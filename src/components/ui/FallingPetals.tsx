import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';

import { DefaultTheme } from '@/constants/defaultTheme';
import { gradientStyle } from '@/constants/gradient';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const SPARKLE_GLOW = gradientStyle(
  'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 26%, rgba(255,255,255,0.16) 52%, rgba(255,255,255,0) 74%)',
);

const SPARKLE_GLOW_SCALE = 5;

const TINTS = [
  DefaultTheme.colors.primaryLight,
  '#FFC2D6',
  DefaultTheme.colors.primary,
  DefaultTheme.colors.warm,
];

type Petal = {
  cycle: number;
  left: number;
  size: number;
  sway: number;
  spin: number;
  duration: number;
  opacity: number;
  tint: string;
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

const FallingPetal = memo(function FallingPetal({
  width,
  travel,
}: {
  width: number;
  travel: number;
}) {
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

  const motion = useMemo(
    () => ({
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
    }),
    [petal, progress, travel],
  );

  return (
    <Animated.View
      renderToHardwareTextureAndroid
      style={[styles.petal, motion]}
    />
  );
});

const Twinkle = memo(function Twinkle({ width, height }: { width: number; height: number }) {
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

  const motion = useMemo(() => {
    const halo = sparkle.size * SPARKLE_GLOW_SCALE;
    return {
      box: {
        left: sparkle.left - halo / 2,
        top: sparkle.top - halo / 2,
        width: halo,
        height: halo,
        borderRadius: halo / 2,
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
      core: {
        width: sparkle.size,
        height: sparkle.size,
        borderRadius: sparkle.size / 2,
      },
    };
  }, [sparkle, progress]);

  return (
    <Animated.View
      pointerEvents="none"
      renderToHardwareTextureAndroid
      style={[styles.sparkle, motion.box]}>
      <View style={[styles.sparkleCore, motion.core]} />
    </Animated.View>
  );
});

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
    alignItems: 'center',
    justifyContent: 'center',
    ...SPARKLE_GLOW,
  },
  sparkleCore: {
    backgroundColor: '#FFFFFF',
  },
});
