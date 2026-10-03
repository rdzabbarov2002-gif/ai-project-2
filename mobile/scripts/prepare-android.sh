#!/usr/bin/env bash
# Generates the Android project (android/, not kept in git) and puts the
# app's own icons, launch screens and version into it.
#
#   SITE_URL           the site the app opens (default: capacitor.config.json)
#   APP_VERSION_CODE   whole number that grows with every build (default 1)
set -euo pipefail
cd "$(dirname "$0")/.."

DEFAULT_URL=$(node -p 'require("./capacitor.config.json").server.url')
if [ -n "${SITE_URL:-}" ] && [ "$SITE_URL" != "$DEFAULT_URL" ]; then
  case "$SITE_URL" in https://*) ;; *) echo "SITE_URL must start with https://" >&2; exit 1 ;; esac
  for f in capacitor.config.json www/index.html www/offline.html; do
    sed -i "s#${DEFAULT_URL}#${SITE_URL%/}#g" "$f"
  done
fi

[ -d android ] || npx cap add android
cp -R resources/android/res/. android/app/src/main/res/

CODE=${APP_VERSION_CODE:-1}
sed -i -E "s/versionCode [0-9]+/versionCode ${CODE}/; s/versionName \"[^\"]*\"/versionName \"1.0.${CODE}\"/" android/app/build.gradle

npx cap sync android
echo "Android project ready: opens $(node -p 'require("./capacitor.config.json").server.url'), version 1.0.${CODE}"
