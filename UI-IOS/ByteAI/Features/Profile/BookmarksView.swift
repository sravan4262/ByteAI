import SwiftUI

// MARK: - Bookmarks View
// Web parity (UI/components/features/profile/profile-screen.tsx loads BOTH `getMyBookmarks`
// and `getMyInterviewBookmarks`). Two sub-tabs: BYTES (blue) · INTERVIEWS (purple).

enum BookmarksTab: String, CaseIterable, Identifiable {
    case bytes = "BYTES"
    case interviews = "INTERVIEWS"
    var id: String { rawValue }

    var identity: IdentityColor {
        switch self {
        case .bytes:      return .blue
        case .interviews: return .purple
        }
    }
}

struct BookmarksView: View {
    @StateObject private var vm = BookmarksVM()
    @Environment(\.dismiss) private var dismiss
    @State private var selectedPost: Post?
    @State private var selectedTab: BookmarksTab = .bytes

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteBackground.ignoresSafeArea()

                VStack(spacing: 0) {
                    BookmarksTabBar(selected: $selectedTab)
                        .padding(.horizontal, 16)
                        .padding(.top, 8)
                        .padding(.bottom, 12)

                    if vm.isLoading && vm.posts.isEmpty && vm.interviews.isEmpty {
                        ScrollView {
                            LazyVStack(spacing: 12) {
                                ForEach(0..<3, id: \.self) { _ in
                                    PostCardSkeleton().padding(.horizontal, 16)
                                }
                            }
                            .padding(.vertical, 12)
                        }
                        .redacted(reason: .placeholder)
                        .accessibilityHidden(true)
                    } else {
                        Group {
                            switch selectedTab {
                            case .bytes:
                                if vm.posts.isEmpty {
                                    EmptyStateView(
                                        icon: "bookmark",
                                        title: "No saved bytes",
                                        message: "Save bytes to revisit them later."
                                    )
                                } else {
                                    ScrollView {
                                        LazyVStack(spacing: 12) {
                                            ForEach(vm.posts) { post in
                                                Button { selectedPost = post } label: {
                                                    PostCardView(post: post)
                                                }
                                                .buttonStyle(.plain)
                                                .padding(.horizontal, 16)
                                            }
                                        }
                                        .padding(.vertical, 12)
                                    }
                                }
                            case .interviews:
                                if vm.interviews.isEmpty {
                                    EmptyStateView(
                                        icon: "bookmark",
                                        title: "No saved interviews",
                                        message: "Save interviews to revisit them later."
                                    )
                                } else {
                                    ScrollView {
                                        LazyVStack(spacing: 12) {
                                            ForEach(vm.interviews) { iv in
                                                NavigationLink {
                                                    InterviewDetailView(interviewId: iv.id)
                                                } label: {
                                                    SavedInterviewRow(interview: iv)
                                                }
                                                .buttonStyle(.plain)
                                                .padding(.horizontal, 16)
                                            }
                                        }
                                        .padding(.vertical, 12)
                                    }
                                }
                            }
                        }
                        .refreshable { await vm.load() }
                    }
                }
            }
            .navigationTitle("Saved")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.byteBackground, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }.foregroundColor(.byteAccent)
                }
            }
            .navigationDestination(item: $selectedPost) { PostDetailView(post: $0) }
        }
        .task { await vm.load() }
    }
}

private struct BookmarksTabBar: View {
    @Binding var selected: BookmarksTab

    var body: some View {
        HStack(spacing: 8) {
            ForEach(BookmarksTab.allCases) { tab in
                Button {
                    withAnimation(.easeInOut(duration: 0.15)) { selected = tab }
                } label: {
                    Text(tab.rawValue)
                        .font(.byteMono(11, weight: selected == tab ? .bold : .regular))
                        .tracking(0.7)
                        .foregroundColor(selected == tab ? tab.identity.solid : .byteText1)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 7)
                        .background(selected == tab ? tab.identity.bgActive : tab.identity.bgFaint)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(selected == tab ? tab.identity.solid : tab.identity.borderFaint, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .shadow(color: selected == tab ? tab.identity.tint(0.20) : .clear, radius: 6)
                }
                .buttonStyle(.plain)
                .frame(minHeight: 36)
            }
        }
    }
}

private struct SavedInterviewRow: View {
    let interview: Interview

    var body: some View {
        CardWithTopGradient {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    Image(systemName: "briefcase.fill")
                        .font(.system(size: 10))
                        .foregroundColor(.bytePurple)
                    Text("INTERVIEW")
                        .font(.byteMono(10, weight: .bold))
                        .tracking(0.7)
                        .foregroundColor(.bytePurple)
                    if let company = interview.company {
                        Text("·").foregroundColor(.byteText3)
                        Text(company)
                            .font(.byteMono(10, weight: .semibold))
                            .foregroundColor(.byteText2)
                    }
                    Spacer()
                }
                Text(interview.title)
                    .font(.byteSans(14, weight: .bold))
                    .foregroundColor(.byteText1)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                HStack(spacing: 12) {
                    Text("\(interview.questions.count) Q\(interview.questions.count == 1 ? "" : "s")")
                        .font(.byteMono(10))
                        .foregroundColor(.byteText2)
                    if let role = interview.role {
                        Text(role)
                            .font(.byteMono(10))
                            .foregroundColor(.byteText2)
                    }
                    if let location = interview.location {
                        HStack(spacing: 3) {
                            Image(systemName: "mappin").font(.system(size: 9))
                            Text(location).font(.byteMono(10))
                        }
                        .foregroundColor(.byteText2)
                    }
                }
            }
            .padding(14)
        }
    }
}

@MainActor
final class BookmarksVM: ObservableObject {
    @Published var posts: [Post] = []
    @Published var interviews: [Interview] = []
    @Published var isLoading = false

    func load() async {
        isLoading = true; defer { isLoading = false }
        async let p = APIClient.shared.getMyBookmarks()
        async let iv = APIClient.shared.getMyInterviewBookmarks()
        posts = (try? await p) ?? []
        interviews = (try? await iv) ?? []
    }
}
