import Foundation

/// Debug-only diagnostic logger.
///
/// In Release builds `dprint` is compiled away entirely — the `@autoclosure`
/// argument is never evaluated, so string interpolation and any side effects
/// in the message expression are elided. Use this anywhere a transient
/// `print` was previously used so production binaries never emit auth
/// errors, push tokens, API failures, or other diagnostic noise to the
/// device console (which is captured by Console.app and crash reports).
@inlinable
public func dprint(_ message: @autoclosure () -> String) {
    #if DEBUG
    print(message())
    #endif
}
