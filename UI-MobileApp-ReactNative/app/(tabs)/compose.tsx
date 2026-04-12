import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API } from '../../src/services/api';
import { C } from '../../src/constants/colors';

type ComposeType = 'byte' | 'interview';
type Difficulty = 'easy' | 'medium' | 'hard';

const LANGS = ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'SQL', 'Swift'];
const TAGS = ['react', 'typescript', 'go', 'rust', 'python', 'postgresql', 'kubernetes', 'swift', 'system-design', 'performance'];
const DIFF_COLOR: Record<Difficulty, string> = { easy: C.green, medium: C.orange, hard: C.red };

interface IQuestion { question: string; answer: string; }

export default function ComposeScreen() {
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<ComposeType>('byte');

  // Byte state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [hasCode, setHasCode] = useState(false);
  const [lang, setLang] = useState('TypeScript');
  const [code, setCode] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Interview state
  const [iTitle, setITitle] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questions, setQuestions] = useState<IQuestion[]>([{ question: '', answer: '' }]);

  const [posting, setPosting] = useState(false);
  const [reachEstimate, setReachEstimate] = useState<number | null>(null);
  const reachTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (type !== 'byte' || !body.trim()) { setReachEstimate(null); return; }
    if (reachTimer.current) clearTimeout(reachTimer.current);
    reachTimer.current = setTimeout(async () => {
      const reach = await API.getReachEstimate(body, selectedTags).catch(() => null);
      setReachEstimate(reach);
    }, 800);
    return () => { if (reachTimer.current) clearTimeout(reachTimer.current); };
  }, [body, selectedTags, type]);

  const toggleTag = (tag: string) =>
    setSelectedTags(t => t.includes(tag) ? t.filter(x => x !== tag) : [...t, tag]);

  const handlePost = async () => {
    if (type === 'byte') {
      if (!title.trim() || !body.trim()) { Alert.alert('Missing fields', 'Title and content are required.'); return; }
      setPosting(true);
      try {
        await API.createPost({
          title, body,
          codeSnippet: hasCode && code.trim() ? { language: lang, content: code } : undefined,
          tags: selectedTags,
        });
        Alert.alert('Posted!', 'Your byte is live.', [{ text: 'OK', onPress: resetByte }]);
      } catch (e: any) { Alert.alert('Error', e.message ?? 'Could not post'); }
      finally { setPosting(false); }
    } else {
      if (!iTitle.trim() || questions.some(q => !q.question.trim())) {
        Alert.alert('Missing fields', 'Add a title and at least one question.');
        return;
      }
      setPosting(true);
      try {
        await API.createInterview({
          title: iTitle, company: company || undefined, role: role || undefined,
          difficulty,
          questions: questions.map((q, i) => ({ question: q.question, answer: q.answer, orderIndex: i + 1 })),
        });
        Alert.alert('Posted!', 'Your interview is live.', [{ text: 'OK', onPress: resetInterview }]);
      } catch (e: any) { Alert.alert('Error', e.message ?? 'Could not post'); }
      finally { setPosting(false); }
    }
  };

  const resetByte = () => { setTitle(''); setBody(''); setCode(''); setSelectedTags([]); setHasCode(false); };
  const resetInterview = () => { setITitle(''); setCompany(''); setRole(''); setQuestions([{ question: '', answer: '' }]); };

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Type toggle */}
      <View style={s.toggle}>
        {(['byte', 'interview'] as ComposeType[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.toggleBtn, type === t && s.toggleActive]}
            onPress={() => setType(t)}
          >
            <Text style={[s.toggleText, type === t && s.toggleTextActive]}>
              NEW {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {type === 'byte' ? (
          <>
            <LabeledInput label="TITLE" value={title} onChangeText={setTitle} placeholder="e.g. Why Go channels are powerful" />
            <LabeledInput label="CONTENT" value={body} onChangeText={setBody} placeholder="Explain the concept…" multiline height={160} />

            {/* Code toggle */}
            <TouchableOpacity style={s.codeToggle} onPress={() => setHasCode(v => !v)}>
              <Ionicons name={hasCode ? 'code-slash' : 'code-slash-outline'} size={16} color={hasCode ? C.accent : C.text3} />
              <Text style={[s.codeToggleText, hasCode && { color: C.accent }]}>
                {hasCode ? 'Remove code snippet' : 'Add code snippet'}
              </Text>
            </TouchableOpacity>

            {hasCode && (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {LANGS.map(l => (
                      <TouchableOpacity
                        key={l}
                        style={[s.langChip, lang === l && s.langChipActive]}
                        onPress={() => setLang(l)}
                      >
                        <Text style={[s.langText, lang === l && { color: C.accent }]}>{l}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <TextInput
                  style={s.codeInput}
                  value={code}
                  onChangeText={setCode}
                  placeholder="// paste your code here"
                  placeholderTextColor={C.text3}
                  multiline
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                />
              </>
            )}

            {/* Tags */}
            <Text style={s.label}>TAGS</Text>
            <View style={s.tagGrid}>
              {TAGS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.tagChip, selectedTags.includes(t) && s.tagChipActive]}
                  onPress={() => toggleTag(t)}
                >
                  <Text style={[s.tagText, selectedTags.includes(t) && { color: C.accent }]}>#{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <LabeledInput label="INTERVIEW TITLE" value={iTitle} onChangeText={setITitle} placeholder="e.g. System Design Round at Stripe" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <LabeledInput label="COMPANY" value={company} onChangeText={setCompany} placeholder="Google" />
              </View>
              <View style={{ flex: 1 }}>
                <LabeledInput label="ROLE" value={role} onChangeText={setRole} placeholder="SWE" />
              </View>
            </View>

            {/* Difficulty */}
            <Text style={s.label}>DIFFICULTY</Text>
            <View style={s.diffRow}>
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                <TouchableOpacity
                  key={d}
                  style={[s.diffBtn, difficulty === d && { borderColor: DIFF_COLOR[d], backgroundColor: DIFF_COLOR[d] + '16' }]}
                  onPress={() => setDifficulty(d)}
                >
                  <Text style={[s.diffText, difficulty === d && { color: DIFF_COLOR[d] }]}>
                    {d.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Questions */}
            <Text style={s.label}>QUESTIONS</Text>
            {questions.map((q, i) => (
              <View key={i} style={s.questionCard}>
                <View style={s.qHeader}>
                  <View style={s.qBadge}><Text style={s.qBadgeText}>Q{i + 1}</Text></View>
                  {questions.length > 1 && (
                    <TouchableOpacity onPress={() => setQuestions(qs => qs.filter((_, j) => j !== i))}>
                      <Ionicons name="close-circle-outline" size={18} color={C.red} />
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={s.qInput}
                  value={q.question}
                  onChangeText={v => setQuestions(qs => qs.map((x, j) => j === i ? { ...x, question: v } : x))}
                  placeholder="Question…"
                  placeholderTextColor={C.text3}
                  multiline
                />
                <TextInput
                  style={[s.qInput, { color: C.text2, fontSize: 13, marginTop: 6 }]}
                  value={q.answer}
                  onChangeText={v => setQuestions(qs => qs.map((x, j) => j === i ? { ...x, answer: v } : x))}
                  placeholder="Answer / hints…"
                  placeholderTextColor={C.text3}
                  multiline
                />
              </View>
            ))}
            <TouchableOpacity
              style={s.addQuestion}
              onPress={() => setQuestions(qs => [...qs, { question: '', answer: '' }])}
            >
              <Ionicons name="add-circle-outline" size={18} color={C.accent} />
              <Text style={s.addQText}>Add Question</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Reach estimate */}
        {type === 'byte' && reachEstimate !== null && (
          <View style={s.reachRow}>
            <Ionicons name="people-outline" size={14} color={C.accent} />
            <Text style={s.reachText}>~{reachEstimate.toLocaleString()} estimated reach</Text>
          </View>
        )}

        {/* Post button */}
        <TouchableOpacity style={s.postBtn} onPress={handlePost} disabled={posting} activeOpacity={0.85}>
          {posting
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.postBtnText}>PUBLISH {type === 'byte' ? 'BYTE' : 'INTERVIEW'}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LabeledInput({ label, multiline, height, ...props }: {
  label: string; multiline?: boolean; height?: number;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.fieldInput, multiline && { height: height ?? 120, textAlignVertical: 'top', paddingTop: 12 }]}
        placeholderTextColor={C.text3}
        autoCorrect={false}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  toggle: {
    flexDirection: 'row', margin: 16, marginBottom: 8,
    backgroundColor: C.element, borderRadius: 10, padding: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  toggleActive: { backgroundColor: C.accent },
  toggleText: { fontSize: 11, fontWeight: '700', color: C.text3, fontFamily: 'Menlo' },
  toggleTextActive: { color: '#fff' },
  label: { fontSize: 10, fontWeight: '700', color: C.text3, marginBottom: 6, fontFamily: 'Menlo' },
  fieldInput: {
    backgroundColor: C.element, borderRadius: 10,
    borderWidth: 1, borderColor: C.borderMed,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: C.text1,
  },
  codeToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10,
  },
  codeToggleText: { fontSize: 13, color: C.text3 },
  langChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: C.element, borderRadius: 6,
    borderWidth: 1, borderColor: C.borderMed,
  },
  langChipActive: { borderColor: C.accent, backgroundColor: C.accentDim },
  langText: { fontSize: 11, fontWeight: '600', color: C.text2 },
  codeInput: {
    backgroundColor: C.codeBg, borderRadius: 8,
    borderWidth: 1, borderColor: C.border,
    padding: 14, fontSize: 12, color: '#c9d1d9',
    fontFamily: 'Menlo', height: 160, textAlignVertical: 'top',
  },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: C.element, borderRadius: 6,
    borderWidth: 1, borderColor: C.borderMed,
  },
  tagChipActive: { borderColor: C.accent, backgroundColor: C.accentDim },
  tagText: { fontSize: 11, fontWeight: '600', color: C.text2 },
  diffRow: { flexDirection: 'row', gap: 10 },
  diffBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: 8, borderWidth: 1, borderColor: C.borderMed,
    backgroundColor: C.element,
  },
  diffText: { fontSize: 11, fontWeight: '700', color: C.text3, fontFamily: 'Menlo' },
  questionCard: {
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, padding: 12, gap: 4,
  },
  qHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  qBadge: { backgroundColor: C.accentDim, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  qBadgeText: { fontSize: 9, fontWeight: '700', color: C.accent, fontFamily: 'Menlo' },
  qInput: {
    fontSize: 14, color: C.text1, minHeight: 40,
    borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 6,
  },
  addQuestion: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  addQText: { fontSize: 14, color: C.accent, fontWeight: '500' },
  reachRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  reachText: { fontSize: 12, color: C.accent, fontFamily: 'Menlo' },
  postBtn: {
    backgroundColor: C.accent, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  postBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Menlo', letterSpacing: 1 },
});
