/**
 * Bảo Tàng Lịch Sử
 * Route: /explore/museum
 * Tương đương: MuseumDetailFragment.java
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Linking, ListRenderItemInfo,
  RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getMuseums } from '@/services/museumService';
import { BORDER_RADIUS, COLORS, FONT_SIZES, FONT_WEIGHTS, SHADOWS, SPACING } from '@/constants/theme';

interface Museum {
  id: string;
  name: string;
  address?: string;
  description?: string;
  coverMediaRef?: string;
  mapUrl?: string;
  openTime?: string;
  ticketPrice?: string;
  sortOrder?: number;
}

function MuseumCard({ item }: { item: Museum }) {
  return (
    <View style={styles.card}>
      {item.coverMediaRef ? (
        <Image source={{ uri: item.coverMediaRef }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={{ fontSize: 48 }}>🏛️</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.name}>{item.name}</Text>
        {!!item.address && <Text style={styles.address}>📍 {item.address}</Text>}
        {!!item.openTime && <Text style={styles.info}>🕐 {item.openTime}</Text>}
        {!!item.ticketPrice && <Text style={styles.info}>🎟 {item.ticketPrice}</Text>}
        {!!item.description && <Text style={styles.desc} numberOfLines={3}>{item.description}</Text>}
        {!!item.mapUrl && (
          <TouchableOpacity style={styles.mapBtn} onPress={() => Linking.openURL(item.mapUrl!)} activeOpacity={0.8}>
            <Text style={styles.mapBtnText}>🗺 Xem bản đồ</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function MuseumScreen() {
  const router = useRouter();
  const [museums, setMuseums] = useState<Museum[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setMuseums(await getMuseums(isRefresh) as Museum[]);
    } catch (e) {
      console.error('❌ Load museums error:', e);
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
        <Text style={styles.headerTitle}>Bảo Tàng Lịch Sử</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.accent} />

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={museums}
          keyExtractor={(m) => m.id}
          renderItem={({ item }: ListRenderItemInfo<Museum>) => <MuseumCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={{ fontSize: 48 }}>🏛️</Text>
              <Text style={styles.emptyText}>Chưa có bảo tàng nào.</Text>
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
  list: { padding: SPACING[4], gap: SPACING[4], paddingBottom: SPACING[8] },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  card: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', ...SHADOWS.md },
  image: { width: '100%', height: 180 },
  placeholder: { backgroundColor: '#fce8e8', alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: SPACING[4], gap: SPACING[2] },
  name: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.gray900 },
  address: { fontSize: FONT_SIZES.sm, color: COLORS.primary },
  info: { fontSize: FONT_SIZES.sm, color: COLORS.gray600 },
  desc: { fontSize: FONT_SIZES.sm, color: COLORS.gray500, lineHeight: 20, marginTop: 4 },
  mapBtn: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.full,
    paddingVertical: 10, alignItems: 'center', marginTop: SPACING[2],
  },
  mapBtnText: { color: COLORS.white, fontWeight: FONT_WEIGHTS.semibold, fontSize: FONT_SIZES.sm },
  emptyText: { color: COLORS.gray400, textAlign: 'center', fontSize: FONT_SIZES.base },
});
