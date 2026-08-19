#!/usr/bin/env bash
# Build LAORS iOS app and upload to App Store Connect (TestFlight).
set -euo pipefail
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS="$ROOT/ios/App"
ARCHIVE="$ROOT/ios/build/LAORS.xcarchive"
EXPORT_DIR="$ROOT/ios/build/export"
TEAM_ID="N6Z7ZA35T8"

cd "$ROOT"
npm run cap:sync

mkdir -p "$ROOT/ios/build"

echo "→ Archiving (App Store distribution)…"
xcodebuild \
  -workspace "$IOS/App.xcworkspace" \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  archive \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  -allowProvisioningUpdates \
  CODE_SIGN_STYLE=Automatic

echo "→ Exporting & uploading to App Store Connect…"
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$ROOT/ios/ExportOptions.plist" \
  -allowProvisioningUpdates

echo "✓ Done. Check App Store Connect → TestFlight in ~10–20 minutes."
