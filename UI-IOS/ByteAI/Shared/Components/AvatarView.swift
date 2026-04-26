import SwiftUI
import Kingfisher

// MARK: - Avatar

enum AvatarSize {
    case xs, sm, md, lg, xl
    var dimension: CGFloat {
        switch self { case .xs: 24; case .sm: 32; case .md: 40; case .lg: 56; case .xl: 80 }
    }
    var fontSize: CGFloat {
        switch self { case .xs: 9; case .sm: 11; case .md: 14; case .lg: 18; case .xl: 26 }
    }
}

struct AvatarView: View {
    let initials: String
    let variant: AvatarVariant
    let size: AvatarSize
    let isOnline: Bool
    let imageUrl: String?

    init(_ initials: String, variant: AvatarVariant = .cyan, size: AvatarSize = .md, isOnline: Bool = false, imageUrl: String? = nil) {
        self.initials = initials
        self.variant = variant
        self.size = size
        self.isOnline = isOnline
        self.imageUrl = imageUrl
    }

    // Avatar source can take three shapes:
    //   • a real URL (Google / uploaded photo) — http(s):// or leading "/"
    //   • a literal emoji or 1–4 char string from the in-app picker
    //   • nil / empty → initials over a gradient
    // `URL(string: "🚀")` returns nil, so emoji avatars previously fell silently to initials.
    private var isHttpUrl: Bool {
        guard let s = imageUrl, !s.isEmpty else { return false }
        return s.hasPrefix("http") || s.hasPrefix("/")
    }
    private var isEmojiAvatar: Bool {
        guard let s = imageUrl, !s.isEmpty else { return false }
        return !isHttpUrl
    }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            ZStack {
                if isHttpUrl, let url = URL(string: imageUrl!) {
                    KFImage(url)
                        .placeholder { fallbackAvatar }
                        .fade(duration: 0.18)
                        .cancelOnDisappear(true)
                        .resizable()
                        .scaledToFill()
                        .frame(width: size.dimension, height: size.dimension)
                        .clipShape(Circle())
                } else if isEmojiAvatar, let emoji = imageUrl {
                    ZStack {
                        Circle()
                            .fill(variant.gradient)
                            .frame(width: size.dimension, height: size.dimension)
                        Text(emoji)
                            .font(.system(size: size.fontSize * 1.5))
                    }
                } else {
                    fallbackAvatar
                }
            }

            if isOnline {
                Circle()
                    .fill(Color.byteGreen)
                    .frame(width: size.dimension * 0.25, height: size.dimension * 0.25)
                    .overlay(Circle().stroke(Color.byteBackground, lineWidth: 1.5))
            }
        }
    }

    private var fallbackAvatar: some View {
        ZStack {
            Circle()
                .fill(variant.gradient)
                .frame(width: size.dimension, height: size.dimension)
            Text(initials)
                .font(.system(size: size.fontSize, weight: .bold, design: .rounded))
                .foregroundColor(.white)
        }
    }
}

// MARK: - User Avatar convenience

extension AvatarView {
    init(user: User, size: AvatarSize = .md) {
        let variant = AvatarVariant(rawValue: user.avatarVariant) ?? .cyan
        self.init(user.initials, variant: variant, size: size, isOnline: user.isOnline, imageUrl: user.avatarUrl)
    }
}

#Preview {
    HStack(spacing: 12) {
        AvatarView("AC", variant: .cyan,   size: .xs)
        AvatarView("PS", variant: .purple, size: .sm)
        AvatarView("MJ", variant: .green,  size: .md, isOnline: true)
        AvatarView("KL", variant: .orange, size: .lg)
    }
    .padding()
    .background(Color.byteBackground)
}
