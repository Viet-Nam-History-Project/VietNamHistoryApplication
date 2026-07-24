/**
 * Carousel Thời Kỳ theo phong cách museum wall gallery.
 * Dữ liệu vẫn đọc từ Firestore collection "periods".
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Period, yearFromIso, formatYear } from '@/models/Period';
import { getPeriods } from '@/services/periodService';
import { BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import {
  AppHeader,
  Screen,
  HistoryImage,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@/components/ui';
import { getPrimaryImageRef } from '@/utils/media';

const MUSEUM_WALL = require('../../../assets/images/period/vietnam-gallery-wall.png');
const CARD_SPACING = SPACING[4];
const SIDE_SCALE = 0.86;
const SIDE_OPACITY = 0.58;

type PeriodCardProps = {
  item: Period;
  index: number;
  cardWidth: number;
  galleryHeight: number;
  itemFullWidth: number;
  scrollX: SharedValue<number>;
  settledIndex: SharedValue<number>;
  settleRotation: SharedValue<number>;
  isActive: boolean;
  onFocus: () => void;
  onOpen: () => void;
};

function PeriodCard({
  item,
  index,
  cardWidth,
  galleryHeight,
  itemFullWidth,
  scrollX,
  settledIndex,
  settleRotation,
  isActive,
  onFocus,
  onOpen,
}: PeriodCardProps) {
  const colors = useThemeColors();
  const pressScale = useSharedValue(1);
  const inputRange = [
    (index - 1) * itemFullWidth,
    index * itemFullWidth,
    (index + 1) * itemFullWidth,
  ];
  const imageHeight = Math.max(280, galleryHeight - 150);
  const startYear = yearFromIso(item.startDate);
  const endYear = yearFromIso(item.endDate);
  const yearLabel = `${formatYear(startYear)} — ${formatYear(endYear)}`;

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [SIDE_SCALE, 1, SIDE_SCALE],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [SIDE_OPACITY, 1, SIDE_OPACITY],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [26, 0, 26],
      Extrapolation.CLAMP,
    );
    const scrollRotation = interpolate(
      scrollX.value,
      inputRange,
      [-3, 0, 3],
      Extrapolation.CLAMP,
    );
    const sway = settledIndex.value === index ? settleRotation.value : 0;

    return {
      opacity,
      zIndex: Math.round(scale * 10),
      transform: [
        { translateY },
        { scale: scale * pressScale.value },
        { rotateZ: `${scrollRotation + sway}deg` },
      ],
    };
  }, [index, inputRange]);

  const imageParallaxStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          scrollX.value,
          inputRange,
          [-22, 0, 22],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }), [inputRange]);

  const imageShadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollX.value,
      inputRange,
      [0.24, 0, 0.24],
      Extrapolation.CLAMP,
    ),
  }), [inputRange]);

  const plaqueAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollX.value,
      inputRange,
      [0.65, 1, 0.65],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollX.value,
          inputRange,
          [8, 0, 8],
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(
          scrollX.value,
          inputRange,
          [0.96, 1, 0.96],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }), [inputRange]);

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollX.value,
      inputRange,
      [0, 0.2, 0],
      Extrapolation.CLAMP,
    ),
  }), [inputRange]);

  const handlePress = () => {
    if (!isActive) {
      onFocus();
      return;
    }

    pressScale.value = withSequence(
      withTiming(0.97, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 120, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onOpen)();
      }),
    );
  };

  return (
    <View style={[styles.itemSlot, { width: itemFullWidth, height: galleryHeight }]}>
      <Animated.View
        style={[
          styles.artworkGroup,
          { width: cardWidth, height: galleryHeight },
          cardAnimatedStyle,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.title}, ${yearLabel}`}
          onPress={handlePress}
          style={styles.pressArea}
        >
          <View style={styles.hanger} pointerEvents="none">
            <View style={[styles.wire, styles.wireLeft, { backgroundColor: colors.borderStrong }]} />
            <View style={[styles.wire, styles.wireRight, { backgroundColor: colors.borderStrong }]} />
            <View
              style={[
                styles.pin,
                { backgroundColor: colors.secondary, borderColor: colors.surfaceElevated },
              ]}
            />
          </View>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.activeGlow,
              {
                top: 29,
                height: imageHeight + 14,
                backgroundColor: colors.primary,
              },
              glowAnimatedStyle,
            ]}
          />

          <View
            style={[
              styles.frame,
              {
                height: imageHeight,
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.primary,
              },
            ]}
          >
            <View style={[styles.imageWindow, { backgroundColor: colors.surface }]}>
              <Animated.View
                style={[
                  styles.parallaxImage,
                  { width: cardWidth + 44 },
                  imageParallaxStyle,
                ]}
              >
                <HistoryImage
                  uri={getPrimaryImageRef(item)}
                  style={styles.image}
                  fallbackIcon="image-outline"
                />
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={[styles.imageShade, imageShadeStyle]}
              />
            </View>
          </View>

          <Animated.View
            style={[
              styles.plaque,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.primary,
              },
              plaqueAnimatedStyle,
            ]}
          >
            <Text style={[styles.plaqueTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title || 'Thời kỳ lịch sử'}
            </Text>
            <View style={[styles.plaqueRule, { backgroundColor: colors.secondary }]} />
            <Text style={[styles.plaqueDate, { color: colors.primary }]}>
              {yearLabel}
            </Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function PaginationDot({
  index,
  itemFullWidth,
  scrollX,
}: {
  index: number;
  itemFullWidth: number;
  scrollX: SharedValue<number>;
}) {
  const colors = useThemeColors();
  const inputRange = [
    (index - 1) * itemFullWidth,
    index * itemFullWidth,
    (index + 1) * itemFullWidth,
  ];

  const animatedStyle = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, inputRange, [8, 22, 8], Extrapolation.CLAMP),
    opacity: interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], Extrapolation.CLAMP),
    backgroundColor: interpolateColor(
      scrollX.value,
      inputRange,
      [colors.borderStrong, colors.secondary, colors.borderStrong],
    ),
  }), [colors.borderStrong, colors.secondary, inputRange]);

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export default function PeriodScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<Period>>(null);

  const cardWidth = Math.min(width * 0.78, 380);
  const itemFullWidth = cardWidth + CARD_SPACING;
  const sidePadding = Math.max(0, (width - cardWidth) / 2);
  const galleryHeight = Math.max(430, Math.min(height * 0.62, 590));

  const scrollX = useSharedValue(0);
  const settledIndex = useSharedValue(0);
  const settleRotation = useSharedValue(0);

  const [periods, setPeriods] = useState<Period[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPeriods = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      setPeriods(await getPeriods(isRefresh));
    } catch (err) {
      console.error('❌ Lỗi tải thời kỳ:', err);
      setError('Không thể tải danh sách thời kỳ.\nVui lòng thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPeriods();
  }, [loadPeriods]);

  const updateActiveIndex = useCallback((nextIndex: number) => {
    setActiveIndex(nextIndex);
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: () => {
      cancelAnimation(settleRotation);
      settleRotation.value = 0;
    },
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
    onMomentumEnd: (event) => {
      const nextIndex = Math.max(
        0,
        Math.min(periods.length - 1, Math.round(event.contentOffset.x / itemFullWidth)),
      );
      settledIndex.value = nextIndex;
      settleRotation.value = withSequence(
        withTiming(0.8, { duration: 160, easing: Easing.out(Easing.cubic) }),
        withTiming(-0.4, { duration: 180, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) }),
      );
      runOnJS(updateActiveIndex)(nextIndex);
    },
  }, [itemFullWidth, periods.length, updateActiveIndex]);

  const handleOpenPeriod = useCallback((period: Period) => {
    router.push({
      pathname: '/period-detail/[periodSlug]',
      params: { periodSlug: period.slug ?? period.id },
    });
  }, [router]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Period>) => (
      <PeriodCard
        item={item}
        index={index}
        cardWidth={cardWidth}
        galleryHeight={galleryHeight}
        itemFullWidth={itemFullWidth}
        scrollX={scrollX}
        settledIndex={settledIndex}
        settleRotation={settleRotation}
        isActive={index === activeIndex}
        onFocus={() => {
          listRef.current?.scrollToOffset({
            offset: index * itemFullWidth,
            animated: true,
          });
        }}
        onOpen={() => handleOpenPeriod(item)}
      />
    ),
    [
      activeIndex,
      cardWidth,
      galleryHeight,
      handleOpenPeriod,
      itemFullWidth,
      scrollX,
      settleRotation,
      settledIndex,
    ],
  );

  return (
    <Screen>
      <AppHeader
        title="Thời Kỳ Lịch Sử"
        subtitle="Phòng trưng bày dòng chảy Việt Nam"
        showBack={false}
      />

      {loading ? (
        <LoadingState message="Đang chuẩn bị phòng trưng bày…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadPeriods()} />
      ) : (
        <View style={[styles.galleryArea, { backgroundColor: '#F4EEDC' }]}>
          <Animated.Image
            source={MUSEUM_WALL}
            resizeMode="contain"
            style={styles.wallTexture}
          />
          <View
            pointerEvents="none"
            style={[styles.wallRail, { backgroundColor: colors.primaryDim }]}
          />
          <View
            pointerEvents="none"
            style={[styles.wallBase, { backgroundColor: colors.borderStrong }]}
          />

          <Animated.FlatList
            ref={listRef}
            data={periods}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            horizontal
            snapToInterval={itemFullWidth}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              { paddingHorizontal: sidePadding },
            ]}
            scrollEventThrottle={16}
            onScroll={scrollHandler}
            initialNumToRender={3}
            maxToRenderPerBatch={5}
            windowSize={5}
            getItemLayout={(_, index) => ({
              length: itemFullWidth,
              offset: itemFullWidth * index,
              index,
            })}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadPeriods(true)}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={[styles.emptyWrapper, { width }]}>
                <EmptyState message="Chưa có thời kỳ nào." />
              </View>
            }
          />

          {periods.length > 1 && (
            <View style={styles.dots}>
              {periods.map((period, index) => (
                <PaginationDot
                  key={period.id}
                  index={index}
                  itemFullWidth={itemFullWidth}
                  scrollX={scrollX}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  galleryArea: {
    flex: 1,
    overflow: 'hidden',
  },
  wallTexture: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  wallRail: {
    position: 'absolute',
    left: '-10%',
    right: '-10%',
    top: '18%',
    height: 3,
    opacity: 0.65,
  },
  wallBase: {
    position: 'absolute',
    left: '-10%',
    right: '-10%',
    bottom: 42,
    height: 2,
    opacity: 0.65,
  },
  listContent: {
    alignItems: 'center',
  },
  itemSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkGroup: {
    alignItems: 'center',
  },
  pressArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  hanger: {
    width: '100%',
    height: 34,
    alignItems: 'center',
  },
  pin: {
    position: 'absolute',
    top: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    zIndex: 2,
  },
  wire: {
    position: 'absolute',
    top: 8,
    width: 1,
    height: 43,
    opacity: 0.72,
  },
  wireLeft: {
    marginLeft: -17,
    transform: [{ rotate: '25deg' }],
  },
  wireRight: {
    marginLeft: 17,
    transform: [{ rotate: '-25deg' }],
  },
  activeGlow: {
    position: 'absolute',
    left: -3,
    right: -3,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 9,
    shadowColor: '#B8860B',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
  },
  frame: {
    width: '100%',
    padding: 8,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.26,
    shadowRadius: 8,
    elevation: 6,
  },
  imageWindow: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: BORDER_RADIUS.base,
  },
  parallaxImage: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -22,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#271A12',
  },
  plaque: {
    width: '88%',
    minHeight: 94,
    marginTop: SPACING[3],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  plaqueTitle: {
    fontFamily: 'serif',
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 23,
    textAlign: 'center',
  },
  plaqueRule: {
    width: 38,
    height: 2,
    marginVertical: 5,
  },
  plaqueDate: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
  },
  dots: {
    height: 38,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING[2],
    paddingBottom: SPACING[2],
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  emptyWrapper: {
    minHeight: 360,
    justifyContent: 'center',
  },
});
