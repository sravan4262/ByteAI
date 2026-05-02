import SwiftUI

// MARK: - Faint-tint button
// The "magnify, don't switch" pattern from ui-standards.md.
// Unselected carries a faint identity-color tint so selecting feels like
// magnifying an existing signal rather than creating color from nothing.
//
//   Unselected: border .20 alpha, bg .03 alpha, --t1 text
//   Selected:   solid border, bgActive (.12) alpha, identity-colored text + glow

struct FaintTintButton: View {
    let label: String
    var icon: String? = nil
    var trailing: String? = nil       // e.g. "✓"
    var isSelected: Bool = false
    var identity: IdentityColor = .blue
    var size: ButtonSize = .standard
    var isDisabled: Bool = false
    let action: () -> Void

    enum ButtonSize {
        case compact, standard, large

        var hPad: CGFloat { switch self { case .compact: return 12; case .standard: return 16; case .large: return 18 } }
        var vPad: CGFloat { switch self { case .compact: return 6;  case .standard: return 12; case .large: return 14 } }
        var fontSize: CGFloat { switch self { case .compact: return 11; case .standard: return 11; case .large: return 12 } }
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if let icon { Text(icon).accessibilityHidden(true) }
                Text(label)
                    .font(.byteMono(size.fontSize, weight: isSelected ? .bold : .regular))
                    .tracking(0.55)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .truncationMode(.tail)
                if let trailing {
                    Text(trailing)
                        .font(.byteMono(10, weight: .bold))
                        .accessibilityHidden(true)
                }
            }
            .foregroundColor(textColor)
            .padding(.horizontal, size.hPad)
            .padding(.vertical, size.vPad)
            .background(backgroundColor)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(borderColor, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .shadow(color: glowColor, radius: isSelected ? 8 : 0, x: 0, y: 0)
        }
        .buttonStyle(.plain)
        .disabled(isDisabled)
        .opacity(isDisabled ? 0.4 : 1)
        .frame(minHeight: 36)
        .accessibilityLabel(label.replacingOccurrences(of: "_", with: " ").capitalized)
        .accessibilityValue(isSelected ? "Selected" : "")
        .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : .isButton)
    }

    private var textColor: Color {
        isSelected ? identity.solid : .byteText1
    }
    private var backgroundColor: Color {
        isSelected ? identity.bgActive : identity.bgFaint
    }
    private var borderColor: Color {
        isSelected ? identity.solid : identity.borderFaint
    }
    private var glowColor: Color {
        isSelected ? identity.tint(0.20) : .clear
    }
}

#Preview {
    VStack(spacing: 12) {
        HStack {
            FaintTintButton(label: "FOR_YOU", isSelected: true) {}
            FaintTintButton(label: "TRENDING", isSelected: false) {}
        }
        HStack {
            FaintTintButton(label: "Senior", icon: "👨‍💻", isSelected: false) {}
            FaintTintButton(label: "Junior", icon: "🌱", isSelected: true) {}
        }
        HStack {
            FaintTintButton(label: "BACKEND", trailing: "✓", isSelected: true, size: .compact) {}
            FaintTintButton(label: "FRONTEND", isSelected: false, size: .compact) {}
        }
        FaintTintButton(label: "ADD QUESTION", icon: "+", isSelected: false, identity: .purple) {}
    }
    .padding()
    .background(Color.byteBackground)
}
