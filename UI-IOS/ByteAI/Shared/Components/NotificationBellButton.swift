import SwiftUI

// MARK: - Notification bell button
// Avatar-paired button with accent ring + outer glow + unread dot.
// Same visual weight as the avatar — they're a matched pair in headers.

struct NotificationBellButton: View {
    var unreadCount: Int = 0
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Circle()
                    .fill(Color.byteElement)
                    .frame(width: 36, height: 36)

                Image(systemName: "bell.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.byteAccent)

                if unreadCount > 0 {
                    ZStack {
                        Capsule()
                            .fill(Color.byteAccent)
                            .frame(
                                width: unreadCount > 9 ? 20 : 16,
                                height: 16
                            )
                            .overlay(Capsule().stroke(Color.byteBackground, lineWidth: 1.5))
                        Text(unreadCount > 9 ? "9+" : "\(unreadCount)")
                            .font(.system(size: 9, weight: .bold, design: .monospaced))
                            .foregroundColor(.white)
                    }
                    .offset(x: unreadCount > 9 ? 13 : 10, y: -11)
                }
            }
            .padding(4)
            .background(
                Circle().fill(Color.byteCard)
            )
            .overlay(
                Circle().strokeBorder(Color.byteAccent, lineWidth: 2)
            )
            .shadow(color: IdentityColor.blue.tint(0.35), radius: 5, x: 0, y: 0)
            .frame(width: 48, height: 48)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(unreadCount > 0 ? "Notifications, \(unreadCount) unread" : "Notifications")
    }
}

// MARK: - Avatar with accent ring
// Mirrors the bell — same outer size + ring weight. Used in feed header next to bell.

struct AvatarRingButton: View {
    let imageURL: String?
    let initials: String
    var variant: AvatarVariant = .cyan
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            AvatarView(initials, variant: variant, size: .sm, imageUrl: imageURL)
                .padding(4)
                .background(
                    Circle().fill(Color.byteCard)
                )
                .overlay(
                    Circle().strokeBorder(Color.byteAccent, lineWidth: 2)
                )
                .frame(width: 48, height: 48)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Profile")
    }
}

#Preview {
    HStack(spacing: 12) {
        NotificationBellButton(unreadCount: 3) {}
        AvatarRingButton(imageURL: nil, initials: "SR") {}
    }
    .padding()
    .background(Color.byteCard)
}
