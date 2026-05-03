import SwiftUI

struct BlockedUsersView: View {
    @State private var users: [APIClient.BlockedUserDTO] = []
    @State private var loading: Bool = true

    var body: some View {
        Group {
            if loading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if users.isEmpty {
                ContentUnavailableView(
                    "No blocked users",
                    systemImage: "hand.raised.slash",
                    description: Text("People you block will appear here.")
                )
            } else {
                List {
                    ForEach(users) { user in
                        HStack(spacing: 12) {
                            avatar(for: user)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(user.displayName.isEmpty ? user.username : user.displayName)
                                    .font(.subheadline.weight(.semibold))
                                Text("@\(user.username)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                            Button("Unblock") { Task { await unblock(user) } }
                                .tint(.green)
                        }
                    }
                }
            }
        }
        .navigationTitle("Blocked Users")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
    }

    private func avatar(for user: APIClient.BlockedUserDTO) -> some View {
        Group {
            if let url = user.avatarUrl, let parsed = URL(string: url) {
                AsyncImage(url: parsed) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Color.gray.opacity(0.2)
                }
            } else {
                ZStack {
                    Color.gray.opacity(0.2)
                    Text(String(user.username.prefix(2)).uppercased())
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(width: 36, height: 36)
        .clipShape(Circle())
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            users = try await APIClient.shared.getBlockedUsers(page: 1, pageSize: 50)
        } catch {
            ToastCenter.shared.show("Couldn't load blocked users", kind: .error)
        }
    }

    private func unblock(_ user: APIClient.BlockedUserDTO) async {
        do {
            try await APIClient.shared.unblockUser(user.id)
            users.removeAll { $0.id == user.id }
            ToastCenter.shared.show("Unblocked @\(user.username)")
        } catch {
            ToastCenter.shared.show("Couldn't unblock", kind: .error)
        }
    }
}
