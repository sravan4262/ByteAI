import SwiftUI

// MARK: - ByteAI Design Tokens
// Matches CSS variables in UI/app/globals.css exactly

extension Color {
    // Backgrounds
    static let byteBackground     = Color(hex: "#05050e") // --bg
    static let byteCard           = Color(hex: "#08081a") // --bg-card
    static let byteElement        = Color(hex: "#0d0d22") // --bg-el

    // Borders
    static let byteBorder         = Color(hex: "#141430") // --border
    static let byteBorderMedium   = Color(hex: "#1c1c42") // --border-m
    static let byteBorderHigh     = Color(hex: "#28286a") // --border-h

    // Text
    static let byteText1          = Color(hex: "#f0f0ff") // --t1 primary
    static let byteText2          = Color(hex: "#7878aa") // --t2 secondary/muted
    static let byteText3          = Color(hex: "#38385a") // --t3 tertiary

    // Accent - Blue (primary)
    static let byteAccent         = Color(hex: "#3b82f6") // --accent
    static let byteAccentDim      = Color(hex: "#3b82f6").opacity(0.12) // --accent-d
    static let byteAccentGlow     = Color(hex: "#3b82f6").opacity(0.35) // --accent-glow

    // Semantic Colors
    static let byteCyan           = Color(hex: "#22d3ee") // --cyan
    static let byteCyanDim        = Color(hex: "#22d3ee").opacity(0.1) // --cyan-d
    static let byteGreen          = Color(hex: "#10d9a0") // --green
    static let byteGreenDim       = Color(hex: "#10d9a0").opacity(0.1) // --green-d
    static let bytePurple         = Color(hex: "#a78bfa") // --purple
    static let bytePurpleDim      = Color(hex: "#a78bfa").opacity(0.1) // --purple-d
    static let byteOrange         = Color(hex: "#fb923c") // --orange
    static let byteRed            = Color(hex: "#f43f5e") // --red
    static let byteCodeBg         = Color(hex: "#030310") // --code-bg
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
