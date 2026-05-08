// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"syscall"
	"unsafe"

	core "dappco.re/go"
	"github.com/charmbracelet/ssh"
	"github.com/creack/pty"
)

// TerminalServer is an embedded SSH server that exposes the user's shell
// inside the IDE. Mirrors charmbracelet/ssh's _examples/ssh-pty/pty.go —
// each incoming session allocates a PTY, spawns $SHELL, and pipes stdin/
// stdout/stderr through the SSH transport.
//
// Addr defaults to "127.0.0.1:9876" (loopback only for v1). Auth is open —
// loopback boundary is the trust model. Adding key-based auth + a public
// listener is a follow-up: charmbracelet/ssh exposes ssh.PublicKeyAuth +
// ssh.PasswordAuth options.
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

// handleSession is invoked for every incoming SSH session. Allocates a PTY,
// spawns the configured shell, and pipes the session's bidirectional stream
// to the PTY master.
func (t *TerminalServer) handleSession(s ssh.Session) {
	shell := t.Shell
	if shell == "" {
		shell = core.Env("SHELL")
	}
	if shell == "" {
		shell = "/bin/zsh"
	}
	cwd := t.Cwd
	if cwd == "" {
		cwd = core.Env("HOME")
	}

	cmd := exec.Command(shell)
	cmd.Dir = cwd

	ptyReq, winCh, isPty := s.Pty()
	if !isPty {
		_, _ = io.WriteString(s, "core/ide terminal: no PTY requested\n")
		_ = s.Exit(1)
		return
	}

	// TERM passthrough so the shell renders colour escape codes correctly.
	cmd.Env = append(os.Environ(), fmt.Sprintf("TERM=%s", ptyReq.Term))

	f, err := pty.Start(cmd)
	if err != nil {
		_, _ = io.WriteString(s, "core/ide terminal: pty.Start failed: "+err.Error()+"\n")
		_ = s.Exit(1)
		return
	}
	defer func() {
		_ = f.Close()
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
	}()

	// Window resize listener. Charmbracelet/ssh emits the initial size on
	// session start and any subsequent SIGWINCH from the client.
	go func() {
		for win := range winCh {
			setWinsize(f, win.Width, win.Height)
		}
	}()

	// stdin: client → pty
	go func() {
		_, _ = io.Copy(f, s)
	}()
	// stdout/stderr: pty → client (blocks until pty closes / cmd exits)
	_, _ = io.Copy(s, f)

	if err := cmd.Wait(); err != nil {
		// Non-zero exit is fine — shells exit on ⌃D / `exit`. Surface it
		// via the SSH session's exit status so the client sees the code.
		if exitErr, ok := err.(*exec.ExitError); ok {
			_ = s.Exit(exitErr.ExitCode())
			return
		}
	}
	_ = s.Exit(0)
}

// setWinsize forwards the SSH client's window size to the PTY master via
// TIOCSWINSZ — the kernel ioctl that drives the slave end's $LINES/$COLUMNS
// env + SIGWINCH delivery to the shell.
func setWinsize(f *os.File, w, h int) {
	_, _, _ = syscall.Syscall(
		syscall.SYS_IOCTL,
		f.Fd(),
		uintptr(syscall.TIOCSWINSZ),
		uintptr(unsafe.Pointer(&struct {
			h, w, x, y uint16
		}{uint16(h), uint16(w), 0, 0})),
	)
}
