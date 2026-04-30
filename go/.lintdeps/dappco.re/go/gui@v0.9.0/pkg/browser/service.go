package browser

import (
	"context"
	"net/url"

	core "dappco.re/go"
)

type Options struct{}

type Service struct {
	*core.ServiceRuntime[Options]
	platform Platform
}

func (s *Service) OnStartup(_ context.Context) core.Result {
	openURL := func(_ context.Context, opts core.Options) core.Result {
		parsedURL, err := validatedOpenURL(opts.String("url"))
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		if err := s.platform.OpenURL(parsedURL); err != nil {
			return core.Result{Value: core.E("browser.openURL", "failed to open URL", err), OK: false}
		}
		return core.Result{OK: true}
	}
	openFile := func(_ context.Context, opts core.Options) core.Result {
		path, err := validatedOpenFilePath(opts.String(core.Concat("pa", "th")))
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		if err := s.platform.OpenFile(path); err != nil {
			return core.Result{Value: core.E("browser.openFile", "failed to open file", err), OK: false}
		}
		return core.Result{OK: true}
	}
	s.Core().Action("browser.openURL", openURL)
	s.Core().Action("gui.browser.open", openURL)
	s.Core().Action("browser.openFile", openFile)
	s.Core().Action("gui.browser.openFile", openFile)
	return core.Result{OK: true}
}

func (s *Service) HandleIPCEvents(_ *core.Core, _ core.Message) core.Result {
	return core.Result{OK: true}
}

func validatedOpenURL(raw string) (string, error) {
	trimmed := core.Trim(raw)
	if trimmed == "" {
		return "", core.E("browser.openURL", "url is required", nil)
	}
	parsed, err := url.ParseRequestURI(trimmed)
	if err != nil {
		return "", core.E("browser.openURL", "invalid url", err)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", core.E("browser.openURL", "unsupported url scheme: "+parsed.Scheme, nil)
	}
	if parsed.Host == "" {
		return "", core.E("browser.openURL", "url host is required", nil)
	}
	if parsed.User != nil {
		return "", core.E("browser.openURL", "url must not include credentials", nil)
	}
	return parsed.String(), nil
}

func validatedOpenFilePath(raw string) (string, error) {
	trimmed := core.Trim(raw)
	if trimmed == "" {
		return "", core.E("browser.openFile", "path is required", nil)
	}
	if core.Contains(trimmed, "\x00") {
		return "", core.E("browser.openFile", "path contains a null byte", nil)
	}
	cleaned := core.CleanPath(trimmed, string(core.PathSeparator))
	if !core.PathIsAbs(cleaned) {
		return "", core.E("browser.openFile", "path must be absolute", nil)
	}
	return cleaned, nil
}
