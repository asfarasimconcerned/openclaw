#!/usr/bin/env bash
set -euo pipefail

echo "[boot] uid=$(id -u) gid=$(id -g)"

mkdir -p /data/.openclaw /data/workspace || true
chmod -R 777 /data/.openclaw /data/workspace || true

# Start OpenClaw core (gateway + browser control + channels)
openclaw &
OPENCLAW_PID=$!

echo "[boot] openclaw pid=$OPENCLAW_PID"

# Wait briefly for internal services to come up
for i in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:18791/ >/dev/null 2>&1 || \
     curl -fsS http://127.0.0.1:18789/ >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Start Railway-facing wrapper on $PORT
node /app/railway-wrapper.mjs &
WRAPPER_PID=$!

echo "[boot] wrapper pid=$WRAPPER_PID"

trap 'kill $OPENCLAW_PID $WRAPPER_PID 2>/dev/null || true' SIGINT SIGTERM
wait -n $OPENCLAW_PID $WRAPPER_PID
exit $?
