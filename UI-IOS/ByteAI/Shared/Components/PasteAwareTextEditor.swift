import SwiftUI
import UIKit

// MARK: - Paste-aware text editor
//
// Why this exists: SwiftUI's `TextEditor` *does* support paste in principle —
// long-pressing inside the editor surfaces the standard edit menu. But two
// things in `ComposeView` were getting in the way:
//
//   1. The placeholder `Text` in `ComposeTextEditor` was rendered above the
//      `TextEditor` in a `ZStack` without `.allowsHitTesting(false)`. Tapping
//      empty editor area before the user typed anything was hitting the
//      placeholder, not the editor, so the long-press → paste menu never came
//      up. The first character typed flips the placeholder off, which is why
//      paste "starts working" once you've typed something.
//   2. Even after the first focus, SwiftUI's TextEditor sometimes needs an
//      extra tap to get UIKit's edit-menu interaction registered. UITextView
//      handles this correctly out of the box.
//
// Wrapping `UITextView` directly gives us:
//   - Guaranteed paste support (the system supplies it; we just need to NOT
//     override `canPerformAction(_:withSender:)` to disallow it).
//   - The same look as `TextEditor` (transparent background, custom font /
//     tint, no scroll background fight).
//   - First-class control over keyboard / autocorrect / smart-quote behavior,
//     which compose mode also benefits from for code snippets.
//
// Drop-in for `TextEditor(text:)` — pass `text`, an optional `placeholder`,
// font, foreground color, and tint.

struct PasteAwareTextEditor: UIViewRepresentable {
    @Binding var text: String
    var placeholder: String = ""
    var font: UIFont
    var textColor: UIColor
    var tintColor: UIColor
    var placeholderColor: UIColor
    /// When `true`, disables autocorrect, smart quotes, smart dashes, and auto-
    /// capitalization so code snippets paste in cleanly.
    var codeStyle: Bool = false
    /// Optional outbound binding that mirrors the underlying UITextView's
    /// first-responder state. Drives the border-glow effect in ComposeTextEditor.
    var isFocused: Binding<Bool>? = nil

    func makeUIView(context: Context) -> UITextView {
        let tv = UITextView()
        tv.delegate = context.coordinator
        tv.backgroundColor = .clear
        tv.textContainerInset = UIEdgeInsets(top: 8, left: 6, bottom: 8, right: 6)
        tv.textContainer.lineFragmentPadding = 0
        tv.font = font
        tv.textColor = textColor
        tv.tintColor = tintColor
        // Allow scroll-within-editor when content grows beyond `minHeight`,
        // matching SwiftUI TextEditor's behavior.
        tv.isScrollEnabled = true
        tv.alwaysBounceVertical = false
        // Critical: do NOT set `isEditable = false`. Default is true. Standard
        // UITextView already returns true from `canPerformAction(_:withSender:)`
        // for `paste:` when the pasteboard has a string, so paste appears in
        // the long-press edit menu without any extra wiring.
        tv.isEditable = true
        tv.isSelectable = true
        if codeStyle {
            tv.autocorrectionType = .no
            tv.autocapitalizationType = .none
            tv.smartQuotesType = .no
            tv.smartDashesType = .no
            tv.smartInsertDeleteType = .no
            tv.spellCheckingType = .no
        } else {
            tv.autocorrectionType = .default
            tv.autocapitalizationType = .sentences
        }

        // Placeholder is a child label rather than a separate SwiftUI overlay
        // so the parent doesn't have to know whether `text` is empty (and so
        // `.allowsHitTesting` decisions are made here, not at the call site).
        let placeholderLabel = UILabel()
        placeholderLabel.text = placeholder
        placeholderLabel.font = font
        placeholderLabel.textColor = placeholderColor
        placeholderLabel.numberOfLines = 0
        placeholderLabel.translatesAutoresizingMaskIntoConstraints = false
        // Crucially: the placeholder must NOT receive touches, otherwise it
        // blocks the long-press that surfaces the paste menu.
        placeholderLabel.isUserInteractionEnabled = false
        tv.addSubview(placeholderLabel)
        NSLayoutConstraint.activate([
            placeholderLabel.topAnchor.constraint(equalTo: tv.topAnchor, constant: tv.textContainerInset.top),
            placeholderLabel.leadingAnchor.constraint(equalTo: tv.leadingAnchor, constant: tv.textContainerInset.left),
            placeholderLabel.trailingAnchor.constraint(equalTo: tv.trailingAnchor, constant: -tv.textContainerInset.right),
        ])
        context.coordinator.placeholderLabel = placeholderLabel
        placeholderLabel.isHidden = !text.isEmpty

        return tv
    }

    func updateUIView(_ uiView: UITextView, context: Context) {
        // Refresh the coordinator's `parent` snapshot so its UITextViewDelegate
        // callbacks write through to the *current* `text` and `isFocused`
        // bindings (each SwiftUI invalidation produces a new struct value).
        context.coordinator.parent = self
        if uiView.text != text {
            uiView.text = text
        }
        uiView.font = font
        uiView.textColor = textColor
        uiView.tintColor = tintColor
        context.coordinator.placeholderLabel?.text = placeholder
        context.coordinator.placeholderLabel?.font = font
        context.coordinator.placeholderLabel?.textColor = placeholderColor
        context.coordinator.placeholderLabel?.isHidden = !uiView.text.isEmpty
    }

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, UITextViewDelegate {
        var parent: PasteAwareTextEditor
        weak var placeholderLabel: UILabel?

        init(_ parent: PasteAwareTextEditor) {
            self.parent = parent
        }

        func textViewDidChange(_ textView: UITextView) {
            parent.text = textView.text
            placeholderLabel?.isHidden = !textView.text.isEmpty
        }

        func textViewDidBeginEditing(_ textView: UITextView) {
            parent.isFocused?.wrappedValue = true
        }

        func textViewDidEndEditing(_ textView: UITextView) {
            parent.isFocused?.wrappedValue = false
        }
    }
}
