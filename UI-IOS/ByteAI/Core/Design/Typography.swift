import SwiftUI

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

    // MARK: - Semantic Scale
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
