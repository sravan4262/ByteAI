#!/usr/bin/env bash
# Rasterize the ByteAI master SVGs into staging folders for iOS + web.
#
# Sources (this folder):
#   byteai-icon-master.svg     — RICH ROUNDED. Use for web favicon / OS app shelves
#                                where the rounded corners are part of the visual.
#                                Has transparent corners — looks correct when the
#                                surface is dark or app-shelf, but a transparent
#                                PNG on a white preview background will *show
#                                white in the corners*. Use this only where you
#                                actually want rounded.
#   byteai-icon-appstore.svg   — RICH SQUARE, fully opaque, no transparency.
#                                Use everywhere you don't want any white
#                                bleed-through: iOS App Store icon, marketing
#                                PNGs, Open Graph cards, Slack/Discord avatars.
#   launch-logo-glyph.svg      — cyan </> glyph only, transparent. Used for
#                                the iOS launch screen image (composited over
#                                the LaunchBackground color asset).
#
# Outputs (this folder):
#   ios/   — drop-in assets for the iOS app
#   web/   — drop-in assets for the Next.js public/ folder
#
# Nothing is auto-copied into UI/public/ or the Xcode asset catalog. Stage
# everything here, then move the files into the project when you're ready.
#
# Tooling: prefers `rsvg-convert` (best fidelity for SVG filters / grain).
# Falls back to `qlmanage` (built into macOS) if rsvg isn't installed.
#
# Usage:  bash assets/branding/build-icons.sh
# Install for best output:  brew install librsvg

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
MASTER="$ROOT/byteai-icon-master.svg"
SQUARE="$ROOT/byteai-icon-appstore.svg"     # fully opaque square (no white)
GLYPH="$ROOT/launch-logo-glyph.svg"
IOS_OUT="$ROOT/ios"
WEB_OUT="$ROOT/web"

mkdir -p "$IOS_OUT" "$WEB_OUT"

# Pick a rasterizer.
RASTERIZER=""
if command -v rsvg-convert >/dev/null 2>&1; then
  RASTERIZER="rsvg"
elif command -v qlmanage >/dev/null 2>&1; then
  RASTERIZER="qlmanage"
  echo "⚠️  rsvg-convert not found — falling back to qlmanage."
  echo "   Install for full filter quality:  brew install librsvg"
else
  echo "❌ Neither rsvg-convert nor qlmanage found. Install librsvg:  brew install librsvg" >&2
  exit 1
fi

render() {
  local src="$1" out="$2" size="$3"
  case "$RASTERIZER" in
    rsvg)
      rsvg-convert -w "$size" -h "$size" "$src" -o "$out"
      ;;
    qlmanage)
      local tmp; tmp="$(mktemp -d)"
      qlmanage -t -s "$size" -o "$tmp" "$src" >/dev/null 2>&1
      mv "$tmp"/*.png "$out"
      rm -rf "$tmp"
      ;;
  esac
  echo "✓ $(basename "$out")  (${size}×${size})"
}

# Strip the alpha channel from a PNG, producing a flat RGB image.
# Required for the App Store icon: Apple rejects RGBA PNGs (ITMS-90717),
# even when every pixel is opaque. rsvg-convert and qlmanage always emit
# RGBA, and macOS sips can't strip the alpha channel from PNGs cleanly,
# so we delegate to a stdlib-only Python helper.
strip_alpha() {
  local file="$1"
  python3 "$ROOT/strip-png-alpha.py" "$file" --bg 0e0b30
  if file "$file" | grep -q "RGBA"; then
    echo "⚠️  $(basename "$file") still reports RGBA — bailing." >&2
    return 1
  fi
}

echo "▶ Rasterizing icons (using $RASTERIZER)…"
echo ""
echo "── iOS (assets/branding/ios/) ──────────────────────────────────"

# AppIcon — fully opaque square, no rounded corners (system applies mask).
# Drop into UI-IOS/ByteAI/Resources/Assets.xcassets/AppIcon.appiconset/ByteAI-Logo.png
# Apple rejects RGBA App Store icons (ITMS-90717), so strip the alpha channel
# after rasterization — even fully-opaque RGBA PNGs are rejected.
render "$SQUARE" "$IOS_OUT/AppIcon-1024.png" 1024
strip_alpha "$IOS_OUT/AppIcon-1024.png"

# Launch screen glyph — transparent cyan </>, sits over LaunchBackground color.
# Drop into UI-IOS/ByteAI/Resources/Assets.xcassets/LaunchLogo.imageset/
render "$GLYPH" "$IOS_OUT/LaunchLogo.png"     280
render "$GLYPH" "$IOS_OUT/LaunchLogo@2x.png"  560
render "$GLYPH" "$IOS_OUT/LaunchLogo@3x.png"  840

echo ""
echo "── Web (assets/branding/web/) ──────────────────────────────────"

# SVG source for the favicon — copy of the rounded master.
cp "$MASTER" "$WEB_OUT/icon.svg"
echo "✓ icon.svg"

# Rounded variants for browser tabs + PWA — transparent corners are correct
# in these contexts (browsers render the favicon on tab background, PWA OS
# applies its own mask).
render "$MASTER" "$WEB_OUT/icon-32.png"     32
render "$MASTER" "$WEB_OUT/icon-64.png"     64
render "$MASTER" "$WEB_OUT/icon-192.png"   192
render "$MASTER" "$WEB_OUT/icon-512.png"   512
render "$MASTER" "$WEB_OUT/apple-icon.png" 180

# Square (fully opaque, no white bleed-through). Use this anywhere you'd
# previously have used a generic "byteai.png" — Open Graph, social cards,
# Slack/Discord workspace icons, GitHub social preview, marketing pages.
render "$SQUARE" "$WEB_OUT/byteai-square-1024.png" 1024
render "$SQUARE" "$WEB_OUT/byteai-square-2048.png" 2048

echo ""
echo "✅ Done. Stage outputs in:"
echo "   $IOS_OUT/"
echo "   $WEB_OUT/"
echo ""
echo "When you're ready to ship, copy these into:"
echo "   ios/AppIcon-1024.png       → UI-IOS/ByteAI/Resources/Assets.xcassets/AppIcon.appiconset/ByteAI-Logo.png"
echo "   ios/LaunchLogo*.png        → UI-IOS/ByteAI/Resources/Assets.xcassets/LaunchLogo.imageset/"
echo "   web/icon.svg + icon-*.png  → UI/public/"
echo "   web/byteai-square-*.png    → use anywhere you'd want 'byteai.png' (no white bg)"
