#!/bin/zsh
# Serves the production build and opens a public Cloudflare quick tunnel to it.
# Both run detached from any terminal, and the Mac is kept awake while the tunnel lives.
# The public URL is written to .share-url. Stop everything with: scripts/share.sh stop
cd "$(dirname "$0")/.."
if [[ "$1" == "stop" ]]; then pkill -f "vite preview --port 4173"; pkill -f "cloudflared tunnel --url http://localhost:4173"; pkill -f "caffeinate -i -w"; exit 0; fi
nohup npx vite preview --port 4173 --strictPort > .share-preview.log 2>&1 &
sleep 2
nohup cloudflared tunnel --url http://localhost:4173 --no-autoupdate > .share-tunnel.log 2>&1 &
TPID=$!
nohup caffeinate -i -w $TPID > /dev/null 2>&1 &
for i in {1..30}; do U=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" .share-tunnel.log | head -1); [[ -n "$U" ]] && break; sleep 1; done
echo "$U" > .share-url; echo "$U"
