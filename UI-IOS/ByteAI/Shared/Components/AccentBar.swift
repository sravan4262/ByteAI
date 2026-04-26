import SwiftUI

// MARK: - Accent bar section header
// 3px vertical accent-colored bar + bold mono label.
// Replaces all `// COMMENT` style labels per ui-standards.md.

struct AccentBarHeader: View {
    let label: String
    var identity: IdentityColor = .blue
    var size: HeaderSize = .standard

    enum HeaderSize {
        case standard   // 4pt-tall bar, 12pt label
        case compact    // 3.5pt-tall bar, 10pt label

        var barHeight: CGFloat { self == .standard ? 16 : 14 }
        var fontSize: CGFloat { self == .standard ? 12 : 10 }
        var tracking: CGFloat { self == .standard ? 0.6 : 0.8 }
    }

    var body: some View {
        HStack(spacing: 10) {
            Capsule()
                .fill(identity.solid)
                .frame(width: 3, height: size.barHeight)
            Text(label)
                .font(.byteMono(size.fontSize, weight: .bold))
                .foregroundColor(.byteText1)
                .tracking(size.tracking)
        }
    }
}

#Preview {
    VStack(alignment: .leading, spacing: 20) {
        AccentBarHeader(label: "SENIORITY")
        AccentBarHeader(label: "TECH STACK", identity: .blue, size: .compact)
        AccentBarHeader(label: "QUESTION", identity: .purple)
        AccentBarHeader(label: "ANSWER", identity: .green)
    }
    .padding()
    .background(Color.byteBackground)
}
