import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Share,
  Dimensions, ScrollView, Modal, FlatList, ActivityIndicator,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { Post, LikeUser } from '../../types/models';
import { API } from '../../services/api';
import { C } from '../../constants/colors';
import { PostHeader } from '../ui/PostHeader';
import { CodeBlock } from '../ui/CodeBlock';
import { AvatarView } from '../ui/AvatarView';
import { ByteSpinner } from '../ui/ByteSpinner';
import { EmptyState } from '../ui/EmptyState';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Likes Modal ──────────────────────────────────────────────────────────

function LikesModal({ postId, visible, onClose }: {
  postId: string; visible: boolean; onClose: () => void;
}) {
  const [likes, setLikes] = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (!visible) return;
    setLoading(true);
    API.getLikes(postId).then(setLikes).finally(() => setLoading(false));
  }, [visible, postId]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modal.container}>
        <View style={modal.header}>
          <Text style={modal.title}>{likes.length} Likes</Text>
          <TouchableOpacity onPress={onClose} style={modal.doneBtn}>
            <Text style={modal.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={modal.center}><ActivityIndicator color={C.accent} /></View>
        ) : likes.length === 0 ? (
          <View style={modal.center}>
            <EmptyState icon="heart-outline" title="No likes yet" message="Be the first to like this byte." />
          </View>
        ) : (
          <FlatList
            data={likes}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            renderItem={({ item }) => (
              <View style={modal.likeRow}>
                <AvatarView initials={item.initials} variant={item.avatarVariant} size="md" />
                <View>
                  <Text style={modal.likeName}>{item.displayName}</Text>
                  <Text style={modal.likeUser}>@{item.username}</Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 16, fontWeight: '600', color: C.text1 },
  doneBtn: { paddingHorizontal: 8 },
  doneText: { fontSize: 15, color: C.accent, fontWeight: '500' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  likeName: { fontSize: 14, fontWeight: '600', color: C.text1 },
  likeUser: { fontSize: 11, color: C.text3, fontFamily: 'Menlo', marginTop: 1 },
});

// ─── Action Button ─────────────────────────────────────────────────────────

function ActionBtn({ icon, count, active, activeColor, onPress, onLongPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  count?: number;
  active?: boolean;
  activeColor?: string;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <TouchableOpacity style={rail.actionBtn} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7}>
      <Ionicons
        name={icon}
        size={30}
        color={active ? (activeColor ?? C.accent) : C.text1}
        style={active ? { textShadowColor: activeColor + '80', textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } } : undefined}
      />
      {count !== undefined && (
        <Text style={[rail.count, active && { color: activeColor ?? C.accent }]}>
          {count}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── BytePageCard ─────────────────────────────────────────────────────────

interface Props {
  post: Post;
  scrollY: Animated.SharedValue<number>;
  index: number;
  onViewFull: () => void;
}

export function BytePageCard({ post: initialPost, scrollY, index, onViewFull }: Props) {
  const [post, setPost] = useState(initialPost);
  const [showLikes, setShowLikes] = useState(false);
  const likeScale = useSharedValue(1);

  // Scroll-driven 3D animation — same effect as SwiftUI .scrollTransition
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

  const likeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const handleLike = useCallback(() => {
    likeScale.value = withSpring(1.55, { damping: 5 }, () => {
      likeScale.value = withSpring(1.0, { damping: 8 });
    });
    const nowLiked = !post.isLiked;
    setPost(p => ({ ...p, isLiked: nowLiked, likes: p.likes + (nowLiked ? 1 : -1) }));
    if (nowLiked) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    API.toggleLike(post.id).catch(() =>
      setPost(p => ({ ...p, isLiked: !nowLiked, likes: p.likes + (nowLiked ? -1 : 1) }))
    );
  }, [post.isLiked, post.id]);

  const handleBookmark = useCallback(() => {
    const nowSaved = !post.isBookmarked;
    setPost(p => ({ ...p, isBookmarked: nowSaved }));
    if (nowSaved) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    API.toggleBookmark(post.id).catch(() =>
      setPost(p => ({ ...p, isBookmarked: !nowSaved }))
    );
  }, [post.isBookmarked, post.id]);

  const handleShare = useCallback(() => {
    Share.share({ message: `Check out this byte on ByteAI: ${post.title}` });
  }, [post.title]);

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      {/* ── Content area ── */}
      <View style={styles.content}>
        <View style={{ height: 68 }} />

        <PostHeader author={post.author} timestamp={post.timestamp} type={post.type} />

        <Text style={styles.title} numberOfLines={3}>{post.title}</Text>
        <Text style={styles.body} numberOfLines={8}>{post.body}</Text>

        {post.code && (
          <CodeBlock
            language={post.code.language}
            filename={post.code.filename}
            content={post.code.content}
            maxHeight={170}
          />
        )}

        {post.tags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 2 }}>
            <View style={styles.tagRow}>
              {post.tags.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
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

      {/* ── Right-side action rail ── */}
      <View style={styles.rail}>
        {/* Like */}
        <View style={rail.item}>
          <Animated.View style={likeStyle}>
            <TouchableOpacity onPress={handleLike} activeOpacity={0.8}>
              <Ionicons
                name={post.isLiked ? 'heart' : 'heart-outline'}
                size={30}
                color={post.isLiked ? C.red : C.text1}
              />
            </TouchableOpacity>
          </Animated.View>
          <TouchableOpacity onPress={() => setShowLikes(true)} activeOpacity={0.7}>
            <Text style={[rail.count, post.isLiked && { color: C.red }]}>{post.likes}</Text>
          </TouchableOpacity>
        </View>

        {/* Comment */}
        <View style={rail.item}>
          <TouchableOpacity onPress={onViewFull} activeOpacity={0.7}>
            <Ionicons name="chatbubble-outline" size={28} color={C.text1} />
          </TouchableOpacity>
          <Text style={rail.count}>{post.comments}</Text>
        </View>

        {/* Bookmark */}
        <TouchableOpacity onPress={handleBookmark} activeOpacity={0.7} style={rail.actionBtn}>
          <Ionicons
            name={post.isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={28}
            color={post.isBookmarked ? C.cyan : C.text1}
          />
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity onPress={handleShare} activeOpacity={0.7} style={rail.actionBtn}>
          <Ionicons name="share-outline" size={26} color={C.text1} />
        </TouchableOpacity>

        {/* Full */}
        <TouchableOpacity onPress={onViewFull} activeOpacity={0.7} style={rail.fullBtn}>
          <Ionicons name="arrow-up-right-box-outline" size={22} color={C.accent} />
          <Text style={rail.fullText}>FULL</Text>
        </TouchableOpacity>
      </View>

      <LikesModal postId={post.id} visible={showLikes} onClose={() => setShowLikes(false)} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: SCREEN_HEIGHT,
    backgroundColor: C.background,
  },
  content: {
    flex: 1,
    paddingLeft: 20,
    paddingRight: 76,
    gap: 14,
  },
  title: {
    fontSize: 22, fontWeight: '700', color: C.text1, lineHeight: 29,
  },
  body: {
    fontSize: 15, color: C.text2, lineHeight: 23,
  },
  tagRow: { flexDirection: 'row', gap: 6 },
  tag: {
    backgroundColor: C.element, borderRadius: 5, borderWidth: 1,
    borderColor: C.borderMed, paddingHorizontal: 8, paddingVertical: 3,
  },
  tagText: { fontSize: 10, color: C.text3, fontFamily: 'Menlo' },
  bottomFade: {
    position: 'absolute', left: 0, right: 0, bottom: 28, height: 72,
  },
  swipeHint: {
    position: 'absolute', bottom: 6, left: 0, right: 0, alignItems: 'center',
  },
  rail: {
    position: 'absolute', right: 0, bottom: 56,
    width: 62, alignItems: 'center', gap: 26,
    paddingBottom: 4,
  },
});

const rail = StyleSheet.create({
  item: { alignItems: 'center', gap: 5 },
  count: { fontSize: 13, fontWeight: '600', color: C.text2 },
  actionBtn: { alignItems: 'center' },
  fullBtn: { alignItems: 'center', gap: 3 },
  fullText: { fontSize: 8, fontWeight: '700', color: C.accent, fontFamily: 'Menlo' },
});
