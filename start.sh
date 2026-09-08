#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
PID_FILE="$ROOT/.pids"

# ── colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${CYAN}[start]${NC} $*"; }
ok()   { echo -e "${GREEN}[  ok ]${NC} $*"; }
warn() { echo -e "${YELLOW}[ warn]${NC} $*"; }
die()  { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }

# ── stop command ─────────────────────────────────────────────────────────────
if [[ "${1:-}" == "stop" ]]; then
  if [ -f "$PID_FILE" ]; then
    while IFS= read -r pid; do
      kill "$pid" 2>/dev/null && echo "Stopped PID $pid" || true
    done < "$PID_FILE"
    rm -f "$PID_FILE"
    ok "All processes stopped."
  else
    warn "No PID file found. Trying pkill…"
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
  fi
  exit 0
fi

# ── helpers ───────────────────────────────────────────────────────────────────
require() {
  command -v "$1" &>/dev/null || die "'$1' not found. Please install it and retry."
}

wait_for_port() {
  local name=$1 port=$2 retries=40
  log "Waiting for $name on :$port…"
  while ! nc -z 127.0.0.1 "$port" 2>/dev/null; do
    retries=$((retries - 1))
    [ "$retries" -le 0 ] && die "$name failed to start on :$port — check $ROOT/${name,,}.log"
    sleep 1
  done
  ok "$name is up on :$port"
}

# ── prerequisites ─────────────────────────────────────────────────────────────
require python3
require node
require npm
require nc

echo -e "\n${BOLD}╔══════════════════════════════════════╗"
echo -e "║     Airbnb Clone — Dev Server        ║"
echo -e "╚══════════════════════════════════════╝${NC}\n"

# Kill any previously started servers
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
rm -f "$PID_FILE"
sleep 1

# ── backend: venv + deps ──────────────────────────────────────────────────────
log "Setting up Python virtual environment…"
cd "$BACKEND"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  ok "Created .venv"
fi

source .venv/bin/activate

log "Installing Python dependencies…"
pip install -q -r requirements.txt
ok "Python deps ready"

# ── database: clean stale WAL + seed ─────────────────────────────────────────
mkdir -p "$BACKEND/data"

# Remove stale WAL checkpoint files that cause disk I/O errors
if [ -f "$BACKEND/data/airbnb.db" ] && [ -f "$BACKEND/data/airbnb.db-shm" ]; then
  DBSIZE=$(wc -c < "$BACKEND/data/airbnb.db")
  WALSIZE=$(wc -c < "$BACKEND/data/airbnb.db-wal" 2>/dev/null || echo 0)
  if [ "$WALSIZE" -eq 0 ] && [ "$DBSIZE" -le 8192 ]; then
    warn "Stale WAL files detected — removing…"
    rm -f "$BACKEND/data/airbnb.db-shm" "$BACKEND/data/airbnb.db-wal"
  fi
fi

log "Seeding database (skipped if already seeded)…"
python3 -c "
import sys; sys.path.insert(0, '.')
from app.database.seed import seed
seed()
" && ok "Database ready" || warn "Seed step skipped (may already be seeded)"

# ── backend: start uvicorn ────────────────────────────────────────────────────
log "Starting FastAPI backend on :8000…"
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload \
  > "$ROOT/backend.log" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" >> "$PID_FILE"

wait_for_port "FastAPI" 8000

# ── notification worker ───────────────────────────────────────────────────────
log "Starting notification worker…"
nohup python3 -m workers.notification_worker \
  > "$ROOT/notification_worker.log" 2>&1 &
WORKER_PID=$!
echo "$WORKER_PID" >> "$PID_FILE"
ok "Notification worker started (PID $WORKER_PID)"

# ── frontend: npm install ─────────────────────────────────────────────────────
cd "$FRONTEND"

log "Checking frontend dependencies…"
if [ ! -d "node_modules" ]; then
  npm install --silent
  ok "npm install done"
else
  ok "node_modules already present"
fi

# Write .env.local if missing
if [ ! -f ".env.local" ]; then
  echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
  ok "Created .env.local"
fi

# ── frontend: start Next.js ───────────────────────────────────────────────────
log "Starting Next.js frontend on :3000…"
nohup npm run dev > "$ROOT/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" >> "$PID_FILE"

wait_for_port "Next.js" 3000

# ── done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}✓ Both servers are running!${NC}"
echo -e "  Frontend  →  ${CYAN}http://localhost:3000${NC}"
echo -e "  Backend   →  ${CYAN}http://localhost:8000${NC}"
echo -e "  API docs  →  ${CYAN}http://localhost:8000/docs${NC}"
echo -e "  Logs      →  backend.log  &  frontend.log  (in $ROOT)"
echo -e "\nTo stop:  ${BOLD}./start.sh stop${NC}\n"
