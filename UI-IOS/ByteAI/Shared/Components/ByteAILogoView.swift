import SwiftUI

// Mirrors UI/components/layout/byteai-logo.tsx — gradient box with shimmer sweep,
// radial glow orb, and cyan </> glyph. The animated shimmer + outer glow are what
// make the brand mark feel "alive"; the static ByteAILogoMark in FloatingHeaderCard
// was a flat substitute.

enum ByteAILogoSize {
    case sm, md, lg

    var box: CGFloat {
        switch self {
        case .sm: return 32
        case .md: return 38
        case .lg: return 56
        }
    }

    var corner: CGFloat {
        switch self {
        case .sm: return 12
        case .md: return 12
        case .lg: return 16
        }
    }

    var glyph: CGFloat {
        switch self {
        case .sm: return 11
        case .md: return 13
        case .lg: return 18
        }
    }

    var label: CGFloat {
        switch self {
        case .sm: return 11
        case .md: return 14
        case .lg: return 18
        }
    }
}

struct ByteAILogoView: View {
    var size: ByteAILogoSize = .sm
    var showText: Bool = true

    private let outerGlow = Color(hex: "#3b82f6")

    var body: some View {
        HStack(spacing: 8) {
            ZStack {
                // Base gradient — matches the web from-#0a1530 to-#152060 fill.
                RoundedRectangle(cornerRadius: size.corner)
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: "#0a1530"), Color(hex: "#152060")],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )

                // Inner radial glow orb at 30% / 30% — same as web's
                // bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.18),transparent_70%)].
                RadialGradient(
                    colors: [outerGlow.opacity(0.18), .clear],
                    center: UnitPoint(x: 0.3, y: 0.3),
                    startRadius: 0,
                    endRadius: size.box * 0.7
                )

                // Animated shimmer sweep — diagonal white highlight cycling across the box.
                ShimmerSweep()
                    .clipShape(RoundedRectangle(cornerRadius: size.corner))
                    .blendMode(.plusLighter)

                // </> glyph — cyan with breathing halo. The shadow alpha pulses on a
                // ~2.6s cycle so the glyph feels alive without being distracting.
                AnimatedGlyph(size: size.glyph)
            }
            .frame(width: size.box, height: size.box)
            // Outer border + glow stack: subtle border, then a soft 24pt blue halo,
            // then a wider 48pt halo for depth. Matches the web shadow chain.
            .overlay(
                RoundedRectangle(cornerRadius: size.corner)
                    .stroke(Color.byteBorderHigh, lineWidth: 1)
            )
            .overlay(
                RoundedRectangle(cornerRadius: size.corner)
                    .stroke(Color.white.opacity(0.07), lineWidth: 0.5)
                    .padding(0.5)
            )
            .shadow(color: outerGlow.opacity(0.22), radius: 12)
            .shadow(color: outerGlow.opacity(0.08), radius: 24)

            if showText {
                Text("BYTEAI")
                    .font(.system(size: size.label, weight: .bold, design: .monospaced))
                    .tracking(2.0)
                    .foregroundColor(.byteText1)
            }
        }
    }
}

// Cyan </> glyph with a breathing cyan halo. Driven by TimelineView so the
// pulse keeps phase across view rebuilds.
private struct AnimatedGlyph: View {
    let size: CGFloat

    var body: some View {
        TimelineView(.animation) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            // 2.6s sine — alpha drifts 0.55 → 1.0, scale drifts 0.985 → 1.015.
            let phase = sin(t * .pi / 1.3) * 0.5 + 0.5  // 0…1
            let glowAlpha = 0.55 + 0.45 * phase
            let scale = 0.985 + 0.030 * phase

            Text("</>")
                .font(.system(size: size, weight: .bold, design: .monospaced))
                .foregroundColor(.byteCyan)
                .shadow(color: .byteCyan.opacity(glowAlpha), radius: 6)
                .shadow(color: .byteCyan.opacity(glowAlpha * 0.6), radius: 14)
                .scaleEffect(scale)
        }
    }
}

// Diagonal highlight that sweeps across the brand mark on a 2.4s loop. Built
// with TimelineView so the animation is owned by the render tree and survives
// view rebuilds without restarting.
private struct ShimmerSweep: View {
    var body: some View {
        TimelineView(.animation) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            let phase = (t.truncatingRemainder(dividingBy: 2.4)) / 2.4
            // Drift the gradient from -1.0 (off-screen left) to +2.0 (off-screen
            // right) so the highlight passes fully across with a brief rest before
            // looping. The eased sin curve makes the sweep accelerate and decel.
            let x = -1.0 + 3.0 * phase
            GeometryReader { geo in
                LinearGradient(
                    colors: [
                        .clear,
                        Color.white.opacity(0.16),
                        .clear
                    ],
                    startPoint: UnitPoint(x: x - 0.25, y: 0),
                    endPoint: UnitPoint(x: x + 0.25, y: 1)
                )
                .frame(width: geo.size.width, height: geo.size.height)
            }
        }
    }
}

#Preview {
    ZStack {
        Color.byteBackground.ignoresSafeArea()
        VStack(spacing: 24) {
            ByteAILogoView(size: .sm)
            ByteAILogoView(size: .md)
            ByteAILogoView(size: .lg, showText: false)
        }
    }
}
