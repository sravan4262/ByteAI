import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Share, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PostHeader } from '../../src/components/ui/PostHeader';
import { CodeBlock } from '../../src/components/ui/CodeBlock';
import { AvatarView } from '../../src/components/ui/AvatarView';
import { ByteSpinner } from '../../src/components/ui/ByteSpinner';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { API } from '../../src/services/api';
import { C } from '../../src/constants/colors';
import { Post, Comment } from '../../src/types/models';
import { formatRelative } from '../../src/utils/time';
import { useAuthStore } from '../../src/stores/authStore';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { auth } = useAuthStore();
  const me = auth.status === 'authenticated' ? auth.user : null;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([API.getPost(id), API.getComments(id)])
      .then(([p, c]) => { setPost(p); setComments(c); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleLike = () => {
    if (!post) return;
    const nowLiked = !post.isLiked;
    setPost(p => p ? { ...p, isLiked: nowLiked, likes: p.likes + (nowLiked ? 1 : -1) } : p);
    API.toggleLike(post.id).catch(() =>
      setPost(p => p ? { ...p, isLiked: !nowLiked, likes: p.likes + (nowLiked ? -1 : 1) } : p)
    );
  };

  const handleBookmark = () => {
    if (!post) return;
    const nowSaved = !post.isBookmarked;
    setPost(p => p ? { ...p, isBookmarked: nowSaved } : p);
    API.toggleBookmark(post.id).catch(() =>
      setPost(p => p ? { ...p, isBookmarked: !nowSaved } : p)
    );
  };

  const handleComment = async () => {
    if (!commentText.trim() || !post) return;
    setSending(true);
    const text = commentText.trim();
    setCommentText('');
    try {
      await API.addComment(post.id, text);
      const updated = await API.getComments(post.id);
      setComments(updated);
      setPost(p => p ? { ...p, comments: p.comments + 1 } : p);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not post comment');
      setCommentText(text);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <View style={s.center}><ByteSpinner size={44} /></View>;
  }

  if (!post) {
    return (
      <View style={s.center}>
        <EmptyState icon="alert-circle-outline" title="Not found" message="This byte could not be loaded." />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.bottom + 56}
    >
      {/* Header */}
      <View style={[s.navBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.text1} />
        </TouchableOpacity>
        <Text style={s.navTitle}>Byte</Text>
        <TouchableOpacity onPress={() => Share.share({ message: post.title })} style={s.shareBtn}>
          <Ionicons name="share-outline" size={20} color={C.text2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Post content */}
        <PostHeader author={post.author} timestamp={post.timestamp} type={post.type} />

        <Text style={s.title}>{post.title}</Text>
        <Text style={s.body}>{post.body}</Text>

        {post.code && (
          <CodeBlock language={post.code.language} filename={post.code.filename} content={post.code.content} maxHeight={300} />
        )}

        {post.tags.length > 0 && (
          <View style={s.tags}>
            {post.tags.map(t => (
              <View key={t} style={s.tag}>
                <Text style={s.tagText}>#{t}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { icon: 'heart-outline' as const, value: post.likes, label: 'likes' },
            { icon: 'chatbubble-outline' as const, value: post.comments, label: 'comments' },
            { icon: 'bookmark-outline' as const, value: post.bookmarks, label: 'saves' },
            ...(post.views != null ? [{ icon: 'eye-outline' as const, value: post.views, label: 'views' }] : []),
          ].map(st => (
            <View key={st.label} style={s.stat}>
              <Ionicons name={st.icon} size={14} color={C.text3} />
              <Text style={s.statText}>{st.value} {st.label}</Text>
            </View>
          ))}
        </View>

        {/* Action bar */}
        <View style={s.actions}>
          <TouchableOpacity style={s.actionBtn} onPress={handleLike}>
            <Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={22} color={post.isLiked ? C.red : C.text2} />
            <Text style={[s.actionText, post.isLiked && { color: C.red }]}>{post.isLiked ? 'Liked' : 'Like'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={handleBookmark}>
            <Ionicons name={post.isBookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color={post.isBookmarked ? C.cyan : C.text2} />
            <Text style={[s.actionText, post.isBookmarked && { color: C.cyan }]}>{post.isBookmarked ? 'Saved' : 'Save'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => Share.share({ message: post.title })}>
            <Ionicons name="share-outline" size={22} color={C.text2} />
            <Text style={s.actionText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Comments */}
        <View style={s.commentsHeader}>
          <Text style={s.commentsTitle}>Comments</Text>
          <Text style={s.commentsCount}>{comments.length}</Text>
        </View>

        {comments.length === 0 ? (
          <Text style={s.noComments}>Be the first to comment</Text>
        ) : (
          comments.map(c => <CommentRow key={c.id} comment={c} />)
        )}
      </ScrollView>

      {/* Comment input */}
      <View style={[s.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        {me && <AvatarView initials={me.initials} variant={me.avatarVariant} size="sm" />}
        <TextInput
          style={s.commentInput}
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Add a comment…"
          placeholderTextColor={C.text3}
          returnKeyType="send"
          onSubmitEditing={handleComment}
          multiline
        />
        <TouchableOpacity onPress={handleComment} disabled={sending || !commentText.trim()} style={s.sendBtn}>
          {sending
            ? <ActivityIndicator size="small" color={C.accent} />
            : <Ionicons name="send" size={18} color={commentText.trim() ? C.accent : C.text3} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function CommentRow({ comment }: { comment: Comment }) {
  return (
    <View style={cr.container}>
      <AvatarView initials={comment.author.initials} variant={comment.author.avatarVariant} size="sm" />
      <View style={cr.body}>
        <View style={cr.header}>
          <Text style={cr.name}>{comment.author.displayName}</Text>
          <Text style={cr.time}>{formatRelative(comment.timestamp)}</Text>
        </View>
        <Text style={cr.content}>{comment.content}</Text>
        {comment.replies.map(r => (
          <View key={r.id} style={cr.reply}>
            <AvatarView initials={r.author.initials} variant={r.author.avatarVariant} size="sm" />
            <View style={{ flex: 1 }}>
              <Text style={cr.name}>{r.author.displayName}</Text>
              <Text style={cr.content}>{r.content}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
  navBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.background,
  },
  backBtn: { padding: 4 },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: C.text1 },
  shareBtn: { padding: 4 },
  scroll: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', color: C.text1, lineHeight: 29 },
  body: { fontSize: 15, color: C.text2, lineHeight: 23 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: C.element, borderRadius: 5,
    borderWidth: 1, borderColor: C.borderMed,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  tagText: { fontSize: 10, color: C.text3, fontFamily: 'Menlo' },
  statsRow: { flexDirection: 'row', gap: 16, paddingVertical: 4 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: C.text3 },
  actions: {
    flexDirection: 'row', gap: 0,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border,
    paddingVertical: 4,
  },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  actionText: { fontSize: 13, fontWeight: '500', color: C.text2 },
  commentsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentsTitle: { fontSize: 16, fontWeight: '600', color: C.text1 },
  commentsCount: { fontSize: 13, color: C.text3 },
  noComments: { fontSize: 13, color: C.text3, textAlign: 'center', paddingVertical: 16 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: C.border,
    backgroundColor: C.background,
  },
  commentInput: {
    flex: 1, backgroundColor: C.element, borderRadius: 20,
    borderWidth: 1, borderColor: C.borderMed,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: C.text1, maxHeight: 100,
  },
  sendBtn: { padding: 6, marginBottom: 4 },
});

const cr = StyleSheet.create({
  container: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  body: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  name: { fontSize: 13, fontWeight: '600', color: C.text1 },
  time: { fontSize: 11, color: C.text3 },
  content: { fontSize: 14, color: C.text2, lineHeight: 20 },
  reply: { flexDirection: 'row', gap: 8, marginTop: 10, paddingLeft: 4 },
});
