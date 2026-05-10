// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"io"
	"net"

	core "dappco.re/go"
	"github.com/charmbracelet/ssh"
)

// TerminalServer is an embedded SSH server that exposes the user's shell
// inside the IDE. Each incoming session is delegated to the shared
// TerminalPool — same PTY engine, same ring buffer, same subscribers as the
// in-IDE WebSocket bridge.
//
// Addr defaults to "127.0.0.1:9876" (loopback only for v1). Auth is open —
// loopback boundary is the trust model. Adding key-based auth + a public
// listener is a follow-up: charmbracelet/ssh exposes ssh.PublicKeyAuth +
// ssh.PasswordAuth options.
//
// Cross-machine note: Snider's M3 Mac and Linux nvidia box share a 10gb LAN.
// SSH listening on loopback is local-only; binding 0.0.0.0 + adding key auth
// is the v2 step that lets `ssh -p 9876 m3-mac` work from the Linux box.
type TerminalServer struct {
	Addr  string // "host:port" — default "127.0.0.1:9876"
	Shell string // override $SHELL — default $SHELL or /bin/zsh
	Cwd   string // working directory for spawned shells

	server   *ssh.Server
	listener net.Listener
}

// NewTerminalServer constructs a TerminalServer with sane defaults.
func NewTerminalServer() *TerminalServer {
	return &TerminalServer{
		Addr: "127.0.0.1:9876",
	}
}

// Start binds the listener and serves SSH in a goroutine. Returns once the
// listener is bound (or fails to bind). Caller is responsible for Stop().
func (t *TerminalServer) Start() error {
	if t == nil {
		return core.E("ide.server.Terminal.Start", "terminal server is nil", nil)
	}

	t.server = &ssh.Server{
		Addr:    t.Addr,
		Handler: t.handleSession,
	}

	ln, err := net.Listen("tcp", t.Addr)
	if err != nil {
		return core.E("ide.server.Terminal.Start", "listen: "+t.Addr, err)
	}
	t.listener = ln

	go func() {
		if err := t.server.Serve(ln); err != nil && err != ssh.ErrServerClosed {
			core.Print(core.Stderr(), "ide.server.Terminal: serve: %v\n", err)
		}
	}()
	return nil
}

// Stop shuts the SSH server down, terminating any active sessions.
func (t *TerminalServer) Stop() error {
	if t == nil || t.server == nil {
		return nil
	}
	return t.server.Shutdown(context.Background())
}

// handleSession is invoked for every incoming SSH session. Allocates a Session
// from the shared TerminalPool, pipes the SSH transport through the Session's
// PTY (input client→pty via Write, output pty→client via Subscribe), and
// blocks until the shell exits or the SSH client disconnects.
func (t *TerminalServer) handleSession(s ssh.Session) {
	ptyReq, winCh, isPty := s.Pty()
	if !isPty {
		_, _ = io.WriteString(s, "core/ide terminal: no PTY requested\n")
		_ = s.Exit(1)
		return
	}

	pool := terminalPoolSingleton()
	sess, err := pool.Open(SessionOptions{
		Host:  "ssh",
		Shell: t.Shell,
		Cwd:   t.Cwd,
		Term:  ptyReq.Term,
		Cols:  ptyReq.Window.Width,
		Rows:  ptyReq.Window.Height,
	})
	if err != nil {
		_, _ = io.WriteString(s, "core/ide terminal: session open failed: "+err.Error()+"\n")
		_ = s.Exit(1)
		return
	}
	defer sess.Close()

	// Subscribe BEFORE forwarding stdin so any startup output (shell prompt)
	// reaches the SSH client. The snapshot is empty here because Open just
	// allocated the PTY — but the Subscribe contract is the same as for
	// WebSocket subscribers so the order matters for symmetry.
	snapshot, unsub := sess.Subscribe(func(chunk []byte) {
		_, _ = s.Write(chunk)
	})
	defer unsub()
	if len(snapshot) > 0 {
		_, _ = s.Write(snapshot)
	}

	// Forward client window resizes to the PTY.
	go func() {
		for win := range winCh {
			sess.Resize(win.Width, win.Height)
		}
	}()

	// stdin: SSH client → PTY. Blocks until the SSH session closes.
	go func() {
		_, _ = io.Copy(writerFunc(sess.Write), s)
		// EOF on the SSH side — kill the shell so Run unblocks.
		sess.Close()
	}()

	// Wait for the shell to exit (PTY pump done) and surface its exit code.
	<-sess.Done()
	_ = s.Exit(0)
}

// writerFunc adapts a func(p []byte)(int,error) to an io.Writer so we can pass
// sess.Write into io.Copy without an extra struct.
type writerFunc func(p []byte) (int, error)

func (f writerFunc) Write(p []byte) (int, error) { return f(p) }
