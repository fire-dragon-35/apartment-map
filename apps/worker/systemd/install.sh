#!/usr/bin/env bash
# Installs the daily worker timer as a systemd user unit. Run once from anywhere; safe to re-run.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../../.." && pwd)"
npm_bin="$(command -v npm)" || { echo "npm not found in PATH" >&2; exit 1; }
[ -f "$repo/.env" ] || { echo "create $repo/.env first (see .env.example)" >&2; exit 1; }

dest="$HOME/.config/systemd/user"
mkdir -p "$dest"
sed -e "s|@REPO@|$repo|" -e "s|@NPM@|$npm_bin|" -e "s|@NODE_BIN@|$(dirname "$npm_bin")|" \
  "$here/lagenhetskartan-worker.service" > "$dest/lagenhetskartan-worker.service"
cp "$here/lagenhetskartan-worker.timer" "$dest/lagenhetskartan-worker.timer"

systemctl --user daemon-reload
systemctl --user enable --now lagenhetskartan-worker.timer
# without linger the user timer only runs while someone is logged in
loginctl enable-linger "$USER" 2>/dev/null || echo "note: run 'sudo loginctl enable-linger $USER' so it also runs while logged out"
systemctl --user list-timers lagenhetskartan-worker.timer --no-pager
