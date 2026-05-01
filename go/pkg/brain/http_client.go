package brain

import (
	"context"
	goio "io"
	"net/http"
	"sync"
	"time"

	core "dappco.re/go"

	"dappco.re/go/ide/pkg/config"
)

const maxErrorBodyBytes = 4096

type httpDoer interface {
	Do(*http.Request) (*http.Response, error)
}

type openBrainHTTPRequest struct {
	Method string
	Path   string
	APIKey string
	Body   []byte
}

type openBrainHTTPClient struct {
	endpoint string
	doer     httpDoer
	retry    config.BrainRetry
	breaker  *openBrainCircuitBreaker
	sleep    func(context.Context, time.Duration) error
}

// newOpenBrainHTTPClient builds the retrying direct OpenBrain client used by Subsystem.
//
//	client := newOpenBrainHTTPClient(cfg, http.DefaultClient)
//	out, err := client.DoJSON(ctx, openBrainHTTPRequest{Method: http.MethodGet, Path: "/v1/brain/list"})
func newOpenBrainHTTPClient(cfg config.Brain, doer httpDoer) *openBrainHTTPClient {
	cfg = cfg.WithDefaults()
	if doer == nil {
		doer = &http.Client{Timeout: cfg.HTTP.Timeout}
	}
	return &openBrainHTTPClient{
		endpoint: cfg.Endpoint,
		doer:     doer,
		retry:    cfg.HTTP.Retry.WithDefaults(),
		breaker:  newOpenBrainCircuitBreaker(cfg.HTTP.CircuitBreaker),
		sleep:    sleepWithContext,
	}
}

func (client *openBrainHTTPClient) DoJSON(
	ctx context.Context,
	request openBrainHTTPRequest,
) (map[string]any, error) {
	if client == nil {
		return nil, wrapOpenBrainError("ide.brain.http", "client unavailable", &OpenBrainError{
			Kind:      OpenBrainErrorTransport,
			Method:    request.Method,
			Path:      request.Path,
			Retryable: true,
		})
	}
	if client.doer == nil {
		return nil, wrapOpenBrainError("ide.brain.http", "transport unavailable", &OpenBrainError{
			Kind:      OpenBrainErrorTransport,
			Method:    request.Method,
			Path:      request.Path,
			Retryable: true,
		})
	}
	if err := client.breaker.Allow(request.Method, request.Path); err != nil {
		return nil, err
	}
	attempts := client.retry.Attempts
	if attempts < 1 {
		attempts = 1
	}
	var finalErr error
	for attempt := 1; attempt <= attempts; attempt++ {
		out, err := client.doOnce(ctx, request)
		if err == nil {
			client.breaker.RecordSuccess()
			return out, nil
		}
		finalErr = err
		if !retryableOpenBrainError(err) || attempt == attempts {
			break
		}
		if sleepErr := client.sleep(ctx, client.backoff(attempt)); sleepErr != nil {
			finalErr = core.E("ide.brain.http", "retry wait interrupted", sleepErr)
			break
		}
	}
	if retryableOpenBrainError(finalErr) {
		client.breaker.RecordFailure()
	}
	return nil, finalErr
}

func (client *openBrainHTTPClient) doOnce(
	ctx context.Context,
	input openBrainHTTPRequest,
) (map[string]any, error) {
	request, err := http.NewRequestWithContext(ctx, input.Method, joinEndpointPath(client.endpoint, input.Path), core.NewBuffer(input.Body))
	if err != nil {
		return nil, wrapOpenBrainError("ide.brain.http", "build request", &OpenBrainError{
			Kind:   OpenBrainErrorRequest,
			Method: input.Method,
			Path:   input.Path,
			Cause:  err,
		})
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Authorization", core.Concat("Bearer ", input.APIKey))
	if len(input.Body) > 0 {
		request.Header.Set("Content-Type", "application/json")
	}
	response, err := client.doer.Do(request)
	if err != nil {
		return nil, wrapOpenBrainError("ide.brain.http", "request failed", &OpenBrainError{
			Kind:      OpenBrainErrorTransport,
			Method:    input.Method,
			Path:      input.Path,
			Retryable: true,
			Cause:     err,
		})
	}
	defer func() {
		if cerr := response.Body.Close(); cerr != nil { _ = cerr }
	}()
	raw, err := readOpenBrainBody(response.Body)
	if err != nil {
		return nil, wrapOpenBrainError("ide.brain.http", "read response", &OpenBrainError{
			Kind:      OpenBrainErrorTransport,
			Method:    input.Method,
			Path:      input.Path,
			Retryable: true,
			Cause:     err,
		})
	}
	if len(raw) > maxResponseBytes {
		return nil, wrapOpenBrainError("ide.brain.http", "response too large", &OpenBrainError{
			Kind:       OpenBrainErrorResponseTooLarge,
			Method:     input.Method,
			Path:       input.Path,
			StatusCode: response.StatusCode,
			Status:     response.Status,
		})
	}
	if response.StatusCode >= http.StatusBadRequest {
		return nil, wrapOpenBrainError("ide.brain.http", "upstream returned an error", &OpenBrainError{
			Kind:       OpenBrainErrorStatus,
			Method:     input.Method,
			Path:       input.Path,
			StatusCode: response.StatusCode,
			Status:     response.Status,
			Body:       truncateErrorBody(raw),
			Retryable:  retryableStatus(response.StatusCode),
		})
	}
	out := map[string]any{}
	if result := core.JSONUnmarshal(raw, &out); !result.OK {
		decodeErr, _ := result.Value.(error)
		return nil, wrapOpenBrainError("ide.brain.http", "decode response", &OpenBrainError{
			Kind:       OpenBrainErrorDecode,
			Method:     input.Method,
			Path:       input.Path,
			StatusCode: response.StatusCode,
			Status:     response.Status,
			Cause:      decodeErr,
		})
	}
	return out, nil
}

func readOpenBrainBody(
	body goio.Reader,
) ([]byte, error) {
	return goio.ReadAll(goio.LimitReader(body, maxResponseBytes+1))
}

func retryableStatus(status int) bool {
	return status == http.StatusTooManyRequests || status >= http.StatusInternalServerError
}

func retryableOpenBrainError(err error) bool {
	apiErr, ok := openBrainErrorFrom(err)
	return ok && apiErr.Retryable
}

func (client *openBrainHTTPClient) backoff(attempt int) time.Duration {
	delay := client.retry.Backoff
	if delay <= 0 {
		delay = 100 * time.Millisecond
	}
	for index := 1; index < attempt; index++ {
		delay *= 2
		if client.retry.MaxBackoff > 0 && delay > client.retry.MaxBackoff {
			return client.retry.MaxBackoff
		}
	}
	if client.retry.MaxBackoff > 0 && delay > client.retry.MaxBackoff {
		return client.retry.MaxBackoff
	}
	return delay
}

func sleepWithContext(
	ctx context.Context,
	delay time.Duration,
) error {
	if delay <= 0 {
		return nil
	}
	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

func joinEndpointPath(endpoint, path string) string {
	endpoint = core.TrimSuffix(core.Trim(endpoint), "/")
	path = core.Trim(path)
	if path == "" {
		return endpoint
	}
	if !core.HasPrefix(path, "/") {
		path = core.Concat("/", path)
	}
	return core.Concat(endpoint, path)
}

func truncateErrorBody(raw []byte) string {
	if len(raw) == 0 {
		return ""
	}
	if len(raw) > maxErrorBodyBytes {
		raw = raw[:maxErrorBodyBytes]
	}
	return core.Trim(string(raw))
}

type openBrainCircuitBreaker struct {
	mu               sync.Mutex
	enabled          bool
	failureThreshold int
	cooldown         time.Duration
	now              func() time.Time
	failures         int
	openedAt         time.Time
}

func newOpenBrainCircuitBreaker(cfg config.BrainCircuitBreaker) *openBrainCircuitBreaker {
	cfg = cfg.WithDefaults()
	return &openBrainCircuitBreaker{
		enabled:          config.BoolValue(cfg.Enabled, true),
		failureThreshold: cfg.FailureThreshold,
		cooldown:         cfg.Cooldown,
		now:              time.Now,
	}
}

func (breaker *openBrainCircuitBreaker) Allow(
	method,
	path string,
) error {
	if breaker == nil || !breaker.enabled {
		return nil
	}
	breaker.mu.Lock()
	defer breaker.mu.Unlock()
	if breaker.openedAt.IsZero() {
		return nil
	}
	if breaker.now().Sub(breaker.openedAt) >= breaker.cooldown {
		return nil
	}
	return wrapOpenBrainError("ide.brain.http", "circuit breaker open", &OpenBrainError{
		Kind:      OpenBrainErrorCircuitOpen,
		Method:    method,
		Path:      path,
		Retryable: true,
	})
}

func (breaker *openBrainCircuitBreaker) RecordSuccess() {
	if breaker == nil || !breaker.enabled {
		return
	}
	breaker.mu.Lock()
	defer breaker.mu.Unlock()
	breaker.failures = 0
	breaker.openedAt = time.Time{}
}

func (breaker *openBrainCircuitBreaker) RecordFailure() {
	if breaker == nil || !breaker.enabled {
		return
	}
	breaker.mu.Lock()
	defer breaker.mu.Unlock()
	breaker.failures++
	if breaker.failures >= breaker.failureThreshold {
		breaker.openedAt = breaker.now()
	}
}
