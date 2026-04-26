import SwiftUI

// MARK: - Drafts List View
// Lists user drafts; tap to load into ComposeView (via callback/binding); swipe to delete.

struct DraftsListView: View {
    @StateObject private var vm = DraftsVM()
    @Environment(\.dismiss) private var dismiss
    var onSelect: ((Draft) -> Void)?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteBackground.ignoresSafeArea()

                if vm.isLoading && vm.drafts.isEmpty {
                    VStack(spacing: 8) {
                        ForEach(0..<4, id: \.self) { _ in
                            RowSkeleton(hasSubtitle: true, titleWidth: 180, subtitleWidth: 240)
                                .padding(.horizontal, 16)
                        }
                        Spacer()
                    }
                    .padding(.vertical, 12)
                    .redacted(reason: .placeholder)
                    .accessibilityHidden(true)
                } else if vm.drafts.isEmpty {
                    EmptyStateView(
                        icon: "tray",
                        title: "No drafts",
                        message: "Drafts you save while composing will appear here."
                    )
                } else {
                    List {
                        ForEach(vm.drafts) { draft in
                            DraftRow(draft: draft)
                                .listRowBackground(Color.byteCard)
                                .listRowSeparatorTint(Color.byteBorder)
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    onSelect?(draft)
                                    dismiss()
                                }
                                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                    Button(role: .destructive) {
                                        Task { await vm.delete(draft.id) }
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                }
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                    .refreshable { await vm.load() }
                }
            }
            .navigationTitle("Drafts")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.byteBackground, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }.foregroundColor(.byteAccent)
                }
            }
        }
        .task { await vm.load() }
    }
}

private struct DraftRow: View {
    let draft: Draft

    private static let isoPrimary: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]; return f
    }()
    private static let isoFallback: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime]; return f
    }()

    private var relativeUpdated: String {
        let date = Self.isoPrimary.date(from: draft.updatedAt) ?? Self.isoFallback.date(from: draft.updatedAt)
        guard let date else { return draft.updatedAt }
        let diff = Date().timeIntervalSince(date)
        switch diff {
        case ..<60:    return "just now"
        case ..<3600:  return "\(Int(diff/60))m ago"
        case ..<86400: return "\(Int(diff/3600))h ago"
        default:       return "\(Int(diff/86400))d ago"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(draft.title?.isEmpty == false ? draft.title! : "Untitled draft")
                .font(.byteSans(14, weight: .semibold))
                .foregroundColor(.byteText1)
                .lineLimit(1)
            if let body = draft.body, !body.isEmpty {
                Text(body)
                    .font(.byteSmall)
                    .foregroundColor(.byteText2)
                    .lineLimit(2)
            }
            Text("Updated \(relativeUpdated)")
                .font(.byteMonoTiny)
                .foregroundColor(.byteText3)
                .tracking(0.4)
        }
        .padding(.vertical, 6)
    }
}

@MainActor
final class DraftsVM: ObservableObject {
    @Published var drafts: [Draft] = []
    @Published var isLoading = false

    func load() async {
        isLoading = true; defer { isLoading = false }
        drafts = (try? await APIClient.shared.getMyDrafts()) ?? []
    }

    func delete(_ id: String) async {
        do {
            try await APIClient.shared.deleteDraft(id: id)
            drafts.removeAll { $0.id == id }
            Haptics.success()
        } catch {
            ToastCenter.shared.show("Couldn't delete draft", kind: .error)
        }
    }
}
