#!/bin/sh
set -eu

REPOSITORY="${OCTOPUS_REPOSITORY:-SORALNV/Octopus-SI-OS}"
VERSION="${OCTOPUS_VERSION:-0.1.0}"
RELEASE_TAG="${OCTOPUS_RELEASE_TAG:-ja-v0.1.0-preview.1}"
INSTALL_DIR="${OCTOPUS_APPLICATIONS_DIR:-}"

fail() {
  printf '%s\n' "$*" >&2
  exit 1
}

[ "$(uname -s)" = "Darwin" ] || fail "Octopus is released for macOS only."
case "$(uname -m)" in
  arm64) ARCH="arm64" ;;
  x86_64)
    if [ "$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)" = "1" ]; then ARCH="arm64"; else ARCH="x64"; fi
    ;;
  *) fail "Unsupported Mac architecture: $(uname -m)" ;;
esac
MACOS_VERSION="$(sw_vers -productVersion)"
[ "${MACOS_VERSION%%.*}" -ge 14 ] || fail "Octopus needs macOS 14 or later; this Mac runs macOS $MACOS_VERSION."
xcode-select -p >/dev/null 2>&1 || fail "Octopus needs the Command Line Tools for Xcode, which provide python3 and git.
Install them with:  xcode-select --install
Then run this installer again."

printf '%s\n' "$REPOSITORY" | grep -Eq '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' || fail "Invalid GitHub repository: $REPOSITORY"
VERSION="${VERSION#v}"
case "$VERSION" in
  ''|*[!0-9.]*) fail "Invalid Octopus release version: $VERSION" ;;
esac

printf '%s\n' "$RELEASE_TAG" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9._-]*$' || fail "Invalid release tag: $RELEASE_TAG"
ASSET="Octopus-$VERSION-macos-$ARCH.dmg"
BASE_URL="${OCTOPUS_RELEASE_BASE_URL:-https://github.com/$REPOSITORY/releases/download/$RELEASE_TAG}"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/octopus-install.XXXXXX")"
MOUNT_DIR="$TEMP_DIR/volume"
MOUNTED=""
STAGE_APP=""
cleanup() {
  if [ -n "$MOUNTED" ]; then hdiutil detach -quiet "$MOUNT_DIR" || hdiutil detach -quiet -force "$MOUNT_DIR" || true; fi
  if [ -n "$STAGE_APP" ] && [ -e "$STAGE_APP" ]; then rm -rf "$STAGE_APP"; fi
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT
trap 'exit 1' HUP INT TERM

curl -fsSL --retry 3 --connect-timeout 15 --max-time 60 "$BASE_URL/checksums.txt" -o "$TEMP_DIR/checksums.txt" \
  || fail "Could not download the checksums of Octopus $VERSION."
EXPECTED="$(awk -v asset="$ASSET" '$2 == asset { print $1 }' "$TEMP_DIR/checksums.txt")"
[ -n "$EXPECTED" ] || fail "Release $RELEASE_TAG has no $ASSET. See https://github.com/$REPOSITORY/releases/tag/$RELEASE_TAG"
printf 'Downloading %s\n' "$ASSET"
curl -fL --retry 3 --connect-timeout 15 --max-time 3600 "$BASE_URL/$ASSET" -o "$TEMP_DIR/$ASSET" \
  || fail "Could not download $ASSET."
ACTUAL="$(shasum -a 256 "$TEMP_DIR/$ASSET" | awk '{ print $1 }')"
[ "$ACTUAL" = "$EXPECTED" ] || fail "SHA-256 verification failed for $ASSET."

mkdir "$MOUNT_DIR"
hdiutil attach -quiet -nobrowse -readonly -noautoopen -mountpoint "$MOUNT_DIR" "$TEMP_DIR/$ASSET"
MOUNTED="yes"
SOURCE_APP="$MOUNT_DIR/Octopus.app"
[ -x "$SOURCE_APP/Contents/MacOS/Octopus" ] || fail "The disk image does not contain Octopus.app."

if [ -z "$INSTALL_DIR" ]; then
  INSTALL_DIR="/Applications"
  if [ ! -w "$INSTALL_DIR" ]; then
    INSTALL_DIR="$HOME/Applications"
    mkdir -p "$INSTALL_DIR"
  fi
fi
[ -d "$INSTALL_DIR" ] && [ -w "$INSTALL_DIR" ] || fail "Cannot write to $INSTALL_DIR."
TARGET_APP="$INSTALL_DIR/Octopus.app"
if pgrep -f "$TARGET_APP/Contents/" >/dev/null 2>&1; then
  fail "Quit Octopus and stop its runtime before updating it."
fi

STAGE_APP="$INSTALL_DIR/.Octopus.app.installing.$$"
printf 'Copying Octopus.app to %s\n' "$INSTALL_DIR"
ditto "$SOURCE_APP" "$STAGE_APP"
codesign --verify --deep --strict "$STAGE_APP" || fail "The copied app failed code signature verification."
APP_VERSION="$(plutil -extract CFBundleShortVersionString raw -o - "$STAGE_APP/Contents/Info.plist")"
APP_ID="$(plutil -extract CFBundleIdentifier raw -o - "$STAGE_APP/Contents/Info.plist")"
[ "$APP_VERSION" = "$VERSION" ] && [ "$APP_ID" = "com.octopus.desktop" ] || fail "Unexpected Octopus bundle identity or version."
printf '%s\n' "This Japanese preview is ad-hoc signed, not notarized. Removing quarantine from the verified app copy only."
if xattr "$STAGE_APP" | grep -qx com.apple.quarantine; then
  xattr -dr com.apple.quarantine "$STAGE_APP" || fail "Could not remove app quarantine."
fi
codesign --verify --deep --strict "$STAGE_APP" || fail "The app failed verification after preparing the copy."
if [ -e "$TARGET_APP" ]; then
  PREVIOUS_APP="$INSTALL_DIR/Octopus.previous.$(date +%Y%m%d-%H%M%S).$$.app"
  mv "$TARGET_APP" "$PREVIOUS_APP"
  if ! mv "$STAGE_APP" "$TARGET_APP"; then
    mv "$PREVIOUS_APP" "$TARGET_APP"
    fail "Could not replace $TARGET_APP; the previous version was kept."
  fi
  printf 'Previous app kept at %s\n' "$PREVIOUS_APP"
else
  mv "$STAGE_APP" "$TARGET_APP"
fi
STAGE_APP=""

printf 'Installed Octopus %s at %s\n' "$VERSION" "$TARGET_APP"
printf 'Open it from Applications, or run: open "%s"\n' "$TARGET_APP"
