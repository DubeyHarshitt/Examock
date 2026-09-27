#!/bin/bash
# Deploys examock to the server and verifies the API came up.
#
# This is a thin ssh wrapper around the exact sequence that used to live in
# scripts/deploy.sh (same file, minus the ssh). deploy.sh has no way to run --
# it assumes it is already ON the server. Keep the two in sync or delete
# deploy.sh; a stale copy is how the pm2/health bugs below got shipped once
# already.
#
# WHY ONE HEREDOC INSTEAD OF SEVERAL `ssh host 'cmd'` CALLS:
# a single remote shell means `set -euo pipefail` governs the whole sequence
# and PORT (read from the backend .env) survives to the health check at the
# bottom. Split across separate ssh calls, each command gets a fresh shell
# and both properties are lost -- and `&&`-chaining them hides which step
# failed.
#
# The delimiter is single-quoted (<< 'ENDSSH') so NOTHING is expanded locally.
# The $PORT and $(...) below must be evaluated on the server, not here.

set -euo pipefail

ssh -p 5726 harshit@examock.initcodes.in << 'ENDSSH'
set -euo pipefail

cd /opt/examock
git pull --ff-only

# ── backend ──────────────────────────────────────────────────────────────
cd examock-backend

# Both of these are gitignored, and git cannot track empty dirs, so they are
# simply absent after a fresh clone. Both are required and neither is
# auto-created:
#   logs/   pm2 will NOT create the dir for out_file/error_file
#           (see the out_file comment in ecosystem.config.cjs)
#   uploads/  multer's `dest: "uploads/"` in rag.routes.js and admin.routes.js
#           resolves against cwd and throws ENOENT on a missing dir
# Without this, pm2 cannot open its log file and every upload route 500s.
mkdir -p logs uploads

npm ci
npx prisma migrate deploy
npx prisma generate

pm2 startOrReload ecosystem.config.cjs --update-env
# Persist the process list, otherwise a reboot resurrects the LAST saved one
# rather than whatever was just deployed. (`pm2 startup` is still a one-time
# manual step to make the service survive reboots at all.)
pm2 save

# ── frontend ─────────────────────────────────────────────────────────────
cd ../examock-frontend

# VITE_* vars are inlined into the bundle at BUILD time, not read at runtime.
# So a stale/copied .env ships a frontend pointing at localhost -- and that
# fails in a way no build or deploy step will notice: the bundle loads fine
# and every API call just dies in the user's browser. Refuse to deploy it.
if [ ! -f .env ]; then
  echo "✖ examock-frontend/.env is missing (needs VITE_API_URL, VITE_GOOGLE_CLIENT_ID)" >&2
  exit 1
fi
if grep -Eq 'VITE_API_URL="?https?://(localhost|127\.0\.0\.1)' .env; then
  echo "✖ VITE_API_URL in examock-frontend/.env points at localhost." >&2
  echo "   Set it to the public API origin, or this deploy ships a bundle" >&2
  echo "   that sends every user's API calls to their own machine." >&2
  exit 1
fi

npm ci
npm run build
# Requires the ssh user to own /var/www/examock. If nginx serves from a
# root-owned path this fails with EACCES -- grant write access once, up front.
rsync -a --delete dist/ /var/www/examock/

# ── health check ─────────────────────────────────────────────────────────
# Deliberately hits 127.0.0.1 and not the nginx domain, because neither
# public path actually tests the API:
#
#   /api/health  -> the route is app.get("/health") at the ROOT (index.js),
#                   not under /api, so nginx proxies this to the backend,
#                   gets the 404 handler, and curl -f fails. Note this is why
#                   the old script reported failure on 100% successful
#                   deploys.
#   /health      -> does not match `location /api/`, so it falls through to
#                   the static root and `try_files $uri /index.html` serves
#                   index.html with HTTP 200. curl -f sees 200 and reports
#                   SUCCESS without the API ever being contacted.
#
# Going straight to the port tests the thing actually deployed: is the pm2
# process up and answering with the right body.
PORT="$(sed -n 's/^PORT=//p' ../examock-backend/.env | head -n1 | tr -d '"[:space:]')"
if [ -z "$PORT" ]; then
  echo "✖ could not read PORT from examock-backend/.env" >&2
  exit 1
fi

# Retry rather than check once: `pm2 startOrReload` returns as soon as the
# process is spawned, but index.js still has to resolve its imports (which
# register the pg-boss workers) before it calls listen(), so the port is
# briefly closed right after every restart.
for attempt in $(seq 1 15); do
  # `|| true` because the body is empty when curl itself fails, and we want to
  # fall through to the retry instead of tripping `set -e`.
  body="$(curl -fsS "http://127.0.0.1:${PORT}/health" 2>/dev/null || true)"

  # Matched with `case` rather than `curl | grep -q`: under `pipefail`, grep
  # exiting early on a match can SIGPIPE curl and flip the pipeline to
  # non-zero, which would read as a failed health check.
  case "$body" in
    *'"success":true'*)
      echo "✔ deployed (API healthy on 127.0.0.1:${PORT})"
      exit 0
      ;;
  esac

  echo "  …waiting for API (${attempt}/15)"
  sleep 1
done

echo "✖ API never became healthy on 127.0.0.1:${PORT}" >&2
echo "  Recent output: pm2 logs examock-api --lines 50 --nostream" >&2
exit 1
ENDSSH
