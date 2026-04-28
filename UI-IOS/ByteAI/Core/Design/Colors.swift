import SwiftUI

// MARK: - ByteAI Design Tokens
// All tokens resolve from ThemeManager.shared so they update when the theme changes.

extension Color {
    // Backgrounds
    static var byteBackground:   Color { ThemeManager.shared.tokens.background }
    static var byteCard:         Color { ThemeManager.shared.tokens.card }
    static var byteElement:      Color { ThemeManager.shared.tokens.element }

    // Borders
    static var byteBorder:       Color { ThemeManager.shared.tokens.border }
    static var byteBorderMedium: Color { ThemeManager.shared.tokens.borderMedium }
    static var byteBorderHigh:   Color { ThemeManager.shared.tokens.borderHigh }

    // Text
    static var byteText1:        Color { ThemeManager.shared.tokens.text1 }
    static var byteText2:        Color { ThemeManager.shared.tokens.text2 }
    static var byteText3:        Color { ThemeManager.shared.tokens.text3 }

    // Accent — blue (primary)
    static var byteAccent:       Color { ThemeManager.shared.tokens.accent }
    static var byteAccentDim:    Color { ThemeManager.shared.tokens.accent.opacity(0.12) }
    static var byteAccentGlow:   Color { ThemeManager.shared.tokens.accent.opacity(0.35) }

    // Semantic colors
    static var byteCyan:         Color { ThemeManager.shared.tokens.cyan }
    static var byteCyanDim:      Color { ThemeManager.shared.tokens.cyan.opacity(0.1) }
    static var byteGreen:        Color { ThemeManager.shared.tokens.green }
    static var byteGreenDim:     Color { ThemeManager.shared.tokens.green.opacity(0.1) }
    static var bytePurple:       Color { ThemeManager.shared.tokens.purple }
    static var bytePurpleDim:    Color { ThemeManager.shared.tokens.purple.opacity(0.1) }
    static var byteOrange:       Color { ThemeManager.shared.tokens.orange }
    static var byteRed:          Color { ThemeManager.shared.tokens.red }
    static var byteCodeBg:       Color { ThemeManager.shared.tokens.codeBg }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Avatar Variant Colors

enum AvatarVariant: String, CaseIterable {
    case cyan, purple, green, orange

    var gradient: LinearGradient {
        switch self {
        case .cyan:
            return LinearGradient(
                colors: [Color(hex: "#0ea5e9"), Color(hex: "#22d3ee")],
                startPoint: .topLeading, endPoint: .bottomTrailing)
        case .purple:
            return LinearGradient(
                colors: [Color(hex: "#7c3aed"), Color(hex: "#a78bfa")],
                startPoint: .topLeading, endPoint: .bottomTrailing)
        case .green:
            return LinearGradient(
                colors: [Color(hex: "#059669"), Color(hex: "#10d9a0")],
                startPoint: .topLeading, endPoint: .bottomTrailing)
        case .orange:
            return LinearGradient(
                colors: [Color(hex: "#ea580c"), Color(hex: "#fb923c")],
                startPoint: .topLeading, endPoint: .bottomTrailing)
        }
    }

    var glowColor: Color {
        switch self {
        case .cyan:    return .byteCyan
        case .purple:  return .bytePurple
        case .green:   return .byteGreen
        case .orange:  return .byteOrange
        }
    }
}
