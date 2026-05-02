#!/usr/bin/env python3
"""
Strip the alpha channel from a PNG, compositing onto a solid background.

Pure stdlib (no Pillow/ImageMagick required) — needed because Apple rejects
RGBA App Store icons (ITMS-90717) even when every pixel is fully opaque.
sips on macOS does not reliably strip the alpha channel from PNGs, so this
re-encodes the file as a true 8-bit RGB PNG.

Usage:  python3 strip-png-alpha.py <input.png> [<output.png>] [--bg RRGGBB]
        If <output.png> is omitted, overwrites the input.
        Default background is #0e0b30 (ByteAI navy — matches byteai-icon-appstore.svg).
"""
from __future__ import annotations
import argparse, struct, sys, zlib


def strip_alpha(src: str, dst: str, bg: tuple[int, int, int]) -> None:
    with open(src, "rb") as f:
        data = f.read()

    sig = b"\x89PNG\r\n\x1a\n"
    if not data.startswith(sig):
        raise SystemExit(f"{src}: not a PNG")

    # Walk chunks
    pos = 8
    chunks = []
    while pos < len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        ctype = data[pos + 4:pos + 8]
        cdata = data[pos + 8:pos + 8 + length]
        chunks.append((ctype, cdata))
        pos += 12 + length

    ihdr = next(c for t, c in chunks if t == b"IHDR")
    w, h, depth, color, _, _, _ = struct.unpack(">IIBBBBB", ihdr)
    if depth != 8:
        raise SystemExit(f"{src}: expected 8-bit, got {depth}-bit")
    if color == 2:
        # Already RGB — just copy through
        if src != dst:
            with open(dst, "wb") as f:
                f.write(data)
        return
    if color != 6:
        raise SystemExit(
            f"{src}: expected RGBA (color type 6), got color type {color}. "
            "Convert to RGBA first or extend this script."
        )

    raw = zlib.decompress(b"".join(c for t, c in chunks if t == b"IDAT"))

    stride_in = 4 * w + 1
    out = bytearray()
    prev = bytearray(4 * w)

    for y in range(h):
        line = raw[y * stride_in:(y + 1) * stride_in]
        ftype = line[0]
        row = bytearray(line[1:])

        # Undo PNG filter so we have raw RGBA bytes
        if ftype == 1:  # Sub
            for x in range(4, 4 * w):
                row[x] = (row[x] + row[x - 4]) & 0xff
        elif ftype == 2:  # Up
            for x in range(4 * w):
                row[x] = (row[x] + prev[x]) & 0xff
        elif ftype == 3:  # Average
            for x in range(4 * w):
                left = row[x - 4] if x >= 4 else 0
                row[x] = (row[x] + (left + prev[x]) // 2) & 0xff
        elif ftype == 4:  # Paeth
            for x in range(4 * w):
                a = row[x - 4] if x >= 4 else 0
                b = prev[x]
                c = prev[x - 4] if x >= 4 else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pred = a if pa <= pb and pa <= pc else (b if pb <= pc else c)
                row[x] = (row[x] + pred) & 0xff

        prev = bytes(row)

        # Composite onto opaque bg, drop alpha
        out.append(0)  # output filter = None (simpler, slightly larger)
        for x in range(w):
            r, g, b, a = row[4 * x], row[4 * x + 1], row[4 * x + 2], row[4 * x + 3]
            af = a / 255.0
            out.append(int(r * af + bg[0] * (1 - af) + 0.5))
            out.append(int(g * af + bg[1] * (1 - af) + 0.5))
            out.append(int(b * af + bg[2] * (1 - af) + 0.5))

    new_ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)  # color type 2 = RGB

    def chunk(t: bytes, d: bytes) -> bytes:
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d))

    with open(dst, "wb") as f:
        f.write(sig)
        f.write(chunk(b"IHDR", new_ihdr))
        f.write(chunk(b"IDAT", zlib.compress(bytes(out), 9)))
        f.write(chunk(b"IEND", b""))


def parse_bg(s: str) -> tuple[int, int, int]:
    s = s.lstrip("#")
    if len(s) != 6:
        raise argparse.ArgumentTypeError("--bg must be 6 hex digits, e.g. 0e0b30")
    return int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src")
    ap.add_argument("dst", nargs="?")
    ap.add_argument("--bg", type=parse_bg, default=(0x0e, 0x0b, 0x30),
                    help="Background hex color to composite onto (default: 0e0b30 — ByteAI navy)")
    args = ap.parse_args()
    dst = args.dst or args.src
    strip_alpha(args.src, dst, args.bg)
    print(f"✓ {dst} — RGB, no alpha channel")
    return 0


if __name__ == "__main__":
    sys.exit(main())
