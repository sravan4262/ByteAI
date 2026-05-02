import SwiftUI

// MARK: - Chat Thread (terminal-themed)
// Mirrors UI/components/features/chat/ChatThread.tsx — green-accented terminal shell:
// title bar with traffic lights, centered @username, SENDING/READY badge, gradient
// accent line, monospace messages, and a `byteai@~ >` prompt input.

struct ChatThreadView: View {
    @StateObject private var vm: ChatThreadVM
    @EnvironmentObject private var chat: ChatService
    @Environment(\.dismiss) private var dismiss
    @FocusState private var inputFocused: Bool
    @State private var caretOn = true

    init(conversation: ConversationDto) {
        _vm = StateObject(wrappedValue: ChatThreadVM(conversation: conversation))
    }

    private var meId: String? { AuthManager.shared.currentUser?.id }

    /// Re-derive live canMessage from the conversations list each render so a follow/unfollow
    /// during the session updates the input state instantly. The snapshot in `vm.conversation`
    /// is only the initial value at open time.
    private var canMessage: Bool {
        chat.conversations.first(where: { $0.id == vm.conversation.id })?.canMessage
            ?? vm.conversation.canMessage
    }

    var body: some View {
        ZStack {
            Color.byteBackground
                .ignoresSafeArea()
                .dismissKeyboardOnTap()

            VStack(spacing: 0) {
                titleBar
                accentLine
                messagesScroll
                if !canMessage {
                    cannotMessageBanner
                }
                if let rejection = vm.contentRejection {
                    rejectionBanner(rejection)
                }
                terminalInput
            }
        }
        .navigationBarHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .onAppear {
            // Pulsing caret loop
            withAnimation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true)) {
                caretOn.toggle()
            }
        }
    }

    // MARK: Title bar — traffic lights + centered @username + SENDING/READY badge

    private var titleBar: some View {
        ZStack {
            HStack(spacing: 6) {
                // Red light — dismisses (back) — matches web's onClose binding
                Button { dismiss() } label: {
                    Circle()
                        .fill(Color(red: 1, green: 0.37, blue: 0.34))
                        .overlay(Circle().stroke(Color.black.opacity(0.15), lineWidth: 1))
                        .frame(width: 12, height: 12)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Close conversation")

                Circle()
                    .fill(Color(red: 1, green: 0.74, blue: 0.18))
                    .overlay(Circle().stroke(Color.black.opacity(0.15), lineWidth: 1))
                    .frame(width: 12, height: 12)

                Circle()
                    .fill(Color.white.opacity(0.10))
                    .overlay(Circle().stroke(Color.white.opacity(0.08), lineWidth: 1))
                    .frame(width: 12, height: 12)

                Spacer()

                statusBadge
            }
            .padding(.horizontal, 14)

            HStack(spacing: 6) {
                ZStack {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.byteGreen.opacity(0.10))
                        .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.byteGreen.opacity(0.20), lineWidth: 1))
                        .frame(width: 16, height: 16)
                    Image(systemName: "terminal.fill")
                        .font(.system(size: 9))
                        .foregroundColor(.byteGreen)
                }
                Text("@\(vm.conversation.otherUsername)")
                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                    .foregroundColor(.byteText1)
                    .tracking(0.6)
            }
        }
        .frame(height: 44)
        .background(Color.byteGreen.opacity(0.03))
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.byteGreen.opacity(0.15))
                .frame(height: 1)
        }
    }

    @ViewBuilder
    private var statusBadge: some View {
        if !chat.isConnected {
            Text("OFFLINE")
                .font(.system(size: 9, weight: .bold, design: .monospaced))
                .foregroundColor(.byteRed)
                .tracking(0.5)
                .padding(.horizontal, 6).padding(.vertical, 2)
                .background(Color.byteRed.opacity(0.08))
                .overlay(RoundedRectangle(cornerRadius: 4)
                    .stroke(Color.byteRed.opacity(0.25), lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: 4))
        } else {
            let label = vm.isSending ? "SENDING" : "READY"
            Text(label)
                .font(.system(size: 9, weight: .regular, design: .monospaced))
                .foregroundColor(.byteGreen)
                .tracking(0.5)
                .padding(.horizontal, 6).padding(.vertical, 2)
                .background(Color.byteGreen.opacity(0.08))
                .overlay(RoundedRectangle(cornerRadius: 4)
                    .stroke(Color.byteGreen.opacity(0.20), lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: 4))
        }
    }

    private var accentLine: some View {
        LinearGradient(
            colors: [Color.byteGreen, Color.byteGreen.opacity(0.25), .clear],
            startPoint: .leading, endPoint: .trailing
        )
        .frame(height: 1)
    }

    // MARK: Messages

    private var messagesScroll: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 4) {
                    if vm.isLoadingHistory {
                        HStack(spacing: 4) {
                            Text("◆")
                                .font(.system(size: 10, design: .monospaced))
                                .foregroundColor(.byteText3)
                            ForEach(0..<3) { i in
                                Circle()
                                    .fill(Color.byteGreen)
                                    .frame(width: 4, height: 4)
                                    .opacity(caretOn ? 0.9 : 0.3)
                                    .animation(.easeInOut(duration: 0.5).repeatForever().delay(Double(i) * 0.15), value: caretOn)
                            }
                        }
                        .padding(.horizontal, 14).padding(.vertical, 4)
                    }
                    ForEach(vm.messages) { msg in
                        MessageBubble(
                            message: msg,
                            isMine: msg.senderId == meId
                        )
                        .id(msg.id)
                        .padding(.horizontal, 12)
                    }
                    Color.clear.frame(height: 4).id("bottom-anchor")
                }
                .padding(.vertical, 12)
            }
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: vm.messages.count) { _, _ in
                withAnimation(.easeOut(duration: 0.2)) {
                    proxy.scrollTo("bottom-anchor", anchor: .bottom)
                }
            }
            .task {
                await vm.load()
                proxy.scrollTo("bottom-anchor", anchor: .bottom)
            }
        }
    }

    // MARK: Terminal input row — `byteai@~ >` prompt + caret

    private var terminalInput: some View {
        VStack(spacing: 0) {
            Rectangle().fill(Color.byteBorderHigh).frame(height: 1)

            HStack(spacing: 4) {
                // Prompt: byteai @ ~ >
                HStack(spacing: 3) {
                    Text("byteai")
                        .foregroundColor(Color.byteGreen.opacity(0.55))
                    Text("@")
                        .foregroundColor(.byteText3)
                    Text("~")
                        .foregroundColor(.byteAccent)
                    Text(">")
                        .foregroundColor(.byteGreen)
                        .fontWeight(.bold)
                }
                .font(.system(size: 12, design: .monospaced))

                TextField("Type your message...", text: $vm.draft, axis: .vertical)
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundColor(.byteText1)
                    .tint(.byteGreen)
                    .lineLimit(1...5)
                    .focused($inputFocused)
                    .submitLabel(.send)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .onSubmit { Task { await vm.send() } }

                Rectangle()
                    .fill(Color.byteGreen)
                    .frame(width: 6, height: 14)
                    .opacity(inputFocused && caretOn ? 0.9 : 0.3)
                    .cornerRadius(1)

                Button {
                    Task { await vm.send() }
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 22))
                        .foregroundColor(vm.draft.trimmingCharacters(in: .whitespaces).isEmpty ? .byteText3 : .byteGreen)
                }
                .buttonStyle(.plain)
                .disabled(!canMessage || vm.draft.trimmingCharacters(in: .whitespaces).isEmpty || vm.isSending)
                .accessibilityLabel("Send message")
            }
            .padding(.horizontal, 14).padding(.vertical, 10)
            .background(Color.byteGreen.opacity(0.02))
            .opacity(canMessage ? 1 : 0.5)
            .allowsHitTesting(canMessage)
        }
    }

    // Inline moderation banner — chat is dense, so we avoid a sheet. Lists each
    // rejected reason in compact form. Tap to dismiss; auto-hides after 5s in VM.
    private func rejectionBanner(_ rejection: ContentRejection) -> some View {
        Button {
            vm.dismissRejectionBanner()
        } label: {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Image(systemName: "xmark.shield")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.byteRed)
                    Text("CONTENT_REJECTED")
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .tracking(0.6)
                        .foregroundColor(.byteRed)
                    Spacer(minLength: 0)
                    Text("TAP TO DISMISS")
                        .font(.system(size: 9, design: .monospaced))
                        .foregroundColor(.byteText3)
                }
                ForEach(rejection.reasons) { reason in
                    HStack(alignment: .top, spacing: 6) {
                        Text(reason.code)
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundColor(.byteRed)
                        Text(reason.message)
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(.byteText2)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            .padding(.horizontal, 14).padding(.vertical, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.byteRed.opacity(0.06))
            .overlay(alignment: .top) {
                Rectangle().fill(Color.byteRed.opacity(0.20)).frame(height: 1)
            }
            .overlay(alignment: .bottom) {
                Rectangle().fill(Color.byteRed.opacity(0.20)).frame(height: 1)
            }
        }
        .buttonStyle(.plain)
        .transition(.opacity.combined(with: .move(edge: .bottom)))
        .accessibilityLabel("Message rejected by moderation")
    }

    // Mutual-follow banner — shown when the relationship is no longer mutual.
    // Server enforces this on send too; UI just signals why the input is disabled.
    private var cannotMessageBanner: some View {
        HStack(spacing: 8) {
            Text("✗")
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundColor(.byteRed.opacity(0.7))
            Text("permission denied — mutual follow required")
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(.byteText2)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14).padding(.vertical, 8)
        .background(Color.byteRed.opacity(0.03))
        .overlay(alignment: .top) {
            Rectangle().fill(Color.byteRed.opacity(0.15)).frame(height: 1)
        }
    }
}
