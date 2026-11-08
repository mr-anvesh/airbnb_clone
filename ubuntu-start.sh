#!/usr/bin/env bash
set -euo pipefail

# Ensure standard system binaries are on PATH
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

# ── Paths and Services ────────────────────────────────────────────────────────
ROOT="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$ROOT/.ubuntu_pids"
ENV_FILE="$ROOT/.env"
ENV_EXAMPLE="$ROOT/.env.example"

# The 6 exact services requested for single-instance EC2 deployment:
# (api-2 and api-3 are intentionally excluded)
TARGET_SERVICES=(postgres redis rabbitmq api-1 worker frontend)

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

log()  { echo -e "${CYAN}[start]${NC} $*"; }
ok()   { echo -e "${GREEN}[  ok ]${NC} $*"; }
warn() { echo -e "${YELLOW}[ warn]${NC} $*"; }
die()  { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }

# ── Docker Detection & Permission Helper ───────────────────────────────────────
detect_docker() {
  if ! command -v docker &>/dev/null; then
    warn "Docker is not installed on this system."
    if command -v apt-get &>/dev/null; then
      log "Attempting automatic Docker installation for Ubuntu..."
      if [ "$(id -u)" -eq 0 ]; then
        apt-get update -y
        apt-get install -y docker.io docker-compose-v2 curl
        systemctl enable --now docker
      else
        log "Running installation with sudo..."
        sudo apt-get update -y
        sudo apt-get install -y docker.io docker-compose-v2 curl
        sudo systemctl enable --now docker
        sudo usermod -aG docker "$USER" 2>/dev/null || true
      fi
      ok "Docker installed successfully."
    else
      die "Please install Docker and Docker Compose before running this script."
    fi
  fi

  # Determine docker command prefix (check if current user needs sudo)
  DOCKER_BIN="docker"
  if ! docker ps &>/dev/null; then
    if sudo docker ps &>/dev/null; then
      DOCKER_BIN="sudo docker"
    else
      die "Cannot connect to Docker daemon. Check 'systemctl status docker'."
    fi
  fi

  # Determine compose command
  if $DOCKER_BIN compose version &>/dev/null; then
    COMPOSE_CMD="$DOCKER_BIN compose"
  elif command -v docker-compose &>/dev/null; then
    COMPOSE_CMD="docker-compose"
    if ! docker-compose version &>/dev/null && sudo docker-compose version &>/dev/null; then
      COMPOSE_CMD="sudo docker-compose"
    fi
  else
    warn "Docker Compose plugin not found. Installing docker-compose-v2..."
    if [ "$(id -u)" -eq 0 ]; then
      apt-get update -y && apt-get install -y docker-compose-v2
    else
      sudo apt-get update -y && sudo apt-get install -y docker-compose-v2
    fi
    COMPOSE_CMD="$DOCKER_BIN compose"
  fi
}

# ── IP Discovery for EC2 ──────────────────────────────────────────────────────
get_public_ip() {
  local ip=""
  # Try IMDSv2 (EC2 metadata)
  local token
  token=$(curl -s -m 2 -X PUT "http://169.254.169.254/latest/api/token" \
    -H "X-aws-ec2-metadata-token-ttl-seconds: 60" 2>/dev/null || true)
  if [ -n "$token" ]; then
    ip=$(curl -s -m 2 -H "X-aws-ec2-metadata-token: $token" \
      http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)
  fi

  # Fallback to IMDSv1
  if [ -z "$ip" ]; then
    ip=$(curl -s -m 2 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)
  fi

  # Fallback to external resolver
  if [ -z "$ip" ]; then
    ip=$(curl -s -m 3 https://checkip.amazonaws.com 2>/dev/null || curl -s -m 3 https://ifconfig.me 2>/dev/null || true)
    ip="$(echo "$ip" | tr -d '[:space:]')"
  fi

  # Final fallback
  if [ -z "$ip" ]; then
    ip="localhost"
  fi
  echo "$ip"
}

# ── Health Check Helpers ───────────────────────────────────────────────────────
wait_for_services() {
  log "Waiting for services to become healthy..."

  # 1. Database (Postgres)
  local retries=30
  while ! $COMPOSE_CMD exec -T postgres pg_isready -U airbnb -d airbnb &>/dev/null; do
    retries=$((retries - 1))
    [ "$retries" -le 0 ] && die "PostgreSQL did not become ready in time."
    sleep 1
  done
  ok "PostgreSQL database is ready."

  # 2. Redis
  retries=30
  while ! $COMPOSE_CMD exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; do
    retries=$((retries - 1))
    [ "$retries" -le 0 ] && die "Redis did not become ready in time."
    sleep 1
  done
  ok "Redis cache is ready."

  # 3. RabbitMQ
  retries=40
  while ! $COMPOSE_CMD exec -T rabbitmq rabbitmq-diagnostics -q ping &>/dev/null; do
    retries=$((retries - 1))
    [ "$retries" -le 0 ] && die "RabbitMQ did not become ready in time."
    sleep 1
  done
  ok "RabbitMQ message broker is ready."

  # 4. Backend (api-1)
  retries=40
  while ! curl -s -f "http://127.0.0.1:8000/health" &>/dev/null; do
    retries=$((retries - 1))
    [ "$retries" -le 0 ] && die "Backend API (api-1) failed to respond on :8000/health."
    sleep 1
  done
  ok "Backend API (api-1) is healthy on :8000."
}

# ── Seed Database ─────────────────────────────────────────────────────────────
seed_db() {
  log "Checking and seeding initial database data..."
  $COMPOSE_CMD exec -T api-1 python -m app.database.seed && ok "Database verified and ready." || warn "Seed step completed with notice."
}

# ── Action: Stop ──────────────────────────────────────────────────────────────
do_stop() {
  detect_docker
  log "Stopping deployment services..."
  $COMPOSE_CMD stop "${TARGET_SERVICES[@]}" 2>/dev/null || true
  ok "Services stopped."
  exit 0
}

# ── Action: Down ──────────────────────────────────────────────────────────────
do_down() {
  detect_docker
  log "Stopping and removing containers..."
  $COMPOSE_CMD down 2>/dev/null || true
  ok "Deployment containers removed."
  exit 0
}

# ── Action: Status ────────────────────────────────────────────────────────────
do_status() {
  detect_docker
  echo -e "\n${BOLD}=== Deployment Status ===${NC}"
  $COMPOSE_CMD ps
  exit 0
}

# ── Action: Logs ──────────────────────────────────────────────────────────────
do_logs() {
  detect_docker
  local svc="${2:-}"
  if [ -n "$svc" ]; then
    $COMPOSE_CMD logs -f "$svc"
  else
    $COMPOSE_CMD logs -f "${TARGET_SERVICES[@]}"
  fi
  exit 0
}

# ── Action: Seed ──────────────────────────────────────────────────────────────
do_seed() {
  detect_docker
  seed_db
  exit 0
}

# ── Main Entrypoint ───────────────────────────────────────────────────────────
COMMAND="${1:-start}"

case "$COMMAND" in
  stop)
    do_stop
    ;;
  down)
    do_down
    ;;
  status|ps)
    do_status
    ;;
  logs)
    do_logs "$@"
    ;;
  seed)
    do_seed
    ;;
  restart)
    detect_docker
    log "Restarting deployment..."
    $COMPOSE_CMD stop "${TARGET_SERVICES[@]}" 2>/dev/null || true
    # fallthrough to start
    ;;
  start)
    ;;
  *)
    echo "Usage: $0 [start|stop|down|restart|status|logs|seed]"
    exit 1
    ;;
esac

# ── Startup Banner ────────────────────────────────────────────────────────────
echo -e "\n${BOLD}╔══════════════════════════════════════════════════════════╗"
echo -e "║        Airbnb Clone — Ubuntu / EC2 Deployment            ║"
echo -e "║   1 Backend · 1 Frontend · RabbitMQ · Consumer · Redis   ║"
echo -e "║                       Database                           ║"
echo -e "╚══════════════════════════════════════════════════════════╝${NC}\n"

detect_docker

# ── Ensure .env exists ────────────────────────────────────────────────────────
cd "$ROOT"
if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$ENV_EXAMPLE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    ok "Created .env from .env.example"
  else
    touch "$ENV_FILE"
  fi
fi

# Read HOST_PORT from .env or default to 80
HOST_PORT="$(grep -E '^HOST_PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 || true)"
HOST_PORT="${HOST_PORT:-80}"

# ── Start Services ────────────────────────────────────────────────────────────
log "Building and starting containers:"
echo -e "  ${DIM}• Database:           postgres"
echo -e "  • Cache:              redis"
echo -e "  • Message Broker:     rabbitmq"
echo -e "  • Backend (1 replica): api-1"
echo -e "  • RabbitMQ Consumer:  worker"
echo -e "  • Frontend:           frontend${NC}"
echo -e "  ${YELLOW}(api-2 and api-3 are excluded)${NC}\n"

$COMPOSE_CMD up -d --build "${TARGET_SERVICES[@]}"

# ── Healthchecks & Seeding ────────────────────────────────────────────────────
wait_for_services
seed_db

# ── Public URL Resolution ─────────────────────────────────────────────────────
PUBLIC_IP="$(get_public_ip)"

echo ""
echo -e "${GREEN}${BOLD}============================================================${NC}"
echo -e "${GREEN}${BOLD}✓ All 6 services are up and running!${NC}"
echo -e "${GREEN}${BOLD}============================================================${NC}"
echo ""
echo -e "  ${BOLD}Web Frontend:${NC}       ${CYAN}http://${PUBLIC_IP}:${HOST_PORT}${NC}"
echo -e "  ${BOLD}Backend API:${NC}        ${CYAN}http://${PUBLIC_IP}:8000${NC}"
echo -e "  ${BOLD}API Documentation:${NC}  ${CYAN}http://${PUBLIC_IP}:8000/docs${NC}"
echo -e "  ${BOLD}API Health Check:${NC}   ${CYAN}http://${PUBLIC_IP}:8000/health${NC}"
echo -e "  ${BOLD}RabbitMQ UI:${NC}        ${CYAN}http://${PUBLIC_IP}:15672${NC} ${DIM}(guest / guest)${NC}"
echo ""
echo -e "  ${BOLD}Architecture Topology:${NC}"
echo -e "  • Database:          PostgreSQL 16 (container: postgres)"
echo -e "  • Redis:             Redis 7 (container: redis)"
echo -e "  • Message Broker:    RabbitMQ 3 Management (container: rabbitmq)"
echo -e "  • Backend:           FastAPI (container: api-1)"
echo -e "  • RabbitMQ Consumer: Notification Worker (container: worker)"
echo -e "  • Frontend:          Next.js (container: frontend)"
echo ""
echo -e "  ${YELLOW}${BOLD}AWS Security Group Note:${NC}"
echo -e "  Ensure your EC2 Security Group allows inbound TCP traffic on:"
echo -e "    - Port ${HOST_PORT} (Frontend)"
echo -e "    - Port 8000 (Backend API)"
echo -e "    - Port 15672 (RabbitMQ Management, optional)"
echo ""
echo -e "  ${BOLD}Management Commands:${NC}"
echo -e "    View status:  ${CYAN}./ubuntu-start.sh status${NC}"
echo -e "    View logs:    ${CYAN}./ubuntu-start.sh logs [service]${NC}"
echo -e "    Stop app:     ${CYAN}./ubuntu-start.sh stop${NC}"
echo -e "    Down app:     ${CYAN}./ubuntu-start.sh down${NC}"
echo -e "    Re-seed DB:   ${CYAN}./ubuntu-start.sh seed${NC}"
echo ""
