import Foundation
import Combine

@MainActor
final class FeatureFlagsManager: ObservableObject {
    static let shared = FeatureFlagsManager()
    @Published private(set) var flags: [String: Bool] = [:]

    private var refreshTask: Task<Void, Never>?
    private let refreshInterval: TimeInterval = 60

    private init() {}

    func start() {
        refreshTask?.cancel()
        refreshTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled {
                await self.refresh()
                try? await Task.sleep(nanoseconds: UInt64(self.refreshInterval * 1_000_000_000))
            }
        }
    }

    func stop() {
        refreshTask?.cancel()
        refreshTask = nil
    }

    func refresh() async {
        do {
            flags = try await APIClient.shared.getEnabledFeatureFlags()
        } catch {
            // Keep stale values silently — feature gates failing closed is the safe default.
        }
    }

    func isEnabled(_ key: String) -> Bool { flags[key] ?? false }
}
