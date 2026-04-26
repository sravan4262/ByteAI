import SwiftUI

// MARK: - Mid-tier CTA button (VIEW_FULL_BYTE → pattern)
// Sits between unselected and fully filled — bg .22, border .60, glow .18 → .25 on press.
// Used as the right-aligned card CTA in feed PostCard.

struct CTAButton: View {
    let label: String
    var trailing: String = "→"
    var identity: IdentityColor = .blue
    let action: () -> Void

    @State private var pressed = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(label)
                    .font(.byteMono(10, weight: .bold))
                    .tracking(1.0)
                Text(trailing)
                    .font(.byteMono(10, weight: .bold))
            }
            .foregroundColor(identity.solid)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(identity.bgCTA)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(pressed ? identity.solid : identity.borderCTA, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .shadow(color: pressed ? identity.tint(0.25) : identity.glowSoft,
                    radius: pressed ? 8 : 6, x: 0, y: 0)
            .offset(y: pressed ? -1 : 0)
        }
        .buttonStyle(.plain)
        .frame(minHeight: 36)
        .onLongPressGesture(minimumDuration: 0, maximumDistance: .infinity,
                            perform: {},
                            onPressingChanged: { pressed = $0 })
    }
}

// MARK: - Solid gradient submit button
// Used for full-width primary submits (ENTER BYTEAI →, POST BYTE, SUBMIT INTERVIEW).
// Identity color drives the gradient — blue for Bytes, purple for Interviews.

struct SubmitButton: View {
    let label: String
    var identity: IdentityColor = .blue
    var isLoading: Bool = false
    var isDisabled: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if isLoading {
                    ProgressView().tint(.white).scaleEffect(0.85)
                }
                Text(label)
                    .font(.byteMono(12, weight: .bold))
                    .tracking(1.0)
                    .foregroundColor(.white)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                LinearGradient(
                    colors: [identity.solid, gradientEnd],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .shadow(color: identity.tint(0.4), radius: 16, x: 0, y: 4)
        }
        .buttonStyle(.plain)
        .disabled(isLoading || isDisabled)
        .opacity(isDisabled ? 0.4 : 1)
    }

    private var gradientEnd: Color {
        switch identity {
        case .blue:   return Color(hex: "#1d4ed8")
        case .purple: return Color(hex: "#5b21b6")
        case .green:  return Color(hex: "#047857")
        case .cyan:   return Color(hex: "#0891b2")
        case .orange: return Color(hex: "#c2410c")
        case .red:    return Color(hex: "#be123c")
        }
    }
}

#Preview {
    VStack(spacing: 16) {
        CTAButton(label: "VIEW_FULL_BYTE") {}
        CTAButton(label: "VIEW_FULL_INTERVIEW", identity: .purple) {}
        SubmitButton(label: "ENTER BYTEAI") {}
        SubmitButton(label: "SUBMIT INTERVIEW", identity: .purple) {}
        SubmitButton(label: "LOADING", isLoading: true) {}
    }
    .padding()
    .background(Color.byteBackground)
}
