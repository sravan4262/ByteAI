import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AvatarView } from './AvatarView';
import { C } from '../../constants/colors';
import { User } from '../../types/models';
import { formatRelative } from '../../utils/time';

interface Props {
  author: User;
  timestamp: string;
  type?: 'byte' | 'interview';
}

export function PostHeader({ author, timestamp, type }: Props) {
  const badge = type === 'interview' ? 'INTERVIEW' : 'BYTE';
  const badgeColor = type === 'interview' ? C.purple : C.accent;

  return (
    <View style={styles.row}>
      <AvatarView
        initials={author.initials}
        variant={author.avatarVariant}
        size="md"
        imageUrl={author.avatarUrl}
      />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{author.displayName}</Text>
          {author.isVerified && (
            <Text style={[styles.badge, { color: C.accent }]}> ✓</Text>
          )}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {[author.role, author.company].filter(Boolean).join(' @ ')}
          {' · '}
          {formatRelative(timestamp)}
        </Text>
      </View>
      <View style={[styles.typeBadge, { borderColor: badgeColor + '50', backgroundColor: badgeColor + '14' }]}>
        <Text style={[styles.typeText, { color: badgeColor }]}>{badge}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '600', color: C.text1 },
  badge: { fontSize: 13, fontWeight: '700' },
  meta: { fontSize: 11, color: C.text3, marginTop: 1 },
  typeBadge: {
    borderWidth: 1, borderRadius: 5,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  typeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, fontFamily: 'Menlo' },
});
