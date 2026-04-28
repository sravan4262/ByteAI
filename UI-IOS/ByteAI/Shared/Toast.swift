import SwiftUI
import Combine

// MARK: - Toast model

struct Toast: Identifiable, Equatable {
    let id = UUID()
    let message: String
    let kind: Kind

    enum Kind {
        case info, success, warning, error

        var icon: String {
            switch self {
            case .info:    return "info.circle.fill"
            case .success: return "checkmark.circle.fill"
            case .warning: return "exclamationmark.triangle.fill"
            case .error:   return "xmark.octagon.fill"
            }
        }
        var tint: Color {
            switch self {
            case .info:    return .byteAccent
            case .success: return .byteGreen
            case .warning: return .byteOrange
            case .error:   return .byteRed
            }
        }
    }
}

// MARK: - Toast center

@MainActor
final class ToastCenter: ObservableObject {
    static let shared = ToastCenter()
    @Published private(set) var current: Toast?

    private var dismissTask: Task<Void, Never>?
    private init() {}

    func show(error: Error, context: String? = nil, duration: TimeInterval = 3.5) {
        let reason = APIError.userMessage(from: error)
        let message = context.map { "\($0) — \(reason)" } ?? reason
        show(message, kind: .error, duration: duration)
    }

    func show(_ message: String, kind: Toast.Kind = .info, duration: TimeInterval = 3.0) {
        let toast = Toast(message: message, kind: kind)
        current = toast
        switch kind {
        case .error:   Haptics.error()
        case .warning: Haptics.warning()
        case .success: Haptics.success()
        case .info:    break
        }
        dismissTask?.cancel()
        dismissTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(duration * 1_000_000_000))
            guard !Task.isCancelled else { return }
            await MainActor.run { self?.dismiss(id: toast.id) }
        }
    }

    func dismiss(id: UUID? = nil) {
        if let id, current?.id != id { return }
        current = nil
    }
}

// MARK: - Overlay

struct ToastOverlay: View {
    @EnvironmentObject private var center: ToastCenter

    var body: some View {
        if let toast = center.current {
            HStack(spacing: 10) {
                Image(systemName: toast.kind.icon)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(toast.kind.tint)
                Text(toast.message)
                    .font(.byteSans(13, weight: .medium))
                    .foregroundColor(.byteText1)
                    .lineLimit(3)
                Spacer(minLength: 0)
                Button {
                    center.dismiss(id: toast.id)
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.byteText3)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(toast.kind.tint.opacity(0.4), lineWidth: 1)
            )
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .transition(.move(edge: .top).combined(with: .opacity))
            .animation(.spring(response: 0.4, dampingFraction: 0.8), value: center.current)
            .accessibilityElement(children: .combine)
            .accessibilityLabel(toast.message)
        }
    }
}
