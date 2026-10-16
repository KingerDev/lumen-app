#!/usr/bin/env bash
# Raw App Store captures from a booted 6.9" simulator running the demo build
# (EXPO_PUBLIC_DEMO=1 npx expo run:ios). Each screen gets a fresh launch, so
# the demo journal is reseeded and nothing from the previous shot is stacked.
#
#   [JS_LOCATION=localhost:8082] scripts/appstore-capture.sh <simulator-udid> <out-dir> [sk en]

set -euo pipefail

UDID="$1"
OUT="$2"
shift 2
if [ $# -gt 0 ]; then LANGS=("$@"); else LANGS=(sk en); fi
APP=com.martinbalaz.lumen
# Metro address, when it does not run on the default 8081
JS_LOCATION="${JS_LOCATION:-localhost:8081}"

SHOTS=(
  "1-journal|"
  "2-entry|/entry/demo-13"
  "3-gallery|/gallery"
  "4-map|/map"
  "5-template|/entry/edit?id=demo-1"
  "6-settings|/settings"
)

xcrun simctl status_bar "$UDID" override \
  --time 9:41 --dataNetwork wifi --wifiBars 3 --cellularMode active --cellularBars 4 \
  --batteryState charged --batteryLevel 100

for lang in "${LANGS[@]}"; do
  locale=$([ "$lang" = sk ] && echo sk_SK || echo en_US)
  mkdir -p "$OUT/$lang"
  for shot in "${SHOTS[@]}"; do
    name="${shot%%|*}"
    route="${shot#*|}"
    xcrun simctl terminate "$UDID" "$APP" >/dev/null 2>&1 || true
    # The demo build opens -demoRoute itself; a deep link would trip iOS's
    # "Open in Lumen?" prompt.
    xcrun simctl launch "$UDID" "$APP" -RCT_jsLocation "$JS_LOCATION" \
      -AppleLanguages "($lang)" -AppleLocale "$locale" -demoRoute "$route" >/dev/null 2>&1
    sleep 10
    # photos come over the network the first time
    sleep 3
    xcrun simctl io "$UDID" screenshot --type=png "$OUT/$lang/$name.png" >/dev/null 2>&1
    echo "captured $lang/$name"
  done
done
