import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AvatarView } from '../../src/components/ui/AvatarView';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { API } from '../../src/services/api';
import { C } from '../../src/constants/colors';
import { Post, PersonResult, SearchType } from '../../src/types/models';
import { formatRelative } from '../../src/utils/time';

const TABS: { key: SearchType; label: string }[] = [
  { key: 'bytes', label: 'Bytes' },
  { key: 'interviews', label: 'Interviews' },
  { key: 'people', label: 'People' },
];

const TRENDING = ['react hooks', 'go concurrency', 'rust ownership', 'postgres indexing', 'system design'];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<SearchType>('bytes');
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [people, setPeople] = useState<PersonResult[]>([]);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q = query, t = type) => {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      if (t === 'people') {
        const res = await API.searchPeople(q);
        setPeople(res);
        setPosts([]);
      } else {
        const res = await API.search(q, t);
        setPosts(res);
        setPeople([]);
      }
    } catch (e: any) {
      setError(e.message ?? 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [query, type]);

  const onTypeChange = (t: SearchType) => {
    setType(t);
    if (searched) doSearch(query, t);
  };

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Search bar */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={18} color={C.text3} />
        <TextInput
          style={s.input}
          placeholder="Search bytes, interviews, people…"
          placeholderTextColor={C.text3}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={() => doSearch()}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setPosts([]); setPeople([]); setSearched(false); }}>
            <Ionicons name="close-circle" size={18} color={C.text3} />
          </TouchableOpacity>
        )}
      </View>

      {/* Type tabs */}
      <View style={s.tabs}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, type === t.key && s.tabActive]}
            onPress={() => onTypeChange(t.key)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabText, type === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.accent} /></View>
      ) : error ? (
        <View style={s.center}>
          <EmptyState icon="alert-circle-outline" title="Search failed" message={error} />
        </View>
      ) : !searched ? (
        <View style={s.trending}>
          <Text style={s.trendLabel}>TRENDING</Text>
          {TRENDING.map(t => (
            <TouchableOpacity
              key={t}
              style={s.trendRow}
              onPress={() => { setQuery(t); doSearch(t); }}
              activeOpacity={0.7}
            >
              <Ionicons name="trending-up-outline" size={16} color={C.text3} />
              <Text style={s.trendText}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : type === 'people' ? (
        people.length === 0 ? (
          <View style={s.center}>
            <EmptyState icon="people-outline" title="No people found" message={`No results for "${query}"`} />
          </View>
        ) : (
          <FlatList
            data={people}
            keyExtractor={p => p.id}
            contentContainerStyle={s.list}
            renderItem={({ item }) => <PersonRow person={item} />}
          />
        )
      ) : (
        posts.length === 0 ? (
          <View style={s.center}>
            <EmptyState icon="search-outline" title="No results" message={`No bytes found for "${query}"`} />
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={p => p.id}
            contentContainerStyle={s.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.postCard}
                onPress={() => router.push(`/post/${item.id}`)}
                activeOpacity={0.8}
              >
                <Text style={s.postTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={s.postBody} numberOfLines={2}>{item.body}</Text>
                <View style={s.postMeta}>
                  <Text style={s.postAuthor}>{item.author.displayName}</Text>
                  <Text style={s.postTime}>{formatRelative(item.timestamp)}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )
      )}
    </KeyboardAvoidingView>
  );
}

function PersonRow({ person }: { person: PersonResult }) {
  return (
    <View style={pr.row}>
      <AvatarView initials={person.initials} variant={person.avatarVariant} size="md" />
      <View style={pr.info}>
        <Text style={pr.name}>{person.displayName}</Text>
        <Text style={pr.meta}>
          @{person.username}
          {person.role ? ` · ${person.role}` : ''}
        </Text>
      </View>
      <Text style={pr.followers}>{person.followers} followers</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.element, borderRadius: 12,
    borderWidth: 1, borderColor: C.borderMed,
    marginHorizontal: 16, paddingHorizontal: 14, height: 48,
    marginBottom: 12,
  },
  input: { flex: 1, fontSize: 15, color: C.text1 },
  tabs: {
    flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 16,
  },
  tab: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    borderRadius: 8, borderWidth: 1, borderColor: C.borderMed,
    backgroundColor: C.element,
  },
  tabActive: { backgroundColor: C.accentDim, borderColor: C.accent + '80' },
  tabText: { fontSize: 13, fontWeight: '600', color: C.text3 },
  tabTextActive: { color: C.accent },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10 },
  trending: { padding: 16, gap: 10 },
  trendLabel: { fontSize: 10, fontWeight: '700', color: C.text3, fontFamily: 'Menlo', marginBottom: 4 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  trendText: { fontSize: 14, color: C.text2 },
  postCard: {
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    padding: 14, gap: 6,
  },
  postTitle: { fontSize: 14, fontWeight: '600', color: C.text1 },
  postBody: { fontSize: 13, color: C.text2 },
  postMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  postAuthor: { fontSize: 11, color: C.text3 },
  postTime: { fontSize: 11, color: C.text3 },
});

const pr = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: C.text1 },
  meta: { fontSize: 11, color: C.text3, marginTop: 1 },
  followers: { fontSize: 11, color: C.text3 },
});
