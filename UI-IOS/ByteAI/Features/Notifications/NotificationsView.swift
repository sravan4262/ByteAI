import SwiftUI
import UIKit

// MARK: - Notifications View
// Mirrors the notification panel (modal overlay) from app-shell.tsx

struct NotificationsView: View {
    @StateObject private var vm = NotificationsViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteBackground.ignoresSafeArea()

                if vm.isLoading && vm.notifications.isEmpty {
                    VStack(spacing: 8) {
                        ForEach(0..<6, id: \.self) { _ in
                            RowSkeleton().padding(.horizontal, 16)
                        }
                        Spacer()
                    }
                    .padding(.vertical, 12)
                    .redacted(reason: .placeholder)
                    .accessibilityHidden(true)
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
                                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                    Button(role: .destructive) {
                                        Task { await vm.delete(id: notif.id) }
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                }
                            }
                        }
                        .listSectionSeparator(.hidden)
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                    .refreshable { await vm.load() }
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
        .task {
            await vm.load()
            UIApplication.shared.applicationIconBadgeNumber = 0
        }
    }
}

// MARK: - Notification Row

private struct NotificationRow: View {
    let notification: AppNotification
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(alignment: .top, spacing: 12) {
                // Actor avatar with accent ring (web parity).
                avatar
                    .padding(.top, 2)

                VStack(alignment: .leading, spacing: 3) {
                    Text(notifText)
                        .font(.byteSans(13, weight: notification.read ? .regular : .semibold))
                        .foregroundColor(notification.read ? .byteText2 : .byteText1)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)

                    if let preview = notification.payload.preview, !preview.isEmpty {
                        Text("“\(preview)”")
                            .font(.byteSmall)
                            .foregroundColor(.byteText2)
                            .italic()
                            .lineLimit(1)
                    }

                    Text(Self.timeAgo(from: notification.createdAt))
                        .font(.byteMonoTiny)
                        .foregroundColor(.byteText3)
                        .tracking(0.6)
                }

                Spacer(minLength: 0)

                // Type badge
                ZStack {
                    RoundedRectangle(cornerRadius: 5).fill(badgeBg).frame(width: 22, height: 22)
                    RoundedRectangle(cornerRadius: 5).stroke(badgeStroke, lineWidth: 1).frame(width: 22, height: 22)
                    Image(systemName: badgeIcon)
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(badgeColor)
                }

                if !notification.read {
                    Circle()
                        .fill(Color.byteAccent)
                        .frame(width: 7, height: 7)
                        .shadow(color: IdentityColor.blue.tint(0.5), radius: 3)
                        .padding(.top, 6)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(notification.read ? Color.clear : IdentityColor.blue.bgFaint)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Avatar

    @ViewBuilder
    private var avatar: some View {
        if notification.type == .feedbackUpdate {
            ZStack {
                Circle()
                    .fill(IdentityColor.purple.bgFaint)
                    .frame(width: 36, height: 36)
                    .overlay(Circle().stroke(Color.bytePurple, lineWidth: 2))
                Image(systemName: "sparkles")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.bytePurple)
            }
        } else if let url = liveActorAvatarUrl, !url.isEmpty {
            AvatarView(actorInitials, variant: .cyan, size: .md, imageUrl: url)
                .overlay(Circle().stroke(Color.byteAccent, lineWidth: 2).padding(-2))
        } else {
            ZStack {
                Circle()
                    .fill(IdentityColor.blue.bgFaint)
                    .frame(width: 36, height: 36)
                    .overlay(Circle().stroke(IdentityColor.blue.borderFaint, lineWidth: 1))
                Text(actorInitials)
                    .font(.byteMono(11, weight: .bold))
                    .foregroundColor(.byteAccent)
            }
        }
    }

    // Prefer the live joined fields from the backend; fall back to the payload snapshot
    // only for legacy / pre-refactor records.
    private var liveActorDisplayName: String? {
        notification.actorDisplayName ?? notification.payload.actorDisplayName
    }
    private var liveActorUsername: String? {
        notification.actorUsername ?? notification.payload.actorUsername
    }
    private var liveActorAvatarUrl: String? {
        notification.actorAvatarUrl ?? notification.payload.actorAvatarUrl
    }

    private var actorInitials: String {
        let source = liveActorDisplayName ?? liveActorUsername ?? "?"
        return String(source.prefix(1)).uppercased()
    }

    private var actorName: String {
        liveActorDisplayName
            ?? liveActorUsername.map { "@\($0)" }
            ?? "Someone"
    }

    // MARK: - Copy

    private var notifText: String {
        switch notification.type {
        case .like:     return "\(actorName) liked your byte"
        case .comment:  return "\(actorName) commented on your byte"
        case .follow:   return "\(actorName) started following you"
        case .unfollow: return "\(actorName) unfollowed you"
        case .badge:
            if let label = notification.payload.badgeLabel {
                return "You earned the \"\(label)\" badge!"
            }
            return "You earned a new badge!"
        case .feedbackUpdate:
            return notification.payload.message ?? "Your feedback was updated"
        case .system:
            return notification.payload.preview ?? notification.payload.message ?? "New notification"
        }
    }

    // MARK: - Type badge styling

    private var badgeIcon: String {
        switch notification.type {
        case .like:           return "heart.fill"
        case .comment:        return "bubble.left.fill"
        case .follow:         return "person.fill.badge.plus"
        case .unfollow:       return "person.fill.badge.minus"
        case .badge:          return "star.fill"
        case .feedbackUpdate: return "bell.fill"
        case .system:         return "bell.fill"
        }
    }

    private var badgeColor: Color {
        switch notification.type {
        case .like:           return .byteRed
        case .comment:        return .byteAccent
        case .follow:         return .byteGreen
        case .unfollow:       return .byteOrange
        case .badge:          return .byteOrange
        case .feedbackUpdate: return .bytePurple
        case .system:         return .byteText2
        }
    }

    private var badgeBg: Color { badgeColor.opacity(0.12) }
    private var badgeStroke: Color { badgeColor.opacity(0.25) }

    // MARK: - Time formatter

    private static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private static let isoFormatterFallback: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    static func timeAgo(from iso: String) -> String {
        let date = isoFormatter.date(from: iso) ?? isoFormatterFallback.date(from: iso)
        guard let date else { return iso }
        let diff = Date().timeIntervalSince(date)
        switch diff {
        case ..<60:      return "just now"
        case ..<3600:    return "\(Int(diff/60))m ago"
        case ..<86400:   return "\(Int(diff/3600))h ago"
        default:         return "\(Int(diff/86400))d ago"
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

    func delete(id: String) async {
        let snapshot = notifications
        notifications.removeAll { $0.id == id }
        do {
            try await APIClient.shared.deleteNotification(notificationId: id)
        } catch {
            // Restore on failure
            notifications = snapshot
        }
    }
}

#Preview {
    NotificationsView()
}
