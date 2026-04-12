import SwiftUI

// MARK: - Auth Screen
// Mirrors /(auth)/page.tsx — Sign In / Register tabs with Clerk auth methods

struct AuthView: View {
    @StateObject private var vm = AuthViewModel()
    @State private var selectedTab = 0       // 0 = Sign In, 1 = Register
    @State private var showOTP   = false

    var body: some View {
        ZStack {
            // Ambient background glow (matches orb-drift animation)
            Color.byteBackground.ignoresSafeArea()
            Circle()
                .fill(Color.byteAccent.opacity(0.06))
                .frame(width: 300, height: 300)
                .offset(x: -100, y: -200)
                .blur(radius: 80)
            Circle()
                .fill(Color.bytePurple.opacity(0.05))
                .frame(width: 250, height: 250)
                .offset(x: 120, y: 150)
                .blur(radius: 70)

            ScrollView {
                VStack(spacing: 36) {
                    // Logo
                    VStack(spacing: 6) {
                        Text("⚡")
                            .font(.system(size: 44))
                        Text("ByteAI")
                            .font(.byteSans(32, weight: .bold))
                            .foregroundColor(.byteText1)
                        Text("Tech insights in a byte")
                            .font(.byteMonoSmall)
                            .foregroundColor(.byteText2)
                            .tracking(1)
                    }
                    .padding(.top, 60)

                    // Tab Switcher
                    HStack(spacing: 0) {
                        ForEach(["SIGN IN", "REGISTER"], id: \.self) { tab in
                            let idx = tab == "SIGN IN" ? 0 : 1
                            Button {
                                withAnimation(.easeInOut(duration: 0.2)) { selectedTab = idx }
                            } label: {
                                Text(tab)
                                    .font(.byteMono(11, weight: .semibold))
                                    .foregroundColor(selectedTab == idx ? .byteText1 : .byteText2)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 10)
                                    .background(
                                        selectedTab == idx
                                        ? Color.byteElement
                                        : Color.clear
                                    )
                            }
                        }
                    }
                    .background(Color.byteCard)
                    .cornerRadius(8)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.byteBorderMedium, lineWidth: 1))

                    // Form panel
                    VStack(spacing: 20) {
                        if selectedTab == 0 {
                            SignInForm(vm: vm, showOTP: $showOTP)
                        } else {
                            RegisterForm(vm: vm, showOTP: $showOTP)
                        }
                    }
                    .padding(20)
                    .background(Color.byteCard)
                    .cornerRadius(12)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.byteBorderMedium, lineWidth: 1))

                    // OAuth divider
                    HStack {
                        Rectangle().fill(Color.byteBorderMedium).frame(height: 1)
                        Text("OR CONTINUE WITH")
                            .font(.byteMono(9))
                            .foregroundColor(.byteText3)
                            .fixedSize()
                        Rectangle().fill(Color.byteBorderMedium).frame(height: 1)
                    }

                    // OAuth buttons
                    HStack(spacing: 12) {
                        OAuthButton(label: "Google", icon: "globe") {
                            Task { await vm.signInWithGoogle() }
                        }
                        OAuthButton(label: "GitHub", icon: "chevron.left.forwardslash.chevron.right") {
                            // GitHub OAuth
                        }
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
        }
        .sheet(isPresented: $showOTP) {
            OTPSheet(vm: vm)
        }
        .alert("Error", isPresented: .constant(vm.error != nil)) {
            Button("OK") { vm.error = nil }
        } message: {
            Text(vm.error ?? "")
        }
    }
}

// MARK: - Sign In Form

private struct SignInForm: View {
    @ObservedObject var vm: AuthViewModel
    @Binding var showOTP: Bool

    var body: some View {
        VStack(spacing: 18) {
            ByteTextField(placeholder: "Email or phone", text: $vm.email, icon: "envelope")

            ByteButton("Send Magic Link", icon: "paperplane", isLoading: vm.isLoading) {
                Task {
                    await vm.sendOTP()
                    showOTP = true
                }
            }

            Text("We'll send a secure one-time code to your inbox.")
                .font(.byteTiny)
                .foregroundColor(.byteText3)
                .multilineTextAlignment(.center)
        }
    }
}

// MARK: - Register Form

private struct RegisterForm: View {
    @ObservedObject var vm: AuthViewModel
    @Binding var showOTP: Bool

    var body: some View {
        VStack(spacing: 18) {
            HStack(spacing: 12) {
                ByteTextField(placeholder: "First name", text: $vm.firstName)
                ByteTextField(placeholder: "Last name", text: $vm.lastName)
            }
            ByteTextField(placeholder: "Username", text: $vm.username, icon: "at")
            ByteTextField(placeholder: "Email address", text: $vm.email, keyboardType: .emailAddress, icon: "envelope")
            ByteTextField(placeholder: "Phone (optional)", text: $vm.phone, keyboardType: .phonePad, icon: "phone")

            ByteButton("Create Account", icon: "person.badge.plus", isLoading: vm.isLoading) {
                Task {
                    await vm.signUp()
                    showOTP = true
                }
            }
        }
    }
}

// MARK: - OTP Bottom Sheet

private struct OTPSheet: View {
    @ObservedObject var vm: AuthViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var otp = ""

    var body: some View {
        VStack(spacing: 28) {
            Capsule()
                .fill(Color.byteBorderMedium)
                .frame(width: 40, height: 4)
                .padding(.top, 8)

            VStack(spacing: 6) {
                Text("Check your inbox")
                    .font(.byteH2)
                    .foregroundColor(.byteText1)
                Text("Enter the 6-digit code we sent you")
                    .font(.byteSmall)
                    .foregroundColor(.byteText2)
            }

            OTPInputView(otp: $otp) { code in
                Task { await vm.verifyOTP(code) }
            }

            if vm.isLoading {
                ByteSpinner()
            }

            Button {
                Task { await vm.sendOTP() }
            } label: {
                Text("Resend code")
                    .font(.byteMono(12))
                    .foregroundColor(.byteAccent)
            }

            Spacer()
        }
        .padding(.horizontal, 32)
        .background(Color.byteCard.ignoresSafeArea())
    }
}

// MARK: - OAuth Button

private struct OAuthButton: View {
    let label: String
    let icon: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 14))
                Text(label)
                    .font(.byteSans(13, weight: .medium))
            }
            .foregroundColor(.byteText1)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(Color.byteElement)
            .cornerRadius(8)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.byteBorderMedium, lineWidth: 1))
        }
    }
}

// MARK: - ViewModel

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var email     = ""
    @Published var phone     = ""
    @Published var firstName = ""
    @Published var lastName  = ""
    @Published var username  = ""
    @Published var isLoading = false
    @Published var error: String?

    func sendOTP() async {
        isLoading = true
        defer { isLoading = false }
        await AuthManager.shared.signInWithEmail(email)
        error = AuthManager.shared.error
    }

    func signUp() async {
        isLoading = true
        defer { isLoading = false }
        await AuthManager.shared.signUp(
            firstName: firstName,
            lastName: lastName,
            username: username,
            email: email
        )
        error = AuthManager.shared.error
    }

    func verifyOTP(_ code: String) async {
        isLoading = true
        defer { isLoading = false }
        await AuthManager.shared.verifyOTP(code)
        error = AuthManager.shared.error
    }

    func signInWithGoogle() async {
        isLoading = true
        defer { isLoading = false }
        await AuthManager.shared.signInWithGoogle()
        error = AuthManager.shared.error
    }
}

#Preview {
    AuthView()
}
