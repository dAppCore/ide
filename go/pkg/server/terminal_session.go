// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"crypto/rand"
	"encoding/hex"
	"io"
	"os"
	"os/exec"
	"sync"
	"time"

	core "dappco.re/go"
	"github.com/creack/pty"
)

// Default ring buffer cap per terminal session — ~10MB of scrollback so a page
// reload (or fresh xterm subscriber) re-streams the recent history without
// losing context. Large enough for `find / -name '*.go'` style firehose; small
// enough to not balloon RSS even with several stale background sessions.
const terminalRingCap = 10 * 1024 * 1024

// terminalDefaultShell falls back when neither SessionOptions.Shell nor $SHELL
// is set. zsh because macOS, /bin/sh would also work but loses dotfile sourcing.
const terminalDefaultShell = "/bin/zsh"

// TerminalSubscriber is a callback fired for every byte chunk produced by a
// session's PTY. Implementations must NOT block — slow consumers should buffer
// internally or drop. The pump runs synchronously over the subscriber list, so
// any blocking subscriber slows every other subscriber on the same session.
type TerminalSubscriber func(chunk []byte)

// TerminalSession represents one PTY-backed shell session. Used by both the
// SSH server (terminal_ssh.go) and the WebSocket bridge (mcp_bridge.go).
//
// Lifecycle: NewSession() → Run() (blocks until shell exits) → Close() (no-op
// after Run returns). The pool's CloseSession also calls Process.Kill so a
// hung shell exits its Run.
//
// Concurrency: Subscribe / Unsubscribe / Write / Resize are safe from any
// goroutine. Run is called once by the spawning code; the pty→subscribers pump
// runs inside Run.
type TerminalSession struct {
	ID    string
	Host  string // "local" today; "linux", "m3", etc. when remote sessions land
	Shell string
	Cwd   string
	Env   []string

	pty    *os.File
	cmd    *exec.Cmd
	closed bool

	mu          sync.RWMutex
	ring        []byte // ring buffer — last terminalRingCap bytes of PTY output
	ringStart   int    // index of oldest byte in ring (== 0 if not yet wrapped)
	ringLen     int    // valid bytes in ring (≤ terminalRingCap)
	wrapped     bool   // true once we've written more than terminalRingCap bytes
	subscribers map[uint64]TerminalSubscriber
	nextSubID   uint64
	doneOnce    sync.Once
	done        chan struct{}
}

// NewTerminalSession allocates a PTY + spawns the configured shell. Returns
// the Session ready to Run(); call Close() if you abandon it before Run.
func NewTerminalSession(opts SessionOptions) (*TerminalSession, error) {
	shell := opts.Shell
	if shell == "" {
		shell = core.Env("SHELL")
	}
	if shell == "" {
		shell = terminalDefaultShell
	}
	cwd := opts.Cwd
	if cwd == "" {
		cwd = core.Env("HOME")
	}
	term := opts.Term
	if term == "" {
		term = "xterm-256color"
	}

	cmd := exec.Command(shell)
	cmd.Dir = cwd
	cmd.Env = append(os.Environ(), "TERM="+term)
	cmd.Env = append(cmd.Env, opts.Env...)

	f, err := pty.Start(cmd)
	if err != nil {
		return nil, err
	}

	if opts.Cols > 0 && opts.Rows > 0 {
		_ = pty.Setsize(f, &pty.Winsize{Cols: uint16(opts.Cols), Rows: uint16(opts.Rows)})
	}

	host := opts.Host
	if host == "" {
		host = "local"
	}

	return &TerminalSession{
		ID:          opts.ID,
		Host:        host,
		Shell:       shell,
		Cwd:         cwd,
		Env:         opts.Env,
		pty:         f,
		cmd:         cmd,
		ring:        make([]byte, terminalRingCap),
		subscribers: make(map[uint64]TerminalSubscriber),
		done:        make(chan struct{}),
	}, nil
}

// SessionOptions configures a new session. ID empty → caller doesn't care
// about a stable identifier (pool will allocate one).
type SessionOptions struct {
	ID    string
	Host  string
	Shell string
	Cwd   string
	Term  string
	Env   []string
	Cols  int
	Rows  int
}

// Run pumps PTY output to subscribers + the ring buffer until the shell exits.
// Blocks until cmd.Wait() returns. Safe to call once per Session.
func (s *TerminalSession) Run() error {
	defer s.markDone()

	buf := make([]byte, 32*1024)
	for {
		n, err := s.pty.Read(buf)
		if n > 0 {
			chunk := append([]byte(nil), buf[:n]...)
			s.appendRing(chunk)
			s.fanOut(chunk)
		}
		if err != nil {
			break
		}
	}

	if err := s.cmd.Wait(); err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			_ = exitErr // exit code accessible via exitErr.ExitCode()
		}
	}
	return nil
}

// Write feeds bytes from a client (xterm.js keystroke / SSH stdin) into the PTY.
// Returns the byte count + any I/O error.
func (s *TerminalSession) Write(p []byte) (int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.closed || s.pty == nil {
		return 0, io.ErrClosedPipe
	}
	return s.pty.Write(p)
}

// Resize sets the PTY window size. Forwards to the kernel via TIOCSWINSZ.
// Cols/rows of zero are silently ignored.
func (s *TerminalSession) Resize(cols, rows int) {
	if cols <= 0 || rows <= 0 {
		return
	}
	s.mu.RLock()
	f := s.pty
	s.mu.RUnlock()
	if f == nil {
		return
	}
	_ = pty.Setsize(f, &pty.Winsize{Cols: uint16(cols), Rows: uint16(rows)})
}

// Subscribe registers a subscriber. Returns the snapshot of current ring buffer
// contents (so the new subscriber catches up to history before the live stream
// starts) and an Unsubscribe function. Safe to call concurrently.
func (s *TerminalSession) Subscribe(sub TerminalSubscriber) ([]byte, func()) {
	s.mu.Lock()
	id := s.nextSubID
	s.nextSubID++
	s.subscribers[id] = sub
	snapshot := s.ringSnapshot()
	s.mu.Unlock()

	return snapshot, func() {
		s.mu.Lock()
		delete(s.subscribers, id)
		s.mu.Unlock()
	}
}

// Done returns a channel that closes when the session's PTY pump exits (shell
// exit, kill, EOF). Subscribers should select on this to know when to stop.
func (s *TerminalSession) Done() <-chan struct{} { return s.done }

// Close kills the shell process and closes the PTY. Idempotent. Run() returns
// shortly after — io.Copy on the PTY hits EOF.
func (s *TerminalSession) Close() {
	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		return
	}
	s.closed = true
	s.mu.Unlock()

	if s.cmd != nil && s.cmd.Process != nil {
		_ = s.cmd.Process.Kill()
	}
	if s.pty != nil {
		_ = s.pty.Close()
	}
}

func (s *TerminalSession) appendRing(p []byte) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, b := range p {
		idx := (s.ringStart + s.ringLen) % terminalRingCap
		s.ring[idx] = b
		if s.ringLen < terminalRingCap {
			s.ringLen++
		} else {
			s.ringStart = (s.ringStart + 1) % terminalRingCap
			s.wrapped = true
		}
	}
}

// ringSnapshot copies the ring buffer's current contents into a new slice in
// chronological order. Caller owns the returned slice. Holds the write lock —
// only invoke from Subscribe (which already holds the lock).
func (s *TerminalSession) ringSnapshot() []byte {
	if s.ringLen == 0 {
		return nil
	}
	out := make([]byte, s.ringLen)
	if !s.wrapped {
		copy(out, s.ring[:s.ringLen])
		return out
	}
	// Wrapped: oldest bytes start at ringStart, walk to end + then [0:ringStart].
	first := terminalRingCap - s.ringStart
	copy(out, s.ring[s.ringStart:])
	copy(out[first:], s.ring[:s.ringStart])
	return out
}

// fanOut delivers a chunk to every subscriber. Read lock — subscribers may not
// register/unregister synchronously while delivering, but new subscribers can't
// miss anything because they atomically grab the ring snapshot inside Subscribe.
func (s *TerminalSession) fanOut(chunk []byte) {
	s.mu.RLock()
	subs := make([]TerminalSubscriber, 0, len(s.subscribers))
	for _, sub := range s.subscribers {
		subs = append(subs, sub)
	}
	s.mu.RUnlock()

	for _, sub := range subs {
		sub(chunk)
	}
}

func (s *TerminalSession) markDone() {
	s.doneOnce.Do(func() { close(s.done) })
}

// --- Session pool ---

// TerminalPool tracks live sessions so the WS endpoint and Wails bridge can
// share state. Single global pool per IDE process — sessions belong to the
// IDE, not the transport.
type TerminalPool struct {
	mu       sync.RWMutex
	sessions map[string]*TerminalSession
}

// NewTerminalPool constructs an empty pool.
func NewTerminalPool() *TerminalPool {
	return &TerminalPool{sessions: make(map[string]*TerminalSession)}
}

// terminalPool is the package-level singleton. Lazily initialised on first use
// from either the WS endpoint or the Wails bridge — both are read-only callers
// of NewSession, so racey-init is fine.
var (
	terminalPoolOnce sync.Once
	terminalPoolInst *TerminalPool
)

// pool returns the package singleton, lazily initialising on first call.
func terminalPoolSingleton() *TerminalPool {
	terminalPoolOnce.Do(func() { terminalPoolInst = NewTerminalPool() })
	return terminalPoolInst
}

// Open allocates a new session, starts its Run pump in a goroutine, and returns
// the session for immediate Subscribe / Write use.
func (p *TerminalPool) Open(opts SessionOptions) (*TerminalSession, error) {
	if opts.ID == "" {
		opts.ID = newSessionID()
	}
	sess, err := NewTerminalSession(opts)
	if err != nil {
		return nil, err
	}

	p.mu.Lock()
	p.sessions[sess.ID] = sess
	p.mu.Unlock()

	go func() {
		_ = sess.Run()
		p.mu.Lock()
		delete(p.sessions, sess.ID)
		p.mu.Unlock()
	}()

	return sess, nil
}

// Get returns a session by ID, or nil if not found.
func (p *TerminalPool) Get(id string) *TerminalSession {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.sessions[id]
}

// Close terminates the given session; no-op if not present.
func (p *TerminalPool) Close(id string) {
	p.mu.RLock()
	sess := p.sessions[id]
	p.mu.RUnlock()
	if sess != nil {
		sess.Close()
	}
}

// Snapshot returns all live session IDs + metadata for the bridge's
// ListSessions method.
func (p *TerminalPool) Snapshot() []SessionInfo {
	p.mu.RLock()
	defer p.mu.RUnlock()
	out := make([]SessionInfo, 0, len(p.sessions))
	for _, s := range p.sessions {
		s.mu.RLock()
		out = append(out, SessionInfo{
			ID:    s.ID,
			Host:  s.Host,
			Shell: s.Shell,
			Cwd:   s.Cwd,
		})
		s.mu.RUnlock()
	}
	return out
}

// SessionInfo is the externally-visible (Wails-serialisable) view of a session.
type SessionInfo struct {
	ID    string `json:"id"`
	Host  string `json:"host"`
	Shell string `json:"shell"`
	Cwd   string `json:"cwd"`
}

// newSessionID returns 16 random hex chars — enough collision resistance for a
// per-process session table.
func newSessionID() string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		// Crypto rand failure is exotic enough to fall back to time-based.
		return "sess-" + time.Now().UTC().Format("20060102T150405.000000")
	}
	return hex.EncodeToString(b[:])
}
