#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
    echo "ERROR: backend/.env missing. Add real env values first."
    exit 1
fi

if [[ ! -d node_modules ]]; then
    echo "Installing backend dependencies..."
    npm install
fi

npm start
