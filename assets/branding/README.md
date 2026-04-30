# ByteAI Branding

Single staging area for all icon assets. Source SVGs at the root, rasterized
PNGs sorted into `ios/` and `web/` subfolders. Nothing here gets auto-copied
into project source — you stage here, then move into the project when ready.

## Folder layout

```
assets/branding/
├── byteai-icon-master.svg     ← rounded, transparent corners (web favicon)
├── byteai-icon-appstore.svg   ← square, fully opaque (iOS app icon, "byteai.png")
├── launch-logo-glyph.svg      ← cyan </> glyph only, transparent (iOS launch)
├── build-icons.sh             ← rasterize → ios/ + web/
├── README.md
├── ios/                       ← drop into UI-IOS asset catalog
│   ├── AppIcon-1024.png       (1024×1024 — square, opaque, no corners)
│   ├── LaunchLogo.png         (280×280)
│   ├── LaunchLogo@2x.png      (560×560)
│   └── LaunchLogo@3x.png      (840×840)
└── web/                       ← drop into UI/public/
    ├── icon.svg               (rounded master — browser favicon SVG)
    ├── icon-32.png  / 64 / 192 / 512  (PWA + favicons, rounded)
    ├── apple-icon.png         (180×180 — iOS Safari home-screen)
    ├── byteai-square-1024.png ← use this as "byteai.png" — no white bleed
    └── byteai-square-2048.png (high-res marketing / OG / social cards)
```

## Why two source SVGs?

| | `byteai-icon-master.svg` (rounded) | `byteai-icon-appstore.svg` (square) |
|---|---|---|
| Shape | Rounded corners (184px radius) | Full square, no corners |
| Outside corners | Transparent | Filled (navy `#0e0b30`) |
| Outer aura/halo | Yes | No (Apple guideline 1.4) |
| Use cases | Web favicon, PWA, browser tab, OS app shelves | App Store icon, marketing PNGs, Open Graph, social avatars, anywhere you previously used `byteai.png` |
| White bleed-through risk | Yes — transparent corners show as white when previewed on white surfaces (Finder, GitHub, image viewers) | **No** — fully opaque, displays correctly on any background |

**Rule of thumb:** if the rendered PNG will sit on a generic preview/file/social
surface where the system might paint white behind it, use the **square** version.
The rounded version is for cases where the surrounding chrome cooperates
(browsers, OS app shelves).

## How to update the icon

1. Edit `byteai-icon-master.svg` (and/or `byteai-icon-appstore.svg`). They
   share the same gradient/glyph code — keep them visually consistent.
2. Install rsvg-convert if you haven't (one-time):
   ```bash
   brew install librsvg
   ```
3. Run the build:
   ```bash
   bash assets/branding/build-icons.sh
   ```
4. Move staged PNGs into the project:
   ```
   ios/AppIcon-1024.png       → UI-IOS/ByteAI/Resources/Assets.xcassets/AppIcon.appiconset/ByteAI-Logo.png
   ios/LaunchLogo*.png        → UI-IOS/ByteAI/Resources/Assets.xcassets/LaunchLogo.imageset/
   web/icon.svg + icon-*.png  → UI/public/
   web/byteai-square-*.png    → wherever you reference "byteai.png"
   ```
5. App Store Connect upload: `web/byteai-square-1024.png` (or `ios/AppIcon-1024.png` — they're identical).

## Rasterizer fallback

The build script prefers `rsvg-convert` (full SVG filter support — grain,
glow, drop shadow render correctly). It falls back to macOS's built-in
`qlmanage`, which doesn't render SVG filter effects faithfully — basic shapes
work, the rich texture is muted. Install `librsvg` for production-quality output.

## iOS launch screen wiring

The launch screen is configured in `Info.plist`:
```xml
<key>UILaunchScreen</key>
<dict>
    <key>UIColorName</key>
    <string>LaunchBackground</string>
    <key>UIImageName</key>
    <string>LaunchLogo</string>
    <key>UIImageRespectsSafeAreaInsets</key>
    <true/>
</dict>
```

Background color asset (`LaunchBackground` = `#0E0B30`) and image set
(`LaunchLogo`) live in `UI-IOS/ByteAI/Resources/Assets.xcassets/`. To
update the launch glyph: edit `launch-logo-glyph.svg`, run `build-icons.sh`,
copy `ios/LaunchLogo*.png` into the imageset folder.

## Color tokens

| Color | Hex | Used for |
|---|---|---|
| Cyan accent | `#22d3ee` | Glyph fill (matches `--cyan` / `byteCyan`) |
| Cyan top sheen | `#a8f0ff` | Top stop of glyph gradient |
| Cyan glow | `#22d3ee @ 0.85` | Glyph halo |
| Bg highlight | `#5b4eaa` | Top-left mesh-gradient corner |
| Bg body | `#1f1850 → #0e0b30` | Center radial gradient |
| Bg shadow | `#06061a` | Bottom-right corner darkening |
| Magenta ghost | `#f43f5e` | Chromatic aberration (left offset) |
| Blue ghost | `#3b82f6` | Chromatic aberration (right offset) |
| `LaunchBackground` | `#0E0B30` | Launch screen color asset |

## Design — what each layer does

In render order:

1. **Mesh-gradient bg.** Three radial gradients composited (warm purple top-left
   highlight + deep navy center + near-black bottom-right shadow).
2. **Top inner-rim highlight** (rounded variant only). 3px stroke, white→
   transparent gradient. Sells "glass" depth.
3. **Glyph drop shadow.** 6px-down blurred shadow under the `</>` for floating depth.
4. **Chromatic aberration.** Magenta copy 3px left, blue copy 3px right at 55% opacity.
5. **Cyan outer glow.** Gaussian-blurred cyan halo merged with source.
6. **Top sheen on glyph.** Subtle white→transparent linear at 35% opacity.
7. **Grain.** SVG `feTurbulence` at 6% opacity over the whole canvas.
