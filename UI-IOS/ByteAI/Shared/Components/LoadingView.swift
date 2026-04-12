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

// MARK: - Empty state

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 40))
                .foregroundColor(.byteText3)
            Text(title)
                .font(.byteH3)
                .foregroundColor(.byteText1)
            Text(message)
                .font(.byteBody)
                .foregroundColor(.byteText2)
                .multilineTextAlignment(.center)
        }
        .padding(32)
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
