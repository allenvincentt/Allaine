import { useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';

import { DefaultTheme } from '@/constants/defaultTheme';
import { gradientStyle } from '@/constants/gradient';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const TINTS = [
  DefaultTheme.colors.primaryLight,
  '#FFC2D6',
  DefaultTheme.colors.primary,
  DefaultTheme.colors.warm,
];

type Petal = {
  key: string;
  left: number;
  size: number;
  sway: number;
  duration: number;
  delay: number;
  opacity: number;
  tint: string;
};

type Sparkle = {
  key: string;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
};

/**
 * The `ambfall` + `twinkle` ambient layer: petals drifting from above the
 * viewport to below it while rotating one and a half turns, over a field of
 * sparkles that fade in and out on their own clocks.
 */
export function FallingPetals() {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const compact = width < 640;

  const petals = useMemo<Petal[]>(() => {
    const count = compact ? 22 : 34;
    // Stagger start times evenly across the window instead of pure random
    // delays, which by chance can clump and leave the screen looking empty.
    const stagger = 7000 / count;
    return Array.from({ length: count }, (_, index) => ({
      key: `petal-${index}`,
      left: Math.random() * width,
      size: 10 + Math.random() * 16,
      sway: Math.random() * 140 - 70,
      duration: (9 + Math.random() * 10) * 1000,
      delay: index * stagger + Math.random() * stagger,
      opacity: 0.22 + Math.random() * 0.4,
      tint: TINTS[index % TINTS.length],
    }));
  }, [compact, width]);

  const sparkles = useMemo<Sparkle[]>(() => {
    const count = compact ? 18 : 26;
    return Array.from({ length: count }, (_, index) => ({
      key: `sparkle-${index}`,
      left: Math.random() * width,
      top: Math.random() * height,
      size: 2 + Math.random() * 3,
      duration: (2.4 + Math.random() * 4) * 1000,
      delay: Math.random() * 6000,
    }));
  }, [compact, width, height]);

  if (reducedMotion) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.root}>
      {petals.map((petal) => (
        <FallingPetal key={petal.key} petal={petal} travel={height * 1.24} />
      ))}
      {sparkles.map((sparkle) => (
        <Twinkle key={sparkle.key} sparkle={sparkle} />
      ))}
    </View>
  );
}

function useLoopedProgress(duration: number, delay: number, easing = Easing.linear) {
  const progress = useRef(new Animated.Value(0)).current;
  const started = useRef(false);

  if (!started.current) {
    started.current = true;
    Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.timing(progress, {
          toValue: 1,
          duration,
          easing,
          isInteraction: false,
          useNativeDriver: true,
        }),
      ),
    ]).start();
  }

  return progress;
}

function FallingPetal({ petal, travel }: { petal: Petal; travel: number }) {
  const progress = useLoopedProgress(petal.duration, petal.delay);

  return (
    <Animated.View
      style={[
        styles.petal,
        {
          left: petal.left,
          width: petal.size,
          height: petal.size,
          opacity: petal.opacity,
          borderTopLeftRadius: petal.size * 0.52,
          borderTopRightRadius: petal.size * 0.08,
          borderBottomRightRadius: petal.size * 0.52,
          borderBottomLeftRadius: petal.size * 0.52,
          ...gradientStyle(
            `linear-gradient(106deg, ${petal.tint} 0%, ${DefaultTheme.colors.primarySoft} 100%)`,
          ),
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [-travel * 0.1, travel],
              }),
            },
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, petal.sway],
              }),
            },
            {
              rotate: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '540deg'],
              }),
            },
          ],
        },
      ]}
    />
  );
}

function Twinkle({ sparkle }: { sparkle: Sparkle }) {
  const progress = useLoopedProgress(sparkle.duration, sparkle.delay, Easing.inOut(Easing.ease));

  return (
    <Animated.View
      style={[
        styles.sparkle,
        {
          left: sparkle.left,
          top: sparkle.top,
          width: sparkle.size,
          height: sparkle.size,
          borderRadius: sparkle.size / 2,
          opacity: progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 1, 0],
          }),
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.4, 1, 0.4],
              }),
            },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    zIndex: 3,
  },
  petal: {
    position: 'absolute',
    top: 0,
  },
  sparkle: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
