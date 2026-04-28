import SwiftUI

// MARK: - Identity Color
// Each major feature has a fixed identity color (per ui-standards.md §"Feature Identity Colors").
// Bytes uses blue (--accent), Interviews use purple (--purple). Shared chrome stays blue.

enum IdentityColor {
    case blue       // Bytes (default)
    case purple     // Interviews
    case green      // Answer fields
    case cyan
    case orange
    case red

    var solid: Color {
        switch self {
        case .blue:   return .byteAccent
        case .purple: return .bytePurple
        case .green:  return .byteGreen
        case .cyan:   return .byteCyan
        case .orange: return .byteOrange
        case .red:    return .byteRed
        }
    }

    /// rgba base (0..1 components) for opacity-tinted surfaces — resolves from active theme.
    var rgb: (r: Double, g: Double, b: Double) {
        let t = ThemeManager.shared.tokens
        switch self {
        case .blue:   return t.accentRGB
        case .purple: return t.purpleRGB
        case .green:  return t.greenRGB
        case .cyan:   return t.cyanRGB
        case .orange: return t.orangeRGB
        case .red:    return t.redRGB
        }
    }

    func tint(_ alpha: Double) -> Color {
        Color(red: rgb.r, green: rgb.g, blue: rgb.b, opacity: alpha)
    }

    // Standardised opacity steps per ui-standards.md
    var bgFaint:    Color { tint(0.03) }   // unselected button bg
    var bgHover:    Color { tint(0.07) }   // hover bg / floating header bg
    var bgActive:   Color { tint(0.12) }   // selected button bg (--accent-d)
    var bgCTA:      Color { tint(0.22) }   // mid-tier CTA bg
    var borderFaint:  Color { tint(0.20) } // unselected button border
    var borderHover:  Color { tint(0.45) } // hover border
    var borderHeader: Color { tint(0.35) } // floating header border
    var borderCTA:    Color { tint(0.60) } // mid-tier CTA border
    var glow:         Color { tint(0.35) } // shadow / glow
    var glowSoft:     Color { tint(0.18) } // CTA shadow at rest
    var glowStrong:   Color { tint(0.55) } // hover shadow
}
