#!/usr/bin/env bash
# SPDX-License-Identifier: EUPL-1.2

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BIN="/tmp/core-ide"
HTTP_ADDR="127.0.0.1:19880"
TOKEN="smoke-$(date +%s)-$$"
HTTP_PID=""

export GOWORK="${GOWORK:-off}"
export GOPATH="${CORE_IDE_GOPATH:-/tmp/core-ide-gopath}"
export GOCACHE="${CORE_IDE_GOCACHE:-/tmp/core-ide-go-build}"

cleanup() {
  if [[ -n "${HTTP_PID}" ]] && kill -0 "${HTTP_PID}" 2>/dev/null; then
    kill "${HTTP_PID}" 2>/dev/null || true
    wait "${HTTP_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

cd "${ROOT}"
go build -o "${BIN}" ./cmd/core-ide

python3 - "${BIN}" <<'PY'
import json
import subprocess
import sys
import time

binary = sys.argv[1]
proc = subprocess.Popen(
    [binary, "--mcp"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
)

def send(message):
    payload = json.dumps(message, separators=(",", ":")).encode("utf-8") + b"\n"
    proc.stdin.write(payload)
    proc.stdin.flush()

def read_message(timeout=10):
    deadline = time.time() + timeout
    line = b""
    while not line.endswith(b"\n"):
        if time.time() > deadline:
            raise TimeoutError("timed out waiting for MCP response")
        chunk = proc.stdout.read(1)
        if not chunk:
            stderr = proc.stderr.read().decode("utf-8", "replace")
            raise RuntimeError("MCP process exited before response: " + stderr)
        line += chunk
    return json.loads(line.decode("utf-8"))

def request(message_id, method, params=None):
    message = {"jsonrpc": "2.0", "id": message_id, "method": method}
    if params is not None:
        message["params"] = params
    send(message)
    while True:
        response = read_message()
        if response.get("id") == message_id:
            if "error" in response:
                raise RuntimeError(response["error"])
            return response["result"]
        if "id" in response and "method" in response:
            send({"jsonrpc": "2.0", "id": response["id"], "result": {}})

try:
    request(1, "initialize", {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "core-ide-smoke", "version": "pass-2"},
    })
    send({"jsonrpc": "2.0", "method": "notifications/initialized"})
    result = request(2, "tools/list", {})
    tools = result.get("tools", [])
    if len(tools) != 19:
        raise RuntimeError(f"expected 19 stdio tools, got {len(tools)}")
    print("stdio MCP: 19 tools")
finally:
    proc.terminate()
    try:
        proc.wait(timeout=3)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait(timeout=3)
PY

"${BIN}" --no-gui --http "${HTTP_ADDR}" --token "${TOKEN}" >/tmp/core-ide-http-smoke.log 2>&1 &
HTTP_PID=$!

python3 - "${HTTP_ADDR}" "${TOKEN}" <<'PY'
import json
import sys
import time
import urllib.error
import urllib.request

addr, token = sys.argv[1], sys.argv[2]
base = "http://" + addr
deadline = time.time() + 10
while True:
    try:
        with urllib.request.urlopen(base + "/health", timeout=1) as response:
            if response.status == 200:
                break
    except Exception:
        if time.time() > deadline:
            raise
        time.sleep(0.1)

request = urllib.request.Request(base + "/v1/tools", headers={"Authorization": "Bearer " + token})
with urllib.request.urlopen(request, timeout=5) as response:
    body = response.read().decode("utf-8")
    envelope = json.loads(body)
    tools = envelope.get("data", [])
    if response.status != 200 or not envelope.get("success") or len(tools) != 19:
        raise RuntimeError(f"expected 19 HTTP tools, got status={response.status} body={body}")
print("HTTP MCP bearer: 19 tools")

payload = json.dumps({"root": "."}).encode("utf-8")
request = urllib.request.Request(
    base + "/v1/tools/workspace_status",
    data=payload,
    headers={
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
    },
)
with urllib.request.urlopen(request, timeout=5) as response:
    body = response.read().decode("utf-8")
    envelope = json.loads(body)
    data = envelope.get("data", {})
    if response.status != 200 or not envelope.get("success") or not data.get("root"):
        raise RuntimeError(f"expected workspace_status success, got status={response.status} body={body}")
print("HTTP tool bridge workspace_status: ok")

try:
    urllib.request.urlopen(base + "/v1/tools", timeout=5)
except urllib.error.HTTPError as error:
    if error.code != 401:
        raise RuntimeError(f"expected unauthenticated HTTP 401, got {error.code}")
    print("HTTP MCP no bearer: 401")
else:
    raise RuntimeError("expected unauthenticated HTTP request to fail")
PY

kill "${HTTP_PID}" 2>/dev/null || true
wait "${HTTP_PID}" 2>/dev/null || true
HTTP_PID=""

set +e
"${BIN}" --no-gui --http "${HTTP_ADDR}" >/tmp/core-ide-http-no-token-smoke.log 2>&1
NO_TOKEN_STATUS=$?
set -e
if [[ "${NO_TOKEN_STATUS}" -ne 1 ]]; then
  echo "HTTP MCP no token: expected exit 1, got ${NO_TOKEN_STATUS}" >&2
  exit 1
fi
echo "HTTP MCP no token: exit 1"

echo "core/ide smoke OK"
