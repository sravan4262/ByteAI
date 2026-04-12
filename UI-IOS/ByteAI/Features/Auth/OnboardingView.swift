import SwiftUI

// MARK: - Onboarding Screen
// Mirrors /(auth)/onboarding/page.tsx
// Terminal-window styled multi-step profile setup

struct OnboardingView: View {
    @StateObject private var vm = OnboardingViewModel()
    @EnvironmentObject private var auth: AuthManager

    var body: some View {
        ZStack {
            Color.byteBackground.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    // Terminal titlebar
                    TerminalHeader(title: "byteai — profile setup")

                    // Progress bar
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("PROFILE COMPLETION")
                                .font(.byteMonoTiny)
                                .foregroundColor(.byteText3)
                                .tracking(1)
                            Spacer()
                            Text("\(vm.completionPercent)%")
                                .font(.byteMonoTiny)
                                .foregroundColor(.byteAccent)
                        }
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 2)
                                    .fill(Color.byteElement)
                                    .frame(height: 4)
                                RoundedRectangle(cornerRadius: 2)
                                    .fill(
                                        LinearGradient(
                                            colors: [.byteAccent, .byteCyan],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .frame(width: geo.size.width * CGFloat(vm.completionPercent) / 100, height: 4)
                                    .animation(.spring(response: 0.5), value: vm.completionPercent)
                            }
                        }
                        .frame(height: 4)
                    }

                    VStack(spacing: 20) {
                        // Seniority
                        OnboardingField(label: "SENIORITY LEVEL") {
                            BytePicker(selection: $vm.seniority, options: vm.seniorityOptions, placeholder: "Select level")
                        }

                        // Domain
                        OnboardingField(label: "DOMAIN") {
                            BytePicker(selection: $vm.domain, options: vm.domainOptions, placeholder: "Select domain")
                        }

                        // Tech Stack
                        OnboardingField(label: "TECH STACK (max 6)") {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(vm.techOptions, id: \.id) { tech in
                                        let selected = vm.selectedTech.contains(tech.name)
                                        TagView(label: tech.name, isSelected: selected)
                                            .onTapGesture { vm.toggleTech(tech.name) }
                                    }
                                }
                            }
                        }

                        // Bio
                        OnboardingField(label: "BIO") {
                            ZStack(alignment: .topLeading) {
                                if vm.bio.isEmpty {
                                    Text("Tell the community about yourself...")
                                        .font(.byteBody)
                                        .foregroundColor(.byteText3)
                                        .padding(.top, 4)
                                }
                                TextEditor(text: $vm.bio)
                                    .font(.byteBody)
                                    .foregroundColor(.byteText1)
                                    .tint(.byteAccent)
                                    .frame(minHeight: 80)
                                    .scrollContentBackground(.hidden)
                            }
                            .padding(.horizontal, -4)
                        }

                        // Role & Company
                        HStack(spacing: 12) {
                            OnboardingField(label: "ROLE TITLE") {
                                ByteTextField(placeholder: "e.g. Senior Engineer", text: $vm.role)
                            }
                            OnboardingField(label: "COMPANY") {
                                ByteTextField(placeholder: "e.g. Vercel", text: $vm.company)
                            }
                        }
                    }
                    .padding(20)
                    .background(Color.byteCard)
                    .cornerRadius(10)
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.byteBorderMedium, lineWidth: 1))

                    ByteButton("Launch into ByteAI", icon: "rocket", isLoading: vm.isLoading) {
                        Task { await vm.complete(auth: auth) }
                    }
                    .frame(maxWidth: .infinity)

                    Text("You can update this anytime in your profile.")
                        .font(.byteTiny)
                        .foregroundColor(.byteText3)
                }
                .padding(20)
            }
        }
        .task { await vm.loadLookups() }
    }
}

// MARK: - Terminal Header

private struct TerminalHeader: View {
    let title: String

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 6) {
                Circle().fill(Color.byteRed).frame(width: 10, height: 10)
                Circle().fill(Color.byteOrange).frame(width: 10, height: 10)
                Circle().fill(Color.byteGreen).frame(width: 10, height: 10)
                Spacer()
                Text(title)
                    .font(.byteMono(11))
                    .foregroundColor(.byteText2)
                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.byteElement)

            Divider().background(Color.byteBorderMedium)
        }
        .cornerRadius(10)
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.byteBorderMedium, lineWidth: 1))
    }
}

// MARK: - Onboarding Field wrapper

private struct OnboardingField<Content: View>: View {
    let label: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.byteMonoTiny)
                .foregroundColor(.byteText3)
                .tracking(1)
            content()
        }
    }
}

// MARK: - Generic Picker

private struct BytePicker: View {
    @Binding var selection: String
    let options: [String]
    let placeholder: String

    var body: some View {
        Menu {
            ForEach(options, id: \.self) { opt in
                Button(opt) { selection = opt }
            }
        } label: {
            HStack {
                Text(selection.isEmpty ? placeholder : selection)
                    .font(.byteBody)
                    .foregroundColor(selection.isEmpty ? .byteText3 : .byteText1)
                Spacer()
                Image(systemName: "chevron.up.chevron.down")
                    .font(.system(size: 12))
                    .foregroundColor(.byteText2)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color.byteElement)
            .cornerRadius(8)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.byteBorderMedium, lineWidth: 1))
        }
    }
}

// MARK: - ViewModel

@MainActor
final class OnboardingViewModel: ObservableObject {
    @Published var seniority  = ""
    @Published var domain     = ""
    @Published var selectedTech: Set<String> = []
    @Published var bio        = ""
    @Published var role       = ""
    @Published var company    = ""
    @Published var isLoading  = false

    @Published var seniorityOptions: [String] = ["Intern", "Junior", "Mid-Level", "Senior", "Staff", "Principal"]
    @Published var domainOptions: [String]    = ["Frontend", "Backend", "Full Stack", "Mobile", "DevOps / Platform", "ML / AI"]
    @Published var techOptions: [TechStack]   = []

    var completionPercent: Int {
        let filled = [!seniority.isEmpty, !domain.isEmpty, !selectedTech.isEmpty,
                      !bio.isEmpty, !role.isEmpty, !company.isEmpty]
        return Int(Double(filled.filter { $0 }.count) / Double(filled.count) * 100)
    }

    func loadLookups() async {
        async let seniorities = try? APIClient.shared.getSeniorityTypes()
        async let domains     = try? APIClient.shared.getDomains()
        async let stacks      = try? APIClient.shared.getTechStacks()

        if let s = await seniorities, !s.isEmpty {
            seniorityOptions = s.map { $0.label }
        }
        if let d = await domains, !d.isEmpty {
            domainOptions = d.map { $0.name }
        }
        if let t = await stacks {
            techOptions = t
        }
    }

    func toggleTech(_ name: String) {
        if selectedTech.contains(name) {
            selectedTech.remove(name)
        } else if selectedTech.count < 6 {
            selectedTech.insert(name)
        }
    }

    func complete(auth: AuthManager) async {
        isLoading = true
        defer { isLoading = false }
        do {
            try await APIClient.shared.saveOnboardingData(
                seniority: seniority,
                domain: domain,
                techStack: Array(selectedTech),
                bio: bio.isEmpty ? nil : bio,
                company: company.isEmpty ? nil : company,
                roleTitle: role.isEmpty ? nil : role
            )
            auth.completeOnboarding()
        } catch {
            // Non-blocking — proceed to app even if save fails
            auth.completeOnboarding()
        }
    }
}

#Preview {
    OnboardingView()
        .environmentObject(AuthManager.shared)
}
