import SwiftUI

// MARK: - Tab pills
// Bordered pill style for feed views (FOR_YOU / TRENDING).
// Same faint-blue-tint pattern as action buttons — selecting feels like
// magnifying an existing signal, not switching color from nothing.

struct TabPills<TabID: Hashable & RawRepresentable>: View where TabID.RawValue == String {
    let tabs: [(id: TabID, label: String)]
    @Binding var selected: TabID
    var identity: IdentityColor = .blue

    var body: some View {
        HStack(spacing: 8) {
            ForEach(tabs, id: \.id) { tab in
                Button {
                    withAnimation(.easeInOut(duration: 0.15)) { selected = tab.id }
                } label: {
                    Text(tab.label)
                        .font(.byteMono(11, weight: selected == tab.id ? .bold : .regular))
                        .tracking(0.7)
                        .foregroundColor(selected == tab.id ? identity.solid : .byteText1)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 7)
                        .background(selected == tab.id ? identity.bgActive : identity.bgFaint)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(selected == tab.id ? identity.solid : identity.borderFaint, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .shadow(color: selected == tab.id ? identity.tint(0.20) : .clear,
                                radius: 6, x: 0, y: 0)
                }
                .buttonStyle(.plain)
                .frame(minHeight: 36)
            }
            Spacer(minLength: 0)
        }
    }
}

#Preview {
    enum Tab: String, Hashable { case forYou, trending }

    struct PreviewWrap: View {
        @State var selected: Tab = .forYou
        var body: some View {
            TabPills(
                tabs: [(.forYou, "FOR_YOU"), (.trending, "TRENDING")],
                selected: $selected
            )
            .padding()
            .background(Color.byteBackground)
        }
    }

    return PreviewWrap()
}
