import SwiftUI

// MARK: - ByteAI Text Input
// Matches border-bottom input style from auth and compose screens

struct ByteTextField: View {
    let placeholder: String
    @Binding var text: String
    var isSecure: Bool = false
    var keyboardType: UIKeyboardType = .default
    var icon: String? = nil
    var error: String? = nil

    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 10) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 14))
                        .foregroundColor(isFocused ? .byteAccent : .byteText2)
                }

                Group {
                    if isSecure {
                        SecureField(placeholder, text: $text)
                    } else {
                        TextField(placeholder, text: $text)
                            .keyboardType(keyboardType)
                    }
                }
                .font(.byteSans(14))
                .foregroundColor(.byteText1)
                .tint(.byteAccent)
                .focused($isFocused)

                if !text.isEmpty {
                    Button { text = "" } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.byteText3)
                            .font(.system(size: 14))
                    }
                }
            }
            .padding(.vertical, 10)

            // Border line — glows on focus
            Rectangle()
                .fill(isFocused ? Color.byteAccent : (error != nil ? Color.byteRed : Color.byteBorderMedium))
                .frame(height: 1)
                .animation(.easeInOut(duration: 0.2), value: isFocused)

            if let error {
                Text(error)
                    .font(.byteTiny)
                    .foregroundColor(.byteRed)
                    .transition(.opacity)
            }
        }
    }
}

// MARK: - OTP Input (6 digits)

struct OTPInputView: View {
    @Binding var otp: String
    let onComplete: (String) -> Void
    private let length = 6

    var body: some View {
        HStack(spacing: 10) {
            ForEach(0..<length, id: \.self) { index in
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.byteElement)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(digitColor(for: index), lineWidth: 1.5)
                        )
                        .frame(width: 46, height: 54)

                    Text(digit(at: index))
                        .font(.byteH2)
                        .foregroundColor(.byteText1)
                }
            }
        }
        .overlay(
            // Hidden TextField for input capture
            TextField("", text: $otp)
                .keyboardType(.numberPad)
                .textContentType(.oneTimeCode)
                .frame(width: 1, height: 1)
                .opacity(0.01)
                .onChange(of: otp) { _, newVal in
                    let filtered = String(newVal.filter { $0.isNumber }.prefix(length))
                    otp = filtered
                    if filtered.count == length {
                        onComplete(filtered)
                    }
                }
        )
    }

    private func digit(at index: Int) -> String {
        guard index < otp.count else { return "" }
        return String(otp[otp.index(otp.startIndex, offsetBy: index)])
    }

    private func digitColor(for index: Int) -> Color {
        if index < otp.count { return .byteAccent }
        if index == otp.count { return .byteAccent.opacity(0.5) }
        return .byteBorderMedium
    }
}

#Preview {
    VStack(spacing: 24) {
        ByteTextField(placeholder: "Email address", text: .constant(""), icon: "envelope")
        ByteTextField(placeholder: "Password", text: .constant("secret"), isSecure: true, icon: "lock", error: "Password too short")
        OTPInputView(otp: .constant("1234"), onComplete: { _ in })
    }
    .padding()
    .background(Color.byteBackground)
}
