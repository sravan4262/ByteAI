import SwiftUI

// MARK: - TerminalChrome
//
// Shared title-bar chrome for the in-app "terminal" surfaces (chat + support).
// Replaces the legacy red/yellow/green window-control buttons whose tap targets
// were too small on iPhone. The colored dots remain on the leading edge as a
// purely-decorative brand mark; all real actions move to a right-side cluster
// of 32pt monospaced glyph buttons with a faint phosphor-green outline.
//
// Layout (left to right):
//   [• • •]  decorative brand dots (8pt, non-tappable)
//   [TITLE]  centered identity badge (icon + label + version)
//   [▢] [⤢] [◫] [✕]  action cluster (collapse / fullscreen / clear / close)
//
// Conventions:
// - Uses `.byteMono(...)` for glyphs to match the existing terminal aesthetic.
// - Each action button is 32pt square — comfortable thumb target.
// - Icons are plain unicode terminal glyphs for visual consistency with the
//   monospaced output (avoids mixing SF Symbol shapes with the type).
struct TerminalChrome: View {
    let title: String
    let version: String
    let icon: String          // SF Symbol name for the centered identity badge
    @Binding var isMaximized: Bool
    @Binding var isMinimized: Bool
    let onClear: () -> Void
    let onClose: () -> Void

    /// Optional trailing badge (e.g. SUPPORT terminal's READY/INPUT status pill).
    var trailingBadge: AnyView? = nil

    var body: some View {
        ZStack {
            // Layer 1: leading brand dots + trailing action cluster.
            HStack(spacing: 0) {
                brandDots
                Spacer(minLength: 0)
                if let trailingBadge {
                    trailingBadge
                        .padding(.trailing, 8)
                }
                actionCluster
            }
            .padding(.horizontal, 12)

            // Layer 2: centered identity badge.
            identityBadge
        }
        .frame(height: 44)
        .background(Color.byteGreen.opacity(0.03))
        .overlay(alignment: .bottom) {
            Rectangle().fill(Color.byteGreen.opacity(0.15)).frame(height: 1)
        }
    }

    // MARK: Decorative brand mark (non-interactive)

    private var brandDots: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(Color(red: 1, green: 0.37, blue: 0.34).opacity(0.55))
                .frame(width: 8, height: 8)
            Circle()
                .fill(Color(red: 1, green: 0.74, blue: 0.18).opacity(0.55))
                .frame(width: 8, height: 8)
            Circle()
                .fill(Color.byteGreen.opacity(0.55))
                .frame(width: 8, height: 8)
        }
        .accessibilityHidden(true)
    }

    // MARK: Centered identity badge

    private var identityBadge: some View {
        HStack(spacing: 6) {
            ZStack {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.byteGreen.opacity(0.10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 4)
                            .stroke(Color.byteGreen.opacity(0.20), lineWidth: 1)
                    )
                    .frame(width: 16, height: 16)
                Image(systemName: icon)
                    .font(.system(size: 9))
                    .foregroundColor(.byteGreen)
            }
            Text(title)
                .font(.byteMono(11, weight: .semibold))
                .foregroundColor(.byteText1)
                .tracking(0.6)
            Text(version)
                .font(.byteMono(11))
                .foregroundColor(.byteText3)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(title) terminal \(version)")
    }

    // MARK: Action cluster (right side, 32pt tap targets)

    private var actionCluster: some View {
        HStack(spacing: 6) {
            chromeButton(
                glyph: "▢",
                label: "Collapse",
                action: {
                    Haptics.light()
                    withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                        isMinimized = true
                    }
                }
            )
            chromeButton(
                glyph: isMaximized ? "⤡" : "⤢",
                label: isMaximized ? "Exit fullscreen" : "Enter fullscreen",
                action: {
                    Haptics.light()
                    withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                        isMaximized.toggle()
                    }
                }
            )
            chromeButton(
                glyph: "◫",
                label: "Clear terminal",
                action: {
                    Haptics.light()
                    onClear()
                }
            )
            chromeButton(
                glyph: "✕",
                label: "Close terminal",
                tint: Color(red: 1, green: 0.37, blue: 0.34),
                action: {
                    Haptics.light()
                    onClose()
                }
            )
        }
    }

    @ViewBuilder
    private func chromeButton(
        glyph: String,
        label: String,
        tint: Color = .byteGreen,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(glyph)
                .font(.byteMono(13, weight: .semibold))
                .foregroundColor(tint)
                .frame(width: 32, height: 32)
                .background(tint.opacity(0.06))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(tint.opacity(0.30), lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }
}
