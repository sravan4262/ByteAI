import SwiftUI

// Apple does not allow animated launch screens — the static UILaunchScreen
// (logo on navy) shows for the OS-controlled cold-start window. The instant
// our SwiftUI lifecycle takes over, we show this view at the same scale and
// position, then animate (scale pulse, glow breath, shimmer sweep) before
// fading into RootView. To the user it looks like the launch animated.

struct LaunchSplashView: View {
    @State private var didAppear = false
    @State private var showShimmer = false

    private let glyphCyan        = Color(hex: "#22d3ee")
    private let glyphCyanBright  = Color(hex: "#a8f0ff")
    private let bgNavy           = Color(hex: "#0e0b30")
    private let bgPurple         = Color(hex: "#1f1850")
    private let bgHighlight      = Color(hex: "#5b4eaa")
    private let blueHalo         = Color(hex: "#3b82f6")

    var body: some View {
        ZStack {
            // Full-screen navy that matches LaunchBackground.colorset so there's
            // no seam between the static launch image and this view.
            bgNavy.ignoresSafeArea()

            // Soft purple bloom drifting in the background. Subtle — keeps the
            // brand language without competing with the logo.
            BackgroundBloom(highlight: bgHighlight, navy: bgNavy)
                .ignoresSafeArea()
                .opacity(didAppear ? 0.9 : 0.0)
                .animation(.easeOut(duration: 0.9), value: didAppear)

            // The launch logo — same rounded square as the static LaunchLogo
            // PNG, redrawn in SwiftUI so we can animate it.
            ZStack {
                RoundedRectangle(cornerRadius: 44, style: .continuous)
                    .fill(
                        RadialGradient(
                            colors: [bgPurple, bgNavy],
                            center: .center,
                            startRadius: 0,
                            endRadius: 160
                        )
                    )

                RadialGradient(
                    colors: [bgHighlight.opacity(0.55), .clear],
                    center: UnitPoint(x: 0.30, y: 0.20),
                    startRadius: 0,
                    endRadius: 160
                )
                .clipShape(RoundedRectangle(cornerRadius: 44, style: .continuous))

                // Glyph + breathing glow
                BreathingGlyph(cyan: glyphCyan, bright: glyphCyanBright)

                // Shimmer sweep — runs once after the entrance, then loops slowly.
                if showShimmer {
                    ShimmerStripe(cornerRadius: 44)
                }
            }
            .frame(width: 200, height: 200)
            .overlay(
                RoundedRectangle(cornerRadius: 44, style: .continuous)
                    .stroke(Color.white.opacity(0.12), lineWidth: 1)
            )
            .shadow(color: blueHalo.opacity(0.45), radius: 32)
            .shadow(color: blueHalo.opacity(0.20), radius: 64)
            .scaleEffect(didAppear ? 1.0 : 0.86)
            .opacity(didAppear ? 1.0 : 0.0)
            .animation(.spring(response: 0.7, dampingFraction: 0.72), value: didAppear)
        }
        .onAppear {
            didAppear = true
            // Stagger the shimmer so it kicks in after the entrance settles.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { showShimmer = true }
        }
    }
}

// MARK: - Background bloom

private struct BackgroundBloom: View {
    let highlight: Color
    let navy: Color

    var body: some View {
        TimelineView(.animation) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            let drift = sin(t * .pi / 4.0) * 0.15  // very slow lateral drift
            ZStack {
                RadialGradient(
                    colors: [highlight.opacity(0.35), .clear],
                    center: UnitPoint(x: 0.35 + drift, y: 0.30),
                    startRadius: 0,
                    endRadius: 420
                )
                RadialGradient(
                    colors: [Color(hex: "#3b82f6").opacity(0.18), .clear],
                    center: UnitPoint(x: 0.65 - drift, y: 0.75),
                    startRadius: 0,
                    endRadius: 380
                )
            }
        }
    }
}

// MARK: - Breathing glyph

private struct BreathingGlyph: View {
    let cyan: Color
    let bright: Color

    var body: some View {
        TimelineView(.animation) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            let phase = sin(t * .pi / 1.1) * 0.5 + 0.5
            let glow  = 0.55 + 0.45 * phase
            let scale = 0.96 + 0.04 * phase

            Text("</>")
                .font(.system(size: 88, weight: .bold, design: .monospaced))
                .foregroundStyle(
                    LinearGradient(
                        colors: [bright, cyan],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .shadow(color: cyan.opacity(glow * 0.95), radius: 14)
                .shadow(color: cyan.opacity(glow * 0.55), radius: 32)
                .scaleEffect(scale)
        }
    }
}

// MARK: - Shimmer stripe

private struct ShimmerStripe: View {
    let cornerRadius: CGFloat

    var body: some View {
        TimelineView(.animation) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            // 2.6s loop — single highlight passes diagonally across the tile.
            let phase = (t.truncatingRemainder(dividingBy: 2.6)) / 2.6
            let x = -1.0 + 3.0 * phase
            GeometryReader { geo in
                LinearGradient(
                    colors: [
                        .clear,
                        Color.white.opacity(0.18),
                        .clear
                    ],
                    startPoint: UnitPoint(x: x - 0.25, y: 0),
                    endPoint: UnitPoint(x: x + 0.25, y: 1)
                )
                .frame(width: geo.size.width, height: geo.size.height)
            }
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .blendMode(.plusLighter)
        }
    }
}

#Preview {
    LaunchSplashView()
}
