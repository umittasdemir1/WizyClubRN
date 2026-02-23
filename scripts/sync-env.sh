#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-all}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_ENV_FILE="$ROOT_DIR/.env"
BACKEND_ENV_FILE="$ROOT_DIR/backend/.env"
MOBILE_ENV_FILE="$ROOT_DIR/mobile/.env"

usage() {
    cat <<'EOF'
Usage: scripts/sync-env.sh [all|backend|mobile]

Reads the root .env file and generates:
  - backend/.env
  - mobile/.env
EOF
}

if [[ "$TARGET" != "all" && "$TARGET" != "backend" && "$TARGET" != "mobile" ]]; then
    usage >&2
    exit 1
fi

if [[ ! -f "$ROOT_ENV_FILE" ]]; then
    echo "[env] ERROR: root .env not found at $ROOT_ENV_FILE" >&2
    echo "[env] Create it from .env.example first." >&2
    exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ROOT_ENV_FILE"
set +a

missing_vars=()

require_var() {
    local key="$1"
    if [[ -z "${!key:-}" ]]; then
        missing_vars+=("$key")
    fi
}

check_required_vars() {
    local scope="$1"
    shift
    missing_vars=()
    for key in "$@"; do
        require_var "$key"
    done
    if (( ${#missing_vars[@]} > 0 )); then
        echo "[env] ERROR: Missing required ${scope} key(s) in root .env: ${missing_vars[*]}" >&2
        exit 1
    fi
}

write_backend_env() {
    check_required_vars "backend" \
        SUPABASE_URL SUPABASE_KEY \
        R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET_NAME R2_PUBLIC_URL

    {
        echo "# Auto-generated from ../.env by scripts/sync-env.sh"
        echo "PORT=${PORT:-3000}"
        echo "SUPABASE_URL=${SUPABASE_URL}"
        echo "SUPABASE_KEY=${SUPABASE_KEY}"
        if [[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
            echo "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}"
        fi
        echo "R2_ACCOUNT_ID=${R2_ACCOUNT_ID}"
        echo "R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}"
        echo "R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}"
        echo "R2_BUCKET_NAME=${R2_BUCKET_NAME}"
        echo "R2_PUBLIC_URL=${R2_PUBLIC_URL}"
        if [[ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
            echo "GOOGLE_APPLICATION_CREDENTIALS=${GOOGLE_APPLICATION_CREDENTIALS}"
        fi
        if [[ -n "${GOOGLE_CLOUD_PROJECT_ID:-}" ]]; then
            echo "GOOGLE_CLOUD_PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID}"
        fi
    } > "$BACKEND_ENV_FILE"

    echo "[env] backend/.env generated from root .env"
}

write_mobile_env() {
    local mobile_api_url="${EXPO_PUBLIC_API_URL:-${WIZY_MOBILE_API_URL:-}}"
    local mobile_supabase_url="${EXPO_PUBLIC_SUPABASE_URL:-${SUPABASE_URL:-}}"
    local mobile_supabase_key="${EXPO_PUBLIC_SUPABASE_ANON_KEY:-${SUPABASE_KEY:-}}"

    if [[ -z "$mobile_api_url" || -z "$mobile_supabase_url" || -z "$mobile_supabase_key" ]]; then
        echo "[env] ERROR: Missing required mobile key(s) in root .env." >&2
        echo "[env] Required: EXPO_PUBLIC_API_URL (or WIZY_MOBILE_API_URL), SUPABASE_URL, SUPABASE_KEY" >&2
        exit 1
    fi

    {
        echo "# Auto-generated from ../.env by scripts/sync-env.sh"
        echo "EXPO_PUBLIC_API_URL=${mobile_api_url}"
        echo "EXPO_PUBLIC_SUPABASE_URL=${mobile_supabase_url}"
        echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=${mobile_supabase_key}"
        if [[ -n "${EXPO_PUBLIC_REVENUECAT_IOS_API_KEY:-}" ]]; then
            echo "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=${EXPO_PUBLIC_REVENUECAT_IOS_API_KEY}"
        fi
        if [[ -n "${EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY:-}" ]]; then
            echo "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=${EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY}"
        fi
    } > "$MOBILE_ENV_FILE"

    echo "[env] mobile/.env generated from root .env"
}

case "$TARGET" in
    all)
        write_backend_env
        write_mobile_env
        ;;
    backend)
        write_backend_env
        ;;
    mobile)
        write_mobile_env
        ;;
esac
