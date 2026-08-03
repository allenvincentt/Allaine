import {
  Fragment,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

const COLORS = ['#FF7FB0', '#E22C56', '#FFB3CE', '#FFD9A8', '#FFFFFF', '#B3123A'];

/** Fewer bodies on device than in a desktop browser. */
const DENSITY = Platform.OS === 'web' ? 1 : 0.6;

type Kind = 'heart' | 'strip' | 'petal';

type Particle = {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  kind: Kind;
  duration: number;
  offsetsX: number[];
  offsetsY: number[];
  rotation: number;
  inputRange: number[];
};

type Batch = { id: number; particles: Particle[] };

export type HeartConfettiHandle = {
  /** A small burst at a touch point. */
  pop: (x: number, y: number, count?: number, scale?: number) => void;
  /** The full "she said yes" moment: two side cannons plus falling rain. */
  celebrate: () => void;
};

const SAMPLES = 12;

/**
 * Ports the canvas particle system from the web original. Each body's
 * trajectory is integrated once up front with the same per-frame rules
 * (gravity plus drag), then sampled into an interpolation so the whole flight
 * can run on the native driver as a single animation.
 */
function buildParticle(
  id: string,
  x: number,
  y: number,
  vx: number,
  vy: number,
  scale: number,
): Particle {
  const gravity = 0.11 + Math.random() * 0.06;
  const life = Math.round(120 + Math.random() * 110);

  const offsetsX: number[] = [];
  const offsetsY: number[] = [];
  const inputRange: number[] = [];

  let px = 0;
  let py = 0;
  let velocityX = vx;
  let velocityY = vy;
  const step = Math.max(1, Math.floor(life / SAMPLES));

  for (let frame = 0; frame <= life; frame += 1) {
    if (frame % step === 0 || frame === life) {
      inputRange.push(frame / life);
      offsetsX.push(px);
      offsetsY.push(py);
    }
    velocityY += gravity;
    velocityX *= 0.992;
    velocityY *= 0.992;
    px += velocityX;
    py += velocityY;
  }

  return {
    id,
    x,
    y,
    size: (10 + Math.random() * 18) * scale,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    kind: (['heart', 'strip', 'petal'] as const)[Math.floor(Math.random() * 3)],
    duration: (life / 60) * 1000,
    offsetsX,
    offsetsY,
    rotation: (Math.random() - 0.5) * 720,
    inputRange,
  };
}

export const HeartConfetti = forwardRef<HeartConfettiHandle>(function HeartConfetti(_props, ref) {
  const { width, height } = useWindowDimensions();
  const [batches, setBatches] = useState<Batch[]>([]);
  const nextBatchId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervals = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      intervals.current.forEach(clearInterval);
    },
    [],
  );

  const emit = useCallback((particles: Particle[]) => {
    if (!particles.length) {
      return;
    }

    const id = nextBatchId.current;
    nextBatchId.current += 1;
    setBatches((current) => [...current, { id, particles }]);

    const lifetime = Math.max(...particles.map((particle) => particle.duration)) + 120;
    const timer = setTimeout(() => {
      setBatches((current) => current.filter((batch) => batch.id !== id));
    }, lifetime);
    timers.current.push(timer);
  }, []);

  const pop = useCallback<HeartConfettiHandle['pop']>(
    (x, y, count = 9, scale = 0.8) => {
      const total = Math.max(3, Math.round(count * DENSITY));
      const particles = Array.from({ length: total }, (_, index) => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        return buildParticle(
          `pop-${nextBatchId.current}-${index}`,
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed - 2.5,
          scale * 0.75,
        );
      });
      emit(particles);
    },
    [emit],
  );

  const celebrate = useCallback(() => {
    const perCannon = Math.round(34 * DENSITY);

    [0, 1].forEach((side) => {
      const originX = side ? width + 20 : -20;
      const particles = Array.from({ length: perCannon }, (_, index) => {
        const speed = 12 + Math.random() * 16;
        const angle = (side ? Math.PI : 0) + (Math.random() - 0.5) * 0.85 - 0.5;
        return buildParticle(
          `cannon-${side}-${nextBatchId.current}-${index}`,
          originX,
          height * (0.72 + Math.random() * 0.2),
          Math.cos(angle) * speed,
          Math.sin(angle) * speed - 6,
          1,
        );
      });
      emit(particles);
    });

    let ticks = 0;
    const perTick = Math.max(3, Math.round(7 * DENSITY));
    const rain = setInterval(() => {
      const particles = Array.from({ length: perTick }, (_, index) =>
        buildParticle(
          `rain-${nextBatchId.current}-${index}`,
          Math.random() * width,
          -30,
          (Math.random() - 0.5) * 2.4,
          1 + Math.random() * 2.5,
          0.95,
        ),
      );
      emit(particles);
      ticks += 1;
      if (ticks > 18) {
        clearInterval(rain);
      }
    }, 190);
    intervals.current.push(rain);
  }, [emit, height, width]);

  useImperativeHandle(ref, () => ({ pop, celebrate }), [pop, celebrate]);

  return (
    <View pointerEvents="none" style={styles.root}>
      {batches.map((batch) => (
        <Fragment key={batch.id}>
          {batch.particles.map((particle) => (
            <Body key={particle.id} particle={particle} />
          ))}
        </Fragment>
      ))}
    </View>
  );
});

function Body({ particle }: { particle: Particle }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: particle.duration,
      easing: Easing.linear,
      isInteraction: false,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, particle.duration]);

  const transform = [
    {
      translateX: progress.interpolate({
        inputRange: particle.inputRange,
        outputRange: particle.offsetsX,
      }),
    },
    {
      translateY: progress.interpolate({
        inputRange: particle.inputRange,
        outputRange: particle.offsetsY,
      }),
    },
    {
      rotate: progress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', `${particle.rotation}deg`],
      }),
    },
  ];

  const opacity = progress.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 1, 0],
  });

  if (particle.kind === 'heart') {
    return (
      <Animated.View
        style={[styles.body, { left: particle.x, top: particle.y, opacity, transform }]}>
        <Text
          style={{
            fontSize: particle.size,
            lineHeight: particle.size * 1.15,
            color: particle.color,
          }}>
          ♥
        </Text>
      </Animated.View>
    );
  }

  if (particle.kind === 'strip') {
    return (
      <Animated.View
        style={[
          styles.body,
          {
            left: particle.x,
            top: particle.y,
            width: particle.size * 0.64,
            height: particle.size * 1.1,
            backgroundColor: particle.color,
            borderRadius: 2,
            opacity,
            transform,
          },
        ]}
      />
    );
  }

  return (
    <Animated.View
      style={[
        styles.body,
        {
          left: particle.x,
          top: particle.y,
          width: particle.size * 1.24,
          height: particle.size * 0.68,
          backgroundColor: particle.color,
          borderRadius: particle.size,
          opacity,
          transform,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    zIndex: 120,
  },
  body: {
    position: 'absolute',
  },
});
