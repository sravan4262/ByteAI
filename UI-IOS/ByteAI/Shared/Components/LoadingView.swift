import SwiftUI

// MARK: - Skeleton placeholder (matches Shadcn skeleton pattern)

struct SkeletonView: View {
    @State private var phase: CGFloat = 0

    var body: some View {
        RoundedRectangle(cornerRadius: 6)
            .fill(
                LinearGradient(
                    colors: [Color.byteElement, Color.byteBorderMedium, Color.byteElement],
                    startPoint: .init(x: phase - 0.5, y: 0),
                    endPoint: .init(x: phase + 0.5, y: 0)
                )
            )
            .onAppear {
                withAnimation(.linear(duration: 1.4).repeatForever(autoreverses: false)) {
                    phase = 1.5
                }
            }
    }
}

// MARK: - Post Card Skeleton

struct PostCardSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Circle().fill(Color.byteElement).frame(width: 40, height: 40)
                VStack(alignment: .leading, spacing: 5) {
                    SkeletonView().frame(width: 120, height: 12)
                    SkeletonView().frame(width: 80, height: 10)
                }
            }
            SkeletonView().frame(maxWidth: .infinity).frame(height: 18)
            SkeletonView().frame(maxWidth: .infinity).frame(height: 14)
            SkeletonView().frame(width: 200, height: 14)
        }
        .padding(16)
        .background(Color.byteCard)
        .cornerRadius(10)
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.byteBorderMedium, lineWidth: 1))
    }
}

// MARK: - Spinner

struct ByteSpinner: View {
    var size: CGFloat = 24
    var color: Color = .byteAccent
    @State private var rotation: Double = 0

    var body: some View {
        Circle()
            .trim(from: 0, to: 0.75)
            .stroke(color, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
            .frame(width: size, height: size)
            .rotationEffect(.degrees(rotation))
            .onAppear {
                withAnimation(.linear(duration: 0.8).repeatForever(autoreverses: false)) {
                    rotation = 360
                }
            }
    }
}

// MARK: - Generic row skeleton (avatar + 2 lines)
// Used for comment / conversation / notification / draft loading states.

struct RowSkeleton: View {
    var hasSubtitle: Bool = true
    var titleWidth: CGFloat = 140
    var subtitleWidth: CGFloat = 220

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Circle().fill(Color.byteElement).frame(width: 36, height: 36)
            VStack(alignment: .leading, spacing: 6) {
                SkeletonView().frame(width: titleWidth, height: 12)
                if hasSubtitle {
                    SkeletonView().frame(width: subtitleWidth, height: 10)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 6)
    }
}

// MARK: - Conversation row skeleton

struct ConversationRowSkeleton: View {
    var body: some View {
        HStack(spacing: 12) {
            Circle().fill(Color.byteElement).frame(width: 40, height: 40)
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    SkeletonView().frame(width: 110, height: 12)
                    Spacer()
                    SkeletonView().frame(width: 32, height: 9)
                }
                SkeletonView().frame(maxWidth: .infinity).frame(height: 10)
            }
        }
        .padding(.vertical, 6)
    }
}

// MARK: - Empty state
// Faint blue-tinted container with accent icon at 0.5 opacity.
// Matches ui-standards.md §"Empty State Pattern" — used everywhere a list is empty.

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var identity: IdentityColor = .blue

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 22, weight: .semibold))
                .foregroundColor(identity.solid.opacity(0.5))
            Text(title.uppercased())
                .font(.byteMono(12, weight: .bold))
                .foregroundColor(.byteText1)
                .tracking(0.6)
            Text(message)
                .font(.byteSans(12))
                .foregroundColor(.byteText2)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 20)
        .padding(.vertical, 32)
        .background(identity.bgFaint)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(identity.borderFaint, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

// MARK: - Mono status line
// "LOADING BYTES…", "— END —", "NO BYTES FOUND" — uppercase mono terminator labels.

struct MonoStatusLine: View {
    let text: String
    var pulsing: Bool = false
    var color: Color = .byteText2

    @State private var phase: Double = 1

    var body: some View {
        Text(text.uppercased())
            .font(.byteMono(12))
            .foregroundColor(color)
            .tracking(0.6)
            .opacity(pulsing ? phase : 1)
            .onAppear {
                guard pulsing else { return }
                withAnimation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true)) {
                    phase = 0.4
                }
            }
    }
}

#Preview {
    VStack(spacing: 20) {
        PostCardSkeleton()
        ByteSpinner()
        EmptyStateView(icon: "tray", title: "Nothing here yet", message: "Post your first Byte to get started.")
    }
    .padding()
    .background(Color.byteBackground)
}
