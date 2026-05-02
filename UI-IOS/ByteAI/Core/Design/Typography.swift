import SwiftUI
import UIKit

// MARK: - ByteAI Typography
// Mirrors Bricolage Grotesque (sans) + JetBrains Mono (mono) from the web app.
// Custom fonts must be added to the Xcode project & Info.plist.
// Falls back to system fonts if not embedded.

extension Font {
    // MARK: Sans (system rounded — swap to BricolageGrotesque once fonts are added to target)
    static func byteSans(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .rounded)
    }

    // MARK: Mono (system mono — swap to JetBrainsMono once fonts are added to target)
    static func byteMono(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }

    // MARK: - Dynamic Type-aware helpers
    // These scale the size with the user's preferred content size category so
    // accessibility text settings are honored.
    static func scaledByteSans(_ size: CGFloat,
                                weight: Font.Weight = .regular,
                                relativeTo style: UIFont.TextStyle = .body) -> Font {
        let scaledSize = UIFontMetrics(forTextStyle: style).scaledValue(for: size)
        return byteSans(scaledSize, weight: weight)
    }

    static func scaledByteMono(_ size: CGFloat,
                                weight: Font.Weight = .regular,
                                relativeTo style: UIFont.TextStyle = .body) -> Font {
        let scaledSize = UIFontMetrics(forTextStyle: style).scaledValue(for: size)
        return byteMono(scaledSize, weight: weight)
    }

    // MARK: - Semantic Tokens (preferred for new code)
    // Sizes are base values that scale with Dynamic Type. Computed properties
    // are used (not `static let`) so each access re-asks UIFontMetrics for the
    // currently scaled value — without this, a size category change after the
    // first read wouldn't take effect until the app restarted.

    // Titles
    static var byteTitleLarge:  Font { scaledByteSans(28, weight: .bold,     relativeTo: .largeTitle) }
    static var byteTitleMedium: Font { scaledByteSans(20, weight: .semibold, relativeTo: .title2) }
    static var byteTitleSmall:  Font { scaledByteSans(17, weight: .semibold, relativeTo: .title3) }

    // Body
    static var byteBodyLarge:  Font { scaledByteSans(17, weight: .regular, relativeTo: .body) }
    static var byteBodyMedium: Font { scaledByteSans(15, weight: .regular, relativeTo: .callout) }
    static var byteBodySmall:  Font { scaledByteSans(13, weight: .regular, relativeTo: .caption1) }

    // UI
    static var byteLabel:    Font { scaledByteSans(13, weight: .semibold, relativeTo: .caption1) }
    static var byteUsername: Font { scaledByteSans(14, weight: .medium,   relativeTo: .footnote) }
    static var byteCaption:  Font { scaledByteSans(11, weight: .regular,  relativeTo: .caption2) }

    // Mono / code
    static var byteCodeBase:      Font { scaledByteMono(14, weight: .regular, relativeTo: .body) }
    static var byteCodeSmall:     Font { scaledByteMono(12, weight: .regular, relativeTo: .caption1) }
    static var byteTerminal:      Font { scaledByteMono(13, weight: .regular, relativeTo: .body) }
    static var byteTerminalSmall: Font { scaledByteMono(11, weight: .regular, relativeTo: .caption1) }

    // MARK: - Legacy Semantic Scale (kept for back-compat)
    static let byteH1   = byteSans(24, weight: .bold)
    static let byteH2   = byteSans(20, weight: .semibold)
    static let byteH3   = byteSans(17, weight: .semibold)
    static let byteBody  = byteSans(14)
    static let byteSmall = byteSans(12)
    static let byteTiny  = byteSans(10)

    static let byteMonoBase  = byteMono(13)
    static let byteMonoSmall = byteMono(11)
    static let byteMonoTiny  = byteMono(10)
}
