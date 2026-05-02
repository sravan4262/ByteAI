import SwiftUI

// MARK: - Content Rejection model
// Mirrors the backend's HTTP 422 envelope:
//   { "error": "CONTENT_REJECTED", "severity": "...", "reasons": [{ code, message }] }
// Severity is intentionally NOT surfaced to the user — only the per-reason code +
// message is shown. The struct is `Identifiable` at the outer level so it can drive
// `.sheet(item:)` directly.

struct ContentRejection: Equatable, Sendable, Identifiable {
    /// Stable ID derived from the contained reason codes, joined with `|`. This
    /// keeps `.sheet(item:)` from treating two structurally-identical rejections
    /// as different sheets, while still re-presenting when the reasons change.
    var id: String { reasons.map(\.code).joined(separator: "|") }
    let reasons: [Reason]

    struct Reason: Equatable, Sendable, Hashable, Identifiable {
        var id: String { code }
        let code: String
        let message: String
    }

    /// Convenience: legacy 400 INVALID_CONTENT reason string → single-reason shape.
    static func legacy(_ reason: String) -> ContentRejection {
        ContentRejection(reasons: [Reason(code: "INVALID_CONTENT", message: reason)])
    }
}

// MARK: - Modal
// Replaces the per-feature InvalidContentModal with a code-aware variant. Visual
// language matches the prior modal (terminal glow, mono header, tip block) but
// each reason now renders its own row with a glyph + uppercase code chip.

struct ContentRejectedModal: View {
    let rejection: ContentRejection
    let onDismiss: () -> Void

    private let tip = "// TIP  Edit the highlighted issues above and resubmit.\n// Your draft is preserved — nothing was lost."

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            header

            VStack(alignment: .leading, spacing: 10) {
                Text("WE COULDN'T POST THIS")
                    .font(.byteTitleMedium)
                    .foregroundColor(.byteText1)

                Text("Address the issues below and try again.")
                    .font(.byteBodyMedium)
                    .foregroundColor(.byteText2)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
            }

            VStack(spacing: 10) {
                ForEach(rejection.reasons) { reason in
                    ReasonRow(reason: reason)
                }
            }

            tipBlock

            Button(action: onDismiss) {
                Text("DISMISS")
                    .font(.byteMono(12, weight: .bold))
                    .tracking(1.0)
                    .foregroundColor(.byteText1)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.byteElement)
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Color.byteBorderHigh, lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            .buttonStyle(.plain)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var header: some View {
        HStack(spacing: 10) {
            Image(systemName: "xmark.shield")
                .font(.system(size: 20))
                .foregroundColor(.byteRed)
            Text("CONTENT_REJECTED")
                .font(.byteMono(11, weight: .bold))
                .tracking(0.8)
                .foregroundColor(.byteRed)
                .padding(.horizontal, 8).padding(.vertical, 3)
                .background(Color.byteRed.opacity(0.12))
                .overlay(
                    RoundedRectangle(cornerRadius: 5)
                        .stroke(Color.byteRed.opacity(0.4), lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 5))
            Spacer()
        }
    }

    private var tipBlock: some View {
        VStack(spacing: 0) {
            Text(tip)
                .font(.byteTerminalSmall)
                .foregroundColor(Color(hex: "#94a3b8"))
                .lineSpacing(3)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
        }
        .background(Color(hex: "#0f0f1a"))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.byteBorderMedium, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

// MARK: - Reason row
// Glyph + uppercase code chip + human title + message. Glyph mapping is
// intentionally kept inside the modal so the call sites only deal with raw
// codes from the API.

private struct ReasonRow: View {
    let reason: ContentRejection.Reason

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: glyph(for: reason.code))
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.byteRed)
                .frame(width: 22, height: 22)
                .padding(.top, 1)

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(reason.code.uppercased())
                        .font(.byteMono(10, weight: .bold))
                        .tracking(0.7)
                        .foregroundColor(.byteRed)
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(Color.byteRed.opacity(0.10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(Color.byteRed.opacity(0.32), lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 4))

                    Text(title(for: reason.code))
                        .font(.byteLabel)
                        .foregroundColor(.byteText1)
                }

                Text(reason.message)
                    .font(.byteBodyMedium)
                    .foregroundColor(.byteText2)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 12).padding(.vertical, 10)
        .background(Color.byteRed.opacity(0.04))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color.byteRed.opacity(0.22), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

// MARK: - Code → glyph + title

private func glyph(for code: String) -> String {
    switch code {
    case "OFF_TOPIC":             return "globe.badge.chevron.backward"
    case "TOXICITY",
         "HATE",
         "HARASSMENT":            return "flame"
    case "SEXUAL":                return "eye.slash"
    case "HARM":                  return "exclamationmark.triangle.fill"
    case "PROFANITY":             return "text.badge.xmark"
    case "PII":                   return "lock.shield"
    case "SPAM":                  return "link.badge.plus"
    case "GIBBERISH":             return "keyboard"
    case "PROMPT_INJECTION":      return "bolt.shield"
    case "MODERATION_UNAVAILABLE":return "wifi.exclamationmark"
    default:                      return "xmark.octagon"
    }
}

private func title(for code: String) -> String {
    switch code {
    case "OFF_TOPIC":             return "Off-topic"
    case "PROFANITY":             return "Profanity"
    case "TOXICITY":              return "Toxic"
    case "HARASSMENT":            return "Harassment"
    case "HATE":                  return "Hateful"
    case "SEXUAL":                return "Sexual"
    case "HARM":                  return "Harmful"
    case "PII":                   return "Private info"
    case "SPAM":                  return "Spam"
    case "GIBBERISH":             return "Gibberish"
    case "PROMPT_INJECTION":      return "Prompt injection"
    case "MODERATION_UNAVAILABLE":return "Moderation unavailable"
    default:                      return code
    }
}

#Preview {
    ContentRejectedModal(
        rejection: ContentRejection(reasons: [
            .init(code: "OFF_TOPIC", message: "Make the post substantively about a tech topic, not just mention one."),
            .init(code: "PROFANITY", message: "Remove the profanity and rephrase.")
        ])
    ) {}
    .padding()
    .background(Color.byteCard)
}
