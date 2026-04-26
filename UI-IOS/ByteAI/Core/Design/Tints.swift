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

    /// rgba base (0..1 components) for opacity-tinted surfaces.
    var rgb: (r: Double, g: Double, b: Double) {
        switch self {
        case .blue:   return (59/255,  130/255, 246/255)   // #3b82f6
        case .purple: return (167/255, 139/255, 250/255)   // #a78bfa
        case .green:  return (16/255,  217/255, 160/255)   // #10d9a0
        case .cyan:   return (34/255,  211/255, 238/255)   // #22d3ee
        case .orange: return (251/255, 146/255, 60/255)    // #fb923c
        case .red:    return (244/255, 63/255,  94/255)    // #f43f5e
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
