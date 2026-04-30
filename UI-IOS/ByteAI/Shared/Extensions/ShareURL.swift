import Foundation

/// Resolves a public share URL for a post/byte. Reads the configured
/// `AppConfig.shareBaseURL`, so dev/staging/production each emit links that
/// match their web origin.
enum ShareURL {
    static func post(id: String) -> URL {
        AppConfig.shareBaseURL.appendingPathComponent("post/\(id)")
    }
}
