import SwiftUI

// MARK: - ByteAI Button Variants
// Mirrors button.tsx — default (gradient), secondary, outline, ghost, icon

enum ByteButtonStyle {
    case primary    // Blue gradient CTA
    case secondary  // Dark muted
    case outline    // Bordered, no fill
    case ghost      // No border, hover bg
    case destructive
}

struct ByteButton: View {
    let label: String
    let icon: String?
    let style: ByteButtonStyle
    var isLoading: Bool = false
    let action: () -> Void

    init(_ label: String, icon: String? = nil, style: ByteButtonStyle = .primary, isLoading: Bool = false, action: @escaping () -> Void) {
        self.label = label
        self.icon = icon
        self.style = style
        self.isLoading = isLoading
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if isLoading {
                    ProgressView()
                        .tint(foregroundColor)
                        .scaleEffect(0.8)
                } else if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 13, weight: .medium))
                }
                Text(label)
                    .font(.byteSans(13, weight: .semibold))
            }
            .foregroundColor(foregroundColor)
            .padding(.horizontal, 14)
            .padding(.vertical, 9)
            .background(backgroundView)
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(borderColor, lineWidth: style == .outline ? 1 : 0)
            )
        }
        .disabled(isLoading)
        .opacity(isLoading ? 0.7 : 1)
    }

    private var foregroundColor: Color {
        switch style {
        case .primary:     return .white
        case .secondary:   return .byteText1
        case .outline:     return .byteText1
        case .ghost:       return .byteText2
        case .destructive: return .byteRed
        }
    }

    private var borderColor: Color {
        switch style {
        case .outline:     return .byteBorderMedium
        case .destructive: return Color.byteRed.opacity(0.4)
        default:           return .clear
        }
    }

    @ViewBuilder
    private var backgroundView: some View {
        switch style {
        case .primary:
            LinearGradient(
                colors: [Color.byteAccent, Color(hex: "#2563eb")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case .secondary:
            Color.byteElement
        case .outline:
            Color.clear
        case .ghost:
            Color.byteElement.opacity(0.5)
        case .destructive:
            Color.byteRed.opacity(0.1)
        }
    }
}

// MARK: - Icon-only action button (for like/bookmark/share)

struct ActionButton: View {
    let icon: String
    let count: Int?
    let isActive: Bool
    let activeColor: Color
    let action: () -> Void

    init(icon: String, count: Int? = nil, isActive: Bool = false, activeColor: Color = .byteAccent, action: @escaping () -> Void) {
        self.icon = icon
        self.count = count
        self.isActive = isActive
        self.activeColor = activeColor
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Image(systemName: isActive ? "\(icon).fill" : icon)
                    .font(.system(size: 13))
                if let count {
                    Text(formatCount(count))
                        .font(.byteMonoSmall)
                }
            }
            .foregroundColor(isActive ? activeColor : .byteText2)
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(
                RoundedRectangle(cornerRadius: 6)
                    .fill(isActive ? activeColor.opacity(0.12) : Color.byteElement)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(isActive ? activeColor.opacity(0.5) : Color.byteBorderMedium, lineWidth: 1)
                    )
            )
        }
    }

    private func formatCount(_ n: Int) -> String {
        n >= 1000 ? String(format: "%.1fk", Double(n) / 1000) : "\(n)"
    }
}

#Preview {
    VStack(spacing: 12) {
        ByteButton("Post Byte", icon: "paperplane.fill", style: .primary) {}
        ByteButton("Save Draft", icon: "tray.and.arrow.down", style: .secondary) {}
        ByteButton("Follow", style: .outline) {}
        ByteButton("Cancel", style: .ghost) {}
        ByteButton("Delete", style: .destructive) {}
        HStack {
            ActionButton(icon: "heart", count: 247, isActive: false, action: {})
            ActionButton(icon: "heart", count: 247, isActive: true, action: {})
            ActionButton(icon: "bubble.left", count: 32, action: {})
            ActionButton(icon: "bookmark", isActive: true, activeColor: .byteCyan, action: {})
        }
    }
    .padding()
    .background(Color.byteBackground)
}
