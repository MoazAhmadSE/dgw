#!/usr/bin/env bash
set -euo pipefail

echo "Installing system dependency: libredwg (dwg2dxf)"
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y libredwg-tools
elif command -v dnf >/dev/null 2>&1; then
  sudo dnf install -y libredwg-tools || sudo dnf install -y libredwg
elif command -v brew >/dev/null 2>&1; then
  brew install libredwg
else
  echo "Please install libredwg manually to get dwg2dxf in PATH" >&2
fi

echo "Installing Node dependencies (frontend + backend)"
pushd "$(dirname "$0")" >/dev/null
npm install -D concurrently
(cd backend && npm install)
(cd frontend && npm install)
popd >/dev/null

echo "All set. Use: npm run dev"

