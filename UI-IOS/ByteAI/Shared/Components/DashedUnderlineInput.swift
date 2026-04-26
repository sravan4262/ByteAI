import SwiftUI

// MARK: - Inline dashed-underline input
// Used in onboarding identity card — role and company fields.
// Dashed border at rest = "editable hint", switches to solid on focus.

struct DashedUnderlineInput: View {
    @Binding var text: String
    let placeholder: String
    var color: Color = .byteAccent
    var maxLength: Int? = nil
    var fontSize: CGFloat = 12

    @FocusState private var isFocused: Bool

    var body: some View {
        TextField("", text: $text, prompt: Text(placeholder).foregroundColor(.byteText3))
            .focused($isFocused)
            .font(.byteMono(fontSize, weight: .medium))
            .foregroundColor(color)
            .multilineTextAlignment(.leading)
            .autocorrectionDisabled()
            .textInputAutocapitalization(.never)
            .padding(.bottom, 4)
            .overlay(alignment: .bottom) {
                Rectangle()
                    .strokeBorder(
                        isFocused ? color : Color.byteBorderHigh,
                        style: StrokeStyle(
                            lineWidth: 1,
                            dash: isFocused ? [] : [3, 3]
                        )
                    )
                    .frame(height: 1)
            }
            .onChange(of: text) { _, new in
                if let max = maxLength, new.count > max {
                    text = String(new.prefix(max))
                }
            }
    }
}

#Preview {
    struct PreviewWrap: View {
        @State var role = ""
        @State var company = ""
        var body: some View {
            HStack(spacing: 6) {
                DashedUnderlineInput(text: $role, placeholder: "Sr. Engineer", color: .byteAccent, maxLength: 40)
                Text("@")
                    .font(.byteMono(10, weight: .bold))
                    .foregroundColor(.byteText2.opacity(0.6))
                DashedUnderlineInput(text: $company, placeholder: "your-company.io", color: .byteGreen, maxLength: 50)
            }
            .padding()
            .background(Color.byteBackground)
        }
    }

    return PreviewWrap()
}
