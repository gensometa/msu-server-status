#!/bin/bash
#
# MSU Game Server Probe Runner
#
# Setup:
# 1. Clone this repo on VPS
# 2. Set up SSH key for GitHub push access
# 3. Run: crontab -e
# 4. Add: * * * * * /path/to/run-probe.sh >> /var/log/msu-probe.log 2>&1
#

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# Pull latest changes (in case of manual updates)
git pull --quiet origin main 2>/dev/null || true

# Run the probe script (bash version, no Node.js needed)
bash probe-servers.sh

# Check if file changed
if git diff --quiet server-status.json 2>/dev/null; then
    echo "[$(date -Iseconds)] No changes detected"
    exit 0
fi

# Commit and push
git add server-status.json
git commit -m "update: $(date -Iseconds)"
git push origin main

echo "[$(date -Iseconds)] Status updated and pushed"
