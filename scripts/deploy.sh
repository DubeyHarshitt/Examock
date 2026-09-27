#!/bin/bash
set -euo pipefail
cd /opt/examock && git pull --ff-only

cd examock-backend
npm ci
npx prisma migrate deploy
npx prisma generate
# `migrate deploy` only compares migrations/ against the _prisma_migrations
# table, so a schema.prisma edited without a generated migration deploys green
# and then fails at runtime. Assert the columns the OTP flow writes to.
node scripts/check-otp-schema.js
pm2 startOrReload ecosystem.config.cjs --update-env

cd ../examock-frontend
npm ci
npm run build
rsync -a --delete dist/ /var/www/examock/

curl -fsS https://examock.initcodes.in/api/health && echo " ✔ deployed"