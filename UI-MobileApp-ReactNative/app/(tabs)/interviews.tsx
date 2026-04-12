import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, FlatList,
  RefreshControl, TouchableOpacity, ActionSheetIOS, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { InterviewPageCard } from '../../src/components/interviews/InterviewPageCard';
import { ByteSpinner } from '../../src/components/ui/ByteSpinner';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { API } from '../../src/services/api';
import { C } from '../../src/constants/colors';
import { Interview } from '../../src/types/models';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Interview>);

const COMPANIES = ['All', 'META', 'GOOGLE', 'STRIPE', 'AMAZON', 'APPLE', 'MICROSOFT'];
const DIFFICULTIES = ['All', 'easy', 'medium', 'hard'];

export default function InterviewsScreen() {
  const insets = useSafeAreaInsets();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [company, setCompany] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const scrollY = useSharedValue(0);
  const flatRef = useRef<FlatList>(null);

  const load = useCallback(async (c = company, d = difficulty) => {
    setLoading(true);
    try {
      const data = await API.getInterviews(c || undefined, d || undefined, 1);
      setInterviews(data);
      setPage(1);
      setHasMore(data.length === 20);
    } catch { setInterviews([]); }
    finally { setLoading(false); }
  }, [company, difficulty]);

  React.useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const loadMore = async () => {
    if (!hasMore || isLoading) return;
    const next = page + 1;
    try {
      const more = await API.getInterviews(company || undefined, difficulty || undefined, next);
      if (more.length === 0) { setHasMore(false); return; }
      setInterviews(p => [...p, ...more]);
      setPage(next);
    } catch { setHasMore(false); }
  };

  const pickCompany = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...COMPANIES, 'Cancel'], cancelButtonIndex: COMPANIES.length },
        i => {
          if (i < COMPANIES.length) {
            const c = COMPANIES[i] === 'All' ? '' : COMPANIES[i];
            setCompany(c);
            load(c, difficulty);
            flatRef.current?.scrollToOffset({ offset: 0, animated: false });
          }
        }
      );
    }
  };

  const pickDifficulty = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...DIFFICULTIES.map(d => d.charAt(0).toUpperCase() + d.slice(1)), 'Cancel'], cancelButtonIndex: DIFFICULTIES.length },
        i => {
          if (i < DIFFICULTIES.length) {
            const d = DIFFICULTIES[i] === 'All' ? '' : DIFFICULTIES[i];
            setDifficulty(d);
            load(company, d);
            flatRef.current?.scrollToOffset({ offset: 0, animated: false });
          }
        }
      );
    }
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; },
  });

  return (
    <View style={s.root}>
      {isLoading && interviews.length === 0 ? (
        <View style={s.center}><ByteSpinner size={44} /></View>
      ) : interviews.length === 0 ? (
        <View style={s.center}>
          <EmptyState icon="briefcase-outline" title="No interviews found" message="Try adjusting your filters." />
        </View>
      ) : (
        <AnimatedFlatList
          ref={flatRef as any}
          data={interviews}
          keyExtractor={i => i.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={SCREEN_HEIGHT}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />
          }
          renderItem={({ item, index }) => (
            <InterviewPageCard interview={item} scrollY={scrollY} index={index} />
          )}
          getItemLayout={(_, i) => ({ length: SCREEN_HEIGHT, offset: i * SCREEN_HEIGHT, index: i })}
        />
      )}

      {/* Filter bar overlay */}
      <View style={[s.filterOverlay, { top: insets.top }]} pointerEvents="box-none">
        <View style={s.filterRow}>
          <TouchableOpacity style={s.filterChip} onPress={pickCompany} activeOpacity={0.8}>
            <Text style={s.filterText}>{company || 'COMPANY'}</Text>
            <Text style={s.filterCount}>{interviews.length} results</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.filterChip} onPress={pickDifficulty} activeOpacity={0.8}>
            <Text style={s.filterText}>{difficulty ? difficulty.toUpperCase() : 'DIFFICULTY'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filterOverlay: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 16 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.element, borderRadius: 6,
    borderWidth: 1, borderColor: C.borderMed,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  filterText: { fontSize: 10, fontWeight: '700', color: C.text2, fontFamily: 'Menlo' },
  filterCount: { fontSize: 9, color: C.text3, fontFamily: 'Menlo' },
});
