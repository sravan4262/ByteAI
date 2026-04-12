import SwiftUI

// MARK: - Tag / Pill Badge
// Matches tag pill styling in post-card.tsx

struct TagView: View {
    let label: String
    var isSelected: Bool = false

    var body: some View {
        Text("# \(label)")
            .font(.byteMono(10, weight: .medium))
            .foregroundColor(isSelected ? .byteAccent : .byteText2)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                RoundedRectangle(cornerRadius: 6)
                    .fill(isSelected ? Color.byteAccentDim : Color.byteElement)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(isSelected ? Color.byteAccent : Color.byteBorderMedium, lineWidth: 1)
                    )
            )
    }
}

// MARK: - Difficulty Badge (Interviews)

struct DifficultyBadge: View {
    let difficulty: Interview.Difficulty

    private var color: Color {
        switch difficulty {
        case .easy:   return .byteGreen
        case .medium: return .byteOrange
        case .hard:   return .byteRed
        }
    }

    var body: some View {
        Text(difficulty.label.uppercased())
            .font(.byteMono(9, weight: .bold))
            .foregroundColor(color)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(
                RoundedRectangle(cornerRadius: 4)
                    .fill(color.opacity(0.12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 4)
                            .stroke(color.opacity(0.4), lineWidth: 1)
                    )
            )
    }
}

// MARK: - Type Badge

struct TypeBadge: View {
    let label: String
    let color: Color

    init(_ label: String, color: Color = .bytePurple) {
        self.label = label
        self.color = color
    }

    var body: some View {
        Text(label.uppercased())
            .font(.byteMono(9, weight: .bold))
            .foregroundColor(color)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(
                RoundedRectangle(cornerRadius: 4)
                    .fill(color.opacity(0.12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 4)
                            .stroke(color.opacity(0.4), lineWidth: 1)
                    )
            )
    }
}

#Preview {
    VStack(alignment: .leading, spacing: 12) {
        HStack { TagView(label: "react"); TagView(label: "typescript", isSelected: true) }
        HStack { DifficultyBadge(difficulty: .easy); DifficultyBadge(difficulty: .medium); DifficultyBadge(difficulty: .hard) }
        TypeBadge("INTERVIEW")
    }
    .padding()
    .background(Color.byteBackground)
}
