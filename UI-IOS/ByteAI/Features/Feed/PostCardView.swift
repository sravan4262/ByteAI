import SwiftUI

// MARK: - Post Card
// Mirrors /components/features/feed/post-card.tsx

struct PostCardView: View {
    @State var post: Post
    var onTap: (() -> Void)? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header
            PostHeader(post: post)

            // Title
            Text(post.title)
                .font(.byteSans(16, weight: .semibold))
                .foregroundColor(.byteText1)
                .lineLimit(2)

            // Body
            Text(post.body)
                .font(.byteBody)
                .foregroundColor(.byteText2)
                .lineLimit(3)

            // Code block (if present)
            if let code = post.code {
                CodeBlockView(snippet: code)
            }

            // Tags
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(post.tags, id: \.self) { tag in
                        TagView(label: tag)
                    }
                }
            }

            Divider().background(Color.byteBorder)

            // Actions row
            HStack(spacing: 8) {
                ActionButton(
                    icon: "heart",
                    count: post.likes,
                    isActive: post.isLiked,
                    activeColor: .byteRed
                ) {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                        post.isLiked.toggle()
                        post.likes += post.isLiked ? 1 : -1
                    }
                    Task { try? await APIClient.shared.toggleLike(postId: post.id) }
                }

                ActionButton(icon: "bubble.left", count: post.comments) {}

                ActionButton(
                    icon: "bookmark",
                    isActive: post.isBookmarked,
                    activeColor: .byteCyan
                ) {
                    withAnimation { post.isBookmarked.toggle() }
                    Task { try? await APIClient.shared.toggleBookmark(postId: post.id) }
                }

                ActionButton(icon: "square.and.arrow.up") {}

                Spacer()

                if let views = post.views {
                    HStack(spacing: 3) {
                        Image(systemName: "eye")
                            .font(.system(size: 10))
                        Text(formatCount(views))
                            .font(.byteMonoTiny)
                    }
                    .foregroundColor(.byteText3)
                }
            }

            // View full Byte CTA
            Button {
                onTap?()
            } label: {
                HStack(spacing: 4) {
                    Text("VIEW FULL BYTE")
                        .font(.byteMono(10, weight: .semibold))
                    Image(systemName: "arrow.right")
                        .font(.system(size: 10))
                }
                .foregroundColor(.byteAccent)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(Color.byteAccentDim)
                .cornerRadius(6)
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(Color.byteAccent.opacity(0.3), lineWidth: 1)
                )
            }
        }
        .padding(16)
        .background(Color.byteCard)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.byteBorderMedium, lineWidth: 1)
        )
    }

    private func formatCount(_ n: Int) -> String {
        n >= 1000 ? String(format: "%.1fk", Double(n) / 1000) : "\(n)"
    }
}

// MARK: - Post Header

struct PostHeader: View {
    let post: Post

    var body: some View {
        HStack(spacing: 10) {
            AvatarView(user: post.author, size: .md)

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Text(post.author.displayName)
                        .font(.byteSans(13, weight: .semibold))
                        .foregroundColor(.byteText1)

                    if post.author.isVerified {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.system(size: 10))
                            .foregroundColor(.byteAccent)
                    }
                }
                Text("\(post.author.role) @ \(post.author.company) · \(post.timestamp)")
                    .font(.byteMonoTiny)
                    .foregroundColor(.byteText3)
                    .lineLimit(1)
            }

            Spacer()

            if post.type == .byte {
                TypeBadge("BYTE", color: .byteAccent)
            }
        }
    }
}

#Preview {
    ScrollView {
        VStack(spacing: 12) {
            PostCardView(post: MockData.posts[0])
            PostCardView(post: MockData.posts[1])
        }
        .padding()
    }
    .background(Color.byteBackground)
}
