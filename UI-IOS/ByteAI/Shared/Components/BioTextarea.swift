import SwiftUI

// MARK: - Bio textarea with line-number gutter
// Used on onboarding "identity card". Mirrors web pattern: gutter + char counter +
// "// commit message" placeholder that flips to "✓ N words" once user types.

struct BioTextarea: View {
    @Binding var text: String
    var maxChars: Int = 280
    var rows: Int = 5

    @FocusState private var isFocused: Bool

    private var wordCount: Int {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? 0 : trimmed.split(whereSeparator: { $0.isWhitespace }).count
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: 0) {
                // Line number gutter
                VStack(alignment: .trailing, spacing: 0) {
                    ForEach(1...rows, id: \.self) { i in
                        Text(String(format: "%02d", i))
                            .font(.byteMono(10))
                            .foregroundColor(.byteText3)
                            .frame(height: 18)
                    }
                }
                .padding(.vertical, 12)
                .padding(.horizontal, 10)
                .background(Color.white.opacity(0.01))
                .overlay(
                    Rectangle()
                        .frame(width: 1)
                        .foregroundColor(.byteBorder),
                    alignment: .trailing
                )

                // Editor
                ZStack(alignment: .topLeading) {
                    if text.isEmpty {
                        Text("Building things that matter.\nOpen source contributor.\nCoffee → code → repeat.")
                            .font(.byteMono(11))
                            .foregroundColor(.byteText2)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 12)
                            .lineSpacing(4)
                            .allowsHitTesting(false)
                    }
                    TextEditor(text: $text)
                        .font(.byteMono(11))
                        .foregroundColor(.byteText1)
                        .scrollContentBackground(.hidden)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .focused($isFocused)
                        .frame(minHeight: CGFloat(rows) * 18 + 24)
                }
            }

            // Footer: word count or commit-message placeholder + char counter
            HStack {
                Group {
                    if text.isEmpty {
                        Text("// commit message")
                            .foregroundColor(.byteText2)
                    } else {
                        HStack(spacing: 4) {
                            Text("✓")
                            Text("\(wordCount) word\(wordCount == 1 ? "" : "s")")
                        }
                        .foregroundColor(.byteAccent)
                    }
                }
                .font(.byteMono(11))
                Spacer()
                Text("\(text.count)/\(maxChars)")
                    .font(.byteMono(10))
                    .foregroundColor(text.count > Int(Double(maxChars) * 0.9) ? .byteRed : .byteText2)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .overlay(
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(isFocused ? IdentityColor.blue.tint(0.3) : Color.byteBorder),
                alignment: .top
            )
        }
        .background(Color.white.opacity(0.01))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.byteBorderMedium, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .onChange(of: text) { _, new in
            if new.count > maxChars { text = String(new.prefix(maxChars)) }
        }
    }
}

#Preview {
    struct PreviewWrap: View {
        @State var bio = ""
        var body: some View {
            BioTextarea(text: $bio)
                .padding()
                .background(Color.byteBackground)
        }
    }

    return PreviewWrap()
}
