import SwiftUI

// MARK: - App Theme

enum AppTheme: String, CaseIterable {
    case dark, light, hacker, nord

    var displayName: String { rawValue.uppercased() }

    var swatchHex: String {
        switch self {
        case .dark:   return "#05050e"
        case .light:  return "#f4f5fb"
        case .hacker: return "#001200"
        case .nord:   return "#1a1e2e"
        }
    }

    var preferredColorScheme: ColorScheme {
        self == .light ? .light : .dark
    }

    var tokens: ThemeTokens {
        switch self {
        case .dark:   return .dark
        case .light:  return .light
        case .hacker: return .hacker
        case .nord:   return .nord
        }
    }
}

// MARK: - Theme Tokens

struct ThemeTokens {
    // Backgrounds
    let background: Color
    let card: Color
    let element: Color
    // Borders
    let border: Color
    let borderMedium: Color
    let borderHigh: Color
    // Text
    let text1: Color
    let text2: Color
    let text3: Color
    // Accent (blue / primary)
    let accent: Color
    let accentRGB: (r: Double, g: Double, b: Double)
    // Feature colors
    let cyan: Color
    let cyanRGB: (r: Double, g: Double, b: Double)
    let green: Color
    let greenRGB: (r: Double, g: Double, b: Double)
    let purple: Color
    let purpleRGB: (r: Double, g: Double, b: Double)
    let orange: Color
    let orangeRGB: (r: Double, g: Double, b: Double)
    let red: Color
    let redRGB: (r: Double, g: Double, b: Double)
    let codeBg: Color
}

extension ThemeTokens {
    static let dark = ThemeTokens(
        background:   Color(hex: "#05050e"),
        card:         Color(hex: "#08081a"),
        element:      Color(hex: "#0d0d22"),
        border:       Color(hex: "#141430"),
        borderMedium: Color(hex: "#1c1c42"),
        borderHigh:   Color(hex: "#28286a"),
        text1:        Color(hex: "#f0f0ff"),
        text2:        Color(hex: "#7878aa"),
        text3:        Color(hex: "#38385a"),
        accent:       Color(hex: "#3b82f6"), accentRGB: (59/255, 130/255, 246/255),
        cyan:         Color(hex: "#22d3ee"), cyanRGB:   (34/255, 211/255, 238/255),
        green:        Color(hex: "#10d9a0"), greenRGB:  (16/255, 217/255, 160/255),
        purple:       Color(hex: "#a78bfa"), purpleRGB: (167/255, 139/255, 250/255),
        orange:       Color(hex: "#fb923c"), orangeRGB: (251/255, 146/255, 60/255),
        red:          Color(hex: "#f43f5e"), redRGB:    (244/255, 63/255,  94/255),
        codeBg:       Color(hex: "#030310")
    )

    static let light = ThemeTokens(
        background:   Color(hex: "#f4f5fb"),
        card:         Color(hex: "#ffffff"),
        element:      Color(hex: "#eceef8"),
        border:       Color(hex: "#d8dcea"),
        borderMedium: Color(hex: "#c4cade"),
        borderHigh:   Color(hex: "#a0aac8"),
        text1:        Color(hex: "#0c0e1e"),
        text2:        Color(hex: "#4a5280"),
        text3:        Color(hex: "#9098be"),
        accent:       Color(hex: "#3b82f6"), accentRGB: (59/255,  130/255, 246/255),
        cyan:         Color(hex: "#0ea5e9"), cyanRGB:   (14/255,  165/255, 233/255),
        green:        Color(hex: "#10b981"), greenRGB:  (16/255,  185/255, 129/255),
        purple:       Color(hex: "#8b5cf6"), purpleRGB: (139/255, 92/255,  246/255),
        orange:       Color(hex: "#f97316"), orangeRGB: (249/255, 115/255, 22/255),
        red:          Color(hex: "#ef4444"), redRGB:    (239/255, 68/255,  68/255),
        codeBg:       Color(hex: "#1e1e3f")
    )

    static let hacker = ThemeTokens(
        background:   Color(hex: "#000800"),
        card:         Color(hex: "#001200"),
        element:      Color(hex: "#001a00"),
        border:       Color(hex: "#003300"),
        borderMedium: Color(hex: "#005500"),
        borderHigh:   Color(hex: "#008800"),
        text1:        Color(hex: "#00ff41"),
        text2:        Color(hex: "#00cc34"),
        text3:        Color(hex: "#006618"),
        accent:       Color(hex: "#00ff41"), accentRGB: (0/255, 255/255, 65/255),
        cyan:         Color(hex: "#00ffcc"), cyanRGB:   (0/255, 255/255, 204/255),
        green:        Color(hex: "#00ff41"), greenRGB:  (0/255, 255/255, 65/255),
        purple:       Color(hex: "#cc00ff"), purpleRGB: (204/255, 0/255, 255/255),
        orange:       Color(hex: "#ffaa00"), orangeRGB: (255/255, 170/255, 0/255),
        red:          Color(hex: "#ff2244"), redRGB:    (255/255, 34/255,  68/255),
        codeBg:       Color(hex: "#000500")
    )

    static let nord = ThemeTokens(
        background:   Color(hex: "#1a1e2e"),
        card:         Color(hex: "#1f2335"),
        element:      Color(hex: "#24283b"),
        border:       Color(hex: "#2e3347"),
        borderMedium: Color(hex: "#3b4261"),
        borderHigh:   Color(hex: "#545c7e"),
        text1:        Color(hex: "#c0caf5"),
        text2:        Color(hex: "#7982a9"),
        text3:        Color(hex: "#414868"),
        accent:       Color(hex: "#7aa2f7"), accentRGB: (122/255, 162/255, 247/255),
        cyan:         Color(hex: "#7dcfff"), cyanRGB:   (125/255, 207/255, 255/255),
        green:        Color(hex: "#9ece6a"), greenRGB:  (158/255, 206/255, 106/255),
        purple:       Color(hex: "#bb9af7"), purpleRGB: (187/255, 154/255, 247/255),
        orange:       Color(hex: "#ff9e64"), orangeRGB: (255/255, 158/255, 100/255),
        red:          Color(hex: "#f7768e"), redRGB:    (247/255, 118/255, 142/255),
        codeBg:       Color(hex: "#13141e")
    )
}

// MARK: - Theme Manager

final class ThemeManager: ObservableObject {
    static let shared = ThemeManager()

    @Published private(set) var current: AppTheme

    var tokens: ThemeTokens { current.tokens }

    private init() {
        let saved = UserDefaults.standard.string(forKey: "byteai.appTheme") ?? "dark"
        current = AppTheme(rawValue: saved) ?? .dark
    }

    func set(_ theme: AppTheme) {
        guard current != theme else { return }
        current = theme
        UserDefaults.standard.set(theme.rawValue, forKey: "byteai.appTheme")
    }
}
