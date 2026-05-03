import SwiftUI

struct ReportSheet: View {
    let contentType: String
    let contentId: String

    @Environment(\.dismiss) private var dismiss
    @State private var reason: String = "Spam"
    @State private var freeText: String = ""
    @State private var submitting: Bool = false

    private let reasons = [
        "Spam",
        "Harassment",
        "Hate speech",
        "Sexual content",
        "Off-topic",
        "Misinformation",
        "Other",
    ]

    var body: some View {
        NavigationStack {
            Form {
                Section("Reason") {
                    Picker("Reason", selection: $reason) {
                        ForEach(reasons, id: \.self) { Text($0).tag($0) }
                    }
                    .pickerStyle(.inline)
                    .labelsHidden()
                }

                Section(header: Text("Additional context"),
                        footer: Text(reason == "Other" ? "Required when selecting Other." : "Optional")) {
                    TextEditor(text: $freeText)
                        .frame(minHeight: 80)
                }
            }
            .navigationTitle("Report")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(submitting ? "Sending…" : "Submit") { submit() }
                        .disabled(submitting || (reason == "Other" && freeText.trimmingCharacters(in: .whitespaces).isEmpty))
                }
            }
        }
    }

    private func submit() {
        submitting = true
        Task {
            defer { submitting = false }
            let trimmed = freeText.trimmingCharacters(in: .whitespacesAndNewlines)
            let message = trimmed.isEmpty ? reason : "\(reason): \(trimmed)"
            do {
                _ = try await APIClient.shared.reportContent(
                    contentType: contentType,
                    contentId: contentId,
                    message: message,
                )
                ToastCenter.shared.show("Thanks — we'll review this within 24 hours")
                dismiss()
            } catch {
                ToastCenter.shared.show("Couldn't submit report", kind: .error)
            }
        }
    }
}
