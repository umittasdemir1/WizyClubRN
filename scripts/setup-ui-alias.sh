#!/bin/bash
# Auto-setup UI alias for bash/zsh

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Detect shell
if [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
elif [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
else
    SHELL_RC="$HOME/.bashrc"
fi

# Add alias if not already present
if ! grep -q "alias ui=" "$SHELL_RC" 2>/dev/null; then
    echo "" >> "$SHELL_RC"
    echo "# WizyClub UI Manager" >> "$SHELL_RC"
    echo "alias ui='node \"$PROJECT_ROOT/scripts/ui.js\"'" >> "$SHELL_RC"
    echo "✅ UI alias added to $SHELL_RC"
else
    echo "✅ UI alias already exists in $SHELL_RC"
fi

# Reload
source "$SHELL_RC" 2>/dev/null || true
echo "✅ Done! You can now use 'ui' command."
