/**
 * Màn splash / onboarding dạng patriotic collage.
 * Bố cục lấy cảm hứng từ collage Việt Nam, animation nhẹ và trang trọng.
 */

import { useEffect } from 'react';
import {
  ImageSourcePropType,
  ImageStyle,
  Pressable,
  StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Screen } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

const onboardingAssets = {
  flagStreet: require('../../assets/onboarding/flag-street.png'),
  mausoleum: require('../../assets/onboarding/mausoleum.png'),
  hanoiFlagTower: require('../../assets/onboarding/hanoi-flag-tower.png'),
  prideBoard: require('../../assets/onboarding/pride-board.png'),
  vietnamMapFlag: require('../../assets/onboarding/vietnam-map-flag.png'),
  lotus: require('../../assets/onboarding/lotus-flowers.png'),
  brownPaper: require('../../assets/onboarding/parchment-strip.png'),
};

// Chỉnh nhanh motion ở đây.
const ARROW_PULSE_SCALE = 1.08;
const ARROW_PULSE_DURATION = 1200;
const ARROW_PRESS_SCALE = 0.92;
const ARROW_PRESS_DISTANCE = 10;

const LAYER_ASPECT = {
  flagStreet: 981 / 736,
  mausoleum: 421 / 645,
  hanoiFlagTower: 716 / 212,
  prideBoard: 942 / 629,
  vietnamMapFlag: 1508 / 1020,
  lotus: 889 / 733,
  brownPaper: 190 / 491,
};

type AnimatedLayerProps = {
  source: ImageSourcePropType;
  style: StyleProp<ImageStyle>;
  animatedStyle: StyleProp<ImageStyle>;
};

function AnimatedLayer({ source, style, animatedStyle }: AnimatedLayerProps) {
  return (
    <Animated.Image
      source={source}
      resizeMode="contain"
      style={[styles.layerImage, style, animatedStyle]}
    />
  );
}

function CollageBackground() {
  const { width: W, height: H } = useWindowDimensions();

  const backgroundProgress = useSharedValue(0);
  const mausoleumProgress = useSharedValue(0);
  const towerProgress = useSharedValue(0);
  const prideProgress = useSharedValue(0);
  const mapProgress = useSharedValue(0);
  const lotusProgress = useSharedValue(0);
  const brownPaperProgress = useSharedValue(0);

  useEffect(() => {
    // Intro nhẹ: opacity/translate trở về đúng vị trí target sau animation.
    backgroundProgress.value = withTiming(1, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
    mausoleumProgress.value = withDelay(160, withTiming(1, {
      duration: 620,
      easing: Easing.out(Easing.cubic),
    }));
    towerProgress.value = withDelay(240, withTiming(1, {
      duration: 620,
      easing: Easing.out(Easing.cubic),
    }));
    prideProgress.value = withDelay(340, withTiming(1, {
      duration: 620,
      easing: Easing.out(Easing.cubic),
    }));
    lotusProgress.value = withDelay(420, withTiming(1, {
      duration: 620,
      easing: Easing.out(Easing.cubic),
    }));
    brownPaperProgress.value = withDelay(480, withTiming(1, {
      duration: 560,
      easing: Easing.out(Easing.cubic),
    }));
    mapProgress.value = withDelay(520, withTiming(1, {
      duration: 620,
      easing: Easing.out(Easing.cubic),
    }));
  }, [
    backgroundProgress,
    brownPaperProgress,
    lotusProgress,
    mapProgress,
    mausoleumProgress,
    prideProgress,
    towerProgress,
  ]);

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundProgress.value,
    transform: [
      { translateX: interpolate(backgroundProgress.value, [0, 1], [-W * 0.015, 0]) },
      { scale: interpolate(backgroundProgress.value, [0, 1], [1.01, 1]) },
    ],
  }), [W]);

  const mausoleumStyle = useAnimatedStyle(() => ({
    opacity: mausoleumProgress.value,
    transform: [
      { translateY: interpolate(mausoleumProgress.value, [0, 1], [24, 0]) },
    ],
  }));

  const towerStyle = useAnimatedStyle(() => ({
    opacity: towerProgress.value,
    transform: [
      { translateX: interpolate(towerProgress.value, [0, 1], [42, 0]) },
    ],
  }));

  const prideStyle = useAnimatedStyle(() => ({
    opacity: prideProgress.value,
    transform: [
      { translateX: interpolate(prideProgress.value, [0, 1], [-42, 0]) },
    ],
  }));

  const mapStyle = useAnimatedStyle(() => ({
    opacity: mapProgress.value,
    transform: [
      { scale: interpolate(mapProgress.value, [0, 1], [0.92, 1]) },
    ],
  }));

  const lotusStyle = useAnimatedStyle(() => ({
    opacity: lotusProgress.value,
    transform: [
      { translateY: interpolate(lotusProgress.value, [0, 1], [52, 0]) },
    ],
  }));

  const brownPaperStyle = useAnimatedStyle(() => ({
    opacity: brownPaperProgress.value,
    transform: [
      { translateY: interpolate(brownPaperProgress.value, [0, 1], [28, 0]) },
      { scale: interpolate(brownPaperProgress.value, [0, 1], [0.96, 1]) },
    ],
  }));

  const mausoleumWidth = W * 0.66;
  const towerWidth = W * 0.37;
  const prideWidth = W * 0.67;
  const mapWidth = W * 0.32;
  const lotusWidth = W * 0.78;
  const brownPaperWidth = W * 0.66;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.flagStreetClip,
          {
            left: 0,
            top: 0,
            width: W,
            height: H * 0.72,
          },
        ]}
      >
        <Animated.Image
          source={onboardingAssets.flagStreet}
          resizeMode="cover"
          style={[
            styles.flagStreetImage,
            {
              width: W,
              height: Math.max(H * 0.72, W * LAYER_ASPECT.flagStreet),
            },
            backgroundStyle,
          ]}
        />
      </View>

      <AnimatedLayer
        source={onboardingAssets.mausoleum}
        style={{
          left: W * -0.1,
          top: H * 0.39,
          width: mausoleumWidth,
          height: mausoleumWidth * LAYER_ASPECT.mausoleum,
          zIndex: 3,
        }}
        animatedStyle={mausoleumStyle}
      />

      <AnimatedLayer
        source={onboardingAssets.hanoiFlagTower}
        style={{
          right: -W * 0.08,
          top: H * 0.10,
          width: towerWidth,
          height: towerWidth * LAYER_ASPECT.hanoiFlagTower,
          zIndex: 5,
        }}
        animatedStyle={towerStyle}
      />

      <AnimatedLayer
        source={onboardingAssets.prideBoard}
        style={{
          left: -W * 0.04,
          top: H * 0.55,
          width: prideWidth,
          height: prideWidth * LAYER_ASPECT.prideBoard,
          zIndex: 8,
        }}
        animatedStyle={prideStyle}
      />

      <AnimatedLayer
        source={onboardingAssets.lotus}
        style={{
          left: W * 0.30,
          top: H * 0.63,
          width: lotusWidth,
          height: lotusWidth * LAYER_ASPECT.lotus,
          zIndex: 7,
        }}
        animatedStyle={lotusStyle}
      />

      <AnimatedLayer
        source={onboardingAssets.brownPaper}
        style={{
          left: W * 0.37,
          top: H * 0.675,
          width: brownPaperWidth,
          height: brownPaperWidth * LAYER_ASPECT.brownPaper,
          zIndex: 6,
        }}
        animatedStyle={brownPaperStyle}
      />

      <AnimatedLayer
        source={onboardingAssets.vietnamMapFlag}
        style={{
          left: W * 0.51,
          top: H * 0.6,
          width: mapWidth,
          height: mapWidth * LAYER_ASPECT.vietnamMapFlag,
          zIndex: 9,
        }}
        animatedStyle={mapStyle}
      />
    </View>
  );
}

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoading } = useAuth();

  const arrowProgress = useSharedValue(0);
  const arrowPulse = useSharedValue(1);
  const pressScale = useSharedValue(1);
  const arrowShift = useSharedValue(0);

  useEffect(() => {
    // Mũi tên vào sau collage, giữ vai trò CTA duy nhất.
    arrowProgress.value = withDelay(1280, withTiming(1, {
      duration: 560,
      easing: Easing.out(Easing.cubic),
    }, (finished) => {
      if (finished) {
        arrowPulse.value = withRepeat(
          withSequence(
            withTiming(ARROW_PULSE_SCALE, {
              duration: ARROW_PULSE_DURATION,
              easing: Easing.inOut(Easing.sin),
            }),
            withTiming(1, {
              duration: ARROW_PULSE_DURATION,
              easing: Easing.inOut(Easing.sin),
            }),
          ),
          -1,
          false,
        );
      }
    }));
  }, [arrowProgress, arrowPulse]);

  const handleStart = () => {
    if (isLoading) {
      return;
    }

    // Press feedback: icon nhún, mũi tên lướt phải rồi chuyển màn.
    pressScale.value = withSequence(
      withTiming(ARROW_PRESS_SCALE, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) }),
    );
    arrowShift.value = withSequence(
      withTiming(ARROW_PRESS_DISTANCE, {
        duration: 130,
        easing: Easing.out(Easing.cubic),
      }),
      withTiming(0, { duration: 140, easing: Easing.out(Easing.cubic) }),
    );

    setTimeout(() => {
      router.replace('/(tabs)/period');
    }, 250);
  };

  const arrowButtonStyle = useAnimatedStyle(() => ({
    opacity: arrowProgress.value,
    transform: [
      { translateY: interpolate(arrowProgress.value, [0, 1], [24, 0]) },
      {
        scale:
          interpolate(arrowProgress.value, [0, 1], [0.88, 1]) *
          arrowPulse.value *
          pressScale.value,
      },
    ],
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(arrowPulse.value, [1, ARROW_PULSE_SCALE], [0.88, 1]),
    transform: [{ translateX: arrowShift.value }],
  }));

  return (
    <Screen style={styles.container}>
      <CollageBackground />

      <Animated.View
        style={[
          styles.arrowHitArea,
          {
            right: 28,
            bottom: insets.bottom + 28,
          },
          arrowButtonStyle,
        ]}
      >
        <Pressable
          onPress={handleStart}
          hitSlop={10}
          style={styles.arrowPressable}
        >
          <Animated.View style={arrowStyle}>
            <Ionicons
              name="arrow-forward"
              size={52}
              color="#FFFFFF"
              style={styles.arrowIcon}
            />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#D9B97A',
  },
  layerImage: {
    position: 'absolute',
  },
  flagStreetClip: {
    position: 'absolute',
    overflow: 'hidden',
    zIndex: 1,
  },
  flagStreetImage: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  arrowHitArea: {
    position: 'absolute',
    width: 64,
    height: 64,
    zIndex: 30,
  },
  arrowPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
