import SwiftUI

// MARK: - Compose View
// Mirrors /(app)/compose/page.tsx — toggle Byte vs Interview, rich editor + code

enum ComposeType: String, CaseIterable {
    case byte = "NEW BYTE"
    case interview = "NEW INTERVIEW"
}

struct ComposeView: View {
    @StateObject private var vm = ComposeViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteBackground.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        // Type toggle
                        HStack(spacing: 0) {
                            ForEach(ComposeType.allCases, id: \.self) { type in
                                Button {
                                    withAnimation(.easeInOut(duration: 0.2)) { vm.composeType = type }
                                } label: {
                                    Text(type.rawValue)
                                        .font(.byteMono(11, weight: .semibold))
                                        .foregroundColor(vm.composeType == type ? .byteText1 : .byteText2)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                        .background(vm.composeType == type ? Color.byteElement : Color.clear)
                                }
                            }
                        }
                        .background(Color.byteCard)
                        .cornerRadius(8)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.byteBorderMedium, lineWidth: 1))

                        if vm.composeType == .byte {
                            ByteComposer(vm: vm)
                        } else {
                            InterviewComposer(vm: vm)
                        }
                    }
                    .padding(16)
                }
            }
            .navigationTitle("Create")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.byteBackground, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .font(.byteSans(14))
                        .foregroundColor(.byteText2)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    ByteButton("Post", style: .primary, isLoading: vm.isPosting) {
                        Task { await vm.post() }
                    }
                }
            }
        }
    }
}

// MARK: - Byte Composer

private struct ByteComposer: View {
    @ObservedObject var vm: ComposeViewModel

    var body: some View {
        VStack(spacing: 20) {
            // Title
            ComposeSection(label: "TITLE") {
                ByteTextField(placeholder: "What did you learn today?", text: $vm.title)
            }

            // Content
            ComposeSection(label: "CONTENT") {
                ZStack(alignment: .topLeading) {
                    if vm.content.isEmpty {
                        Text("Share your insight, tip, or discovery...")
                            .font(.byteBody)
                            .foregroundColor(.byteText3)
                            .padding(.top, 8)
                            .padding(.horizontal, 4)
                    }
                    TextEditor(text: $vm.content)
                        .font(.byteBody)
                        .foregroundColor(.byteText1)
                        .tint(.byteAccent)
                        .frame(minHeight: 120)
                        .scrollContentBackground(.hidden)
                }
                .padding(2)
            }

            // Code snippet toggle
            Toggle(isOn: $vm.showCode.animation()) {
                HStack(spacing: 6) {
                    Image(systemName: "chevron.left.forwardslash.chevron.right")
                        .font(.system(size: 12))
                    Text("ADD CODE SNIPPET")
                        .font(.byteMono(10, weight: .medium))
                }
                .foregroundColor(.byteText2)
            }
            .tint(.byteAccent)

            if vm.showCode {
                ComposeSection(label: "CODE") {
                    VStack(spacing: 8) {
                        // Language picker
                        Menu {
                            ForEach(["typescript", "javascript", "python", "go", "rust", "sql", "swift"], id: \.self) { lang in
                                Button(lang.uppercased()) { vm.codeLanguage = lang }
                            }
                        } label: {
                            HStack {
                                Text(vm.codeLanguage.uppercased())
                                    .font(.byteMono(11, weight: .medium))
                                    .foregroundColor(.byteCyan)
                                Spacer()
                                Image(systemName: "chevron.down")
                                    .font(.system(size: 10))
                                    .foregroundColor(.byteText2)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 7)
                            .background(Color.byteElement)
                            .cornerRadius(6)
                            .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.byteBorderMedium, lineWidth: 1))
                        }

                        ZStack(alignment: .topLeading) {
                            if vm.codeContent.isEmpty {
                                Text("// paste your code here...")
                                    .font(.byteMono(12))
                                    .foregroundColor(.byteText3)
                                    .padding(.top, 8)
                                    .padding(.horizontal, 4)
                            }
                            TextEditor(text: $vm.codeContent)
                                .font(.byteMono(12))
                                .foregroundColor(.byteText1)
                                .tint(.byteAccent)
                                .frame(minHeight: 120)
                                .scrollContentBackground(.hidden)
                        }
                        .padding(10)
                        .background(Color.byteCodeBg)
                        .cornerRadius(8)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.byteBorderMedium, lineWidth: 1))
                    }
                }
            }

            // Tags
            ComposeSection(label: "TAGS") {
                TagSelector(selectedTags: $vm.tags)
            }

            // Reach estimate
            if let reach = vm.reachEstimate {
                ReachEstimateCard(reach: reach)
            }
        }
    }
}

// MARK: - Interview Composer

private struct InterviewComposer: View {
    @ObservedObject var vm: ComposeViewModel

    var body: some View {
        VStack(spacing: 20) {
            ComposeSection(label: "INTERVIEW TITLE") {
                ByteTextField(placeholder: "e.g. Meta Frontend Interview — L5", text: $vm.title)
            }

            HStack(spacing: 12) {
                ComposeSection(label: "COMPANY") {
                    ByteTextField(placeholder: "Meta", text: $vm.company)
                }
                ComposeSection(label: "ROLE") {
                    ByteTextField(placeholder: "Frontend Eng", text: $vm.interviewRole)
                }
            }

            // Difficulty
            ComposeSection(label: "DIFFICULTY") {
                HStack(spacing: 8) {
                    ForEach(["easy", "medium", "hard"], id: \.self) { level in
                        Button {
                            vm.difficulty = level
                        } label: {
                            Text(level.capitalized)
                                .font(.byteMono(10, weight: .semibold))
                                .foregroundColor(vm.difficulty == level ? diffColor(level) : .byteText2)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 7)
                                .background(
                                    RoundedRectangle(cornerRadius: 6)
                                        .fill(vm.difficulty == level ? diffColor(level).opacity(0.12) : Color.byteElement)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 6)
                                                .stroke(vm.difficulty == level ? diffColor(level).opacity(0.5) : Color.byteBorderMedium, lineWidth: 1)
                                        )
                                )
                        }
                    }
                    Spacer()
                }
            }

            // Questions
            ComposeSection(label: "QUESTIONS (\(vm.questions.count))") {
                VStack(spacing: 10) {
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
                            Text("ADD QUESTION")
                                .font(.byteMono(10, weight: .semibold))
                        }
                        .foregroundColor(.byteAccent)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.byteAccentDim)
                        .cornerRadius(8)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.byteAccent.opacity(0.3), lineWidth: 1))
                    }
                }
            }
        }
    }

    private func diffColor(_ level: String) -> Color {
        switch level {
        case "easy":   return .byteGreen
        case "medium": return .byteOrange
        default:       return .byteRed
        }
    }
}

// MARK: - Question Editor

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
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Q\(index + 1)")
                    .font(.byteMono(9, weight: .bold))
                    .foregroundColor(.byteAccent)
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background(Color.byteAccentDim)
                    .cornerRadius(4)
                Spacer()
                Button(action: onDelete) {
                    Image(systemName: "xmark")
                        .font(.system(size: 11))
                        .foregroundColor(.byteText3)
                }
            }

            TextField("Question", text: $question.question)
                .font(.byteSans(13, weight: .medium))
                .foregroundColor(.byteText1)
                .tint(.byteAccent)
                .padding(10)
                .background(Color.byteElement)
                .cornerRadius(6)
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.byteBorderMedium, lineWidth: 1))

            TextEditor(text: $question.answer)
                .font(.byteBody)
                .foregroundColor(.byteText2)
                .tint(.byteAccent)
                .frame(minHeight: 70)
                .scrollContentBackground(.hidden)
                .padding(10)
                .background(Color.byteElement)
                .cornerRadius(6)
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.byteBorderMedium, lineWidth: 1))
                .overlay(alignment: .topLeading) {
                    if question.answer.isEmpty {
                        Text("Answer...")
                            .font(.byteBody)
                            .foregroundColor(.byteText3)
                            .padding(14)
                            .allowsHitTesting(false)
                    }
                }
        }
        .padding(12)
        .background(Color.byteCard)
        .cornerRadius(8)
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.byteBorderMedium, lineWidth: 1))
    }
}

// MARK: - Tag Selector

private struct TagSelector: View {
    @Binding var selectedTags: [String]
    private let allTags = ["react", "typescript", "go", "rust", "python", "postgresql", "kubernetes", "swift", "system-design", "performance"]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(allTags, id: \.self) { tag in
                    let isSelected = selectedTags.contains(tag)
                    TagView(label: tag, isSelected: isSelected)
                        .onTapGesture {
                            if isSelected {
                                selectedTags.removeAll { $0 == tag }
                            } else {
                                selectedTags.append(tag)
                            }
                        }
                }
            }
        }
    }
}

// MARK: - Reach Estimate Card

private struct ReachEstimateCard: View {
    let reach: Int

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "antenna.radiowaves.left.and.right")
                .font(.system(size: 18))
                .foregroundColor(.byteGreen)

            VStack(alignment: .leading, spacing: 2) {
                Text("ESTIMATED REACH")
                    .font(.byteMonoTiny)
                    .foregroundColor(.byteText3)
                    .tracking(1)
                Text("~\(formatReach(reach)) engineers")
                    .font(.byteSans(16, weight: .semibold))
                    .foregroundColor(.byteGreen)
            }
            Spacer()
        }
        .padding(14)
        .background(Color.byteGreenDim)
        .cornerRadius(10)
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.byteGreen.opacity(0.3), lineWidth: 1))
    }

    private func formatReach(_ n: Int) -> String {
        n >= 1000 ? String(format: "%.1fk", Double(n) / 1000) : "\(n)"
    }
}

// MARK: - Section wrapper

private struct ComposeSection<Content: View>: View {
    let label: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.byteMonoTiny)
                .foregroundColor(.byteText3)
                .tracking(1)
            content()
        }
    }
}

// MARK: - ViewModel

@MainActor
final class ComposeViewModel: ObservableObject {
    @Published var composeType: ComposeType = .byte
    @Published var title = ""
    @Published var content = ""
    @Published var showCode = false
    @Published var codeLanguage = "typescript"
    @Published var codeContent = ""
    @Published var tags: [String] = []
    @Published var isPosting = false
    @Published var reachEstimate: Int? = 3200

    // Interview-specific
    @Published var company = ""
    @Published var interviewRole = ""
    @Published var difficulty = "medium"
    @Published var questions: [DraftQuestion] = [DraftQuestion()]

    func post() async {
        isPosting = true
        defer { isPosting = false }
        let code = showCode && !codeContent.isEmpty
            ? CodeSnippet(language: codeLanguage, filename: "snippet.\(codeLanguage)", content: codeContent)
            : nil
        _ = try? await APIClient.shared.createPost(title: title, content: content, code: code, tags: tags)
    }
}

#Preview {
    ComposeView()
}
