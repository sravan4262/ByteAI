import SwiftUI

// MARK: - ByteScrollbar
// Terminal-aesthetic custom scroll indicator: a thin phosphor-green vertical
// "scanline" docked to the trailing edge of a ScrollView. Height is
// proportional to the viewport/content ratio; vertical position tracks the
// scroll offset. Auto-fades out `fadeDelay` seconds after the last scroll
// event. An optional position pill (e.g. "POSITION 47%") can be rendered in
// the top-right corner for long feeds.
//
// The default iOS indicator is intentionally left hidden by callers
// (`.scrollIndicators(.hidden)` / `showsIndicators: false`) — this overlay is
// the replacement, not an addition.
//
// Wiring contract (see `byteScrollbar` extension at the bottom):
//   1. Apply `.byteScrollbar()` to the ScrollView.
//   2. Add `.coordinateSpace(name: "byteScroll")` to the same ScrollView
//      (or pass a custom name through both APIs).
//   3. Insert `ByteScrollOffsetReader(coordinateSpace: "byteScroll")` as the
//      first child of the ScrollView's content (zero-height; emits offset
//      via PreferenceKey).
//   4. Wrap the inner content in a `GeometryReader`-driven container that
//      emits `ByteScrollContentSizeKey`, OR use the convenience
//      `byteScrollContent` modifier which does both 3+4 in one shot.

// MARK: - Configuration

struct ByteScrollbarConfig {
    /// Width of the scanline thumb in points.
    var width: CGFloat = 3
    /// Phosphor-green default; theme tokens are not used here so the bar reads
    /// the same on light/dark themes (terminal aesthetic is intrinsically dark).
    var color: Color = Color.green.opacity(0.7)
    /// Faint track color rendered behind the thumb. Set to `.clear` to disable.
    var trackColor: Color = Color.white.opacity(0.05)
    /// Seconds to wait after the last scroll event before fading out.
    var fadeDelay: Double = 1.5
    /// Padding from the trailing edge.
    var trailingPadding: CGFloat = 4
    /// Vertical insets so the bar doesn't crowd safe-area content.
    var verticalPadding: CGFloat = 8
    /// Minimum thumb height — ensures the bar is grabbable/visible even on
    /// very long feeds.
    var minThumbHeight: CGFloat = 24
    /// Show the position pill ("POSITION 47%") in the top-right corner.
    var showPositionPill: Bool = false
    /// Custom formatter: `(currentIdx, total) -> String`. When nil and
    /// `showPositionPill == true`, falls back to a percent display.
    var pillFormat: ((Int, Int) -> String)? = nil
}

// MARK: - Modifier

struct ByteScrollbar: ViewModifier {
    let config: ByteScrollbarConfig
    let coordinateSpace: String

    @State private var visible: Bool = false
    @State private var hideWorkItem: DispatchWorkItem?
    @State private var scrollOffset: CGFloat = 0
    @State private var contentSize: CGSize = .zero
    @State private var viewportSize: CGSize = .zero

    func body(content: Content) -> some View {
        content
            .background(
                GeometryReader { vp in
                    Color.clear.preference(
                        key: ByteScrollViewportSizeKey.self,
                        value: vp.size
                    )
                }
            )
            .onPreferenceChange(ByteScrollViewportSizeKey.self) { viewportSize = $0 }
            .onPreferenceChange(ByteScrollContentSizeKey.self) { contentSize = $0 }
            .onPreferenceChange(ByteScrollOffsetKey.self) { newOffset in
                scrollOffset = newOffset
                showThenScheduleHide()
            }
            .overlay(alignment: .topTrailing) {
                overlay
                    .opacity(visible ? 1 : 0)
                    .animation(.easeOut(duration: 0.4), value: visible)
                    .allowsHitTesting(false)
            }
    }

    // MARK: Overlay layout

    @ViewBuilder
    private var overlay: some View {
        ZStack(alignment: .topTrailing) {
            scanline
                .padding(.trailing, config.trailingPadding)
                .padding(.vertical, config.verticalPadding)

            if config.showPositionPill, isScrollable {
                positionPill
                    .padding(.trailing, config.trailingPadding + 6)
                    .padding(.top, 6)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
    }

    // MARK: Scanline

    private var scanline: some View {
        // Compute thumb geometry in a GeometryReader so we always have a
        // bounded height to work against (independent of `viewportSize` race
        // conditions during the very first layout pass).
        GeometryReader { geo in
            let trackHeight = geo.size.height
            let thumbHeight = thumbHeight(for: trackHeight)
            let thumbY = thumbY(for: trackHeight, thumbHeight: thumbHeight)

            ZStack(alignment: .top) {
                // Track
                RoundedRectangle(cornerRadius: config.width / 2)
                    .fill(config.trackColor)
                    .frame(width: config.width, height: trackHeight)

                // Thumb (phosphor-green scanline)
                RoundedRectangle(cornerRadius: config.width / 2)
                    .fill(config.color)
                    .frame(width: config.width, height: thumbHeight)
                    .shadow(color: config.color.opacity(0.6), radius: 3)
                    .offset(y: thumbY)
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
            .opacity(isScrollable ? 1 : 0)
        }
        .frame(width: config.width)
    }

    // MARK: Position pill

    private var positionPill: some View {
        Text(pillText)
            .font(.system(size: 9, weight: .bold, design: .monospaced))
            .tracking(0.6)
            .foregroundColor(config.color)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(Color.black.opacity(0.55))
            .overlay(
                RoundedRectangle(cornerRadius: 4)
                    .stroke(config.color.opacity(0.55), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 4))
    }

    private var pillText: String {
        let pct = Int((scrollProgress * 100).rounded())
        if let custom = config.pillFormat {
            // We don't have semantic "current index / total" here — the
            // caller can pass a closure that ignores the args and computes
            // its own label, or we fall back to deriving an approximate
            // (idx, total) pair from the percent so a default formatter
            // like `{ idx, total in "BYTE \(idx) / \(total)" }` still works.
            let total = max(1, Int(contentSize.height / max(1, viewportSize.height)))
            let idx = max(1, min(total, Int((scrollProgress * Double(total)).rounded()) + 1))
            return custom(idx, total)
        }
        return "POSITION \(pct)%"
    }

    // MARK: Geometry helpers

    private var isScrollable: Bool {
        contentSize.height > viewportSize.height + 1 && viewportSize.height > 0
    }

    private var scrollProgress: Double {
        guard isScrollable else { return 0 }
        let maxOffset = max(1, contentSize.height - viewportSize.height)
        let clamped = min(max(0, scrollOffset), maxOffset)
        return Double(clamped / maxOffset)
    }

    private func thumbHeight(for trackHeight: CGFloat) -> CGFloat {
        guard isScrollable else { return 0 }
        let ratio = viewportSize.height / contentSize.height
        return max(config.minThumbHeight, trackHeight * ratio)
    }

    private func thumbY(for trackHeight: CGFloat, thumbHeight: CGFloat) -> CGFloat {
        guard isScrollable else { return 0 }
        let travel = max(0, trackHeight - thumbHeight)
        return travel * CGFloat(scrollProgress)
    }

    // MARK: Visibility

    private func showThenScheduleHide() {
        visible = true
        hideWorkItem?.cancel()
        let work = DispatchWorkItem {
            visible = false
        }
        hideWorkItem = work
        DispatchQueue.main.asyncAfter(deadline: .now() + config.fadeDelay, execute: work)
    }
}

// MARK: - Preference Keys

struct ByteScrollOffsetKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

struct ByteScrollContentSizeKey: PreferenceKey {
    static var defaultValue: CGSize = .zero
    static func reduce(value: inout CGSize, nextValue: () -> CGSize) {
        // Take the largest reported height — multiple readers may emit during
        // layout, and we want the actual content extent.
        let next = nextValue()
        if next.height > value.height { value = next }
    }
}

struct ByteScrollViewportSizeKey: PreferenceKey {
    static var defaultValue: CGSize = .zero
    static func reduce(value: inout CGSize, nextValue: () -> CGSize) {
        value = nextValue()
    }
}

// MARK: - Helpers (insert these inside the ScrollView's content)

/// Zero-height view that emits the current scroll offset as a preference.
/// Place it as the first child inside the ScrollView's content.
struct ByteScrollOffsetReader: View {
    let coordinateSpace: String

    var body: some View {
        GeometryReader { proxy in
            Color.clear.preference(
                key: ByteScrollOffsetKey.self,
                value: -proxy.frame(in: .named(coordinateSpace)).minY
            )
        }
        .frame(height: 0)
    }
}

/// Reports the size of the ScrollView's content via a background GeometryReader.
/// Apply this modifier to the inner content stack (e.g. LazyVStack) so the
/// scrollbar knows how tall the content actually is.
private struct ByteScrollContentSizeReporter: ViewModifier {
    func body(content: Content) -> some View {
        content.background(
            GeometryReader { proxy in
                Color.clear.preference(
                    key: ByteScrollContentSizeKey.self,
                    value: proxy.size
                )
            }
        )
    }
}

// MARK: - Public API

extension View {
    /// Apply the terminal-aesthetic scroll indicator overlay to a ScrollView.
    /// Pair with `.coordinateSpace(name: coordinateSpace)` on the ScrollView
    /// and a `ByteScrollOffsetReader(coordinateSpace:)` as the first child
    /// of the scroll content.
    func byteScrollbar(
        coordinateSpace: String = "byteScroll",
        config: ByteScrollbarConfig = .init()
    ) -> some View {
        modifier(ByteScrollbar(config: config, coordinateSpace: coordinateSpace))
    }

    /// Convenience modifier for the inner content stack (e.g. LazyVStack):
    /// reports the content size up to the scrollbar via PreferenceKey.
    func byteScrollContentSize() -> some View {
        modifier(ByteScrollContentSizeReporter())
    }
}
