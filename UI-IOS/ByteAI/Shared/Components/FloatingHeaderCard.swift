import SwiftUI

// MARK: - Floating header card
// Feed/Interviews header — rounded, identity-tinted bg + border, blur. Floats with mx/mt margin.
//   Bytes:      border .35 alpha + bg .07 alpha (blue)
//   Interviews: border .35 alpha + bg .07 alpha (purple)

// MARK: - ByteAI Logo Mark
// Renders the </> brand icon matching the web ByteAILogo component and the app icon asset.

struct ByteAILogoMark: View {
    var size: CGFloat = 20

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.22)
                .fill(
                    LinearGradient(
                        colors: [Color(hex: "#1e2a6b"), Color(hex: "#0d1540")],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: size * 0.22)
                        .stroke(Color(hex: "#3b82f6").opacity(0.45), lineWidth: 1)
                )
                .frame(width: size, height: size)

            Text("</>")
                .font(.system(size: size * 0.38, weight: .bold, design: .monospaced))
                .foregroundColor(Color(hex: "#06b6d4"))
        }
        .frame(width: size, height: size)
    }
}

struct FloatingHeaderCard<Trailing: View>: View {
    let icon: String       // SF Symbol — ignored when useLogoMark is true
    let title: String
    let subtitle: String
    var identity: IdentityColor = .blue
    /// When true, renders ByteAILogoMark instead of the SF Symbol icon.
    var useLogoMark: Bool = false
    @ViewBuilder let trailing: () -> Trailing

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 8) {
                    if useLogoMark {
                        ByteAILogoMark(size: 20)
                    } else {
                        Image(systemName: icon)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(identity.solid)
                    }
                    Text(title)
                        .font(.byteMono(15, weight: .bold))
                        .foregroundColor(.byteText1)
                        .tracking(1.0)
                }
                Text(subtitle)
                    .font(.byteMono(11))
                    .foregroundColor(.byteText1)
                    .tracking(0.9)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            Spacer(minLength: 0)
            trailing()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        // Web: `bg-[rgba(...,0.07)]` + `backdrop-blur-md` over --bg-card.
        // ultraThinMaterial provides the blur; 0.75-opacity card base prevents washout;
        // bgHover (0.07 tint) supplies the identity colour, matching the web exactly.
        .background(identity.bgHover)
        .background(Color.byteCard.opacity(0.75))
        .background(.ultraThinMaterial)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(identity.borderHeader, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .padding(.horizontal, 12)
        .padding(.top, 12)
    }
}

// MARK: - Searchable Dropdown
// Mirrors UI/components/ui/searchable-dropdown.tsx — typeable, filtered, accent-tinted.
// Used for: stack filter on Feed/Interviews, company/role/location/tech-stack on compose.

struct SearchableDropdown: View {
    @Binding var value: String?
    let options: [DropdownOption]
    var placeholder: String = "SELECT"
    var allLabel: String = "ALL"
    var showAllOption: Bool = true
    var identity: IdentityColor = .blue
    /// Optional external trigger — when provided the built-in button is hidden and the
    /// caller controls when the picker sheet opens (e.g. FilterPanelRow).
    var externalOpen: Binding<Bool>? = nil

    @State private var internalOpen = false
    private var isOpen: Binding<Bool> { externalOpen ?? $internalOpen }

    struct DropdownOption: Hashable {
        let value: String
        let label: String
    }

    private var selectedLabel: String {
        if let v = value, let opt = options.first(where: { $0.value == v }) {
            return opt.label
        }
        if let v = value, !v.isEmpty { return v }
        return allLabel
    }

    var body: some View {
        Group {
            if externalOpen == nil {
                Button {
                    isOpen.wrappedValue = true
                } label: {
                    HStack(spacing: 6) {
                        Text(selectedLabel.uppercased())
                            .font(.byteMono(11, weight: .bold))
                            .tracking(0.5)
                        Image(systemName: value == nil ? "chevron.down" : "xmark")
                            .font(.system(size: 9, weight: .semibold))
                            .opacity(0.7)
                    }
                    .foregroundColor(value != nil ? identity.solid : .byteText1)
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(value != nil ? identity.bgActive : identity.bgFaint)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(value != nil ? identity.solid : identity.borderFaint, lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
                .frame(minHeight: 32)
            }
        }
        .sheet(isPresented: isOpen) {
            SearchableDropdownSheet(
                value: $value,
                options: options,
                placeholder: placeholder,
                allLabel: allLabel,
                showAllOption: showAllOption,
                identity: identity
            )
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
    }
}

struct SearchableDropdownSheet: View {
    @Binding var value: String?
    let options: [SearchableDropdown.DropdownOption]
    let placeholder: String
    let allLabel: String
    let showAllOption: Bool
    let identity: IdentityColor
    @State private var search = ""
    @Environment(\.dismiss) private var dismiss
    @FocusState private var searchFocused: Bool

    private var filtered: [SearchableDropdown.DropdownOption] {
        let q = search.trimmingCharacters(in: .whitespaces).lowercased()
        if q.isEmpty { return options }
        return options.filter {
            $0.label.lowercased().contains(q) || $0.value.lowercased().contains(q)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 13))
                    .foregroundColor(.byteText2)
                TextField("Search \(placeholder.lowercased())…", text: $search)
                    .font(.byteMono(13))
                    .foregroundColor(.byteText1)
                    .tint(identity.solid)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .focused($searchFocused)
                if !search.isEmpty {
                    Button { search = "" } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.byteText3)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 14).padding(.vertical, 12)
            .background(identity.bgFaint)
            .overlay(
                Rectangle().fill(Color.byteBorderHigh).frame(height: 1),
                alignment: .bottom
            )

            ScrollView {
                LazyVStack(spacing: 0) {
                    if showAllOption {
                        DropdownRow(
                            label: allLabel,
                            isSelected: value == nil,
                            identity: identity
                        ) {
                            value = nil
                            dismiss()
                        }
                        Rectangle()
                            .fill(Color.byteBorderHigh.opacity(0.4))
                            .frame(height: 1)
                    }
                    if filtered.isEmpty {
                        Text(search.isEmpty ? "No options" : "No results for \"\(search)\"")
                            .font(.byteMono(12))
                            .foregroundColor(.byteText2)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 28)
                    } else {
                        ForEach(filtered, id: \.value) { opt in
                            DropdownRow(
                                label: opt.label,
                                isSelected: value == opt.value,
                                identity: identity
                            ) {
                                value = opt.value
                                dismiss()
                            }
                        }
                    }
                }
            }
        }
        .background(Color.byteBackground.ignoresSafeArea())
        .onAppear { searchFocused = true }
    }
}

private struct DropdownRow: View {
    let label: String
    let isSelected: Bool
    let identity: IdentityColor
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Text(label)
                    .font(.byteMono(13, weight: isSelected ? .bold : .regular))
                    .foregroundColor(isSelected ? identity.solid : .byteText1)
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(identity.solid)
                }
            }
            .padding(.horizontal, 14).padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
            .background(isSelected ? identity.bgActive : Color.clear)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Multi-Select Dropdown
// Mirrors UI/components/ui/multi-select-dropdown.tsx — typeable + multi-select.
// Used for tech-stack selection in compose-byte (required, ≥1 selection).

struct MultiSelectDropdown: View {
    @Binding var values: [String]
    let options: [SearchableDropdown.DropdownOption]
    var placeholder: String = "SELECT"
    var identity: IdentityColor = .blue

    @State private var isOpen = false

    var body: some View {
        Button {
            isOpen = true
        } label: {
            HStack(spacing: 6) {
                Text(triggerLabel)
                    .font(.byteMono(11, weight: .bold))
                    .tracking(0.5)
                    .lineLimit(1)
                Spacer()
                Image(systemName: "chevron.down")
                    .font(.system(size: 9, weight: .semibold))
                    .opacity(0.7)
            }
            .foregroundColor(values.isEmpty ? .byteText1 : identity.solid)
            .padding(.horizontal, 12).padding(.vertical, 10)
            .background(values.isEmpty ? identity.bgFaint : identity.bgActive)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(values.isEmpty ? identity.borderFaint : identity.solid, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity, minHeight: 40)
        .sheet(isPresented: $isOpen) {
            MultiSelectDropdownSheet(
                values: $values,
                options: options,
                placeholder: placeholder,
                identity: identity
            )
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
    }

    private var triggerLabel: String {
        if values.isEmpty { return placeholder.uppercased() }
        if values.count == 1 {
            return options.first(where: { $0.value == values[0] })?.label ?? values[0]
        }
        return "\(values.count) SELECTED"
    }
}

private struct MultiSelectDropdownSheet: View {
    @Binding var values: [String]
    let options: [SearchableDropdown.DropdownOption]
    let placeholder: String
    let identity: IdentityColor
    @State private var search = ""
    @Environment(\.dismiss) private var dismiss
    @FocusState private var searchFocused: Bool

    private var filtered: [SearchableDropdown.DropdownOption] {
        let q = search.trimmingCharacters(in: .whitespaces).lowercased()
        if q.isEmpty { return options }
        return options.filter {
            $0.label.lowercased().contains(q) || $0.value.lowercased().contains(q)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 13))
                    .foregroundColor(.byteText2)
                TextField("Search \(placeholder.lowercased())…", text: $search)
                    .font(.byteMono(13))
                    .foregroundColor(.byteText1)
                    .tint(identity.solid)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .focused($searchFocused)
                if !search.isEmpty {
                    Button { search = "" } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.byteText3)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 14).padding(.vertical, 12)
            .background(identity.bgFaint)
            .overlay(
                Rectangle().fill(Color.byteBorderHigh).frame(height: 1),
                alignment: .bottom
            )

            ScrollView {
                LazyVStack(spacing: 0) {
                    if filtered.isEmpty {
                        Text(search.isEmpty ? "No options" : "No results for \"\(search)\"")
                            .font(.byteMono(12))
                            .foregroundColor(.byteText2)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 28)
                    } else {
                        ForEach(filtered, id: \.value) { opt in
                            DropdownRow(
                                label: opt.label,
                                isSelected: values.contains(opt.value),
                                identity: identity
                            ) {
                                if let i = values.firstIndex(of: opt.value) {
                                    values.remove(at: i)
                                } else {
                                    values.append(opt.value)
                                }
                            }
                        }
                    }
                }
            }

            HStack(spacing: 8) {
                Text("\(values.count) selected")
                    .font(.byteMono(11, weight: .bold))
                    .foregroundColor(.byteText2)
                    .tracking(0.5)
                Spacer()
                Button { dismiss() } label: {
                    Text("DONE")
                        .font(.byteMono(11, weight: .bold))
                        .tracking(0.6)
                        .foregroundColor(identity.solid)
                        .padding(.horizontal, 16).padding(.vertical, 8)
                        .background(identity.bgActive)
                        .overlay(RoundedRectangle(cornerRadius: 8)
                            .stroke(identity.solid, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 14).padding(.vertical, 10)
            .overlay(
                Rectangle().fill(Color.byteBorderHigh).frame(height: 1),
                alignment: .top
            )
        }
        .background(Color.byteBackground.ignoresSafeArea())
        .onAppear { searchFocused = true }
    }
}

// MARK: - Creatable Dropdown
// Mirrors UI/components/ui/creatable-dropdown.tsx — full-width form input that filters
// existing options and lets the user "Create + use \"<query>\"" if the query is novel.
// Used for COMPANY · ROLE · LOCATION on Compose Interview.

struct CreatableDropdown: View {
    @Binding var value: String
    let options: [String]
    var placeholder: String = ""
    var identity: IdentityColor = .purple

    @State private var isOpen = false

    var body: some View {
        Button { isOpen = true } label: {
            HStack(spacing: 8) {
                if value.isEmpty {
                    Text(placeholder)
                        .font(.byteMono(12))
                        .foregroundColor(.byteText2)
                } else {
                    Text(value)
                        .font(.byteMono(12, weight: .semibold))
                        .foregroundColor(.byteText1)
                        .lineLimit(1)
                }
                Spacer(minLength: 8)
                if value.isEmpty {
                    Image(systemName: "chevron.down")
                        .font(.system(size: 10))
                        .foregroundColor(.byteText2)
                } else {
                    Button {
                        value = ""
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.byteText2)
                            .frame(width: 22, height: 22)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 12).padding(.vertical, 10)
            .background(Color.byteElement)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.byteBorderHigh, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
        .frame(minHeight: 44)
        .sheet(isPresented: $isOpen) {
            CreatableDropdownSheet(
                value: $value,
                options: options,
                placeholder: placeholder,
                identity: identity
            )
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
    }
}

private struct CreatableDropdownSheet: View {
    @Binding var value: String
    let options: [String]
    let placeholder: String
    let identity: IdentityColor
    @State private var search = ""
    @Environment(\.dismiss) private var dismiss
    @FocusState private var searchFocused: Bool

    private var filtered: [String] {
        let q = search.trimmingCharacters(in: .whitespaces).lowercased()
        if q.isEmpty { return options }
        return options.filter { $0.lowercased().contains(q) }
    }

    private var canCreate: Bool {
        let q = search.trimmingCharacters(in: .whitespaces)
        return !q.isEmpty && !options.contains(where: { $0.caseInsensitiveCompare(q) == .orderedSame })
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 13))
                    .foregroundColor(.byteText2)
                TextField(placeholder.isEmpty ? "Search…" : "Search or type to add…", text: $search)
                    .font(.byteMono(13))
                    .foregroundColor(.byteText1)
                    .tint(identity.solid)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .focused($searchFocused)
                    .submitLabel(.done)
                    .onSubmit {
                        let q = search.trimmingCharacters(in: .whitespaces)
                        if !q.isEmpty {
                            value = q
                            dismiss()
                        }
                    }
                if !search.isEmpty {
                    Button { search = "" } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.byteText3)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 14).padding(.vertical, 12)
            .background(identity.bgFaint)
            .overlay(
                Rectangle().fill(Color.byteBorderHigh).frame(height: 1),
                alignment: .bottom
            )

            ScrollView {
                LazyVStack(spacing: 0) {
                    if canCreate {
                        Button {
                            value = search.trimmingCharacters(in: .whitespaces)
                            dismiss()
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "plus.circle.fill")
                                    .font(.system(size: 14))
                                    .foregroundColor(identity.solid)
                                Text("Create ")
                                    .font(.byteMono(12))
                                    .foregroundColor(.byteText1)
                                + Text("\"\(search.trimmingCharacters(in: .whitespaces))\"")
                                    .font(.byteMono(12, weight: .bold))
                                    .foregroundColor(identity.solid)
                                Spacer()
                            }
                            .padding(.horizontal, 14).padding(.vertical, 12)
                            .background(identity.bgFaint)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        Rectangle().fill(Color.byteBorderHigh.opacity(0.4)).frame(height: 1)
                    }

                    if filtered.isEmpty && !canCreate {
                        Text(search.isEmpty ? "No options" : "No matches")
                            .font(.byteMono(12))
                            .foregroundColor(.byteText2)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 28)
                    } else {
                        ForEach(filtered, id: \.self) { opt in
                            Button {
                                value = opt
                                dismiss()
                            } label: {
                                HStack {
                                    Text(opt)
                                        .font(.byteMono(13, weight: opt == value ? .bold : .regular))
                                        .foregroundColor(opt == value ? identity.solid : .byteText1)
                                    Spacer()
                                    if opt == value {
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundColor(identity.solid)
                                    }
                                }
                                .padding(.horizontal, 14).padding(.vertical, 12)
                                .background(opt == value ? identity.bgActive : Color.clear)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
        .background(Color.byteBackground.ignoresSafeArea())
        .onAppear { searchFocused = true }
    }
}

#Preview {
    ZStack(alignment: .top) {
        Color.byteBackground.ignoresSafeArea()
        VStack(spacing: 12) {
            FloatingHeaderCard(
                icon: "bolt.fill",
                title: "BITS",
                subtitle: "SHORT · INSIGHTS · LEARN.",
                identity: .blue
            ) {
                Text("[bell] [avatar]")
                    .font(.byteMonoTiny)
                    .foregroundColor(.byteText3)
            }

            FloatingHeaderCard(
                icon: "briefcase.fill",
                title: "INTERVIEWS",
                subtitle: "REAL QUESTIONS · REAL ANSWERS · ACE YOUR NEXT ROUND",
                identity: .purple
            ) {
                EmptyView()
            }
        }
    }
}
