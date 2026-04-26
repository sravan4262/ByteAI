import SwiftUI

// MARK: - Terminal-styled chat message
// Mirrors UI/components/features/chat/ChatMessage.tsx — monospace, faint-tinted card,
// time below in t3 mono. Mine = white-tint, theirs = green-tint.

struct MessageBubble: View {
    let message: MessageDto
    let isMine: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 0) {
            if isMine { Spacer(minLength: 40) }
            VStack(alignment: isMine ? .trailing : .leading, spacing: 2) {
                Text(message.content)
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundColor(.byteText1)
                    .multilineTextAlignment(isMine ? .trailing : .leading)
                    .padding(.horizontal, 10).padding(.vertical, 6)
                    .background(isMine ? Color.white.opacity(0.06) : Color.byteGreen.opacity(0.12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 4)
                            .stroke(isMine ? Color.white.opacity(0.10) : Color.byteGreen.opacity(0.25), lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                    .accessibilityLabel(isMine ? "Sent: \(message.content)" : "Received: \(message.content)")
                Text(timestamp)
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundColor(.byteText3)
                    .padding(.horizontal, 4)
            }
            if !isMine { Spacer(minLength: 40) }
        }
    }

    private var timestamp: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = formatter.date(from: message.sentAt) ?? ISO8601DateFormatter().date(from: message.sentAt)
        guard let date else { return message.sentAt }
        let f = DateFormatter()
        f.dateFormat = "HH:mm"
        return f.string(from: date)
    }
}
