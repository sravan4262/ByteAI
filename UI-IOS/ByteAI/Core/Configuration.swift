import Foundation

enum AppConfig {
    static let supabaseURL: URL = {
        let raw = value(for: "SUPABASE_URL", plistKey: "SupabaseURL")
        guard let url = URL(string: raw), !raw.isEmpty, !raw.hasPrefix("$(") else {
            fatalError("SUPABASE_URL not set — add it to Scheme → Run → Environment Variables (or hardcode SupabaseURL in Info.plist)")
        }
        return url
    }()

    static let supabaseAnonKey: String = {
        let key = value(for: "SUPABASE_ANON_KEY", plistKey: "SupabaseAnonKey")
        precondition(!key.isEmpty && !key.hasPrefix("$("),
                     "SUPABASE_ANON_KEY not set — add it to Scheme → Run → Environment Variables")
        return key
    }()

    static let apiBaseURL: URL = {
        let raw = value(for: "BYTEAI_API_URL", plistKey: "ByteAIApiURL")
        let fallback = "http://127.0.0.1:5239"
        let final = raw.isEmpty || raw.hasPrefix("$(") ? fallback : raw
        return URL(string: final)!
    }()

    static let signalRHubURL: URL = apiBaseURL.appendingPathComponent("hubs/chat")

    /// Public base URL used when generating share links (`<base>/post/<id>`).
    /// Must match the production web origin so iOS-shared links resolve to the same
    /// post page web users see.
    static let shareBaseURL: URL = {
        let raw = value(for: "BYTEAI_SHARE_BASE_URL", plistKey: "ByteAIShareBaseURL")
        let fallback = "https://www.byteaiofficial.com"
        let final = raw.isEmpty || raw.hasPrefix("$(") ? fallback : raw
        return URL(string: final)!
    }()

    /// Google Sign-In iOS client ID. Checked in order: scheme env var → Info.plist GIDClientID.
    static let googleIOSClientID: String = {
        let raw = value(for: "GOOGLE_IOS_CLIENT_ID", plistKey: "GIDClientID")
        precondition(!raw.isEmpty && !raw.hasPrefix("$("),
                     "GIDClientID not set — add GOOGLE_IOS_CLIENT_ID to Scheme → Run → Environment Variables")
        return raw
    }()

    /// Google web/server client ID — same one registered in Supabase.
    /// Setting this as serverClientID makes the issued ID token's `aud` match
    /// what Supabase expects, instead of the iOS client ID.
    static let googleWebClientID: String = {
        let raw = value(for: "GOOGLE_WEB_CLIENT_ID", plistKey: "GIDServerClientID")
        precondition(!raw.isEmpty && !raw.hasPrefix("$("),
                     "GIDServerClientID not set — add GOOGLE_WEB_CLIENT_ID to Scheme → Run → Environment Variables")
        return raw
    }()

    /// Read from scheme env first (dev workflow), then Info.plist (production xcconfig builds).
    private static func value(for envKey: String, plistKey: String) -> String {
        if let env = ProcessInfo.processInfo.environment[envKey], !env.isEmpty {
            return env
        }
        return (Bundle.main.object(forInfoDictionaryKey: plistKey) as? String) ?? ""
    }
}
