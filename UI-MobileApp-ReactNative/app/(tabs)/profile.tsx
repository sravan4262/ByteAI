import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, TextInput, Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AvatarView } from '../../src/components/ui/AvatarView';
import { ByteSpinner } from '../../src/components/ui/ByteSpinner';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { API } from '../../src/services/api';
import { C } from '../../src/constants/colors';
import { User, Post, Interview } from '../../src/types/models';
import { useAuthStore } from '../../src/stores/authStore';
import { formatRelative } from '../../src/utils/time';

type Tab = 'bytes' | 'interviews' | 'bookmarks';

const PLATFORM_ICONS: Record<string, 'logo-github' | 'logo-linkedin' | 'logo-twitter' | 'globe-outline'> = {
  github: 'logo-github',
  linkedin: 'logo-linkedin',
  twitter: 'logo-twitter',
  website: 'globe-outline',
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { auth, setUnauthenticated } = useAuthStore();
  const me = auth.status === 'authenticated' ? auth.user : null;

  const [profile, setProfile] = useState<User | null>(me);
  const [bytes, setBytes] = useState<Post[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [bookmarks, setBookmarks] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('bytes');
  const [editVisible, setEditVisible] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    try {
      const [u, b, iv, bk] = await Promise.all([
        API.getMe(),
        API.getMyBytes(),
        API.getMyInterviews(),
        API.getMyBookmarks(),
      ]);
      setProfile(u);
      setBytes(b);
      setInterviews(iv);
      setBookmarks(bk);
    } catch { }
    finally { setLoading(false); }
  }, [me]);

  React.useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => { await signOut(); setUnauthenticated(); },
      },
    ]);
  };

  const handleDeleteByte = (postId: string) => {
    Alert.alert('Delete Byte', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await API.deletePost(postId).catch(() => { });
          setBytes(b => b.filter(p => p.id !== postId));
        },
      },
    ]);
  };

  const handleDeleteInterview = (id: string) => {
    Alert.alert('Delete Interview', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await API.deleteMyInterview(id).catch(() => { });
          setInterviews(iv => iv.filter(i => i.id !== id));
        },
      },
    ]);
  };

  const toggleExpand = (id: string) => {
    setExpanded(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  if (!profile) return <View style={s.center}><ByteSpinner /></View>;

  const currentData = tab === 'bytes' ? bytes : tab === 'interviews' ? interviews : bookmarks;
  const isEmpty = !loading && currentData.length === 0;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        {/* Edit + Sign Out row */}
        <View style={s.topActions}>
          <TouchableOpacity style={s.iconBtn} onPress={() => setEditVisible(true)}>
            <Ionicons name="pencil-outline" size={16} color={C.text2} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.iconBtn, { borderColor: C.red + '40', backgroundColor: C.redDim }]} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={16} color={C.red} />
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <AvatarView initials={profile.initials} variant={profile.avatarVariant} size="xl" imageUrl={profile.avatarUrl} />

        {/* Name + verified */}
        <View style={s.nameRow}>
          <Text style={s.displayName}>{profile.displayName}</Text>
          {profile.isVerified && <Text style={s.verified}> ✓</Text>}
        </View>
        <Text style={s.username}>@{profile.username}</Text>

        {(profile.role || profile.company) && (
          <Text style={s.roleLine}>{[profile.role, profile.company].filter(Boolean).join(' @ ')}</Text>
        )}

        {/* XP bar */}
        <View style={s.xpRow}>
          <Text style={s.xpLabel}>LVL {profile.level}</Text>
          <View style={s.xpTrack}>
            <LinearGradient
              colors={[C.accent, C.cyan]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[s.xpFill, { width: `${Math.min(100, (profile.xp / (profile.xpToNextLevel || 1000)) * 100)}%` }]}
            />
          </View>
          <Text style={s.xpLabel}>{profile.xp} XP</Text>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { label: 'Followers', value: profile.followers },
            { label: 'Following', value: profile.following },
            { label: 'Bytes', value: profile.bytes },
            { label: 'Streak', value: profile.streak },
          ].map(st => (
            <View key={st.label} style={s.stat}>
              <Text style={s.statValue}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Bio */}
        {!!profile.bio && <Text style={s.bio}>{profile.bio}</Text>}

        {/* Tech stack */}
        {profile.techStack.length > 0 && (
          <View style={s.stackRow}>
            {profile.techStack.map(t => (
              <View key={t} style={s.stackChip}>
                <Text style={s.stackText}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Social links */}
        {profile.socials && profile.socials.length > 0 && (
          <View style={s.socialsRow}>
            {profile.socials.map(link => (
              <TouchableOpacity
                key={link.platform}
                style={s.socialBtn}
                onPress={() => Linking.openURL(link.url)}
              >
                <Ionicons name={PLATFORM_ICONS[link.platform] ?? 'globe-outline'} size={16} color={C.text2} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Badges */}
        {profile.badges.filter(b => b.earned).length > 0 && (
          <View style={s.badgeRow}>
            {profile.badges.filter(b => b.earned).map(b => (
              <View key={b.id} style={s.badgeChip}>
                <Text style={s.badgeIcon}>{b.icon}</Text>
                <Text style={s.badgeName}>{b.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {(['bytes', 'interviews', 'bookmarks'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tabBtn, tab === t && s.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabBtnText, tab === t && s.tabBtnTextActive]}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={s.center}><ByteSpinner /></View>
      ) : isEmpty ? (
        <View style={s.center}>
          <EmptyState
            icon={tab === 'bytes' ? 'flash-outline' : tab === 'interviews' ? 'briefcase-outline' : 'bookmark-outline'}
            title={tab === 'bytes' ? 'No bytes yet' : tab === 'interviews' ? 'No interviews yet' : 'No bookmarks'}
            message={tab === 'bytes' ? 'Post your first byte.' : tab === 'interviews' ? 'Share an interview Q&A.' : 'Bookmark bytes and interviews.'}
          />
        </View>
      ) : (
        <View style={s.postList}>
          {tab === 'interviews'
            ? interviews.map(iv => (
                <View key={iv.id} style={s.postCard}>
                  <TouchableOpacity onPress={() => toggleExpand(iv.id)} activeOpacity={0.8}>
                    <View style={s.postHeader}>
                      <View style={s.diffBadge}>
                        <Text style={[s.diffText, { color: iv.difficulty === 'easy' ? C.green : iv.difficulty === 'hard' ? C.red : C.orange }]}>
                          {iv.difficulty.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={s.postTitle} numberOfLines={expanded.has(iv.id) ? undefined : 1}>{iv.title}</Text>
                      <Ionicons name={expanded.has(iv.id) ? 'chevron-up' : 'chevron-down'} size={14} color={C.text3} />
                    </View>
                    {expanded.has(iv.id) && (
                      <Text style={s.postBody} numberOfLines={3}>
                        {iv.company && `Company: ${iv.company}  `}
                        {iv.role && `Role: ${iv.role}  `}
                        {`${iv.questions.length} questions`}
                      </Text>
                    )}
                    <View style={s.postMeta}>
                      <Text style={s.postTime}>{formatRelative(iv.createdAt)}</Text>
                      <View style={s.postStats}>
                        <Ionicons name="help-circle-outline" size={12} color={C.text3} />
                        <Text style={s.postStat}>{iv.questions.length}Q</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.deleteBtn} onPress={() => handleDeleteInterview(iv.id)}>
                    <Ionicons name="trash-outline" size={14} color={C.red} />
                  </TouchableOpacity>
                </View>
              ))
            : (tab === 'bytes' ? bytes : bookmarks).map(post => (
                <View key={post.id} style={s.postCard}>
                  <TouchableOpacity onPress={() => toggleExpand(post.id)} activeOpacity={0.8}>
                    <View style={s.postHeader}>
                      <Text style={s.postTitle} numberOfLines={expanded.has(post.id) ? undefined : 1}>{post.title}</Text>
                      <Ionicons name={expanded.has(post.id) ? 'chevron-up' : 'chevron-down'} size={14} color={C.text3} />
                    </View>
                    {expanded.has(post.id) && (
                      <Text style={s.postBody} numberOfLines={6}>{post.body}</Text>
                    )}
                    <View style={s.postMeta}>
                      <Text style={s.postTime}>{formatRelative(post.timestamp)}</Text>
                      <View style={s.postStats}>
                        <Ionicons name="heart-outline" size={12} color={C.text3} />
                        <Text style={s.postStat}>{post.likes}</Text>
                        <Ionicons name="chatbubble-outline" size={11} color={C.text3} />
                        <Text style={s.postStat}>{post.comments}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  {tab === 'bytes' && (
                    <TouchableOpacity style={s.deleteBtn} onPress={() => handleDeleteByte(post.id)}>
                      <Ionicons name="trash-outline" size={14} color={C.red} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
        </View>
      )}

      <EditProfileModal
        visible={editVisible}
        user={profile}
        onClose={() => setEditVisible(false)}
        onSaved={u => { setProfile(u); setEditVisible(false); }}
      />
    </ScrollView>
  );
}

// ─── Edit Profile Modal ────────────────────────────────────────────────────

function EditProfileModal({ visible, user, onClose, onSaved }: {
  visible: boolean; user: User;
  onClose: () => void; onSaved: (u: User) => void;
}) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio ?? '');
  const [company, setCompany] = useState(user.company ?? '');
  const [role, setRole] = useState(user.role ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const u = await API.updateProfile({ displayName, bio, company, roleTitle: role });
      onSaved(u);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save');
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={em.container}>
        <View style={em.header}>
          <TouchableOpacity onPress={onClose}><Text style={em.cancel}>Cancel</Text></TouchableOpacity>
          <Text style={em.title}>Edit Profile</Text>
          <TouchableOpacity onPress={save} disabled={saving}>
            <Text style={[em.save, saving && { opacity: 0.5 }]}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ gap: 14, padding: 16 }}>
          {[
            { label: 'DISPLAY NAME', value: displayName, onChange: setDisplayName },
            { label: 'COMPANY', value: company, onChange: setCompany },
            { label: 'ROLE', value: role, onChange: setRole },
          ].map(f => (
            <View key={f.label}>
              <Text style={em.label}>{f.label}</Text>
              <TextInput style={em.input} value={f.value} onChangeText={f.onChange} placeholderTextColor={C.text3} />
            </View>
          ))}
          <View>
            <Text style={em.label}>BIO</Text>
            <TextInput
              style={[em.input, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
              value={bio} onChangeText={setBio}
              multiline maxLength={280} placeholderTextColor={C.text3}
              placeholder="Tell the community about yourself..."
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { padding: 40, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  header: { alignItems: 'center', paddingHorizontal: 20, gap: 10, paddingBottom: 20 },
  topActions: {
    position: 'absolute', top: 16, right: 0,
    flexDirection: 'row', gap: 8, paddingRight: 20,
    paddingTop: 16,
  },
  iconBtn: {
    padding: 8, backgroundColor: C.element, borderRadius: 20,
    borderWidth: 1, borderColor: C.borderMed,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  displayName: { fontSize: 22, fontWeight: '700', color: C.text1 },
  verified: { fontSize: 18, color: C.accent, fontWeight: '700' },
  username: { fontSize: 13, color: C.text3, fontFamily: 'Menlo' },
  roleLine: { fontSize: 12, color: C.text2 },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', paddingHorizontal: 8 },
  xpLabel: { fontSize: 10, fontWeight: '700', color: C.text3, fontFamily: 'Menlo', width: 50 },
  xpTrack: { flex: 1, height: 4, backgroundColor: C.element, borderRadius: 2, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 2 },
  statsRow: { flexDirection: 'row', gap: 20 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: C.text1 },
  statLabel: { fontSize: 11, color: C.text3, marginTop: 1 },
  bio: { fontSize: 13, color: C.text2, textAlign: 'center', lineHeight: 20 },
  stackRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  stackChip: {
    backgroundColor: C.accentDim, borderRadius: 5,
    borderWidth: 1, borderColor: C.accent + '40',
    paddingHorizontal: 8, paddingVertical: 3,
  },
  stackText: { fontSize: 10, color: C.accent, fontWeight: '600' },
  socialsRow: { flexDirection: 'row', gap: 10 },
  socialBtn: {
    padding: 10, backgroundColor: C.element, borderRadius: 20,
    borderWidth: 1, borderColor: C.borderMed,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  badgeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.element, borderRadius: 20,
    borderWidth: 1, borderColor: C.borderMed,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  badgeIcon: { fontSize: 14 },
  badgeName: { fontSize: 11, fontWeight: '600', color: C.text2 },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, gap: 4, marginBottom: 12 },
  tabBtn: {
    flex: 1, paddingVertical: 9, alignItems: 'center',
    borderRadius: 8, borderWidth: 1, borderColor: C.borderMed,
    backgroundColor: C.element,
  },
  tabBtnActive: { backgroundColor: C.accentDim, borderColor: C.accent + '80' },
  tabBtnText: { fontSize: 10, fontWeight: '700', color: C.text3, fontFamily: 'Menlo' },
  tabBtnTextActive: { color: C.accent },
  postList: { paddingHorizontal: 16, gap: 8 },
  postCard: {
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    padding: 14, position: 'relative',
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  postTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text1 },
  postBody: { fontSize: 13, color: C.text2, marginBottom: 8, lineHeight: 19 },
  postMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postTime: { fontSize: 11, color: C.text3 },
  postStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postStat: { fontSize: 11, color: C.text3 },
  diffBadge: {
    backgroundColor: C.element, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2,
    borderWidth: 1, borderColor: C.borderMed,
  },
  diffText: { fontSize: 8, fontWeight: '700', fontFamily: 'Menlo' },
  deleteBtn: {
    position: 'absolute', top: 10, right: 10,
    padding: 6, backgroundColor: C.redDim, borderRadius: 6,
  },
});

const em = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.card },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title: { fontSize: 16, fontWeight: '600', color: C.text1 },
  cancel: { fontSize: 15, color: C.text2 },
  save: { fontSize: 15, fontWeight: '600', color: C.accent },
  label: { fontSize: 11, fontWeight: '700', color: C.text3, marginBottom: 6, fontFamily: 'Menlo' },
  input: {
    backgroundColor: C.element, borderRadius: 10,
    borderWidth: 1, borderColor: C.borderMed,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: C.text1,
  },
});
