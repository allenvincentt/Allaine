import { useEffect, useMemo, useRef, useState } from 'react';
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
  /** Bumped on every reseed; this is what restarts the fall. */
  cycle: number;
  left: number;
  size: number;
  sway: number;
  spin: number;
  duration: number;
  opacity: number;
  tint: string;
  /** Where in its fall this petal begins — only ever non-zero on the first. */
  start: number;
};

type Sparkle = {
  cycle: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  start: number;
};

function petalSeed(cycle: number, width: number, mid: boolean): Petal {
  return {
    cycle,
    left: Math.random() * width,
    size: 10 + Math.random() * 16,
    sway: Math.random() * 150 - 75,
    spin: (400 + Math.random() * 380) * (Math.random() < 0.35 ? -1 : 1),
    duration: (9 + Math.random() * 10) * 1000,
    opacity: 0.22 + Math.random() * 0.4,
    tint: TINTS[Math.floor(Math.random() * TINTS.length)],
    start: mid ? Math.random() : 0,
  };
}

function sparkleSeed(cycle: number, width: number, height: number, mid: boolean): Sparkle {
  return {
    cycle,
    left: Math.random() * width,
    top: Math.random() * height,
    size: 2 + Math.random() * 3,
    duration: (2.4 + Math.random() * 4) * 1000,
    start: mid ? Math.random() : 0,
  };
}

/**
 * The ambient layer: petals drifting past while they turn, over a field of
 * sparkles on their own clocks.
 *
 * Every petal reseeds itself the instant it leaves the bottom of the screen —
 * new lane, size, speed, spin and drift — and starts again from above the top,
 * so the fall never runs out and never repeats. The first generation starts
 * part-way down so the screen is already full on the first frame instead of
 * filling up over the opening seven seconds.
 */
export function FallingPetals() {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const compact = width < 640;

  const petalCount = compact ? 22 : 34;
  const sparkleCount = compact ? 18 : 26;

  const petals = useMemo(
    () => Array.from({ length: petalCount }, (_, index) => `petal-${index}`),
    [petalCount],
  );
  const sparkles = useMemo(
    () => Array.from({ length: sparkleCount }, (_, index) => `sparkle-${index}`),
    [sparkleCount],
  );

  if (reducedMotion) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.root}>
      {petals.map((key) => (
        <FallingPetal key={key} width={width} travel={height * 1.24} />
      ))}
      {sparkles.map((key) => (
        <Twinkle key={key} width={width} height={height} />
      ))}
    </View>
  );
}

function FallingPetal({ width, travel }: { width: number; travel: number }) {
  /* Read through refs so a window resize retunes the *next* fall instead of
     snapping every petal on screen back to the top. */
  const box = useRef({ width, travel });
  box.current = { width, travel };

  const [petal, setPetal] = useState<Petal>(() => petalSeed(0, width, true));
  const progress = useRef(new Animated.Value(petal.start)).current;

  useEffect(() => {
    let alive = true;
    progress.setValue(petal.start);

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: Math.max(600, petal.duration * (1 - petal.start)),
      easing: Easing.linear,
      isInteraction: false,
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished && alive) {
        setPetal((previous) => petalSeed(previous.cycle + 1, box.current.width, false));
      }
    });

    return () => {
      alive = false;
      animation.stop();
    };
  }, [petal, progress]);

  return (
    <Animated.View
      style={[
        styles.petal,
        {
          left: petal.left,
          width: petal.size,
          height: petal.size,
          borderTopLeftRadius: petal.size * 0.52,
          borderTopRightRadius: petal.size * 0.08,
          borderBottomRightRadius: petal.size * 0.52,
          borderBottomLeftRadius: petal.size * 0.52,
          ...gradientStyle(
            `linear-gradient(106deg, ${petal.tint} 0%, ${DefaultTheme.colors.primarySoft} 100%)`,
          ),
          // Fading in and out at the ends is what hides the seam: a petal is
          // never visible at the moment it is recycled.
          opacity: progress.interpolate({
            inputRange: [0, 0.07, 0.88, 1],
            outputRange: [0, petal.opacity, petal.opacity, 0],
          }),
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [-travel * 0.12, travel],
              }),
            },
            {
              // An S through the air rather than a straight diagonal.
              translateX: progress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, petal.sway, petal.sway * 0.34],
              }),
            },
            {
              rotate: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', `${petal.spin}deg`],
              }),
            },
          ],
        },
      ]}
    />
  );
}

function Twinkle({ width, height }: { width: number; height: number }) {
  const box = useRef({ width, height });
  box.current = { width, height };

  const [sparkle, setSparkle] = useState<Sparkle>(() => sparkleSeed(0, width, height, true));
  const progress = useRef(new Animated.Value(sparkle.start)).current;

  useEffect(() => {
    let alive = true;
    progress.setValue(sparkle.start);

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: Math.max(400, sparkle.duration * (1 - sparkle.start)),
      easing: Easing.inOut(Easing.ease),
      isInteraction: false,
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished && alive) {
        setSparkle((previous) =>
          sparkleSeed(previous.cycle + 1, box.current.width, box.current.height, false),
        );
      }
    });

    return () => {
      alive = false;
      animation.stop();
    };
  }, [sparkle, progress]);

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
