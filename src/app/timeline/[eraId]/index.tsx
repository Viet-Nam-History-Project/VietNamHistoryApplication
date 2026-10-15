/**
 * Màn thông tin Kỷ Nguyên (trước khi chơi Timeline Puzzle) - Thiết kế Sử đàn
 * Route: /timeline/[eraId]
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Era } from '@/models/Era';
import { getEraById } from '@/services/timelinePuzzleService';
import { Fonts, HTML_SHADOWS, SuVietColors, SPACING } from '@/constants/theme';
import { Screen, LoadingState, ErrorState, useTopInset } from '@/components/ui';

export default function TimelineDetailScreen() {
  const { eraId } = useLocalSearchParams<{ eraId: string }>();
  const router = useRouter();
  const topInset = useTopInset();
  const [era, setEra] = useState<Era | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eraId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getEraById(eraId);
      if (!data) {
        setError('Không tìm thấy kỷ nguyên.');
        return;
      }
      setEra(data);
    } catch {
      setError('Không thể tải kỷ nguyên.');
    } finally {
      setLoading(false);
    }
  }, [eraId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Screen><LoadingState /></Screen>;
  if (error || !era) return <Screen><ErrorState message={error ?? 'Không tìm thấy kỷ nguyên.'} onRetry={load} /></Screen>;

  const eventCount = era.events?.length ?? 0;
  const heroImage = era.coverMediaRef ?? era.thumbnailUrl;

  return (
    <Screen style={styles.screen}>
      <LinearGradient
        colors={[SuVietColors.son, SuVietColors.son2]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topInset + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#f6e9cf" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ghép niên đại</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Card nổi — giống HTML */}
        <View style={[styles.card, HTML_SHADOWS.cardLarge]}>
          {heroImage ? (
            <ImageBackground
              source={{ uri: heroImage }}
              resizeMode="cover"
              style={styles.heroImage}
              imageStyle={styles.heroImageRadius}
            >
              <View style={styles.heroImageOverlay} />
            </ImageBackground>
          ) : (
            <View style={styles.starIconWrap}>
              <LinearGradient
                colors={[SuVietColors.son, SuVietColors.son2]}
                style={styles.starIconBg}
              >
                <Ionicons name="time" size={28} color={SuVietColors.sao} />
              </LinearGradient>
            </View>
          )}

          <Text style={styles.heroTitle}>{era.title}</Text>
          {!!era.description && (
            <Text style={styles.heroDesc}>{era.description}</Text>
          )}
          {eventCount > 0 && (
            <View style={styles.countBadgeWrap}>
              <View style={styles.countBadge}>
                <Ionicons name="albums" size={16} color={SuVietColors.son} />
                <Text style={styles.countText}>{eventCount} sự kiện</Text>
              </View>
            </View>
          )}

          <View style={styles.rulesBox}>
            <Text style={styles.rulesText}>
              <Text style={styles.rulesBold}>Cách chơi. </Text>
              Chọn thẻ sự kiện theo thứ tự thời gian từ sớm đến muộn. Sai tối đa 3 lần pháo đài sẽ thất thủ. Ghép đủ sự kiện trước khi hết máu để thắng!
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push({ pathname: '/timeline/[eraId]/play', params: { eraId: eraId! } })}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[SuVietColors.son, SuVietColors.son2]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.startBtn, HTML_SHADOWS.button]}
            >
              <Text style={styles.startBtnText}>Bắt đầu ghép niên đại</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: SuVietColors.giay },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[5],
    paddingBottom: SPACING[12] + SPACING[3],
  },
  headerTitle: {
    fontFamily: Fonts.serifExtraBold,
    fontSize: 20,
    color: '#f6e9cf',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1, borderColor: 'rgba(240,192,76,0.35)',
    backgroundColor: 'rgba(0,0,0,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Centered card layout
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[8],
  },
  card: {
    backgroundColor: SuVietColors.card,
    borderRadius: 22, borderWidth: 1, borderColor: SuVietColors.line, padding: 22,
  },

  heroImage: { width: '100%', height: 160, marginBottom: 16, justifyContent: 'flex-end' },
  heroImageRadius: { borderRadius: 14 },
  heroImageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)' },
  
  starIconWrap: { alignItems: 'center', marginBottom: SPACING[4] },
  starIconBg: {
    width: 60, height: 60, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },

  heroTitle: {
    fontFamily: Fonts.serifExtraBold, fontSize: 24, color: SuVietColors.muc,
    textAlign: 'center', lineHeight: 30, marginBottom: 8,
  },
  heroDesc: {
    fontFamily: Fonts.regular, fontSize: 13.5, color: SuVietColors.muc2,
    textAlign: 'center', marginBottom: 16, lineHeight: 20,
  },
  
  countBadgeWrap: { alignItems: 'center', marginBottom: 20 },
  countBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f7e6e4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  countText: { fontFamily: Fonts.bold, fontSize: 13, color: SuVietColors.son },

  rulesBox: {
    backgroundColor: SuVietColors.rulesBg,
    borderWidth: 1, borderStyle: 'dashed', borderColor: SuVietColors.dong,
    borderRadius: 14, padding: 13, marginBottom: 22,
  },
  rulesText: { fontFamily: Fonts.regular, fontSize: 13, color: SuVietColors.muc2, lineHeight: 20 },
  rulesBold: { fontFamily: Fonts.bold, color: SuVietColors.muc },

  startBtn: { borderRadius: 15, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  startBtnText: { fontFamily: Fonts.bold, fontSize: 16, color: '#f6e9cf' },
});
