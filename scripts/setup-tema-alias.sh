#!/bin/bash
# Auto-setup TEMA command for bash/zsh

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOCAL_BIN="$HOME/.local/bin"

# Detect shell rc
if [ -n "${BASH_VERSION:-}" ]; then
    SHELL_RC="$HOME/.bashrc"
elif [ -n "${ZSH_VERSION:-}" ]; then
    SHELL_RC="$HOME/.zshrc"
else
    SHELL_RC="$HOME/.bashrc"
fi

mkdir -p "$LOCAL_BIN"

create_launcher() {
    local target="$1"
    cat > "$target" <<EOF
#!/usr/bin/env bash
node "$PROJECT_ROOT/scripts/tema.js" "\$@"
EOF
    chmod +x "$target"
}

create_launcher "$LOCAL_BIN/tema"
create_launcher "$LOCAL_BIN/TEMA"
echo "✅ Launchers created: $LOCAL_BIN/tema, $LOCAL_BIN/TEMA"

# Ensure PATH contains ~/.local/bin
if ! grep -q '\.local/bin' "$SHELL_RC" 2>/dev/null; then
    {
        echo ""
        echo "# Ensure local bin is available"
        echo 'export PATH="$HOME/.local/bin:$PATH"'
    } >> "$SHELL_RC"
    echo "✅ Added ~/.local/bin to PATH in $SHELL_RC"
else
    echo "✅ ~/.local/bin PATH already exists in $SHELL_RC"
fi

# Ensure aliases exist for convenience
if ! grep -q "alias tema=" "$SHELL_RC" 2>/dev/null; then
    {
        echo ""
        echo "# WizyClub Theme Manager"
        echo "alias tema='node \"$PROJECT_ROOT/scripts/tema.js\"'"
    } >> "$SHELL_RC"
    echo "✅ Added alias tema in $SHELL_RC"
else
    echo "✅ alias tema already exists in $SHELL_RC"
fi

if ! grep -q "alias TEMA=" "$SHELL_RC" 2>/dev/null; then
    echo "alias TEMA='tema'" >> "$SHELL_RC"
    echo "✅ Added alias TEMA in $SHELL_RC"
else
    echo "✅ alias TEMA already exists in $SHELL_RC"
fi

echo "✅ Kurulum tamamlandı."
echo "➡️  Bu oturum için çalıştır: source \"$SHELL_RC\" && hash -r"
echo "➡️  Sonra kullan: tema   veya   TEMA"
