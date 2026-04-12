import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Share,
  Dimensions, ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Interview, InterviewQuestion } from '../../types/models';
import { API } from '../../services/api';
import { C } from '../../constants/colors';
import { PostHeader } from '../ui/PostHeader';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: C.green, medium: C.orange, hard: C.red,
};

// ─── Question row ─────────────────────────────────────────────────────────

function QuestionRow({ question, isExpanded, onToggle }: {
  question: InterviewQuestion; isExpanded: boolean; onToggle: () => void;
}) {
  return (
    <View style={qrow.container}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.75} style={qrow.header}>
        <View style={qrow.badge}>
          <Text style={qrow.badgeText}>Q{question.orderIndex}</Text>
        </View>
        <Text style={qrow.question} numberOfLines={isExpanded ? undefined : 2}>
          {question.question}
        </Text>
        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={13} color={C.text3} />
      </TouchableOpacity>

      {isExpanded && (
        <View style={qrow.answer}>
          <Text style={qrow.answerText} numberOfLines={6}>{question.answer}</Text>
          <View style={qrow.actions}>
            <TouchableOpacity
              style={qrow.actionBtn}
              onPress={() => question.isLiked
                ? API.unlikeQuestion(question.id)
                : API.likeQuestion(question.id)
              }
            >
              <Ionicons name="thumbs-up-outline" size={14} color={C.green} />
              <Text style={[qrow.actionCount, { color: C.green }]}>{question.likeCount}</Text>
            </TouchableOpacity>
            <View style={qrow.actionBtn}>
              <Ionicons name="chatbubble-outline" size={13} color={C.text3} />
              <Text style={qrow.actionCount}>{question.commentCount}</Text>
            </View>
          </View>
        </View>
      )}
      <View style={qrow.divider} />
    </View>
  );
}

const qrow = StyleSheet.create({
  container: {},
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, paddingVertical: 10,
  },
  badge: {
    backgroundColor: C.accentDim, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2, marginTop: 2,
  },
  badgeText: { fontSize: 9, fontWeight: '700', color: C.accent, fontFamily: 'Menlo' },
  question: { flex: 1, fontSize: 13, fontWeight: '500', color: C.text1, lineHeight: 19 },
  answer: { paddingLeft: 36, paddingBottom: 10 },
  answerText: { fontSize: 13, color: C.text2, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionCount: { fontSize: 12, color: C.text3 },
  divider: { height: 1, backgroundColor: C.border },
});

// ─── InterviewPageCard ────────────────────────────────────────────────────

interface Props {
  interview: Interview;
  scrollY: Animated.SharedValue<number>;
  index: number;
}

export function InterviewPageCard({ interview, scrollY, index }: Props) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isBookmarked, setBookmarked] = useState(false);

  const cardStyle = useAnimatedStyle(() => {
    const itemY = index * SCREEN_HEIGHT;
    const dist = Math.abs(scrollY.value - itemY);
    const progress = Math.min(dist / SCREEN_HEIGHT, 1);
    return {
      opacity: interpolate(progress, [0, 1], [1, 0.62], Extrapolation.CLAMP),
      transform: [
        { perspective: 800 },
        { rotateX: `${interpolate(progress, [0, 1], [0, 7], Extrapolation.CLAMP)}deg` },
        { scale: interpolate(progress, [0, 1], [1, 0.955], Extrapolation.CLAMP) },
      ],
    };
  });

  const diffColor = DIFFICULTY_COLOR[interview.difficulty] ?? C.text3;
  const visibleQs = interview.questions.slice(0, 4);

  const fakePostAuthor = {
    id: interview.id, title: interview.title, body: '',
    author: interview.author, tags: [], likes: 0, comments: 0,
    shares: 0, bookmarks: 0, timestamp: interview.createdAt,
    isLiked: false, isBookmarked: false, type: 'interview' as const,
  };

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      <View style={styles.content}>
        <View style={{ height: 62 }} />

        {/* Author */}
        <PostHeader
          author={interview.author}
          timestamp={interview.createdAt}
          type="interview"
        />

        {/* Meta chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chips}>
            <View style={[styles.chip, { borderColor: C.purple + '50', backgroundColor: C.purpleDim }]}>
              <Text style={[styles.chipText, { color: C.purple }]}>INTERVIEW</Text>
            </View>
            <View style={[styles.chip, { borderColor: diffColor + '50', backgroundColor: diffColor + '14' }]}>
              <Text style={[styles.chipText, { color: diffColor }]}>{interview.difficulty.toUpperCase()}</Text>
            </View>
            {interview.company && (
              <View style={[styles.chip, { borderColor: C.borderMed }]}>
                <Ionicons name="business-outline" size={9} color={C.text3} />
                <Text style={styles.chipText}>{interview.company.toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.chip}>
              <Text style={styles.chipText}>{interview.questions.length} Q's</Text>
            </View>
          </View>
        </ScrollView>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>{interview.title}</Text>

        <View style={styles.divider} />

        {/* Questions */}
        {visibleQs.map(q => (
          <QuestionRow
            key={q.id}
            question={q}
            isExpanded={expandedId === q.id}
            onToggle={() => setExpandedId(expandedId === q.id ? null : q.id)}
          />
        ))}

        {interview.questions.length > 4 && (
          <Text style={styles.moreQs}>
            + {interview.questions.length - 4} more questions
          </Text>
        )}
      </View>

      {/* Bottom fade */}
      <LinearGradient
        colors={['transparent', C.background + 'b0']}
        style={styles.bottomFade}
        pointerEvents="none"
      />

      {/* Swipe hint */}
      <View style={styles.swipeHint} pointerEvents="none">
        <Ionicons name="chevron-up" size={18} color={C.text3} />
      </View>

      {/* Right action rail */}
      <View style={styles.rail}>
        {/* Bookmark */}
        <View style={railS.item}>
          <TouchableOpacity
            onPress={() => {
              setBookmarked(b => !b);
              if (!isBookmarked) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={30}
              color={isBookmarked ? C.cyan : C.text1}
            />
          </TouchableOpacity>
          <Text style={[railS.label, isBookmarked && { color: C.cyan }]}>
            {isBookmarked ? 'Saved' : 'Save'}
          </Text>
        </View>

        {/* Share */}
        <View style={railS.item}>
          <TouchableOpacity
            onPress={() => Share.share({ message: `Check out this interview on ByteAI: ${interview.title}` })}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={28} color={C.text1} />
          </TouchableOpacity>
          <Text style={railS.label}>Share</Text>
        </View>

        {/* View Full */}
        <View style={railS.item}>
          <TouchableOpacity
            onPress={() => router.push(`/interviews/${interview.id}` as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="open-outline" size={26} color={C.text1} />
          </TouchableOpacity>
          <Text style={railS.label}>View</Text>
        </View>

        {/* Role */}
        {interview.role && (
          <View style={railS.item}>
            <Ionicons name="person-outline" size={20} color={C.text3} />
            <Text style={railS.roleText} numberOfLines={2}>{interview.role.toUpperCase()}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { height: SCREEN_HEIGHT, backgroundColor: C.background },
  content: { flex: 1, paddingLeft: 20, paddingRight: 76, gap: 12 },
  chips: { flexDirection: 'row', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderColor: C.borderMed, borderRadius: 5,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  chipText: { fontSize: 9, fontWeight: '700', color: C.text3, fontFamily: 'Menlo' },
  title: { fontSize: 18, fontWeight: '700', color: C.text1, lineHeight: 25 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 2 },
  moreQs: { fontSize: 11, color: C.text3, fontFamily: 'Menlo', marginTop: 2 },
  bottomFade: { position: 'absolute', left: 0, right: 0, bottom: 28, height: 72 },
  swipeHint: { position: 'absolute', bottom: 6, left: 0, right: 0, alignItems: 'center' },
  rail: {
    position: 'absolute', right: 0, bottom: 56,
    width: 62, alignItems: 'center', gap: 26,
  },
});

const railS = StyleSheet.create({
  item: { alignItems: 'center', gap: 5 },
  label: { fontSize: 11, fontWeight: '500', color: C.text3 },
  roleText: {
    fontSize: 8, fontWeight: '700', color: C.text3,
    fontFamily: 'Menlo', textAlign: 'center', maxWidth: 52,
  },
});
