#!/usr/bin/env bash
set -euo pipefail

APP_NAME="qwen35-hermes"
LOG_DIR="${LOG_DIR:-./logs}"
PID_FILE="${PID_FILE:-$LOG_DIR/${APP_NAME}.pid}"
LOG_FILE="${LOG_FILE:-$LOG_DIR/${APP_NAME}.log}"

LLAMA_SERVER_BIN="${LLAMA_SERVER_BIN:-llama-server}"

MODEL_CACHE="${LLAMA_CACHE:-unsloth/Qwen3.5-27B-GGUF}"
MODEL_REF="${MODEL_REF:-unsloth/Qwen3.5-27B-GGUF:Q4_K_M}"
MODEL_ALIAS="${MODEL_ALIAS:-qwen35-27b-hermes}"

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8080}"

CTX_SIZE="${CTX_SIZE:-262144}"
NGL="${NGL:-99}"
FLASH_ATTN="${FLASH_ATTN:-on}"
CACHE_TYPE_K="${CACHE_TYPE_K:-q4_0}"
CACHE_TYPE_V="${CACHE_TYPE_V:-q4_0}"

TEMP="${TEMP:-0.6}"
TOP_P="${TOP_P:-0.95}"
TOP_K="${TOP_K:-20}"
MIN_P="${MIN_P:-0.00}"

REASONING="${REASONING:-on}"
REASONING_FORMAT="${REASONING_FORMAT:-deepseek}"
ENABLE_THINKING="${ENABLE_THINKING:-true}"

mkdir -p "$LOG_DIR"
export LLAMA_CACHE="$MODEL_CACHE"

usage() {
  cat <<EOF
Usage:
  $0 start [-- extra llama-server args...]
  $0 stop
  $0 restart [-- extra llama-server args...]
  $0 status
  $0 logs
  $0 models
  $0 test
  $0 env-hermes

Examples:
  $0 start
  $0 logs
  $0 stop
  $0 restart
  $0 test
  eval "\$($0 env-hermes)"
EOF
}

is_running() {
  [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

require_bin() {
  command -v "$LLAMA_SERVER_BIN" >/dev/null 2>&1 || {
    echo "Missing binary: $LLAMA_SERVER_BIN" >&2
    exit 1
  }
}

build_cmd() {
  CMD=(
    "$LLAMA_SERVER_BIN"
    -hf "$MODEL_REF"
    --alias "$MODEL_ALIAS"
    --host "$HOST"
    --port "$PORT"
    --ctx-size "$CTX_SIZE"
    -ngl "$NGL"
    -fa "$FLASH_ATTN"
    --cache-type-k "$CACHE_TYPE_K"
    --cache-type-v "$CACHE_TYPE_V"
    --temp "$TEMP"
    --top-p "$TOP_P"
    --top-k "$TOP_K"
    --min-p "$MIN_P"
    --reasoning "$REASONING"
    --reasoning-format "$REASONING_FORMAT"
    --chat-template-kwargs "{\"enable_thinking\":$ENABLE_THINKING}"
  )
}

start_server() {
  require_bin

  if is_running; then
    echo "Already running with PID $(cat "$PID_FILE")"
    echo "Log: $LOG_FILE"
    exit 0
  fi

  build_cmd
  local extra_args=("$@")

  nohup "${CMD[@]}" "${extra_args[@]}" >"$LOG_FILE" 2>&1 < /dev/null &
  echo $! > "$PID_FILE"

  sleep 1
  if is_running; then
    echo "Started"
    echo "PID: $(cat "$PID_FILE")"
    echo "Log: $LOG_FILE"
    echo "Base URL: http://$HOST:$PORT/v1"
    echo "Model: $MODEL_ALIAS"
  else
    echo "Failed to start. Check $LOG_FILE"
    exit 1
  fi
}

stop_server() {
  if ! [[ -f "$PID_FILE" ]]; then
    echo "Not running"
    exit 0
  fi

  local pid
  pid="$(cat "$PID_FILE")"

  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    for _ in {1..10}; do
      if kill -0 "$pid" 2>/dev/null; then
        sleep 1
      else
        break
      fi
    done
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  fi

  rm -f "$PID_FILE"
  echo "Stopped"
}

status_server() {
  if is_running; then
    local pid
    pid="$(cat "$PID_FILE")"
    echo "Running"
    echo "PID: $pid"
    echo "Log: $LOG_FILE"
    ps -fp "$pid" || true
  else
    echo "Not running"
  fi
}

logs_server() {
  touch "$LOG_FILE"
  tail -n 100 -f "$LOG_FILE"
}

models_server() {
  curl -s "http://$HOST:$PORT/v1/models"
  echo
}

test_server() {
  curl -s "http://$HOST:$PORT/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer dummy" \
    -d "{
      \"model\": \"$MODEL_ALIAS\",
      \"messages\": [
        {\"role\": \"user\", \"content\": \"Reply with exactly: server is working\"}
      ]
    }"
  echo
}

env_hermes() {
  cat <<EOF
export OPENAI_BASE_URL=http://$HOST:$PORT/v1
export OPENAI_API_KEY=dummy
export LLM_MODEL=$MODEL_ALIAS
EOF
}

cmd="${1:-}"
case "$cmd" in
  start)
    shift
    if [[ "${1:-}" == "--" ]]; then
      shift
    fi
    start_server "$@"
    ;;
  stop)
    stop_server
    ;;
  restart)
    shift
    if [[ "${1:-}" == "--" ]]; then
      shift
    fi
    stop_server || true
    start_server "$@"
    ;;
  status)
    status_server
    ;;
  logs)
    logs_server
    ;;
  models)
    models_server
    ;;
  test)
    test_server
    ;;
  env-hermes)
    env_hermes
    ;;
  *)
    usage
    exit 1
    ;;
esac
