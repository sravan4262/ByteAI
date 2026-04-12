import SwiftUI

// MARK: - Notifications View
// Mirrors the notification panel (modal overlay) from app-shell.tsx

struct NotificationsView: View {
    @StateObject private var vm = NotificationsViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteBackground.ignoresSafeArea()

                if vm.isLoading {
                    ByteSpinner(size: 28)
                } else if vm.notifications.isEmpty {
                    EmptyStateView(
                        icon: "bell.slash",
                        title: "All caught up",
                        message: "You have no notifications right now."
                    )
                } else {
                    List {
                        Section {
                            ForEach(vm.notifications) { notif in
                                NotificationRow(notification: notif) {
                                    Task { await vm.markRead(id: notif.id) }
                                }
                                .listRowBackground(Color.byteCard)
                                .listRowSeparatorTint(Color.byteBorder)
                                .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                            }
                        }
                        .listSectionSeparator(.hidden)
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.byteBackground, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") { dismiss() }
                        .font(.byteSans(14))
                        .foregroundColor(.byteText2)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    if vm.unreadCount > 0 {
                        Button("Mark all read") {
                            Task { await vm.markAllRead() }
                        }
                        .font(.byteMono(11))
                        .foregroundColor(.byteAccent)
                    }
                }
            }
        }
        .task { await vm.load() }
    }
}

// MARK: - Notification Row

private struct NotificationRow: View {
    let notification: AppNotification
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                // Icon
                ZStack {
                    Circle()
                        .fill(iconColor.opacity(0.12))
                        .frame(width: 40, height: 40)
                    Image(systemName: iconName)
                        .font(.system(size: 16))
                        .foregroundColor(iconColor)
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(notifTitle)
                        .font(.byteSans(13, weight: notification.read ? .regular : .semibold))
                        .foregroundColor(notification.read ? .byteText2 : .byteText1)
                        .multilineTextAlignment(.leading)

                    if let preview = notification.payload.preview {
                        Text(preview)
                            .font(.byteSmall)
                            .foregroundColor(.byteText3)
                            .lineLimit(1)
                    }

                    Text(notification.createdAt)
                        .font(.byteMonoTiny)
                        .foregroundColor(.byteText3)
                }

                Spacer()

                if !notification.read {
                    Circle()
                        .fill(Color.byteAccent)
                        .frame(width: 8, height: 8)
                }
            }
            .padding(.vertical, 6)
        }
        .buttonStyle(.plain)
    }

    private var notifTitle: String {
        switch notification.type {
        case .like:
            return "@\(notification.payload.actorUsername ?? "Someone") liked your byte"
        case .comment:
            return "@\(notification.payload.actorUsername ?? "Someone") commented on your byte"
        case .follow:
            return "@\(notification.payload.actorUsername ?? "Someone") followed you"
        case .badge:
            return notification.payload.preview ?? "You earned a badge!"
        case .system:
            return notification.payload.preview ?? "System notification"
        }
    }

    private var iconName: String {
        switch notification.type {
        case .like:    return "heart.fill"
        case .comment: return "bubble.left.fill"
        case .follow:  return "person.fill.badge.plus"
        case .badge:   return "star.fill"
        case .system:  return "bell.fill"
        }
    }

    private var iconColor: Color {
        switch notification.type {
        case .like:    return .byteRed
        case .comment: return .byteCyan
        case .follow:  return .byteAccent
        case .badge:   return .byteOrange
        case .system:  return .bytePurple
        }
    }
}

// MARK: - ViewModel

@MainActor
final class NotificationsViewModel: ObservableObject {
    @Published var notifications: [AppNotification] = []
    @Published var isLoading = false

    var unreadCount: Int { notifications.filter { !$0.read }.count }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        notifications = (try? await APIClient.shared.getNotifications()) ?? []
    }

    func markRead(id: String) async {
        guard let i = notifications.firstIndex(where: { $0.id == id }) else { return }
        notifications[i].read = true
        try? await APIClient.shared.markRead(notificationId: id)
    }

    func markAllRead() async {
        notifications = notifications.map { var n = $0; n.read = true; return n }
        try? await APIClient.shared.markAllRead()
    }
}

#Preview {
    NotificationsView()
}
