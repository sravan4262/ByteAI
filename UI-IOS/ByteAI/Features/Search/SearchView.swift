import SwiftUI

// MARK: - Search View
// Mirrors /(app)/search/page.tsx — keyword + AI Ask (RAG) modes

struct SearchView: View {
    @StateObject private var vm = SearchViewModel()

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteBackground.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Search bar
                    SearchBar(vm: vm)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)

                    // Type tabs (Bytes / Interviews / People)
                    SearchTypeBar(selected: $vm.searchType)
                        .padding(.horizontal, 16)
                        .padding(.bottom, 8)

                    // Mode toggle (Keyword / Ask AI)
                    SearchModeToggle(mode: $vm.mode)
                        .padding(.horizontal, 16)
                        .padding(.bottom, 12)

                    Divider().background(Color.byteBorderMedium)

                    // Results
                    ScrollView {
                        if vm.mode == .ask {
                            AskResultView(vm: vm)
                                .padding(16)
                        } else {
                            KeywordResultView(vm: vm)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                        }
                    }
                }
            }
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.byteBackground, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }
}

// MARK: - Search Bar

private struct SearchBar: View {
    @ObservedObject var vm: SearchViewModel
    @FocusState private var isFocused: Bool

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 14))
                .foregroundColor(isFocused ? .byteAccent : .byteText2)

            TextField(
                vm.mode == .ask ? "Ask anything about tech..." : "Search bytes, people...",
                text: $vm.query
            )
            .font(.byteBody)
            .foregroundColor(.byteText1)
            .tint(.byteAccent)
            .focused($isFocused)
            .submitLabel(.search)
            .onSubmit { Task { await vm.search() } }

            if !vm.query.isEmpty {
                Button { vm.query = "" } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.byteText3)
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color.byteElement)
        .cornerRadius(10)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(isFocused ? Color.byteAccent.opacity(0.5) : Color.byteBorderMedium, lineWidth: 1)
        )
        .animation(.easeInOut(duration: 0.15), value: isFocused)
    }
}

// MARK: - Type Bar

private struct SearchTypeBar: View {
    @Binding var selected: SearchType

    var body: some View {
        HStack(spacing: 6) {
            ForEach(SearchType.allCases, id: \.self) { type in
                Button {
                    withAnimation(.easeInOut(duration: 0.15)) { selected = type }
                } label: {
                    Text(type.rawValue)
                        .font(.byteMono(10, weight: .semibold))
                        .foregroundColor(selected == type ? .byteAccent : .byteText2)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(
                            RoundedRectangle(cornerRadius: 6)
                                .fill(selected == type ? Color.byteAccentDim : Color.clear)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 6)
                                        .stroke(selected == type ? Color.byteAccent.opacity(0.4) : Color.clear, lineWidth: 1)
                                )
                        )
                }
            }
            Spacer()
        }
    }
}

// MARK: - Mode Toggle

enum SearchMode: String { case keyword = "KEYWORD", ask = "ASK AI" }

private struct SearchModeToggle: View {
    @Binding var mode: SearchMode

    var body: some View {
        HStack(spacing: 0) {
            ForEach([SearchMode.keyword, .ask], id: \.rawValue) { m in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { mode = m }
                } label: {
                    HStack(spacing: 4) {
                        if m == .ask {
                            Image(systemName: "sparkles")
                                .font(.system(size: 10))
                                .foregroundColor(mode == m ? .byteAccent : .byteText3)
                        }
                        Text(m.rawValue)
                            .font(.byteMono(10, weight: .semibold))
                            .foregroundColor(mode == m ? .byteText1 : .byteText3)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 7)
                    .background(mode == m ? Color.byteElement : Color.clear)
                }
            }
        }
        .background(Color.byteCard)
        .cornerRadius(8)
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.byteBorderMedium, lineWidth: 1))
    }
}

// MARK: - Keyword Result View

private struct KeywordResultView: View {
    @ObservedObject var vm: SearchViewModel

    var body: some View {
        LazyVStack(spacing: 12) {
            if vm.query.isEmpty {
                // Recent searches / suggestions
                VStack(alignment: .leading, spacing: 16) {
                    Text("TRENDING SEARCHES")
                        .font(.byteMonoTiny)
                        .foregroundColor(.byteText3)
                        .tracking(1)

                    ForEach(["react server components", "go concurrency", "postgresql indexes", "rust ownership"], id: \.self) { term in
                        HStack {
                            Image(systemName: "arrow.up.right")
                                .font(.system(size: 11))
                                .foregroundColor(.byteText3)
                            Text(term)
                                .font(.byteBody)
                                .foregroundColor(.byteText2)
                            Spacer()
                        }
                        .padding(.vertical, 6)
                        .onTapGesture {
                            vm.query = term
                            Task { await vm.search() }
                        }
                    }
                }
            } else if vm.isLoading {
                ForEach(0..<3, id: \.self) { _ in PostCardSkeleton() }
            } else if let err = vm.error {
                EmptyStateView(icon: "exclamationmark.triangle", title: "Search failed", message: err)
            } else if vm.searchType == .people {
                if vm.peopleResults.isEmpty && !vm.query.isEmpty {
                    EmptyStateView(icon: "person.slash", title: "No people found", message: "Try a different name or username.")
                } else {
                    ForEach(vm.peopleResults) { person in
                        PersonRow(person: person)
                    }
                }
            } else if vm.results.isEmpty && !vm.query.isEmpty {
                EmptyStateView(icon: "magnifyingglass", title: "No results", message: "Try different keywords or switch to Ask AI mode.")
            } else {
                ForEach(vm.results) { post in PostCardView(post: post) }
            }
        }
    }
}

// MARK: - Ask AI Result View

private struct AskResultView: View {
    @ObservedObject var vm: SearchViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            if vm.query.isEmpty {
                // Prompt suggestions
                VStack(alignment: .leading, spacing: 12) {
                    Text("TRY ASKING")
                        .font(.byteMonoTiny)
                        .foregroundColor(.byteText3)
                        .tracking(1)

                    ForEach([
                        "What's the difference between useEffect and useLayoutEffect?",
                        "When should I use PostgreSQL over MongoDB?",
                        "How does Rust's borrow checker prevent data races?"
                    ], id: \.self) { suggestion in
                        HStack(spacing: 10) {
                            Image(systemName: "sparkles")
                                .font(.system(size: 12))
                                .foregroundColor(.byteAccent)
                            Text(suggestion)
                                .font(.byteBody)
                                .foregroundColor(.byteText2)
                                .multilineTextAlignment(.leading)
                            Spacer()
                        }
                        .padding(12)
                        .background(Color.byteCard)
                        .cornerRadius(8)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.byteBorderMedium, lineWidth: 1))
                        .onTapGesture {
                            vm.query = suggestion
                            Task { await vm.search() }
                        }
                    }
                }
            } else if vm.isLoading {
                VStack(spacing: 12) {
                    ByteSpinner(size: 28)
                    Text("Searching across all bytes...")
                        .font(.byteMonoSmall)
                        .foregroundColor(.byteText2)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 40)
            } else if let result = vm.askResult {
                // AI Answer
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 6) {
                        Image(systemName: "sparkles")
                            .foregroundColor(.byteAccent)
                        Text("AI ANSWER")
                            .font(.byteMono(10, weight: .bold))
                            .foregroundColor(.byteAccent)
                            .tracking(1)
                    }

                    Text(result.answer)
                        .font(.byteBody)
                        .foregroundColor(.byteText1)
                        .lineSpacing(4)
                        .padding(14)
                        .background(Color.byteCard)
                        .cornerRadius(10)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Color.byteAccent.opacity(0.3), lineWidth: 1)
                        )

                    if !result.sources.isEmpty {
                        Text("SOURCES")
                            .font(.byteMonoTiny)
                            .foregroundColor(.byteText3)
                            .tracking(1)
                            .padding(.top, 4)

                        ForEach(result.sources) { post in
                            HStack(spacing: 10) {
                                RoundedRectangle(cornerRadius: 2)
                                    .fill(Color.byteAccent)
                                    .frame(width: 2)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(post.title)
                                        .font(.byteSans(13, weight: .medium))
                                        .foregroundColor(.byteText1)
                                        .lineLimit(1)
                                    Text("by @\(post.author.username)")
                                        .font(.byteMonoTiny)
                                        .foregroundColor(.byteText3)
                                }
                            }
                            .padding(10)
                            .background(Color.byteElement)
                            .cornerRadius(8)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Person Row

private struct PersonRow: View {
    let person: PersonResult
    var body: some View {
        HStack(spacing: 12) {
            AvatarView(person.initials, variant: AvatarVariant(rawValue: person.avatarVariant) ?? .cyan, size: .md)
            VStack(alignment: .leading, spacing: 2) {
                Text(person.displayName).font(.byteSans(14, weight: .semibold)).foregroundColor(.byteText1)
                Text("@\(person.username)").font(.byteMonoTiny).foregroundColor(.byteText3)
                if !person.role.isEmpty {
                    Text(person.role).font(.byteMonoTiny).foregroundColor(.byteText3)
                }
            }
            Spacer()
            Text("\(person.followers) followers").font(.byteMonoTiny).foregroundColor(.byteText3)
        }
        .padding(12)
        .background(Color.byteCard)
        .cornerRadius(10)
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.byteBorderMedium, lineWidth: 1))
    }
}

// MARK: - ViewModel

@MainActor
final class SearchViewModel: ObservableObject {
    @Published var query = ""
    @Published var mode: SearchMode = .keyword
    @Published var searchType: SearchType = .bytes
    @Published var results: [Post] = []
    @Published var peopleResults: [PersonResult] = []
    @Published var askResult: AskResult?
    @Published var isLoading = false
    @Published var error: String?

    func search() async {
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            if mode == .ask {
                askResult = try await APIClient.shared.searchAsk(question: query)
            } else if searchType == .people {
                peopleResults = try await APIClient.shared.searchPeople(query: query)
            } else {
                results = try await APIClient.shared.search(query: query, type: searchType.rawValue)
            }
        } catch {
            self.error = error.localizedDescription
        }
    }
}

#Preview {
    SearchView()
}
