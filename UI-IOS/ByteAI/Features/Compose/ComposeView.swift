import SwiftUI

// MARK: - Compose View
// Mirrors UI/components/features/compose/compose-screen.tsx + compose-interview-screen.tsx
// Two modes (Byte / Interview) with separate identity colors:
//   Byte      → blue (--accent)
//   Interview → purple (--purple)
// Required field markers (red *), validation toasts per missing field, rm pattern on Q deletion.

enum ComposeType: String, CaseIterable {
    case byte, interview

    var label: String {
        switch self {
        case .byte: "BYTE"
        case .interview: "INTERVIEW"
        }
    }

    var identity: IdentityColor {
        switch self {
        case .byte: .blue
        case .interview: .purple
        }
    }
}

struct ComposeView: View {
    @StateObject private var vm: ComposeViewModel
    @Environment(\.dismiss) private var dismiss

    init(initialType: ComposeType = .byte) {
        _vm = StateObject(wrappedValue: ComposeViewModel(initialType: initialType))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteBackground.ignoresSafeArea()
                    .dismissKeyboardOnTap()

                ScrollView {
                    VStack(spacing: 22) {
                        modeToggle

                        if vm.composeType == .byte {
                            ByteComposer(vm: vm)
                        } else {
                            InterviewComposer(vm: vm)
                        }

                        SubmitButton(
                            label: vm.composeType == .byte ? "POST BYTE" : "SUBMIT INTERVIEW",
                            identity: vm.composeType.identity,
                            isLoading: vm.isPosting,
                            isDisabled: !vm.canSubmit
                        ) {
                            Task {
                                await vm.post()
                                if vm.lastError == nil { dismiss() }
                            }
                        }
                        .padding(.top, 4)

                        // Inline draft save — bytes only; interviews do not support drafts.
                        if vm.composeType == .byte {
                            Button {
                                Task { await vm.saveDraft() }
                            } label: {
                                HStack(spacing: 6) {
                                    Image(systemName: "square.and.arrow.down")
                                        .font(.system(size: 13))
                                    Text(vm.draftId == nil ? "SAVE AS DRAFT" : "UPDATE DRAFT")
                                        .font(.byteMono(11, weight: .semibold))
                                        .tracking(0.6)
                                }
                                .foregroundColor(.byteText2)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(vm.composeType.identity.bgFaint)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(vm.composeType.identity.borderFaint, lineWidth: 1)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                            .buttonStyle(.plain)
                            .disabled(vm.isPosting)
                        }
                    }
                    .padding(16)
                }
            }
            .navigationTitle(vm.composeType == .byte ? "New Byte" : "New Interview")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.byteBackground, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("CANCEL") { dismiss() }
                        .font(.byteMono(11, weight: .semibold))
                        .tracking(0.5)
                        .foregroundColor(.byteText2)
                }
            }
        }
    }

    private var modeToggle: some View {
        HStack(spacing: 8) {
            ForEach(ComposeType.allCases, id: \.self) { type in
                Button {
                    withAnimation(.easeInOut(duration: 0.15)) { vm.composeType = type }
                } label: {
                    Text(type.label)
                        .font(.byteMono(11, weight: vm.composeType == type ? .bold : .regular))
                        .tracking(0.7)
                        .foregroundColor(vm.composeType == type ? type.identity.solid : .byteText1)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(vm.composeType == type ? type.identity.bgActive : type.identity.bgFaint)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(vm.composeType == type ? type.identity.solid : type.identity.borderFaint, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .shadow(color: vm.composeType == type ? type.identity.tint(0.20) : .clear, radius: 6)
                }
                .buttonStyle(.plain)
                .frame(minHeight: 44)
            }
        }
    }
}

// MARK: - Byte Composer (blue identity)

private struct ByteComposer: View {
    @ObservedObject var vm: ComposeViewModel
    @EnvironmentObject private var flags: FeatureFlagsManager

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            ComposeField(label: "TITLE", required: true, identity: .blue) {
                ComposeInput(text: $vm.title, placeholder: "What did you learn today?", identity: .blue)
            }

            ComposeField(label: "CONTENT", required: true, identity: .blue) {
                ComposeTextEditor(text: $vm.content,
                                  placeholder: "Share your insight, tip, or discovery…",
                                  minHeight: 140,
                                  identity: .blue)
                .onChange(of: vm.content) { _, _ in
                    if flags.isEnabled("reach-estimate") { vm.refreshReachEstimate() }
                }
            }

            // Optional code snippet
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    Image(systemName: "chevron.left.forwardslash.chevron.right")
                        .font(.system(size: 12))
                        .foregroundColor(.byteAccent)
                    Toggle(isOn: $vm.showCode.animation()) {
                        Text("ADD CODE SNIPPET")
                            .font(.byteMono(10, weight: .bold))
                            .foregroundColor(.byteText1)
                            .tracking(0.7)
                    }
                    .tint(.byteAccent)
                }

                if vm.showCode {
                    LanguagePicker(language: $vm.codeLanguage)
                    ComposeTextEditor(
                        text: $vm.codeContent,
                        placeholder: "// paste your code here…",
                        minHeight: 140,
                        identity: .blue,
                        mono: true,
                        codeBg: true
                    )
                }
            }

            ComposeField(label: "TECH STACK", required: true, identity: .blue) {
                VStack(alignment: .leading, spacing: 8) {
                    MultiSelectDropdown(
                        values: $vm.selectedTechStacks,
                        options: vm.techStackOptions,
                        placeholder: "SELECT TECH STACKS",
                        identity: .blue
                    )
                    .onChange(of: vm.selectedTechStacks) { _, _ in
                        if flags.isEnabled("reach-estimate") { vm.refreshReachEstimate() }
                    }
                    if !vm.selectedTechStacks.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(vm.selectedTechStacks, id: \.self) { name in
                                    let label = vm.techStackOptions.first(where: { $0.value == name })?.label ?? name
                                    HStack(spacing: 4) {
                                        Text(label)
                                            .font(.byteMono(11, weight: .bold))
                                            .tracking(0.5)
                                        Button {
                                            vm.selectedTechStacks.removeAll { $0 == name }
                                        } label: {
                                            Image(systemName: "xmark").font(.system(size: 9, weight: .bold))
                                        }
                                        .buttonStyle(.plain)
                                    }
                                    .foregroundColor(.byteAccent)
                                    .padding(.horizontal, 8).padding(.vertical, 4)
                                    .background(IdentityColor.blue.bgActive)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.byteAccent, lineWidth: 1)
                                    )
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                                }
                            }
                        }
                    }
                }
            }

            // Reach estimate (web parity: gated by `reach-estimate` flag).
            if flags.isEnabled("reach-estimate") {
                ReachEstimateCard(reach: vm.reachEstimate)
            }
        }
    }
}

private struct ReachEstimateCard: View {
    let reach: Int

    private var formatted: String {
        // 1,234 — match web's toLocaleString grouping.
        let f = NumberFormatter()
        f.numberStyle = .decimal
        return f.string(from: NSNumber(value: reach)) ?? "\(reach)"
    }

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                AccentBarHeader(label: "REACH EST", size: .compact)
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(formatted)
                        .font(.byteMono(20, weight: .bold))
                        .foregroundColor(.byteText1)
                    Text("↗")
                        .font(.byteMono(15, weight: .bold))
                        .foregroundColor(.byteGreen)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 1) {
                Text("devs who may")
                Text("see this byte")
            }
            .font(.byteMono(10))
            .foregroundColor(.byteText2)
        }
        .padding(.horizontal, 14).padding(.vertical, 12)
        .background(IdentityColor.blue.bgFaint)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(IdentityColor.blue.borderFaint, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Interview Composer (purple identity)

private struct InterviewComposer: View {
    @ObservedObject var vm: ComposeViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            // Anonymous toggle (web parity with compose-screen.tsx)
            AnonymousToggle(isAnonymous: $vm.isAnonymous)

            HStack(alignment: .top, spacing: 12) {
                ComposeField(label: "COMPANY", required: true, identity: .purple) {
                    CreatableDropdown(
                        value: $vm.company,
                        options: vm.companyOptions,
                        placeholder: "e.g. Meta",
                        identity: .purple
                    )
                }
                ComposeField(label: "ROLE", required: true, identity: .purple) {
                    CreatableDropdown(
                        value: $vm.interviewRole,
                        options: vm.roleOptions,
                        placeholder: "e.g. Senior SWE",
                        identity: .purple
                    )
                }
            }

            ComposeField(label: "LOCATION", required: true, identity: .purple) {
                CreatableDropdown(
                    value: $vm.location,
                    options: vm.locationOptionStrings,
                    placeholder: "e.g. San Francisco",
                    identity: .purple
                )
            }

            ComposeField(label: "DIFFICULTY", required: false, identity: .purple) {
                HStack(spacing: 8) {
                    ForEach([("easy", IdentityColor.green),
                             ("medium", IdentityColor.orange),
                             ("hard", IdentityColor.red)], id: \.0) { level, color in
                        Button { vm.difficulty = level } label: {
                            Text(level.uppercased())
                                .font(.byteMono(10, weight: vm.difficulty == level ? .bold : .regular))
                                .tracking(0.7)
                                .foregroundColor(vm.difficulty == level ? color.solid : .byteText1)
                                .padding(.horizontal, 14).padding(.vertical, 7)
                                .background(vm.difficulty == level ? color.bgActive : color.bgFaint)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(vm.difficulty == level ? color.solid : color.borderFaint, lineWidth: 1)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                        .buttonStyle(.plain)
                        .frame(minHeight: 36)
                    }
                    Spacer(minLength: 0)
                }
            }

            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    AccentBarHeader(label: "QUESTIONS", identity: .purple)
                    Spacer()
                    Text("\(vm.questions.count)")
                        .font(.byteMono(10))
                        .foregroundColor(.byteText2)
                }

                ForEach(vm.questions.indices, id: \.self) { i in
                    QuestionEditor(index: i, question: $vm.questions[i]) {
                        vm.questions.remove(at: i)
                    }
                }

                Button {
                    vm.questions.append(DraftQuestion())
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "plus")
                        Text("ADD QUESTION").tracking(0.7)
                    }
                    .font(.byteMono(11, weight: .semibold))
                    .foregroundColor(.bytePurple)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(IdentityColor.purple.bgFaint)
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(IdentityColor.purple.borderFaint, lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)
                .frame(minHeight: 44)
            }
        }
    }
}

// MARK: - Q&A pair editor

struct DraftQuestion: Identifiable {
    let id = UUID()
    var question = ""
    var answer = ""
}

private struct QuestionEditor: View {
    let index: Int
    @Binding var question: DraftQuestion
    let onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Q\(index + 1)")
                    .font(.byteMono(10, weight: .bold))
                    .foregroundColor(.bytePurple)
                    .tracking(0.5)
                    .padding(.horizontal, 6).padding(.vertical, 2)
                    .background(IdentityColor.purple.bgActive)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                Spacer()
                RmConfirmButton(onDelete: onDelete)
            }

            HStack(alignment: .top, spacing: 6) {
                Capsule().fill(Color.byteAccent).frame(width: 3, height: 14)
                Text("QUESTION")
                    .font(.byteMono(10, weight: .bold))
                    .foregroundColor(.byteText1)
                    .tracking(0.6)
            }
            ComposeTextEditor(
                text: $question.question,
                placeholder: "What did they ask?",
                minHeight: 60,
                identity: .blue
            )

            HStack(alignment: .top, spacing: 6) {
                Capsule().fill(Color.byteGreen).frame(width: 3, height: 14)
                Text("ANSWER")
                    .font(.byteMono(10, weight: .bold))
                    .foregroundColor(.byteText1)
                    .tracking(0.6)
            }
            ComposeTextEditor(
                text: $question.answer,
                placeholder: "How would you answer?",
                minHeight: 80,
                identity: .green
            )
        }
        .padding(14)
        .background(Color.byteCard)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.byteBorderHigh, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Inputs

private struct ComposeInput: View {
    @Binding var text: String
    let placeholder: String
    var identity: IdentityColor = .blue
    @FocusState private var focused: Bool

    var body: some View {
        TextField("", text: $text, prompt: Text(placeholder).foregroundColor(.byteText2))
            .font(.byteSans(14, weight: .medium))
            .foregroundColor(.byteText1)
            .tint(identity.solid)
            .focused($focused)
            .padding(.horizontal, 14).padding(.vertical, 11)
            .background(Color.byteElement)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(focused ? identity.solid : Color.byteBorderHigh, lineWidth: 1)
            )
            .shadow(color: focused ? identity.tint(0.14) : .clear, radius: 6)
            .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

private struct ComposeTextEditor: View {
    @Binding var text: String
    let placeholder: String
    var minHeight: CGFloat = 100
    var identity: IdentityColor = .blue
    var mono: Bool = false
    var codeBg: Bool = false
    @FocusState private var focused: Bool

    var body: some View {
        ZStack(alignment: .topLeading) {
            if text.isEmpty {
                Text(placeholder)
                    .font(mono ? .byteMono(12) : .byteSans(14))
                    .foregroundColor(.byteText2)
                    .padding(.horizontal, 14).padding(.vertical, 11)
            }
            TextEditor(text: $text)
                .font(mono ? .byteMono(12) : .byteSans(14))
                .foregroundColor(.byteText1)
                .tint(identity.solid)
                .scrollContentBackground(.hidden)
                .frame(minHeight: minHeight)
                .padding(.horizontal, 10).padding(.vertical, 4)
                .focused($focused)
        }
        .background(codeBg ? Color.byteCodeBg : Color.byteElement)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(focused ? identity.solid : Color.byteBorderHigh, lineWidth: 1)
        )
        .shadow(color: focused ? identity.tint(0.14) : .clear, radius: 6)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

private struct LanguagePicker: View {
    @Binding var language: String

    // Mirrors LANGUAGES in UI/components/ui/code-editor.tsx exactly.
    private static let options: [SearchableDropdown.DropdownOption] = [
        // Web frontend
        .init(value: "JS",     label: "JavaScript"),
        .init(value: "TS",     label: "TypeScript"),
        .init(value: "JSX",    label: "React JSX"),
        .init(value: "TSX",    label: "React TSX"),
        .init(value: "HTML",   label: "HTML"),
        .init(value: "CSS",    label: "CSS"),
        .init(value: "SCSS",   label: "SCSS"),
        // Backend
        .init(value: "PY",     label: "Python"),
        .init(value: "JAVA",   label: "Java"),
        .init(value: "CS",     label: "C#"),
        .init(value: "GO",     label: "Go"),
        .init(value: "RS",     label: "Rust"),
        .init(value: "RB",     label: "Ruby"),
        .init(value: "PHP",    label: "PHP"),
        .init(value: "SWIFT",  label: "Swift"),
        .init(value: "KT",     label: "Kotlin"),
        .init(value: "SCALA",  label: "Scala"),
        .init(value: "ELIXIR", label: "Elixir"),
        // Systems
        .init(value: "C",      label: "C"),
        .init(value: "CPP",    label: "C++"),
        .init(value: "RS_ASM", label: "Assembly"),
        // Mobile
        .init(value: "DART",   label: "Dart"),
        .init(value: "OBJC",   label: "Objective-C"),
        // Data / ML
        .init(value: "R",      label: "R"),
        .init(value: "SQL",    label: "SQL"),
        .init(value: "MATLAB", label: "MATLAB"),
        // Config / Markup
        .init(value: "JSON",   label: "JSON"),
        .init(value: "YAML",   label: "YAML"),
        .init(value: "TOML",   label: "TOML"),
        .init(value: "XML",    label: "XML"),
        .init(value: "MD",     label: "Markdown"),
        .init(value: "GQL",    label: "GraphQL"),
        // Scripting / DevOps
        .init(value: "BASH",   label: "Bash"),
        .init(value: "PS1",    label: "PowerShell"),
        .init(value: "LUA",    label: "Lua"),
        .init(value: "DOCKER", label: "Dockerfile"),
    ]

    private var optBinding: Binding<String?> {
        Binding(
            get: { language.isEmpty ? nil : language },
            set: { language = $0 ?? "TS" }
        )
    }

    var body: some View {
        SearchableDropdown(
            value: optBinding,
            options: Self.options,
            placeholder: "LANGUAGE",
            allLabel: "SELECT LANGUAGE",
            showAllOption: false,
            identity: .blue
        )
    }
}

// MARK: - Field wrapper with required marker

private struct ComposeField<Content: View>: View {
    let label: String
    var required: Bool = false
    var identity: IdentityColor = .blue
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Capsule().fill(identity.solid).frame(width: 3, height: 14)
                HStack(spacing: 4) {
                    Text(label)
                        .font(.byteMono(11, weight: .bold))
                        .foregroundColor(.byteText1)
                        .tracking(0.6)
                    if required {
                        Text("*")
                            .font(.byteMono(11, weight: .bold))
                            .foregroundColor(.byteRed)
                    }
                }
            }
            content()
        }
    }
}

// MARK: - Anonymous toggle (interview compose)

private struct AnonymousToggle: View {
    @Binding var isAnonymous: Bool

    var body: some View {
        Button {
            withAnimation(.easeInOut(duration: 0.18)) { isAnonymous.toggle() }
            if isAnonymous { Haptics.light() }
        } label: {
            HStack(spacing: 12) {
                Text("👻")
                    .font(.system(size: 20))
                    .opacity(isAnonymous ? 1 : 0.4)
                VStack(alignment: .leading, spacing: 3) {
                    Text(isAnonymous ? "POSTING ANONYMOUSLY" : "POST ANONYMOUSLY")
                        .font(.byteMono(10, weight: .bold))
                        .tracking(1.0)
                        .foregroundColor(isAnonymous ? .bytePurple : .byteText2)
                    Text(isAnonymous
                         ? "Your identity is hidden — only the content is visible"
                         : "Hide your identity — your name won't appear on this post")
                        .font(.byteMono(10))
                        .foregroundColor(.byteText2)
                        .multilineTextAlignment(.leading)
                        .lineLimit(2)
                }
                Spacer(minLength: 8)
                ZStack(alignment: isAnonymous ? .trailing : .leading) {
                    Capsule()
                        .fill(isAnonymous ? Color.bytePurple : Color.byteBorderMedium)
                        .frame(width: 36, height: 20)
                    Circle()
                        .fill(Color.white)
                        .frame(width: 14, height: 14)
                        .shadow(color: .black.opacity(0.2), radius: 1, y: 1)
                        .padding(3)
                }
                .frame(width: 36, height: 20)
            }
            .padding(.horizontal, 14).padding(.vertical, 12)
            .background(isAnonymous ? IdentityColor.purple.bgHover : Color.byteElement)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isAnonymous ? IdentityColor.purple.tint(0.5) : Color.byteBorderMedium, lineWidth: 1)
            )
            .shadow(color: isAnonymous ? IdentityColor.purple.tint(0.18) : .clear, radius: 8)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(isAnonymous ? "Posting anonymously" : "Post anonymously")
        .accessibilityHint("Toggle anonymous posting")
    }
}

// MARK: - Tag selector (legacy — kept for compatibility but no longer used in byte compose)

private struct TagSelector: View {
    @Binding var selectedTags: [String]
    var identity: IdentityColor = .blue
    private let allTags = ["react", "typescript", "go", "rust", "python", "postgresql",
                           "kubernetes", "swift", "system-design", "performance"]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(allTags, id: \.self) { tag in
                    let isSelected = selectedTags.contains(tag)
                    Button {
                        if isSelected { selectedTags.removeAll { $0 == tag } }
                        else { selectedTags.append(tag) }
                    } label: {
                        HStack(spacing: 4) {
                            Text(tag)
                            if isSelected { Text("✓") }
                        }
                        .font(.byteMono(11, weight: isSelected ? .bold : .regular))
                        .tracking(0.5)
                        .foregroundColor(isSelected ? identity.solid : .byteText1)
                        .padding(.horizontal, 10).padding(.vertical, 5)
                        .background(isSelected ? identity.bgActive : identity.bgFaint)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(isSelected ? identity.solid : identity.borderFaint, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

// MARK: - ViewModel

@MainActor
final class ComposeViewModel: ObservableObject {
    @Published var composeType: ComposeType
    @Published var title = ""
    @Published var content = ""
    @Published var showCode = false
    @Published var codeLanguage = "TS"
    @Published var codeContent = ""
    @Published var selectedTechStacks: [String] = []
    @Published var techStackOptions: [SearchableDropdown.DropdownOption] = []
    @Published var isPosting = false
    @Published var draftId: String?
    @Published var lastError: String?

    // Interview-specific
    @Published var company = ""
    @Published var interviewRole = ""
    @Published var location = ""
    @Published var companyOptions: [String] = []
    @Published var roleOptions: [String] = []
    @Published var locationOptionStrings: [String] = []
    @Published var difficulty = "medium"
    @Published var isAnonymous = false
    @Published var questions: [DraftQuestion] = [DraftQuestion()]

    // Reach estimate (gated by `reach-estimate` feature flag) — byte mode only.
    @Published var reachEstimate: Int = 1200
    private var reachTask: Task<Void, Never>?

    init(initialType: ComposeType = .byte) {
        composeType = initialType
        Task { await loadOptions() }
    }

    private func loadOptions() async {
        if let stacks = try? await APIClient.shared.getTechStacks() {
            techStackOptions = stacks.map {
                SearchableDropdown.DropdownOption(value: $0.name, label: $0.label)
            }
        }
        async let companies = APIClient.shared.getInterviewCompanies()
        async let roles = APIClient.shared.getInterviewRoles()
        async let locs = APIClient.shared.getInterviewLocations()
        if let result = try? await companies { companyOptions = result.sorted() }
        if let result = try? await roles { roleOptions = result.sorted() }
        if let result = try? await locs { locationOptionStrings = result.sorted() }
    }

    /// Debounced reach-estimate refresh — fired from ByteComposer when content changes
    /// and the `reach-estimate` flag is on.
    func refreshReachEstimate() {
        reachTask?.cancel()
        let body = content
        let stack = selectedTechStacks
        reachTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 300_000_000)
            guard !Task.isCancelled else { return }
            guard body.count > 10 else { return }
            if let reach = try? await APIClient.shared.getReachEstimate(content: body, tags: stack) {
                await MainActor.run { self?.reachEstimate = reach }
            }
        }
    }

    var canSubmit: Bool {
        if isPosting { return false }
        switch composeType {
        case .byte:
            return !title.trimmingCharacters(in: .whitespaces).isEmpty
                && !content.trimmingCharacters(in: .whitespaces).isEmpty
                && !selectedTechStacks.isEmpty
        case .interview:
            return !company.trimmingCharacters(in: .whitespaces).isEmpty
                && !interviewRole.trimmingCharacters(in: .whitespaces).isEmpty
                && !location.trimmingCharacters(in: .whitespaces).isEmpty
                && validQuestions.count > 0
        }
    }

    private var validQuestions: [DraftQuestion] {
        questions.filter {
            !$0.question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                && !$0.answer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
    }

    func post() async {
        if composeType == .byte {
            let trimmedTitle = title.trimmingCharacters(in: .whitespaces)
            guard !trimmedTitle.isEmpty else {
                ToastCenter.shared.show("Title is required", kind: .warning)
                return
            }
            let trimmedContent = content.trimmingCharacters(in: .whitespaces)
            guard !trimmedContent.isEmpty else {
                ToastCenter.shared.show("Content is required", kind: .warning)
                return
            }
            guard !selectedTechStacks.isEmpty else {
                ToastCenter.shared.show("Pick at least one tech stack", kind: .warning)
                return
            }
        } else {
            guard !company.trimmingCharacters(in: .whitespaces).isEmpty else {
                ToastCenter.shared.show("Company is required", kind: .warning)
                return
            }
            guard !interviewRole.trimmingCharacters(in: .whitespaces).isEmpty else {
                ToastCenter.shared.show("Role is required", kind: .warning)
                return
            }
            guard !location.trimmingCharacters(in: .whitespaces).isEmpty else {
                ToastCenter.shared.show("Location is required", kind: .warning)
                return
            }
            guard !validQuestions.isEmpty else {
                ToastCenter.shared.show("Add at least one Q&A pair", kind: .warning)
                return
            }
        }

        isPosting = true
        defer { isPosting = false }
        lastError = nil

        let code = showCode && !codeContent.isEmpty
            ? CodeSnippet(language: codeLanguage, filename: "snippet.\(codeLanguage)", content: codeContent)
            : nil

        do {
            if composeType == .byte {
                _ = try await APIClient.shared.createPost(
                    title: title,
                    content: content,
                    code: code,
                    techStackNames: selectedTechStacks
                )
            } else {
                let qs = validQuestions.enumerated().map { idx, dq in
                    InterviewQuestion(
                        id: dq.id.uuidString,
                        question: dq.question.trimmingCharacters(in: .whitespacesAndNewlines),
                        answer: dq.answer.trimmingCharacters(in: .whitespacesAndNewlines),
                        orderIndex: idx,
                        likeCount: 0, commentCount: 0, isLiked: false
                    )
                }
                _ = try await APIClient.shared.createInterview(
                    company: company.isEmpty ? nil : company,
                    role: interviewRole.isEmpty ? nil : interviewRole,
                    location: location.isEmpty ? nil : location,
                    difficulty: difficulty,
                    questions: qs,
                    isAnonymous: isAnonymous
                )
            }
            if let draftId {
                try? await APIClient.shared.deleteDraft(id: draftId)
            }
            Haptics.success()
            ToastCenter.shared.show(composeType == .byte ? "Byte posted" : "Interview posted", kind: .success)
        } catch {
            lastError = error.localizedDescription
            ToastCenter.shared.show("Couldn't post — try again", kind: .error)
        }
    }

    func saveDraft() async {
        let code = showCode && !codeContent.isEmpty ? codeContent : nil
        do {
            // saveDraft API still uses the legacy `tags` field for storage; we map
            // selectedTechStacks → tags for now. Backend may unify later.
            let id = try await APIClient.shared.saveDraft(
                id: draftId,
                title: title.isEmpty ? nil : title,
                body: content.isEmpty ? nil : content,
                codeSnippet: code,
                language: code != nil ? codeLanguage : nil,
                tags: selectedTechStacks
            )
            draftId = id
            ToastCenter.shared.show("Draft saved", kind: .success)
        } catch {
            ToastCenter.shared.show("Couldn't save draft", kind: .error)
        }
    }

    func load(from draft: Draft) {
        draftId = draft.id
        title = draft.title ?? ""
        content = draft.body ?? ""
        if let snippet = draft.codeSnippet, !snippet.isEmpty {
            showCode = true
            codeContent = snippet
            codeLanguage = draft.language ?? codeLanguage
        }
        if let t = draft.tags { selectedTechStacks = t }
    }
}

#Preview {
    ComposeView()
        .environmentObject(ToastCenter.shared)
        .environmentObject(FeatureFlagsManager.shared)
}
