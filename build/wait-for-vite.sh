#!/usr/bin/env sh
# Block until vite's dev server is reachable. Used by build/config.yml's
# dev_mode.executes ordering to keep the Wails dev binary from racing
# vite cold-start (the binary's 10-attempt × 500ms retry budget loses
# every time on the first run, FATAL'ing with "unable to connect to
# frontend server"). wails3 dev's exec path doesn't go through a shell,
# so an inline `until ...; do sleep ...; done` is unreachable; this
# script gives it a single binary to run.
PORT="${1:-9247}"
until curl -sf "http://localhost:${PORT}" >/dev/null 2>&1; do
  sleep 1
done
