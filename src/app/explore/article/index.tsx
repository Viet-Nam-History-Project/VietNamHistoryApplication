/**
 * Bài Báo Lịch Sử — Danh sách audio/bài báo
 * Route: /explore/article
 * Tương đương: AudioArticleListFragment.java
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, ListRenderItemInfo, RefreshControl,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getArticles } from '@/services/articleService';
import { BORDER_RADIUS, COLORS, FONT_SIZES, FONT_WEIGHTS, SHADOWS, SPACING } from '@/constants/theme';

interface Article {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  audioUrl?: string;
  coverMediaRef?: string;
  publishedDate?: string;
  sortOrder?: number;
}

function ArticleCard({ item, onPress }: { item: Article; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardLeft}>
        <View style={styles.articleIcon}>
          <Text style={{ fontSize: 24 }}>{item.audioUrl ? '🎧' : '📰'}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {!!item.summary && <Text style={styles.cardSummary} numberOfLines={2}>{item.summary}</Text>}
        {item.publishedDate && <Text style={styles.cardDate}>{item.publishedDate}</Text>}
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function ArticleListScreen() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setArticles(await getArticles(isRefresh) as Article[]);
    } catch (e) {
      console.error('❌ Load articles error:', e);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bài Báo Lịch Sử</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.accent} />

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(a) => a.id}
          renderItem={({ item }: ListRenderItemInfo<Article>) => (
            <ArticleCard item={item} onPress={() => {}} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={{ fontSize: 48 }}>📭</Text>
              <Text style={styles.emptyText}>Chưa có bài báo nào.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.lightBg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.primary, paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16,
  },
  accent: { height: 4, backgroundColor: COLORS.accent },
  backBtn: { width: 40, alignItems: 'center' },
  backBtnText: { color: COLORS.white, fontSize: 30, fontWeight: FONT_WEIGHTS.bold, lineHeight: 34 },
  headerTitle: { flex: 1, color: COLORS.white, fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, textAlign: 'center' },
  list: { padding: SPACING[4], gap: SPACING[3], paddingBottom: SPACING[8] },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING[3],
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, padding: SPACING[3], ...SHADOWS.sm,
  },
  cardLeft: {},
  articleIcon: {
    width: 56, height: 56, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#fce8e8', alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.gray900, lineHeight: 20 },
  cardSummary: { fontSize: FONT_SIZES.xs, color: COLORS.gray500, lineHeight: 18 },
  cardDate: { fontSize: FONT_SIZES.xs, color: COLORS.primary },
  arrow: { color: COLORS.primary, fontSize: 22 },
  emptyText: { color: COLORS.gray400, textAlign: 'center', fontSize: FONT_SIZES.base },
});
