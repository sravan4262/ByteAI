import SwiftUI

// MARK: - HiddenFeaturesView
//
// Cheat-sheet listing every gesture, terminal command, and Smart-Mode syntax
// the iOS app exposes. Surfaced from three places:
//   - Preferences → "Gestures & Shortcuts" row
//   - Triple-tap on the floating header logo
//   - The "Open Hidden Features" home-screen quick action

struct HiddenFeaturesEntry {
    let trigger: String
    let what: String
}

struct HiddenFeaturesSection {
    let title: String
    let icon: String  // SF Symbol
    let entries: [HiddenFeaturesEntry]
}

private let SECTIONS: [HiddenFeaturesSection] = [
    HiddenFeaturesSection(
        title: "GESTURES",
        icon: "hand.tap.fill",
        entries: [
            HiddenFeaturesEntry(trigger: "Shake device",      what: "Open the support terminal"),
            HiddenFeaturesEntry(trigger: "Pinch (2-finger)",  what: "Zoom the entire app from 1× to 3×"),
            HiddenFeaturesEntry(trigger: "Double-tap",        what: "Reset zoom back to 1×"),
            HiddenFeaturesEntry(trigger: "Swipe up — bottom-right corner", what: "Open the chat terminal"),
            HiddenFeaturesEntry(trigger: "Drag the terminal orb", what: "Reposition the floating orb anywhere"),
            HiddenFeaturesEntry(trigger: "Triple-tap the logo",   what: "Reopen this cheat sheet"),
        ]
    ),
    HiddenFeaturesSection(
        title: "HOME-SCREEN QUICK ACTIONS",
        icon: "square.grid.2x2.fill",
        entries: [
            HiddenFeaturesEntry(trigger: "Long-press app icon", what: "Open Support · Open Chat directly"),
        ]
    ),
    HiddenFeaturesSection(
        title: "SUPPORT TERMINAL",
        icon: "terminal.fill",
        entries: [
            HiddenFeaturesEntry(trigger: "help",       what: "Show all terminal commands"),
            HiddenFeaturesEntry(trigger: "shortcuts",  what: "Show keyboard shortcuts (web)"),
            HiddenFeaturesEntry(trigger: "whoami",     what: "Show your profile info"),
            HiddenFeaturesEntry(trigger: "feedback --type good|bad|idea", what: "Submit feedback"),
            HiddenFeaturesEntry(trigger: "report",     what: "Report offensive content"),
            HiddenFeaturesEntry(trigger: "history",    what: "View your last 5 submissions"),
        ]
    ),
    HiddenFeaturesSection(
        title: "CHAT LAUNCHER",
        icon: "bubble.left.and.bubble.right.fill",
        entries: [
            HiddenFeaturesEntry(trigger: "inbox",          what: "View all conversations"),
            HiddenFeaturesEntry(trigger: "dm @username",   what: "Open a DM thread by username"),
            HiddenFeaturesEntry(trigger: "search \"query\"", what: "Search mutual follows"),
            HiddenFeaturesEntry(trigger: "recent",         what: "Show your last 5 conversations"),
        ]
    ),
    HiddenFeaturesSection(
        title: "INTERVIEWS — SMART MODE",
        icon: "wand.and.stars",
        entries: [
            HiddenFeaturesEntry(trigger: "@google",                    what: "Filter by company"),
            HiddenFeaturesEntry(trigger: "role:swe",                   what: "Filter by role"),
            HiddenFeaturesEntry(trigger: "loc:nyc",                    what: "Filter by location"),
            HiddenFeaturesEntry(trigger: "#easy / #medium / #hard",    what: "Filter by difficulty"),
            HiddenFeaturesEntry(trigger: "@stripe role:swe loc:sf #hard", what: "Combine — order doesn't matter"),
        ]
    ),
]

struct HiddenFeaturesView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Color.byteBackground.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 22) {
                        ForEach(SECTIONS, id: \.title) { section in
                            sectionView(section)
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            Text("Triple-tap the logo at the top of the feed to reopen this any time.")
                                .font(.byteMono(10))
                                .foregroundColor(.byteText3)
                        }
                        .padding(.top, 4)
                    }
                    .padding(20)
                }
            }
            .navigationTitle("Hidden Features")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color.byteBackground, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .font(.byteMono(11, weight: .bold))
                        .tracking(0.5)
                        .foregroundColor(.bytePurple)
                }
            }
        }
    }

    @ViewBuilder
    private func sectionView(_ section: HiddenFeaturesSection) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                RoundedRectangle(cornerRadius: 1.5)
                    .fill(Color.bytePurple)
                    .frame(width: 3, height: 14)
                Image(systemName: section.icon)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.bytePurple)
                Text(section.title)
                    .font(.byteMono(10, weight: .bold))
                    .tracking(0.8)
                    .foregroundColor(.byteText1)
            }

            VStack(spacing: 0) {
                ForEach(Array(section.entries.enumerated()), id: \.offset) { idx, entry in
                    HStack(alignment: .top, spacing: 12) {
                        Text(entry.trigger)
                            .font(.byteMono(11, weight: .semibold))
                            .foregroundColor(.bytePurple)
                            .frame(maxWidth: 160, alignment: .leading)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(entry.what)
                            .font(.byteMono(11))
                            .foregroundColor(.byteText2)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(.vertical, 8)
                    .padding(.horizontal, 12)
                    if idx < section.entries.count - 1 {
                        Divider().background(Color.byteBorderHigh.opacity(0.4))
                    }
                }
            }
            .background(Color.byteCard)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.byteBorderHigh, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}

#Preview {
    HiddenFeaturesView()
}
