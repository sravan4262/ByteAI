import SwiftUI

// MARK: - Code Block
// Matches /components/ui/code-block.tsx
// Renders syntax-highlighted code with filename header bar

struct CodeBlockView: View {
    let snippet: CodeSnippet
    @State private var isCopied = false

    var body: some View {
        VStack(spacing: 0) {
            // Header bar — matches macOS terminal style
            HStack(spacing: 6) {
                // Traffic light dots
                Circle().fill(Color.byteRed).frame(width: 9, height: 9)
                Circle().fill(Color.byteOrange).frame(width: 9, height: 9)
                Circle().fill(Color.byteGreen).frame(width: 9, height: 9)

                Spacer()

                Text(snippet.filename)
                    .font(.byteMono(11))
                    .foregroundColor(.byteText2)

                Spacer()

                // Language badge
                Text(snippet.language.uppercased())
                    .font(.byteMono(10, weight: .medium))
                    .foregroundColor(.byteCyan)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.byteCyanDim)
                    .cornerRadius(4)

                // Copy button
                Button {
                    UIPasteboard.general.string = snippet.content
                    withAnimation { isCopied = true }
                    Task {
                        try? await Task.sleep(nanoseconds: 2_000_000_000)
                        await MainActor.run { withAnimation { isCopied = false } }
                    }
                } label: {
                    Image(systemName: isCopied ? "checkmark" : "doc.on.doc")
                        .font(.system(size: 11))
                        .foregroundColor(isCopied ? .byteGreen : .byteText2)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.byteElement)

            Divider().background(Color.byteBorderMedium)

            // Code content
            ScrollView(.horizontal, showsIndicators: false) {
                Text(snippet.content)
                    .font(.byteMono(12))
                    .foregroundColor(.byteText1)
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(Color.byteCodeBg)
        }
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.byteBorderMedium, lineWidth: 1)
        )
    }
}

#Preview {
    CodeBlockView(snippet: CodeSnippet(
        language: "typescript",
        filename: "use-data.ts",
        content: "const user = use(fetchUser(id));\nreturn <Profile data={user} />;"
    ))
    .padding()
    .background(Color.byteBackground)
}
