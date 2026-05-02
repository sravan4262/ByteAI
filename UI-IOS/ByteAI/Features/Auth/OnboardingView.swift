import SwiftUI

// MARK: - Onboarding Screen
// Mirrors UI/components/features/onboarding/onboarding-screen.tsx
// 4-step flow: SENIORITY → DOMAIN (multi-select) → TECH (max 6) → REVIEW
// Plus an "identity card" with role/company inline inputs and bio editor.

enum OnboardingStep: Int, CaseIterable {
    case seniority, domain, tech, review

    var label: String {
        switch self {
        case .seniority: "SENIORITY"
        case .domain:    "DOMAIN"
        case .tech:      "TECH STACK"
        case .review:    "REVIEW"
        }
    }
}

struct OnboardingView: View {
    @StateObject private var vm = OnboardingViewModel()
    @EnvironmentObject private var auth: AuthManager

    var body: some View {
        ZStack {
            Color.byteBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                ProgressHeader(stepIndex: vm.currentStepIndex, totalSteps: OnboardingStep.allCases.count)

                ScrollView {
                    VStack(spacing: 24) {
                        IdentityCard(vm: vm)
                            .padding(.top, 8)

                        switch vm.activeStep {
                        case .seniority: SeniorityStep(vm: vm)
                        case .domain:    DomainStep(vm: vm)
                        case .tech:      TechStep(vm: vm)
                        case .review:    ReviewStep(vm: vm) {
                            Task { await vm.complete(auth: auth) }
                        }
                        }
                    }
                    .padding(20)
                    .padding(.bottom, 40)
                }
                .scrollDismissesKeyboard(.interactively)
            }
        }
        .dismissKeyboardOnTap()
        .task { await vm.loadLookups() }
    }
}

// MARK: - Progress header

private struct ProgressHeader: View {
    let stepIndex: Int
    let totalSteps: Int

    var body: some View {
        VStack(spacing: 10) {
            HStack {
                AccentBarHeader(label: "SETUP PROFILE", size: .standard)
                Spacer()
                Text("\(stepIndex + 1) / \(totalSteps)")
                    .font(.byteMono(10))
                    .foregroundColor(.byteText2)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.byteBorderMedium).frame(height: 2)
                    Capsule()
                        .fill(LinearGradient(
                            colors: [.byteAccent, .byteCyan, .byteAccent],
                            startPoint: .leading, endPoint: .trailing
                        ))
                        .frame(width: geo.size.width * CGFloat(stepIndex + 1) / CGFloat(totalSteps), height: 2)
                        .animation(.easeOut(duration: 0.5), value: stepIndex)
                }
            }
            .frame(height: 2)
        }
        .padding(.horizontal, 20)
        .padding(.top, 16)
        .padding(.bottom, 12)
        .background(Color.byteBackground)
    }
}

// MARK: - Identity card (terminal-window style)

private struct IdentityCard: View {
    @ObservedObject var vm: OnboardingViewModel

    var body: some View {
        VStack(spacing: 0) {
            // Title bar
            HStack(spacing: 6) {
                Circle().fill(Color(hex: "#ff5f57")).frame(width: 10, height: 10)
                Circle().fill(Color(hex: "#febc2e")).frame(width: 10, height: 10)
                Circle().fill(Color(hex: "#28c840")).frame(width: 10, height: 10)
                Text("~/user.profile.init")
                    .font(.byteMono(10))
                    .foregroundColor(.byteText2)
                    .tracking(0.6)
                    .padding(.leading, 4)
                Spacer()
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color.white.opacity(0.02))
            .overlay(Rectangle().frame(height: 1).foregroundColor(.byteBorder), alignment: .bottom)

            // Author line
            HStack(alignment: .center, spacing: 12) {
                AvatarView(vm.initials, variant: .cyan, size: .md, imageUrl: vm.avatarUrl)

                VStack(alignment: .leading, spacing: 6) {
                    Text(vm.displayName)
                        .font(.byteMono(12, weight: .bold))
                        .foregroundColor(.byteText1)
                        .lineLimit(1)

                    HStack(spacing: 4) {
                        DashedUnderlineInput(text: $vm.role, placeholder: "Sr. Engineer", color: .byteAccent, maxLength: 40)
                            .layoutPriority(1)
                        Text("@")
                            .font(.byteMono(11, weight: .bold))
                            .foregroundColor(.byteText2.opacity(0.6))
                        DashedUnderlineInput(text: $vm.company, placeholder: "your-company.io", color: .byteGreen, maxLength: 50)
                            .layoutPriority(1)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
            .background(IdentityColor.blue.bgFaint)
            .overlay(Rectangle().frame(height: 1).foregroundColor(.byteBorder), alignment: .bottom)

            BioTextarea(text: $vm.bio)
        }
        .background(Color.white.opacity(0.01))
        .overlay(
            RoundedRectangle(cornerRadius: 14).stroke(Color.byteBorderMedium, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

// MARK: - Step: Seniority

private struct SeniorityStep: View {
    @ObservedObject var vm: OnboardingViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            AccentBarHeader(label: "SENIORITY")

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ForEach(vm.seniorityOptions) { level in
                    FaintTintButton(
                        label: level.label,
                        icon: level.icon,
                        isSelected: vm.selectedSeniority?.id == level.id
                    ) {
                        vm.selectedSeniority = level
                        withAnimation { vm.activeStep = .domain }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
    }
}

// MARK: - Step: Domain (multi-select)

private struct DomainStep: View {
    @ObservedObject var vm: OnboardingViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 10) {
                Button { withAnimation { vm.activeStep = .seniority } } label: {
                    Image(systemName: "arrow.left")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.byteAccent)
                        .frame(width: 32, height: 32)
                }
                AccentBarHeader(label: "DOMAIN")
                Spacer()
                if !vm.selectedDomains.isEmpty {
                    Text("\(vm.selectedDomains.count) selected")
                        .font(.byteMono(10))
                        .foregroundColor(.byteAccent)
                }
            }

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ForEach(vm.domainOptions) { domain in
                    FaintTintButton(
                        label: domain.label,
                        icon: domain.icon,
                        trailing: vm.selectedDomains.contains(where: { $0.id == domain.id }) ? "✓" : nil,
                        isSelected: vm.selectedDomains.contains(where: { $0.id == domain.id })
                    ) {
                        vm.toggleDomain(domain)
                    }
                    .frame(maxWidth: .infinity)
                }
            }

            Button {
                Task { await vm.advanceToTech() }
            } label: {
                Text(vm.selectedDomains.isEmpty
                     ? "Select at least 1 domain"
                     : "Continue with \(vm.selectedDomains.count) domain\(vm.selectedDomains.count > 1 ? "s" : "") →")
                    .font(.byteMono(11, weight: .semibold))
                    .foregroundColor(vm.selectedDomains.isEmpty ? .byteText2 : .byteAccent)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(IdentityColor.blue.bgFaint)
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(vm.selectedDomains.isEmpty ? IdentityColor.blue.borderFaint : .byteAccent, lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            .disabled(vm.selectedDomains.isEmpty)
            .opacity(vm.selectedDomains.isEmpty ? 0.5 : 1)
            .frame(minHeight: 44)
        }
    }
}

// MARK: - Step: Tech Stack (max 6)

private struct TechStep: View {
    @ObservedObject var vm: OnboardingViewModel
    @State private var search: String = ""

    private var filtered: [TechStack]? {
        guard !search.trimmingCharacters(in: .whitespaces).isEmpty else { return nil }
        let q = search.lowercased()
        return vm.allTechStacks().filter { $0.label.lowercased().contains(q) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 10) {
                Button { withAnimation { vm.activeStep = .domain } } label: {
                    Image(systemName: "arrow.left")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.byteAccent)
                        .frame(width: 32, height: 32)
                }
                AccentBarHeader(label: "TECH STACK")
                Spacer()
                if !vm.selectedTech.isEmpty {
                    Text("\(vm.selectedTech.count)/\(OnboardingViewModel.maxTech) selected")
                        .font(.byteMono(10))
                        .foregroundColor(.byteAccent)
                }
            }

            // Search field
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 12))
                    .foregroundColor(.byteText2)
                TextField("Search across all domains…", text: $search)
                    .font(.byteTerminalSmall)
                    .foregroundColor(.byteText1)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color.byteElement)
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.byteBorderHigh, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 10))

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let filtered {
                        // Flat list (search mode)
                        FlowChips(items: filtered, selected: vm.selectedTech, max: OnboardingViewModel.maxTech) { tech in
                            vm.toggleTech(tech.name)
                        }
                    } else {
                        // Grouped by domain
                        ForEach(vm.selectedDomains) { domain in
                            VStack(alignment: .leading, spacing: 8) {
                                HStack(spacing: 6) {
                                    Text(domain.icon)
                                    Text(domain.label.uppercased())
                                        .font(.byteMono(10, weight: .bold))
                                        .foregroundColor(.byteText2)
                                        .tracking(0.6)
                                }
                                FlowChips(
                                    items: vm.techStackByDomain[domain.id] ?? [],
                                    selected: vm.selectedTech,
                                    max: OnboardingViewModel.maxTech
                                ) { tech in
                                    vm.toggleTech(tech.name)
                                }
                            }
                        }
                    }
                }
            }
            .frame(maxHeight: 280)

            Button {
                withAnimation { vm.activeStep = .review }
            } label: {
                Text(vm.selectedTech.isEmpty ? "Select at least 1 technology" : "Continue →")
                    .font(.byteMono(11, weight: .semibold))
                    .foregroundColor(vm.selectedTech.isEmpty ? .byteText2 : .byteAccent)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(IdentityColor.blue.bgFaint)
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(vm.selectedTech.isEmpty ? IdentityColor.blue.borderFaint : .byteAccent, lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            .disabled(vm.selectedTech.isEmpty)
            .opacity(vm.selectedTech.isEmpty ? 0.5 : 1)
            .frame(minHeight: 44)
        }
    }
}

// MARK: - Step: Review

private struct ReviewStep: View {
    @ObservedObject var vm: OnboardingViewModel
    let onSubmit: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 10) {
                Button { withAnimation { vm.activeStep = .tech } } label: {
                    Image(systemName: "arrow.left")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.byteAccent)
                        .frame(width: 32, height: 32)
                }
                AccentBarHeader(label: "REVIEW", identity: .purple)
            }

            VStack(alignment: .leading, spacing: 18) {
                ChipSection(title: "SENIORITY") {
                    if let s = vm.selectedSeniority {
                        SelectedChip(label: s.label, icon: s.icon)
                    }
                }
                ChipSection(title: "DOMAINS") {
                    FlowSelectedChips(items: vm.selectedDomains.map { (label: $0.label, icon: $0.icon) })
                }
                ChipSection(title: "TECH STACK") {
                    FlowSelectedChips(items: vm.selectedTech.map { (label: $0, icon: nil) })
                }
            }
            .padding(16)
            .background(Color.byteElement)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.byteBorderMedium, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 14))

            SubmitButton(label: vm.isLoading ? "SETTING UP…" : "ENTER BYTEAI", isLoading: vm.isLoading, isDisabled: vm.isLoading) {
                onSubmit()
            }
        }
    }
}

private struct ChipSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            AccentBarHeader(label: title, size: .compact)
            content()
        }
    }
}

private struct SelectedChip: View {
    let label: String
    var icon: String?
    var body: some View {
        HStack(spacing: 6) {
            if let icon { Text(icon) }
            Text(label)
                .font(.byteMono(11, weight: .semibold))
        }
        .foregroundColor(.byteAccent)
        .padding(.horizontal, 12)
        .padding(.vertical, 7)
        .background(IdentityColor.blue.bgActive)
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.byteAccent, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

private struct FlowSelectedChips: View {
    let items: [(label: String, icon: String?)]
    var body: some View {
        FlowLayout(spacing: 8) {
            ForEach(items.indices, id: \.self) { i in
                SelectedChip(label: items[i].label, icon: items[i].icon)
            }
        }
    }
}

// Tech-stack chips — wrap with FlowLayout to mirror web's `flex-wrap` behavior.
// Chips size to their label content rather than being forced into a 2-col grid.
private struct FlowChips: View {
    let items: [TechStack]
    let selected: Set<String>
    let max: Int
    let onTap: (TechStack) -> Void

    var body: some View {
        FlowLayout(spacing: 8) {
            ForEach(items) { tech in
                let isSelected = selected.contains(tech.name)
                let isDisabled = !isSelected && selected.count >= max
                FaintTintButton(
                    label: tech.label,
                    trailing: isSelected ? "✓" : nil,
                    isSelected: isSelected,
                    size: .compact,
                    isDisabled: isDisabled
                ) {
                    onTap(tech)
                }
            }
        }
    }
}

// MARK: - ViewModel

@MainActor
final class OnboardingViewModel: ObservableObject {
    static let maxTech = 6

    @Published var activeStep: OnboardingStep = .seniority
    @Published var seniorityOptions: [SeniorityType] = []
    @Published var domainOptions: [Domain] = []
    @Published var techStackByDomain: [String: [TechStack]] = [:]

    @Published var selectedSeniority: SeniorityType?
    @Published var selectedDomains: [Domain] = []
    @Published var selectedTech: Set<String> = []

    @Published var role = ""
    @Published var company = ""
    @Published var bio = ""
    @Published var isLoading = false

    var currentStepIndex: Int { activeStep.rawValue }

    var displayName: String {
        AuthManager.shared.currentUser?.displayName ?? "Developer"
    }

    var initials: String {
        let name = displayName
        return String(name.prefix(1)).uppercased()
    }

    var avatarUrl: String? {
        AuthManager.shared.currentUser?.avatarUrl
    }

    func loadLookups() async {
        do {
            async let s = APIClient.shared.getSeniorityTypes()
            async let d = APIClient.shared.getDomains()
            seniorityOptions = try await s
            domainOptions = try await d
        } catch let err {
            dprint("[Onboarding] loadLookups failed: \(err)")
            ToastCenter.shared.show(error: err, context: "Couldn't load options")
        }
    }

    func toggleDomain(_ domain: Domain) {
        if let idx = selectedDomains.firstIndex(where: { $0.id == domain.id }) {
            // Remove and unselect that domain's tech stacks
            selectedDomains.remove(at: idx)
            let removed = (techStackByDomain[domain.id] ?? []).map { $0.name }
            selectedTech.subtract(removed)
        } else {
            selectedDomains.append(domain)
        }
    }

    func advanceToTech() async {
        let unfetched = selectedDomains.filter { techStackByDomain[$0.id] == nil }
        if !unfetched.isEmpty {
            await withTaskGroup(of: (String, [TechStack]?).self) { group in
                for d in unfetched {
                    group.addTask {
                        let stacks = try? await APIClient.shared.getTechStacks(domainId: d.id)
                        return (d.id, stacks)
                    }
                }
                for await (id, stacks) in group {
                    techStackByDomain[id] = stacks ?? []
                }
            }
        }
        withAnimation { activeStep = .tech }
    }

    func toggleTech(_ name: String) {
        if selectedTech.contains(name) {
            selectedTech.remove(name)
        } else if selectedTech.count < Self.maxTech {
            selectedTech.insert(name)
        }
    }

    func allTechStacks() -> [TechStack] {
        selectedDomains.flatMap { techStackByDomain[$0.id] ?? [] }
    }

    func complete(auth: AuthManager) async {
        guard let seniority = selectedSeniority,
              let domain = selectedDomains.first else {
            ToastCenter.shared.show("Please complete all steps.", kind: .warning)
            return
        }
        guard !selectedTech.isEmpty else {
            ToastCenter.shared.show("Please select at least one technology.", kind: .warning)
            withAnimation { activeStep = .tech }
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            try await APIClient.shared.saveOnboardingData(
                seniority: seniority.name,
                domain: domain.name,
                techStack: Array(selectedTech),
                bio: bio.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : bio,
                company: company.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : company,
                roleTitle: role.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : role
            )
            await auth.completeOnboarding()
        } catch let err {
            ToastCenter.shared.show(error: err, context: "Couldn't save your profile")
        }
    }
}

#Preview {
    OnboardingView()
        .environmentObject(AuthManager.shared)
}
