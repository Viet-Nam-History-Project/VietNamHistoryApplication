/**
 * Timeline Puzzle gameplay. (Thiết kế Sử đàn)
 * Port tu UI Java: nen chien truong, ban bai, card pixel-art va nhan vat frame animation.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageBackground,
  ImageSourcePropType,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getEraById } from '@/services/timelinePuzzleService';
import { Era, TimelineEvent } from '@/models/Era';
import { SessionResult, BadgeDefinition } from '@/models/GamificationModels';
import { Fonts, HTML_SHADOWS, SuVietColors, SPACING } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useGamification } from '@/contexts/GamificationContext';
import { getRankTier } from '@/services/rankService';
import { ErrorState, LoadingState, Screen, AppHeader, useTopInset } from '@/components/ui';

const MAX_MISTAKES = 3;

type Status = 'playing' | 'won' | 'lost';
type WarriorMode = 'idle' | 'walk' | 'attack';

const GAME_ASSETS = {
  sky: require('../../../../assets/images/game/summer3.png'),
  table: require('../../../../assets/images/game/rell_table.png'),
  card: require('../../../../assets/images/game/card.png'),
  turretFrames: [
    require('../../../../assets/images/game/turret_idle000.png'),
    require('../../../../assets/images/game/turret_idle001.png'),
    require('../../../../assets/images/game/turret_idle002.png'),
    require('../../../../assets/images/game/turret_idle003.png'),
    require('../../../../assets/images/game/turret_idle004.png'),
    require('../../../../assets/images/game/turret_idle005.png'),
  ],
  warriorIdleFrames: [
    require('../../../../assets/images/game/warrior2_idle000.png'),
    require('../../../../assets/images/game/warrior2_idle001.png'),
    require('../../../../assets/images/game/warrior2_idle002.png'),
    require('../../../../assets/images/game/warrior2_idle003.png'),
    require('../../../../assets/images/game/warrior2_idle004.png'),
  ],
  warriorWalkFrames: [
    require('../../../../assets/images/game/warrior2_walk000.png'),
    require('../../../../assets/images/game/warrior2_walk001.png'),
    require('../../../../assets/images/game/warrior2_walk002.png'),
    require('../../../../assets/images/game/warrior2_walk003.png'),
    require('../../../../assets/images/game/warrior2_walk004.png'),
    require('../../../../assets/images/game/warrior2_walk005.png'),
    require('../../../../assets/images/game/warrior2_walk006.png'),
    require('../../../../assets/images/game/warrior2_walk007.png'),
  ],
  warriorAttackFrames: [
    require('../../../../assets/images/game/warrior2_atack000.png'),
    require('../../../../assets/images/game/warrior2_atack001.png'),
    require('../../../../assets/images/game/warrior2_atack002.png'),
    require('../../../../assets/images/game/warrior2_atack003.png'),
  ],
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function FrameSprite({
  frames,
  interval = 120,
  style,
}: {
  frames: ImageSourcePropType[];
  interval?: number;
  style?: object;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % frames.length);
    }, interval);
    return () => clearInterval(timer);
  }, [frames, interval]);

  return <Image source={frames[index]} resizeMode="contain" style={style} />;
}

function EventCard({
  event,
  compact = false,
}: {
  event: TimelineEvent;
  compact?: boolean;
}) {
  return (
    <ImageBackground
      source={GAME_ASSETS.card}
      resizeMode="stretch"
      style={compact ? styles.slotImageCard : styles.handImageCard}
      imageStyle={styles.pixelCardImage}
    >
      <View style={compact ? styles.slotTitleBox : styles.handTitleBox}>
        <Text style={compact ? styles.slotCardTitle : styles.handCardTitle} numberOfLines={compact ? 2 : 4}>
          {event.name}
        </Text>
      </View>
      <Text style={compact ? styles.slotYear : styles.handYear}>{event.year}</Text>
      <View style={styles.cardDivider} />
      {!!event.desc && (
        <Text style={compact ? styles.slotCardDesc : styles.handCardDesc} numberOfLines={compact ? 3 : undefined}>
          {event.desc}
        </Text>
      )}
    </ImageBackground>
  );
}

export default function TimelinePlayScreen() {
  const params = useLocalSearchParams<{ eraId: string, isReviewMode?: string, timelineItems?: string, xpGained?: string }>();
  const eraId = params.eraId;
  const isReviewMode = params.isReviewMode === 'true';

  const router = useRouter();
  const topInset = useTopInset();
  const { user } = useAuth();
  const { submitSession, profile } = useGamification();

  const [era, setEra] = useState<Era | null>(null);
  const [loading, setLoading] = useState(!isReviewMode);
  const [error, setError] = useState<string | null>(null);

  const [sortedEvents, setSortedEvents] = useState<TimelineEvent[]>([]);
  const [hand, setHand] = useState<TimelineEvent[]>([]);
  const [placed, setPlaced] = useState<(TimelineEvent | null)[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [status, setStatus] = useState<Status>(isReviewMode ? 'won' : 'playing');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stageWidth, setStageWidth] = useState(360);
  const [warriorMode, setWarriorMode] = useState<WarriorMode>('idle');
  const [shakeKey, setShakeKey] = useState<string | null>(null);

  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const totalTimeRef = useRef(0);
  const submittedRef = useRef(false);

  const enemyProgress = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const turretScale = useRef(new Animated.Value(1)).current;

  const lives = Math.max(0, MAX_MISTAKES - mistakes);
  const warriorFrames = useMemo(() => {
    if (warriorMode === 'walk') return GAME_ASSETS.warriorWalkFrames;
    if (warriorMode === 'attack') return GAME_ASSETS.warriorAttackFrames;
    return GAME_ASSETS.warriorIdleFrames;
  }, [warriorMode]);

  const enemyTranslateX = enemyProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -Math.max(130, stageWidth * 0.46)],
  });

  const setupGame = useCallback(
    (events: TimelineEvent[]) => {
      const sorted = [...events].sort((a, b) => a.order - b.order);
      setSortedEvents(sorted);
      setHand(shuffle(events));
      setPlaced(new Array(sorted.length).fill(null));
      setCurrentStep(0);
      setMistakes(0);
      setStatus('playing');
      setIsProcessing(false);
      setWarriorMode('idle');
      setSessionResult(null);
      submittedRef.current = false;
      totalTimeRef.current = 0;
      enemyProgress.setValue(0);
      turretScale.setValue(1);
    },
    [enemyProgress, turretScale],
  );

  const load = useCallback(async () => {
    if (!eraId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getEraById(eraId);
      if (!data || !data.events?.length) {
        setError('Kỷ nguyên này chưa có sự kiện để chơi.');
        return;
      }
      setEra(data);
      setupGame(data.events);
    } catch {
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [eraId, setupGame]);

  useEffect(() => {
    if (isReviewMode) {
      if (params.timelineItems) {
        try {
          const items = JSON.parse(params.timelineItems);
          setSortedEvents(items.map((it: any) => ({ year: Number(it.year), name: it.event, order: 0 } as TimelineEvent)));
        } catch {}
      }
      setSessionResult({
        xpGained: Number(params.xpGained ?? 0),
        totalXP: profile?.totalXP ?? 0,
        currentRank: profile?.currentRank ?? 'Newcomer',
        previousRank: profile?.currentRank ?? 'Newcomer',
        rankChanged: false,
        newBadges: [],
      });
      return;
    }
    if (!era) {
      load();
    }
  }, [load, isReviewMode, params.timelineItems, params.xpGained, profile, era]);

  useEffect(() => {
    if (loading || error || status !== 'playing') return;
    const id = setInterval(() => {
      totalTimeRef.current += 1;
    }, 1000);
    return () => clearInterval(id);
  }, [loading, error, status]);

  useEffect(() => {
    if (isReviewMode || status === 'playing' || submittedRef.current || !user?.id) return;
    submittedRef.current = true;

    const doSubmit = async () => {
      try {
        const totalQ = sortedEvents.length;
        const correctAns = status === 'won' ? totalQ : currentStep;
        const gameScore = status === 'won' ? totalQ : currentStep;

        const result = await submitSession({
          userId: user.id,
          type: 'game',
          gameId: eraId ?? null,
          gameTitle: era?.name ?? 'Ghép nối Niên đại',
          score: gameScore,
          totalQuestions: totalQ,
          correctAnswers: correctAns,
          timeTaken: totalTimeRef.current,
          timelineItems: sortedEvents.map(e => ({ year: String(e.year), event: e.name })),
        });
        setSessionResult(result);
      } catch (err) {
        console.error('❌ Lỗi submit timeline session:', err);
      }
    };

    doSubmit();
  }, [status, user?.id]);

  const triggerCardShake = (key: string) => {
    setShakeKey(key);
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -10, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 10, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -7, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start(() => setShakeKey(null));
  };

  const playWalk = (nextMistakes: number) => {
    setWarriorMode('walk');
    // Ánh xạ bước tiến của lính theo MAX_MISTAKES:
    // Với MAX_MISTAKES = 3:
    // - Sai lần 1: 1 / 2 = 0.5 (tiến lại gần)
    // - Sai lần 2: 2 / 2 = 1.0 (tới sát chân thành)
    const targetProgress = Math.min(nextMistakes / (MAX_MISTAKES - 1), 1);
    Animated.timing(enemyProgress, {
      toValue: targetProgress,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      setWarriorMode('idle');
      setIsProcessing(false);
    });
  };

  const playAttack = () => {
    enemyProgress.setValue(1);
    setWarriorMode('attack');
    Animated.sequence([
      Animated.timing(turretScale, { toValue: 0.88, duration: 120, useNativeDriver: true }),
      Animated.spring(turretScale, { toValue: 1, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      setWarriorMode('idle');
      setIsProcessing(false);
      setStatus('lost');
    }, 900);
  };

  const handleTapCard = (event: TimelineEvent) => {
    if (status !== 'playing' || isProcessing) return;

    const key = `${event.order}-${event.name}`;

    if (event.order === currentStep + 1) {
      setIsProcessing(true);
      setPlaced((prev) => {
        const next = [...prev];
        next[currentStep] = event;
        return next;
      });
      setHand((prev) => prev.filter((e) => e !== event));

      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);

      setTimeout(() => {
        setIsProcessing(false);
        if (nextStep >= sortedEvents.length) {
          setStatus('won');
        }
      }, 260);
      return;
    }

    setIsProcessing(true);
    triggerCardShake(key);

    const nextMistakes = mistakes + 1;
    setMistakes(nextMistakes);

    if (nextMistakes < MAX_MISTAKES) {
      playWalk(nextMistakes);
    } else {
      playAttack();
    }
  };

  if (loading) return <LoadingState message="Đang tải kỷ nguyên..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const renderResultModal = () => (
    <View style={styles.overlay}>
      <View style={[styles.modal, HTML_SHADOWS.cardLarge]}>
        <Ionicons
          name={status === 'won' ? 'trophy' : 'skull'}
          size={56}
          color={status === 'won' ? SuVietColors.do : SuVietColors.muc2}
        />
        <Text style={[styles.modalTitle, { color: status === 'won' ? SuVietColors.do : SuVietColors.muc }]}>
          {status === 'won' ? 'Hoàn thành!' : 'Thua mất rồi!'}
        </Text>

        {sessionResult && (
          <LinearGradient
            colors={[SuVietColors.son, SuVietColors.son2]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.xpBanner}
          >
            <View style={styles.xpBannerRow}>
              <Ionicons name="sparkles" size={20} color="#f6e9cf" />
              <Text style={styles.xpBannerText}>+{sessionResult.xpGained} XP</Text>
              <Text style={styles.xpBannerDetail}>Tổng: {sessionResult.totalXP} • Hạng: {sessionResult.currentRank}</Text>
            </View>
            {sessionResult.rankChanged && (
              <Text style={styles.xpRankUp}>
                🎉 Thăng hạng: {sessionResult.previousRank} → {sessionResult.currentRank}!
              </Text>
            )}
            {sessionResult.newBadges.length > 0 && (
              <View style={styles.xpBadgesRow}>
                {sessionResult.newBadges.map((badge: BadgeDefinition) => (
                  <View key={badge.id} style={styles.xpBadgeChip}>
                    <Ionicons name={badge.icon as any} size={14} color={SuVietColors.son} />
                    <Text style={styles.xpBadgeLabel}>{badge.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </LinearGradient>
        )}

        <ScrollView style={styles.modalTimeline} showsVerticalScrollIndicator={false}>
          {sortedEvents.map((event, idx) => (
            <View key={idx} style={styles.modalRow}>
              <Text style={styles.modalYear}>{event.year}</Text>
              <Text style={styles.modalName}>{event.name}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.modalActions}>
          {!isReviewMode && (
            <TouchableOpacity onPress={() => era?.events && setupGame(era.events)} activeOpacity={0.8} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Chơi lại</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={() => isReviewMode ? router.back() : router.replace('/(tabs)/game')} 
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[SuVietColors.son, SuVietColors.son2]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.doneBtn}
            >
              <Text style={styles.doneBtnText}>{isReviewMode ? 'Quay lại' : 'Về trang trò chơi'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (isReviewMode) {
    return (
      <Screen style={{ backgroundColor: SuVietColors.giay }}>
        <AppHeader title="Xem lại kết quả" showThemeToggle={false} />
        {renderResultModal()}
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.gameRoot}>
        <ImageBackground source={GAME_ASSETS.sky} resizeMode="cover" style={styles.battleBg}>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => router.back()}
            style={[styles.backButton, { top: topInset + 14 }]}
          >
            <Ionicons name="chevron-back" size={28} color="#3A3A3A" />
          </TouchableOpacity>

          <View style={[styles.titlePill, { top: topInset + 14 }]}>
            <Text style={styles.titleText} numberOfLines={1}>
              {era?.title ?? 'Timeline Puzzle'}
            </Text>
            <Text style={styles.progressText}>
              {currentStep}/{sortedEvents.length}
            </Text>
          </View>

          <View
            style={[styles.battleLayer, status !== 'playing' && styles.battleLayerEnded]}
            onLayout={(e) => setStageWidth(e.nativeEvent.layout.width)}
          >
            <View style={styles.hpWrap}>
              {Array.from({ length: MAX_MISTAKES }).map((_, i) => {
                const filled = i < lives;
                return (
                  <View
                    key={i}
                    style={[
                      styles.hpSegment,
                      i === 0 && styles.hpLeft,
                      i === MAX_MISTAKES - 1 && styles.hpRight,
                      { backgroundColor: filled ? '#ff2d23' : '#4a4a4a' },
                    ]}
                  />
                );
              })}
            </View>

            <Animated.View style={[styles.turretWrap, { transform: [{ scale: turretScale }] }]}>
              <FrameSprite frames={GAME_ASSETS.turretFrames} interval={130} style={styles.turret} />
            </Animated.View>

            <Animated.View style={[styles.enemyWrap, { transform: [{ translateX: enemyTranslateX }] }]}>
              <FrameSprite
                frames={warriorFrames}
                interval={warriorMode === 'idle' ? 145 : 95}
                style={styles.enemy}
              />
            </Animated.View>
          </View>
        </ImageBackground>

        <ImageBackground source={GAME_ASSETS.table} resizeMode="stretch" style={styles.tableBg}>
          <View style={styles.slotGrid}>
            {sortedEvents.map((_, idx) => {
              const event = placed[idx];
              return (
                <View key={idx} style={styles.slotCell}>
                  {event ? (
                    <EventCard event={event} compact />
                  ) : (
                    <View style={[styles.emptySlot, idx === currentStep && styles.nextSlot]}>
                      <View style={styles.emptySlotMark} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.handScroller}
            contentContainerStyle={styles.handContent}
          >
            {hand.map((event) => {
              const key = `${event.order}-${event.name}`;
              return (
                <Animated.View
                  key={key}
                  style={shakeKey === key ? { transform: [{ translateX: shakeX }] } : undefined}
                >
                  <TouchableOpacity
                    activeOpacity={0.88}
                    disabled={isProcessing}
                    onPress={() => handleTapCard(event)}
                    style={styles.handPressable}
                  >
                    <EventCard event={event} />
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>
        </ImageBackground>
      </View>

      {status !== 'playing' && renderResultModal()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#000' },
  gameRoot: { flex: 1, backgroundColor: '#000' },
  battleBg: { flex: 0.42 },
  tableBg: { flex: 0.58, paddingTop: 20, paddingBottom: 16 },

  backButton: {
    position: 'absolute', left: 16, zIndex: 30,
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  titlePill: {
    position: 'absolute', left: 70, right: 16, zIndex: 20,
    minHeight: 44, paddingHorizontal: 16, borderRadius: 22,
    backgroundColor: 'rgba(36, 28, 20, 0.6)', borderWidth: 1, borderColor: 'rgba(255, 214, 116, 0.4)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  },
  titleText: { flex: 1, fontFamily: Fonts.bold, color: '#FFF1C7', fontSize: 14 },
  progressText: { fontFamily: Fonts.bold, color: '#FFD45A', fontSize: 14 },

  battleLayer: { flex: 1, position: 'relative' },
  battleLayerEnded: { opacity: 0.45 },
  hpWrap: {
    position: 'absolute', left: 50, bottom: 126, zIndex: 12,
    flexDirection: 'row', padding: 4, borderRadius: 18, backgroundColor: '#0a0a0a',
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  hpSegment: { width: 43, height: 16, borderLeftWidth: 5, borderLeftColor: '#0a0a0a' },
  hpLeft: { borderTopLeftRadius: 12, borderBottomLeftRadius: 12, borderLeftWidth: 0 },
  hpRight: { borderTopRightRadius: 12, borderBottomRightRadius: 12 },

  turretWrap: { position: 'absolute', left: 58, bottom: 54, zIndex: 10 },
  turret: { width: 106, height: 121 },
  enemyWrap: { position: 'absolute', right: 48, bottom: 62, zIndex: 11 },
  enemy: { width: 82, height: 88, transform: [{ scaleX: -1 }] },

  slotGrid: {
    flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'stretch',
    paddingHorizontal: 22, justifyContent: 'space-between', rowGap: 8,
  },
  slotCell: { width: '23.2%', aspectRatio: 0.82 },
  emptySlot: {
    flex: 1, borderWidth: 1.4, borderStyle: 'dashed', borderColor: '#F4BD00',
    backgroundColor: 'rgba(227, 151, 65, 0.12)', alignItems: 'center', justifyContent: 'center',
  },
  nextSlot: { backgroundColor: 'rgba(255, 205, 74, 0.25)' },
  emptySlotMark: { width: 20, height: 20, backgroundColor: 'rgba(123, 74, 31, 0.16)' },

  handScroller: { marginTop: 'auto', maxHeight: 238 },
  handContent: { paddingHorizontal: 18, gap: 10, alignItems: 'flex-end', paddingBottom: 8 },
  handPressable: { width: 142, height: 230 },
  handImageCard: { width: 142, height: 230, paddingTop: 20, paddingHorizontal: 14 },
  slotImageCard: { flex: 1, paddingTop: 8, paddingHorizontal: 8 },
  pixelCardImage: { borderRadius: 4 },

  handCardTitle: { color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: 12, lineHeight: 16, textAlign: 'center' },
  handTitleBox: { height: 48, alignItems: 'center', justifyContent: 'center' },
  slotCardTitle: { color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: 9, lineHeight: 11, textAlign: 'center' },
  slotTitleBox: { minHeight: 24, alignItems: 'center', justifyContent: 'center' },

  handYear: { marginTop: 4, color: '#FFC107', fontFamily: Fonts.bold, fontSize: 16, textAlign: 'center' },
  slotYear: { marginTop: 1, color: '#FFC107', fontFamily: Fonts.bold, fontSize: 9, textAlign: 'center' },
  cardDivider: { height: 1, marginTop: 3, marginHorizontal: 3, backgroundColor: '#FFC107' },

  handCardDesc: { marginTop: 8, color: '#D7D4DF', fontFamily: Fonts.bold, fontSize: 12, lineHeight: 16 },
  slotCardDesc: { marginTop: 3, color: '#D7D4DF', fontFamily: Fonts.semibold, fontSize: 7, lineHeight: 9 },

  // Result modal overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 1000,
  },
  modal: {
    width: '100%', maxWidth: 400, backgroundColor: SuVietColors.card,
    borderRadius: 24, borderWidth: 1, borderColor: SuVietColors.line,
    alignItems: 'center', padding: 24,
  },
  modalTitle: { fontFamily: Fonts.serifBold, fontSize: 28, marginTop: 8, marginBottom: 20 },

  // XP Banner
  xpBanner: {
    width: '100%', borderRadius: 16, padding: 16, marginBottom: 20, gap: 8,
  },
  xpBannerRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  xpBannerText: { fontFamily: Fonts.bold, fontSize: 18, color: '#f6e9cf' },
  xpBannerDetail: { fontFamily: Fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  xpRankUp: { fontFamily: Fonts.bold, fontSize: 13, color: '#4ade80' },
  xpBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  xpBadgeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  xpBadgeLabel: { fontFamily: Fonts.bold, fontSize: 11, color: SuVietColors.muc },

  modalTimeline: { maxHeight: 450, alignSelf: 'stretch', marginBottom: 24 },
  modalRow: {
    flexDirection: 'row', gap: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: SuVietColors.line,
  },
  modalYear: { width: 50, fontFamily: Fonts.bold, fontSize: 14, color: SuVietColors.do },
  modalName: { flex: 1, fontFamily: Fonts.regular, fontSize: 14, color: SuVietColors.muc, lineHeight: 22 },

  modalActions: { width: '100%', gap: 12 },
  retryBtn: {
    width: '100%', paddingVertical: 14, borderRadius: 20,
    borderWidth: 1, borderColor: SuVietColors.dong, alignItems: 'center',
  },
  retryBtnText: { fontFamily: Fonts.bold, fontSize: 15, color: SuVietColors.dong },
  doneBtn: {
    width: '100%', paddingVertical: 14, borderRadius: 20, alignItems: 'center',
  },
  doneBtnText: { fontFamily: Fonts.bold, fontSize: 15, color: '#f6e9cf' },
});
