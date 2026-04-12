import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Share, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { API } from '../../src/services/api';
import { C } from '../../src/constants/colors';
import { Interview, InterviewQuestion, InterviewComment } from '../../src/types/models';
import { AvatarView } from '../../src/components/ui/AvatarView';
import { ByteSpinner } from '../../src/components/ui/ByteSpinner';
import { formatRelative } from '../../src/utils/time';

const DIFF_COLOR: Record<string, string> = {
  easy: C.green,
  medium: C.orange,
  hard: C.red,
};

function QuestionCard({
  q, index, expanded, onToggle,
}: {
  q: InterviewQuestion; index: number; expanded: boolean; onToggle: () => void;
}) {
  const [liked, setLiked] = useState(q.isLiked);
  const [likeCount, setLikeCount] = useState(q.likeCount);

  const handleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount(c => c + (next ? 1 : -1));
    if (next) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await (next ? API.likeQuestion(q.id) : API.unlikeQuestion(q.id)).catch(() => {
      setLiked(!next);
      setLikeCount(c => c + (next ? -1 : 1));
    });
  };

  return (
    <View style={qs.card}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.8} style={qs.header}>
        <View style={qs.badge}>
          <Text style={qs.badgeText}>Q{index + 1}</Text>
        </View>
        <Text style={qs.question} numberOfLines={expanded ? undefined : 2}>{q.question}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={C.text3} />
      </TouchableOpacity>

      {expanded && (
        <View style={qs.answer}>
          <Text style={qs.answerText}>{q.answer}</Text>
          <View style={qs.answerActions}>
            <TouchableOpacity onPress={handleLike} style={qs.actionBtn} activeOpacity={0.7}>
              <Ionicons name={liked ? 'thumbs-up' : 'thumbs-up-outline'} size={14} color={liked ? C.green : C.text3} />
              <Text style={[qs.actionText, liked && { color: C.green }]}>{likeCount}</Text>
            </TouchableOpacity>
            <View style={qs.actionBtn}>
              <Ionicons name="chatbubble-outline" size={13} color={C.text3} />
              <Text style={qs.actionText}>{q.commentCount}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function CommentRow({ comment }: { comment: InterviewComment }) {
  return (
    <View style={cm.row}>
      <AvatarView initials={comment.authorId.slice(0, 1).toUpperCase()} variant="cyan" size="sm" />
      <View style={cm.body}>
        <Text style={cm.author}>@{comment.authorId.slice(0, 8)}</Text>
        <Text style={cm.text}>{comment.body}</Text>
        <Text style={cm.time}>{formatRelative(comment.createdAt)}</Text>
      </View>
    </View>
  );
}

export default function InterviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [interview, setInterview] = useState<Interview | null>(null);
  const [comments, setComments] = useState<InterviewComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [iv, cs] = await Promise.all([
        API.getInterview(id),
        API.getInterviewComments(id),
      ]);
      setInterview(iv);
      setComments(cs);
    } catch {
      Alert.alert('Error', 'Could not load interview.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const toggleQuestion = (qid: string) => {
    setExpandedIds(s => {
      const n = new Set(s);
      n.has(qid) ? n.delete(qid) : n.add(qid);
      return n;
    });
  };

  const toggleAll = () => {
    if (!interview) return;
    if (allExpanded) {
      setExpandedIds(new Set());
      setAllExpanded(false);
    } else {
      setExpandedIds(new Set(interview.questions.map(q => q.id)));
      setAllExpanded(true);
    }
  };

  const handleBookmark = async () => {
    const next = !isBookmarked;
    setIsBookmarked(next);
    if (next) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await API.toggleBookmark(id!, 'interview').catch(() => setIsBookmarked(!next));
  };

  const handleShare = () => {
    Share.share({ message: `Check out this interview on ByteAI: ${interview?.title}` });
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !id) return;
    setSubmitting(true);
    try {
      await API.addInterviewComment(id, commentText.trim());
      setCommentText('');
      const cs = await API.getInterviewComments(id);
      setComments(cs);
    } catch {
      Alert.alert('Error', 'Failed to add comment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <ByteSpinner />
      </View>
    );
  }

  if (!interview) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.text2, fontFamily: 'Menlo', fontSize: 12 }}>INTERVIEW NOT FOUND</Text>
      </View>
    );
  }

  const diffColor = DIFF_COLOR[interview.difficulty] ?? C.text3;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text1} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{interview.title}</Text>
        <View style={s.headerActions}>
          <TouchableOpacity onPress={handleBookmark} activeOpacity={0.7}>
            <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color={isBookmarked ? C.cyan : C.text2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={22} color={C.text2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Meta section */}
        <View style={s.meta}>
          {/* Badges row */}
          <View style={s.badgesRow}>
            <View style={[s.badge, { borderColor: C.purple + '50', backgroundColor: C.purpleDim }]}>
              <Text style={[s.badgeText, { color: C.purple }]}>INTERVIEW</Text>
            </View>
            <View style={[s.badge, { borderColor: diffColor + '50', backgroundColor: diffColor + '14' }]}>
              <Text style={[s.badgeText, { color: diffColor }]}>{interview.difficulty.toUpperCase()}</Text>
            </View>
            {interview.company && (
              <View style={[s.badge, { borderColor: C.borderMed }]}>
                <Ionicons name="business-outline" size={9} color={C.text3} />
                <Text style={[s.badgeText, { color: C.text3 }]}>{interview.company.toUpperCase()}</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={s.title}>{interview.title}</Text>

          {/* Author row */}
          <View style={s.authorRow}>
            <AvatarView initials={interview.author.initials} variant={interview.author.avatarVariant} size="sm" />
            <View>
              <Text style={s.authorName}>@{interview.author.username}</Text>
              {interview.role && (
                <Text style={s.authorRole}>{interview.role}{interview.company ? ` @ ${interview.company}` : ''}</Text>
              )}
            </View>
            <Text style={s.timestamp}>{formatRelative(interview.createdAt)}</Text>
          </View>
        </View>

        {/* Questions */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>// {interview.questions.length} QUESTIONS</Text>
            <TouchableOpacity onPress={toggleAll} style={s.expandAllBtn}>
              <Ionicons name={allExpanded ? 'contract-outline' : 'expand-outline'} size={12} color={allExpanded ? C.accent : C.text3} />
              <Text style={[s.expandAllText, allExpanded && { color: C.accent }]}>
                {allExpanded ? 'COLLAPSE ALL' : 'EXPAND ALL'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ gap: 8 }}>
            {interview.questions.map((q, i) => (
              <QuestionCard
                key={q.id}
                q={q}
                index={i}
                expanded={expandedIds.has(q.id)}
                onToggle={() => toggleQuestion(q.id)}
              />
            ))}
          </View>
        </View>

        {/* Comments */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>// {comments.length} COMMENTS</Text>
          {comments.length === 0 ? (
            <Text style={s.noComments}>Be the first to comment.</Text>
          ) : (
            <View style={{ gap: 12, marginTop: 12 }}>
              {comments.map(c => <CommentRow key={c.id} comment={c} />)}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Comment input */}
      <View style={[s.commentBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={s.commentInput}
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Add a comment..."
          placeholderTextColor={C.text3}
          multiline
        />
        <TouchableOpacity
          onPress={handleAddComment}
          disabled={!commentText.trim() || submitting}
          style={[s.sendBtn, (!commentText.trim() || submitting) && { opacity: 0.4 }]}
        >
          {submitting
            ? <ActivityIndicator size="small" color={C.accent} />
            : <Ionicons name="send" size={18} color={C.accent} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.background,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text1 },
  headerActions: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  meta: { padding: 20, gap: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  badgesRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderRadius: 5,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '700', fontFamily: 'Menlo' },
  title: { fontSize: 20, fontWeight: '700', color: C.text1, lineHeight: 27 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorName: { fontSize: 13, fontWeight: '600', color: C.text1 },
  authorRole: { fontSize: 11, color: C.text3 },
  timestamp: { marginLeft: 'auto', fontSize: 11, color: C.text3 },
  section: { padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: C.text3, fontFamily: 'Menlo' },
  expandAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  expandAllText: { fontSize: 9, fontWeight: '700', color: C.text3, fontFamily: 'Menlo' },
  noComments: { fontSize: 13, color: C.text3, textAlign: 'center', paddingVertical: 20 },
  commentBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border,
  },
  commentInput: {
    flex: 1, backgroundColor: C.element, borderRadius: 20,
    borderWidth: 1, borderColor: C.borderMed,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: C.text1, maxHeight: 100,
  },
  sendBtn: { padding: 8 },
});

const qs = StyleSheet.create({
  card: {
    backgroundColor: C.element, borderRadius: 10,
    borderWidth: 1, borderColor: C.borderMed, overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 14,
  },
  badge: {
    backgroundColor: C.accentDim, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2, marginTop: 2,
  },
  badgeText: { fontSize: 9, fontWeight: '700', color: C.purple, fontFamily: 'Menlo' },
  question: { flex: 1, fontSize: 14, fontWeight: '500', color: C.text1, lineHeight: 20 },
  answer: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  answerText: { fontSize: 13, color: C.text2, lineHeight: 19 },
  answerActions: { flexDirection: 'row', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12, color: C.text3 },
});

const cm = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  body: { flex: 1, gap: 3 },
  author: { fontSize: 12, fontWeight: '600', color: C.text1, fontFamily: 'Menlo' },
  text: { fontSize: 13, color: C.text2, lineHeight: 19 },
  time: { fontSize: 10, color: C.text3 },
});
