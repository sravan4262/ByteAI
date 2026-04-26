import SwiftUI
import UIKit

// MARK: - Keyboard dismiss helpers
//
// Adds two ergonomic ways to dismiss the keyboard:
//   1. `Keyboard.dismiss()`         — call from anywhere
//   2. `.dismissKeyboardOnTap()`    — view modifier; taps on empty regions dismiss the keyboard
//
// `.dismissKeyboardOnTap()` uses a background gesture so it only fires for taps that don't hit
// another interactive element. Buttons, list rows, links, etc. continue to work normally.

enum Keyboard {
    static func dismiss() {
        UIApplication.shared.sendAction(
            #selector(UIResponder.resignFirstResponder),
            to: nil, from: nil, for: nil
        )
    }
}

extension View {
    /// Dismisses the keyboard on any tap inside this view.
    /// Uses `simultaneousGesture` so taps on Buttons / TextFields still work — they just also dismiss the keyboard.
    /// Required because `.background(Color.clear...onTapGesture)` is swallowed when the modified view has an opaque fill.
    func dismissKeyboardOnTap() -> some View {
        simultaneousGesture(
            TapGesture().onEnded { Keyboard.dismiss() }
        )
    }
}
