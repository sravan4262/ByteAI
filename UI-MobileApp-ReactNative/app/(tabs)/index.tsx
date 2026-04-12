import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, FlatList,
  RefreshControl, TouchableOpacity, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BytePageCard } from '../../src/components/feed/BytePageCard';
import { ByteSpinner } from '../../src/components/ui/ByteSpinner';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { API } from '../../src/services/api';
import { C } from '../../src/constants/colors';
import { Post, FeedFilter, FEED_FILTERS } from '../../src/types/models';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Post>);

const STACKS = ['React', 'TypeScript', 'Go', 'Rust', 'Python', 'PostgreSQL', 'Swift', 'Kubernetes'];

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FeedFilter>('for_you');
  const [stack, setStack] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [stacks, setStacks] = useState(STACKS);
  const scrollY = useSharedValue(0);
  const flatRef = useRef<FlatList>(null);

  const load = useCallback(async (f = filter, s = stack) => {
    setLoading(true);
    try {
      const data = await API.getFeed(f, s || undefined, 1);
      setPosts(data);
      setPage(1);
      setHasMore(data.length === 20);
    } catch { setPosts([]); }
    finally { setLoading(false); }
    API.getTechStacks().then(ts => { if (ts.length) setStacks(ts.map(t => t.name)); }).catch(() => {});
  }, [filter, stack]);

  React.useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onFilterChange = (f: FeedFilter) => {
    setFilter(f);
    load(f, stack);
    flatRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const onStackChange = (s: string) => {
    setStack(s);
    load(filter, s);
    flatRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const loadMore = async () => {
    if (!hasMore || isLoading) return;
    const next = page + 1;
    try {
      const more = await API.getFeed(filter, stack || undefined, next);
      if (more.length === 0) { setHasMore(false); return; }
      setPosts(p => [...p, ...more]);
      setPage(next);
    } catch { setHasMore(false); }
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; },
  });

  return (
    <View style={s.root}>
      {isLoading && posts.length === 0 ? (
        <View style={s.center}><ByteSpinner size={44} /></View>
      ) : posts.length === 0 ? (
        <View style={s.center}>
          <EmptyState icon="flash-outline" title="No bytes yet" message="Follow engineers or change your filter." />
        </View>
      ) : (
        <AnimatedFlatList
          ref={flatRef as any}
          data={posts}
          keyExtractor={p => p.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={SCREEN_HEIGHT}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.accent}
              progressBackgroundColor={C.card}
            />
          }
          renderItem={({ item, index }) => (
            <BytePageCard
              post={item}
              scrollY={scrollY}
              index={index}
              onViewFull={() => router.push(`/post/${item.id}`)}
            />
          )}
          getItemLayout={(_, i) => ({ length: SCREEN_HEIGHT, offset: i * SCREEN_HEIGHT, index: i })}
        />
      )}

      {/* Filter bar overlay */}
      <View style={[s.filterOverlay, { top: insets.top }]} pointerEvents="box-none">
        <View style={s.topRow}>
          <Text style={s.logoText}>⚡ ByteAI</Text>
        </View>
        <FilterBar
          filter={filter}
          stack={stack}
          stacks={stacks}
          onFilter={onFilterChange}
          onStack={onStackChange}
        />
      </View>
    </View>
  );
}

// ─── Filter Bar ────────────────────────────────────────────────────────────

function FilterBar({ filter, stack, stacks, onFilter, onStack }: {
  filter: FeedFilter; stack: string; stacks: string[];
  onFilter: (f: FeedFilter) => void; onStack: (s: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingTop: 4 }}>
      <View style={fb.row}>
        {FEED_FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[fb.chip, filter === f.key && fb.chipActive]}
            onPress={() => onFilter(f.key)}
            activeOpacity={0.8}
          >
            <Text style={[fb.chipText, filter === f.key && fb.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={fb.chip}
          onPress={() => {
            // Simple cycle through stacks for demo; in production use an ActionSheet
            const idx = stacks.indexOf(stack);
            onStack(stacks[(idx + 1) % stacks.length] ?? '');
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={10} color={C.text2} />
          <Text style={fb.chipText}>{stack || 'STACK'}</Text>
          <Ionicons name="chevron-down" size={9} color={C.text2} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filterOverlay: {
    position: 'absolute', left: 0, right: 0,
    paddingHorizontal: 16,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  logoText: { fontSize: 18, fontWeight: '800', color: C.text1 },
});

const fb = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.element, borderRadius: 6,
    borderWidth: 1, borderColor: C.borderMed,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: C.accentDim, borderColor: C.accent + '80',
  },
  chipText: { fontSize: 10, fontWeight: '700', color: C.text2, fontFamily: 'Menlo' },
  chipTextActive: { color: C.accent },
});
