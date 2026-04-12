import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { API } from '../../src/services/api';
import { C } from '../../src/constants/colors';
import { useAuthStore } from '../../src/stores/authStore';
import { TechStack, SeniorityType, Domain } from '../../src/types/models';

const FALLBACK_SENIORITY = ['Intern', 'Junior', 'Mid-level', 'Senior', 'Staff', 'Principal'];
const FALLBACK_DOMAINS = ['Frontend', 'Backend', 'Full Stack', 'Mobile', 'DevOps', 'ML/AI'];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { setAuthenticated, setToken } = useAuthStore();

  const [step, setStep] = useState(0); // 0=seniority, 1=domain, 2=stacks, 3=profile
  const [seniority, setSeniority] = useState('');
  const [domain, setDomain] = useState('');
  const [selectedStacks, setSelectedStacks] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [stacks, setStacks] = useState<TechStack[]>([]);
  const [seniorityOptions, setSeniorityOptions] = useState<string[]>(FALLBACK_SENIORITY);
  const [domainOptions, setDomainOptions] = useState<string[]>(FALLBACK_DOMAINS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      API.getSeniorityTypes().catch(() => [] as SeniorityType[]),
      API.getDomains().catch(() => [] as Domain[]),
      API.getTechStacks().catch(() => [] as TechStack[]),
    ]).then(([s, d, t]) => {
      if (s.length > 0) setSeniorityOptions(s.map(x => x.name));
      if (d.length > 0) setDomainOptions(d.map(x => x.name));
      if (t.length > 0) setStacks(t);
    });
  }, []);

  const toggleStack = (name: string) =>
    setSelectedStacks(s => s.includes(name) ? s.filter(x => x !== name) : s.length < 6 ? [...s, name] : s);

  const handleFinish = async () => {
    setSaving(true);
    try {
      const token = await getToken().catch(() => null);
      if (token) setToken(token);
      await API.saveOnboardingData({
        seniority: seniority || undefined,
        domain: domain || undefined,
        techStack: selectedStacks,
        bio: bio || undefined,
        company: company || undefined,
        roleTitle: role || undefined,
      });
      const user = await API.updateProfile({
        displayName: displayName || undefined,
      });
      setAuthenticated(user);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  const progress = (step + 1) / 4;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Progress */}
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.stepLabel}>STEP {step + 1} OF 4</Text>

        {step === 0 && (
          <>
            <Text style={s.heading}>What's your seniority?</Text>
            <View style={s.grid}>
              {seniorityOptions.map(s_ => (
                <TouchableOpacity
                  key={s_}
                  style={[s.option, seniority === s_ && s.optionActive]}
                  onPress={() => setSeniority(s_)}
                >
                  <Text style={[s.optionText, seniority === s_ && s.optionTextActive]}>{s_}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={s.heading}>What's your domain?</Text>
            <View style={s.grid}>
              {domainOptions.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[s.option, domain === d && s.optionActive]}
                  onPress={() => setDomain(d)}
                >
                  <Text style={[s.optionText, domain === d && s.optionTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={s.heading}>Pick your tech stack</Text>
            <Text style={s.sub}>Choose up to 6</Text>
            <View style={s.tagWrap}>
              {stacks.map(st => (
                <TouchableOpacity
                  key={st.id}
                  style={[s.tagChip, selectedStacks.includes(st.name) && s.tagChipActive]}
                  onPress={() => toggleStack(st.name)}
                >
                  <Text style={[s.tagText, selectedStacks.includes(st.name) && { color: C.accent }]}>
                    {st.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={s.heading}>Complete your profile</Text>
            {[
              { label: 'Display Name', value: displayName, setter: setDisplayName, placeholder: 'John Doe' },
              { label: 'Company', value: company, setter: setCompany, placeholder: 'Stripe' },
              { label: 'Role', value: role, setter: setRole, placeholder: 'Senior SWE' },
            ].map(f => (
              <View key={f.label}>
                <Text style={s.fieldLabel}>{f.label.toUpperCase()}</Text>
                <TextInput
                  style={s.input}
                  value={f.value}
                  onChangeText={f.setter}
                  placeholder={f.placeholder}
                  placeholderTextColor={C.text3}
                />
              </View>
            ))}
            <View>
              <Text style={s.fieldLabel}>BIO</Text>
              <TextInput
                style={[s.input, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                value={bio} onChangeText={setBio}
                placeholder="Tell the community about yourself…"
                placeholderTextColor={C.text3}
                multiline
              />
            </View>
          </>
        )}

        {/* Navigation */}
        <View style={s.navRow}>
          {step > 0 && (
            <TouchableOpacity style={s.backBtn} onPress={() => setStep(s => s - 1)}>
              <Text style={s.backText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={s.nextBtn}
            onPress={step < 3 ? () => setStep(s => s + 1) : handleFinish}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.nextText}>{step < 3 ? 'Continue' : 'Finish Setup'}</Text>
            }
          </TouchableOpacity>
        </View>

        {step < 3 && (
          <TouchableOpacity onPress={() => setStep(s => s + 1)} style={s.skip}>
            <Text style={s.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  progressTrack: { height: 2, backgroundColor: C.border },
  progressFill: { height: '100%', backgroundColor: C.accent },
  stepLabel: { fontSize: 10, fontWeight: '700', color: C.text3, fontFamily: 'Menlo' },
  heading: { fontSize: 24, fontWeight: '700', color: C.text1 },
  sub: { fontSize: 13, color: C.text3, marginTop: -12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1,
    borderColor: C.borderMed, backgroundColor: C.element,
  },
  optionActive: { borderColor: C.accent, backgroundColor: C.accentDim },
  optionText: { fontSize: 14, fontWeight: '500', color: C.text2 },
  optionTextActive: { color: C.accent, fontWeight: '600' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1,
    borderColor: C.borderMed, backgroundColor: C.element,
  },
  tagChipActive: { borderColor: C.accent, backgroundColor: C.accentDim },
  tagText: { fontSize: 13, fontWeight: '500', color: C.text2 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: C.text3, marginBottom: 6, fontFamily: 'Menlo' },
  input: {
    backgroundColor: C.element, borderRadius: 10,
    borderWidth: 1, borderColor: C.borderMed,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: C.text1,
  },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  backBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: C.borderMed,
  },
  backText: { fontSize: 15, fontWeight: '600', color: C.text2 },
  nextBtn: {
    flex: 2, backgroundColor: C.accent, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  nextText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  skip: { alignItems: 'center' },
  skipText: { fontSize: 13, color: C.text3 },
});
