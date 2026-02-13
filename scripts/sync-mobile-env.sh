#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_ENV_FILE="$ROOT_DIR/mobile/.env"
HOME_ENV_FILE="$ROOT_DIR/mobile/.env.home"
WORK_ENV_FILE="$ROOT_DIR/mobile/.env.work"
DEFAULT_HOME_URL="http://192.168.0.138:3000"

extract_api_url() {
    local file_path="$1"
    if [[ ! -f "$file_path" ]]; then
        return 1
    fi

    local line
    line="$(grep -E '^EXPO_PUBLIC_API_URL=' "$file_path" | head -n 1 || true)"
    if [[ -z "$line" ]]; then
        return 1
    fi

    line="${line#EXPO_PUBLIC_API_URL=}"
    line="${line%$'\r'}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"

    if [[ -z "$line" ]]; then
        return 1
    fi

    printf '%s' "$line"
}

fetch_ngrok_https_url() {
    local ngrok_json
    ngrok_json="$(curl -sS --max-time 2 http://127.0.0.1:4040/api/tunnels 2>/dev/null || true)"
    if [[ -z "$ngrok_json" ]]; then
        return 1
    fi

    local url
    url="$(printf '%s' "$ngrok_json" | tr -d '\n' | sed -n 's/.*"public_url":"\(https:[^"]*\)".*/\1/p' | head -n 1)"
    if [[ -z "$url" ]]; then
        return 1
    fi

    printf '%s' "$url"
}

wait_for_ngrok_https_url() {
    local attempt=1
    local max_attempts=30
    local url=""

    while (( attempt <= max_attempts )); do
        url="$(fetch_ngrok_https_url || true)"
        if [[ -n "$url" ]]; then
            printf '%s' "$url"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done

    return 1
}

write_mobile_env() {
    local api_url="$1"
    printf 'EXPO_PUBLIC_API_URL=%s\n' "$api_url" > "$MOBILE_ENV_FILE"
    echo "[env] mobile/.env updated -> EXPO_PUBLIC_API_URL=$api_url"
}

resolve_home_url() {
    local url=""

    url="$(extract_api_url "$HOME_ENV_FILE" || true)"
    if [[ -z "$url" ]]; then
        url="${WIZY_HOME_API_URL:-$DEFAULT_HOME_URL}"
    fi

    printf '%s' "$url"
}

resolve_work_url() {
    local url=""

    url="$(wait_for_ngrok_https_url || true)"
    if [[ -n "$url" ]]; then
        printf '%s' "$url"
        return 0
    fi

    url="$(extract_api_url "$WORK_ENV_FILE" || true)"
    if [[ -n "$url" ]]; then
        printf '%s' "$url"
        return 0
    fi

    url="$(extract_api_url "$MOBILE_ENV_FILE" || true)"
    if [[ -n "$url" && "$url" == *ngrok* ]]; then
        printf '%s' "$url"
        return 0
    fi

    return 1
}

case "$MODE" in
    home)
        write_mobile_env "$(resolve_home_url)"
        ;;
    work)
        work_url="$(resolve_work_url || true)"
        if [[ -z "${work_url:-}" ]]; then
            echo "[env] ERROR: ngrok URL could not be resolved." >&2
            echo "[env] Start ngrok first or set EXPO_PUBLIC_API_URL in mobile/.env.work." >&2
            exit 1
        fi
        write_mobile_env "$work_url"
        ;;
    *)
        echo "Usage: $0 [home|work]" >&2
        exit 1
        ;;
esac
