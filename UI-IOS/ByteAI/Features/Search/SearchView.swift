import SwiftUI

// MARK: - Search View
// Mirrors UI/components/features/search/search-screen.tsx
// Single search field with auto-detected intent:
//   "@xyz"  → PEOPLE
//   "?how to..." or "how/what/why/when/explain/is/are/does/can/should/will/where/which" → ASK
//   else    → BYTES
// User can override by tapping a mode chip.

enum SearchMode: String, CaseIterable, Identifiable {
    // Order is the visible mode-pill order: BYTES first, then ASK, then PEOPLE.
    case bytes, ask, people
    var id: String { rawValue }

    var label: String {
        switch self {
        case .bytes:  "BYTES"
        case .people: "PEOPLE"
        case .ask:    "ASK"
        }
    }

    var icon: String {
        switch self {
        case .bytes:  "magnifyingglass"
        case .people: "person.2"
        case .ask:    "sparkles"
        }
    }

    var placeholder: String {
        switch self {
        case .bytes:  "Find bytes by keyword or concept…"
        case .people: "Search for people by name or username…"
        case .ask:    "Ask anything about tech…"
        }
    }
}

private let QUESTION_STARTERS = [
    "how ", "what ", "why ", "when ", "explain ", "is ", "are ",
    "does ", "can ", "should ", "will ", "where ", "which "
]

private func detectIntent(_ q: String, askEnabled: Bool) -> SearchMode {
    let trimmed = q.trimmingCharacters(in: .whitespaces).lowercased()
    if trimmed.hasPrefix("@") { return .people }
    if askEnabled, trimmed.hasPrefix("?") || QUESTION_STARTERS.contains(where: { trimmed.hasPrefix($0) }) {
        return .ask
    }
    return .bytes
}

struct SearchView: View {
    @StateObject private var vm = SearchViewModel()
    @EnvironmentObject private var flags: FeatureFlagsManager
    @FocusState private var queryFocused: Bool

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                Color.byteBackground.ignoresSafeArea()
                    .dismissKeyboardOnTap()

                VStack(spacing: 0) {
                    searchBar
                    modeChips
                    Divider().background(Color.byteBorderHigh)
                    resultsList
                }
            }
            .navigationBarHidden(true)
        }
        .onAppear { vm.askEnabled = flags.isEnabled("ai-search-ask") }
        // Re-evaluate when flags refresh — initial flags fetch is async; without this the
        // ASK chip stays hidden if the flag arrives after first render.
        .onChange(of: flags.flags) { _, _ in
            vm.askEnabled = flags.isEnabled("ai-search-ask")
        }
    }

    private var searchBar: some View {
        HStack(spacing: 10) {
            Image(systemName: vm.mode.icon)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(queryFocused ? .byteAccent : .byteText2)
            TextField(vm.mode.placeholder, text: $vm.query)
                .font(.byteBodyMedium)
                .foregroundColor(.byteText1)
                .tint(.byteAccent)
                .focused($queryFocused)
                .submitLabel(.search)
                .onSubmit { Task { await vm.search() } }
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .onChange(of: vm.query) { _, q in
                    // Empty input → reset to a fresh "pre-search" state, drop any
                    // pinned mode override so detectIntent runs again next time.
                    if q.isEmpty {
                        vm.userPinnedMode = false
                        vm.mode = .bytes
                        vm.resetResults()
                    } else {
                        if !vm.userPinnedMode {
                            vm.mode = detectIntent(q, askEnabled: vm.askEnabled)
                        }
                        // Web parity: typing AFTER a search clears stale results
                        // so the user isn't comparing new input against old hits.
                        if vm.hasSearched { vm.resetResults() }
                    }
                }
            if !vm.query.isEmpty {
                Button {
                    vm.query = ""
                    vm.userPinnedMode = false
                    vm.resetResults()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.byteText3)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("Clear search")
            }
            // Mode badge — mirrors the web `cfg.badgeClass` pill that signals
            // which surface is being searched (BYTES / PEOPLE / ASK AI).
            Text(vm.mode == .ask ? "ASK AI" : vm.mode.label)
                .font(.byteMono(9, weight: .bold))
                .tracking(0.6)
                .foregroundColor(.byteAccent)
                .padding(.horizontal, 7).padding(.vertical, 2)
                .background(IdentityColor.blue.bgActive)
                .overlay(
                    RoundedRectangle(cornerRadius: 5)
                        .stroke(Color.byteAccent, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 5))
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(IdentityColor.blue.bgFaint)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(queryFocused ? .byteAccent : IdentityColor.blue.borderFaint, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .shadow(color: queryFocused ? IdentityColor.blue.tint(0.14) : .clear, radius: 6)
        .padding(.horizontal, 16)
        .padding(.top, 12)
    }

    private var modeChips: some View {
        HStack(spacing: 8) {
            ForEach(visibleModes, id: \.self) { mode in
                Button {
                    withAnimation(.easeInOut(duration: 0.15)) {
                        vm.userPinnedMode = true
                        vm.mode = mode
                        // Web parity: switching mode wipes the previous mode's
                        // results so the user isn't looking at byte rows after
                        // toggling to PEOPLE.
                        vm.resetResults()
                        queryFocused = true
                    }
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: mode.icon).font(.system(size: 11))
                        Text(mode.label).font(.byteMono(11, weight: vm.mode == mode ? .bold : .regular))
                    }
                    .tracking(0.5)
                    .foregroundColor(vm.mode == mode ? .byteAccent : .byteText1)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(vm.mode == mode ? IdentityColor.blue.bgActive : IdentityColor.blue.bgFaint)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(vm.mode == mode ? .byteAccent : IdentityColor.blue.borderFaint, lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .shadow(color: vm.mode == mode ? IdentityColor.blue.tint(0.20) : .clear, radius: 6)
                }
                .buttonStyle(.plain)
                .frame(minHeight: 36)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.top, 10)
        .padding(.bottom, 12)
    }

    private var visibleModes: [SearchMode] {
        vm.askEnabled ? SearchMode.allCases : [.bytes, .people]
    }

    @ViewBuilder
    private var resultsList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                // Web parity: pre-search state (empty query OR not-yet-searched)
                // shows trending suggestions instead of an empty results list.
                if vm.query.isEmpty || !vm.hasSearched {
                    suggestions
                } else if vm.isLoading {
                    HStack {
                        ByteSpinner(size: 22)
                        MonoStatusLine(text: vm.mode == .ask ? "THINKING…" : "SEARCHING…", pulsing: true)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 40)
                } else if let err = vm.error {
                    EmptyStateView(icon: "exclamationmark.triangle", title: "Search failed", message: err)
                        .padding(.horizontal, 16)
                } else {
                    switch vm.mode {
                    case .bytes:  bytesResults
                    case .people: peopleResults
                    case .ask:    askResults
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
        }
    }

    @ViewBuilder
    private var suggestions: some View {
        // Pre-search hints are scoped per mode:
        //   • BYTES → "TRENDING SEARCHES" with topic chips.
        //   • ASK   → "TRY ASKING" with example questions.
        //   • PEOPLE → nothing (clean empty canvas — user types `@handle`).
        if vm.mode == .people {
            EmptyView()
        } else {
            VStack(alignment: .leading, spacing: 14) {
                AccentBarHeader(label: vm.mode == .ask ? "TRY ASKING" : "TRENDING SEARCHES", size: .compact)
                ForEach(suggestionItems, id: \.self) { item in
                    Button { vm.query = item; Task { await vm.search() } } label: {
                        HStack(spacing: 10) {
                            Image(systemName: vm.mode == .ask ? "sparkles" : "arrow.up.right")
                                .font(.system(size: 12))
                                .foregroundColor(.byteAccent)
                            Text(item)
                                .font(.byteBodySmall)
                                .foregroundColor(.byteText1)
                                .multilineTextAlignment(.leading)
                            Spacer()
                        }
                        .padding(12)
                        .background(IdentityColor.blue.bgFaint)
                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(IdentityColor.blue.borderFaint, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)
                    .frame(minHeight: 44)
                }
            }
        }
    }

    private var suggestionItems: [String] {
        switch vm.mode {
        case .ask:
            return [
                "What's the difference between useEffect and useLayoutEffect?",
                "When should I use PostgreSQL over MongoDB?",
                "How does Rust's borrow checker prevent data races?"
            ]
        case .bytes:
            return ["react server components", "go concurrency", "postgresql indexes", "rust ownership"]
        case .people:
            return []
        }
    }

    @ViewBuilder
    private var bytesResults: some View {
        if vm.posts.isEmpty {
            EmptyStateView(icon: "magnifyingglass", title: "No results",
                           message: "Try different keywords or switch to ASK mode.")
        } else {
            ForEach(vm.posts) { post in PostCardView(post: post) }
        }
    }

    @ViewBuilder
    private var peopleResults: some View {
        if vm.people.isEmpty {
            EmptyStateView(icon: "person.slash", title: "No people found",
                           message: "Try a different name or username.")
        } else {
            ForEach(vm.people) { person in
                NavigationLink(destination: ProfileView(username: person.username)) {
                    PersonRow(person: person)
                }
                .buttonStyle(.plain)
            }
        }
    }

    @ViewBuilder
    private var askResults: some View {
        if vm.askAnswer.isEmpty && vm.askSources.isEmpty && !vm.isStreamingAsk {
            EmptyStateView(icon: "sparkles", title: "No answer yet",
                           message: "Ask a question — I'll search across all bytes.")
        } else {
            ScrollViewReader { proxy in
                VStack(alignment: .leading, spacing: 14) {
                    HStack(spacing: 6) {
                        Image(systemName: "sparkles").foregroundColor(.byteAccent)
                        Text("AI ANSWER")
                            .font(.byteMono(10, weight: .bold))
                            .foregroundColor(.byteAccent)
                            .tracking(1.0)
                        if vm.isStreamingAsk {
                            Circle()
                                .fill(Color.byteAccent)
                                .frame(width: 6, height: 6)
                                .opacity(0.8)
                                .scaleEffect(vm.isStreamingAsk ? 1.0 : 0.6)
                                .animation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true), value: vm.isStreamingAsk)
                        }
                    }

                    MarkdownAnswerView(
                        text: vm.askAnswer,
                        onCite: { n in
                            withAnimation(.spring(response: 0.4, dampingFraction: 0.85)) {
                                proxy.scrollTo("rag-source-\(n)", anchor: .center)
                            }
                        }
                    )
                    .padding(14)
                    .background(Color.byteCard)
                    .overlay(RoundedRectangle(cornerRadius: 12)
                        .stroke(IdentityColor.blue.tint(0.3), lineWidth: 1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                    if !vm.askSources.isEmpty {
                        AccentBarHeader(label: "SOURCES", size: .compact)
                        ForEach(Array(vm.askSources.enumerated()), id: \.element.id) { idx, src in
                            HStack(spacing: 10) {
                                Text("[\(idx + 1)]")
                                    .font(.byteMono(10, weight: .bold))
                                    .foregroundColor(.byteAccent)
                                    .frame(width: 24, alignment: .leading)
                                RoundedRectangle(cornerRadius: 2).fill(Color.byteAccent).frame(width: 2, height: 36)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(src.title)
                                        .font(.byteSans(13, weight: .semibold))
                                        .foregroundColor(.byteText1)
                                        .lineLimit(2)
                                    Text(src.contentType.uppercased())
                                        .font(.byteMono(10))
                                        .foregroundColor(.byteText3)
                                        .tracking(0.5)
                                }
                                Spacer()
                            }
                            .padding(10)
                            .background(Color.byteElement)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                            .id("rag-source-\(idx + 1)")
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Markdown answer renderer
// Inline markdown: **bold** → accent; `code` → accent inline pill;
// "- " / "* " / "• " bullets, "1. " numbered lists, paragraphs.

private struct MarkdownAnswerView: View {
    let text: String
    var onCite: ((Int) -> Void)? = nil

    private var lines: [String] {
        text.components(separatedBy: "\n").map { $0.trimmingCharacters(in: .whitespaces) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(Array(lines.enumerated()), id: \.offset) { _, line in
                if line.isEmpty {
                    EmptyView()
                } else if let m = bulletMatch(line) {
                    HStack(alignment: .top, spacing: 10) {
                        Circle().fill(Color.byteAccent).frame(width: 5, height: 5).padding(.top, 8)
                        renderInlineRow(m)
                    }
                } else if let (num, body) = numberMatch(line) {
                    HStack(alignment: .top, spacing: 10) {
                        Text("\(num).")
                            .font(.byteMono(10, weight: .bold))
                            .foregroundColor(.byteAccent)
                            .frame(width: 16, alignment: .trailing)
                            .padding(.top, 2)
                        renderInlineRow(body)
                    }
                } else {
                    renderInlineRow(line)
                }
            }
        }
        .font(.byteBodySmall)
    }

    /// Splits a line on `[N]` citation markers; renders each non-citation chunk via
    /// the existing styled-Text path, and each `[N]` as a tappable chip. We can't put
    /// a Button inside a `Text` concatenation, so we drop into HStack at the line level.
    @ViewBuilder
    private func renderInlineRow(_ s: String) -> some View {
        let segments = splitCitations(s)
        // If the whole line has no citations, fall back to the more compact single-Text
        // path so wrap behavior matches the previous version.
        if segments.allSatisfy({ if case .text = $0 { return true } else { return false } }) {
            renderInline(s).foregroundColor(.byteText1)
        } else {
            // FlowLayout-ish horizontal wrap; SwiftUI doesn't ship one so use HStack with
            // wrap-via-fixedSize. For long answers a wrapping flow is preferable, but
            // citations land at end-of-clauses so this stays readable.
            HStack(alignment: .firstTextBaseline, spacing: 0) {
                ForEach(Array(segments.enumerated()), id: \.offset) { _, seg in
                    switch seg {
                    case .text(let t):
                        renderInline(t).foregroundColor(.byteText1)
                    case .cite(let n):
                        Button { onCite?(n) } label: {
                            Text("[\(n)]")
                                .font(.byteMono(10, weight: .bold))
                                .foregroundColor(.byteAccent)
                                .padding(.horizontal, 5).padding(.vertical, 1)
                                .background(IdentityColor.blue.bgFaint)
                                .overlay(RoundedRectangle(cornerRadius: 4).stroke(IdentityColor.blue.tint(0.35), lineWidth: 1))
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Jump to source \(n)")
                    }
                }
            }
        }
    }

    private enum InlineSegment { case text(String); case cite(Int) }

    private func splitCitations(_ s: String) -> [InlineSegment] {
        var out: [InlineSegment] = []
        var buffer = ""
        var i = s.startIndex
        while i < s.endIndex {
            if s[i] == "[",
               let close = s[s.index(after: i)...].firstIndex(of: "]"),
               let num = Int(s[s.index(after: i)..<close]) {
                if !buffer.isEmpty { out.append(.text(buffer)); buffer = "" }
                out.append(.cite(num))
                i = s.index(after: close)
            } else {
                buffer.append(s[i])
                i = s.index(after: i)
            }
        }
        if !buffer.isEmpty { out.append(.text(buffer)) }
        return out
    }

    private func bulletMatch(_ line: String) -> String? {
        for prefix in ["- ", "• ", "* "] {
            if line.hasPrefix(prefix) { return String(line.dropFirst(prefix.count)) }
        }
        return nil
    }

    private func numberMatch(_ line: String) -> (Int, String)? {
        guard let dot = line.firstIndex(where: { $0 == "." || $0 == ")" }) else { return nil }
        let head = line[..<dot]
        guard let num = Int(head) else { return nil }
        let body = line[line.index(after: dot)...].drop(while: { $0 == " " })
        return (num, String(body))
    }

    /// Tokenise on **bold** and `code` runs, return concatenated styled Text.
    private func renderInline(_ s: String) -> Text {
        var output = Text("")
        var i = s.startIndex
        while i < s.endIndex {
            if s[i] == "*", let end = nextDoubleStar(in: s, from: s.index(i, offsetBy: 2, limitedBy: s.endIndex) ?? s.endIndex) {
                let segment = String(s[s.index(i, offsetBy: 2)..<end])
                output = output + Text(segment).fontWeight(.semibold).foregroundColor(.byteAccent)
                i = s.index(end, offsetBy: 2, limitedBy: s.endIndex) ?? s.endIndex
            } else if s[i] == "`", let end = s[s.index(after: i)...].firstIndex(of: "`") {
                let segment = String(s[s.index(after: i)..<end])
                output = output + Text(segment).font(.byteTerminalSmall).foregroundColor(.byteAccent)
                i = s.index(after: end)
            } else {
                let next = s[i...].firstIndex(where: { $0 == "*" || $0 == "`" }) ?? s.endIndex
                output = output + Text(String(s[i..<next]))
                i = next
            }
        }
        return output
    }

    private func nextDoubleStar(in s: String, from start: String.Index) -> String.Index? {
        var i = start
        while i < s.endIndex {
            if s[i] == "*", s.index(after: i) < s.endIndex, s[s.index(after: i)] == "*" { return i }
            i = s.index(after: i)
        }
        return nil
    }
}

// MARK: - Person row

private struct PersonRow: View {
    let person: PersonResult

    var body: some View {
        HStack(spacing: 12) {
            AvatarView(person.initials, variant: AvatarVariant(rawValue: person.avatarVariant) ?? .cyan, size: .md)
            VStack(alignment: .leading, spacing: 2) {
                Text(person.displayName)
                    .font(.byteSans(14, weight: .semibold))
                    .foregroundColor(.byteText1)
                Text("@\(person.username)")
                    .font(.byteTerminalSmall)
                    .foregroundColor(.byteText2)
                if !person.role.isEmpty {
                    Text(person.role)
                        .font(.byteTerminalSmall)
                        .foregroundColor(.byteText2)
                }
            }
            Spacer()
            Text("\(person.followers) followers")
                .font(.byteTerminalSmall)
                .foregroundColor(.byteText2)
        }
        .padding(12)
        .background(Color.byteCard)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.byteBorderHigh, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - ViewModel

@MainActor
final class SearchViewModel: ObservableObject {
    @Published var query = ""
    @Published var mode: SearchMode = .bytes
    /// True once the user explicitly taps a mode chip — prevents detectIntent() from
    /// overriding their choice on subsequent keystrokes. Reset when query is cleared.
    var userPinnedMode = false
    @Published var posts: [Post] = []
    @Published var people: [PersonResult] = []
    /// Streaming RAG answer accumulated as `chunk` events arrive.
    @Published var askAnswer: String = ""
    @Published var askSources: [SearchAskSource] = []
    @Published var isStreamingAsk = false
    @Published var isLoading = false
    @Published var error: String?
    @Published var askEnabled = false
    /// Mirrors the web `hasSearched` flag — flips true after a query is run.
    /// Drives the empty-state vs results-list switch and lets `resetResults()`
    /// clear stale hits when the query or mode changes mid-flight.
    @Published var hasSearched = false

    private var askStreamTask: Task<Void, Never>?

    func cancelAskStream() {
        askStreamTask?.cancel()
        askStreamTask = nil
        isStreamingAsk = false
    }

    /// Drops every result list back to its empty state. Used on:
    ///  • query cleared via the X button
    ///  • query changed AFTER a search has already run
    ///  • mode chip switched
    func resetResults() {
        cancelAskStream()
        posts = []
        people = []
        askAnswer = ""
        askSources = []
        hasSearched = false
        error = nil
    }

    func search() async {
        let trimmed = query.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }

        isLoading = true
        error = nil
        hasSearched = true
        defer { isLoading = false }

        // Strip the magic prefixes that toggle modes; backend expects plain text.
        let cleanQuery: String = {
            switch mode {
            case .people:
                return trimmed.hasPrefix("@") ? String(trimmed.dropFirst()).trimmingCharacters(in: .whitespaces) : trimmed
            case .ask:
                return trimmed.hasPrefix("?") ? String(trimmed.dropFirst()).trimmingCharacters(in: .whitespaces) : trimmed
            case .bytes:
                return trimmed
            }
        }()
        guard !cleanQuery.isEmpty else { return }

        do {
            switch mode {
            case .ask:
                // First token paints in ~400ms instead of waiting for the full Gemini round-trip.
                cancelAskStream()
                askAnswer = ""
                askSources = []
                isStreamingAsk = true
                // Drop the spinner once the stream has been initiated — chunks fill the answer card directly.
                isLoading = false
                let stream = await APIClient.shared.searchAskStream(question: cleanQuery, type: "bytes")
                askStreamTask = Task { [weak self] in
                    do {
                        for try await event in stream {
                            guard let self else { return }
                            await MainActor.run {
                                switch event {
                                case .sources(let s): self.askSources = s
                                case .chunk(let t):   self.askAnswer.append(t)
                                case .done:           self.isStreamingAsk = false
                                }
                            }
                        }
                    } catch let err {
                        await MainActor.run {
                            self?.isStreamingAsk = false
                            ToastCenter.shared.show(error: err, context: "Search failed")
                        }
                    }
                }
            case .people:
                people = try await APIClient.shared.searchPeople(query: cleanQuery)
            case .bytes:
                posts = try await APIClient.shared.search(query: cleanQuery, type: "Bytes")
            }
        } catch {
            self.error = APIError.userMessage(from: error)
        }
    }
}

#Preview {
    SearchView()
        .environmentObject(FeatureFlagsManager.shared)
}
