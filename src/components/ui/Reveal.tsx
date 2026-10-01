import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useReducedMotion } from '@/hooks/useReducedMotion';


const REVEAL_MS = 1800;
const REVEAL_DISTANCE = 48;
const REVEAL_SCALE = 0.955;
const DELAY_SCALE = 1.7;
const REVEAL_EASING = Easing.bezier(0.16, 1, 0.3, 1);

const LAYER_HINT =
  Platform.OS === 'web'
    ? ({ willChange: 'transform, opacity' } as unknown as ViewStyle)
    : null;

const TRIGGER = 0.95;

export type RevealFrom = 'bottom' | 'left' | 'right';

type Watcher = { top: number; fire: () => void };

type ScrollRevealValue = {
  watch: (top: number, fire: () => void) => () => void;
};

export type ScrollRevealController = {
  value: ScrollRevealValue;
  notify: (offset: number) => void;
};

const ScrollRevealContext = createContext<ScrollRevealValue | null>(null);
const RevealedContext = createContext(true);


export type ScrollMetrics = {
  scrollY: Animated.Value;
  scrollYNative?: Animated.Value;
  viewportHeight: number;
};

const ScrollMetricsContext = createContext<ScrollMetrics | null>(null);

const SectionTopContext = createContext<number | null>(null);

export function ScrollMetricsProvider({
  scrollY,
  scrollYNative,
  viewportHeight,
  children,
}: {
  scrollY: Animated.Value;
  scrollYNative?: Animated.Value;
  viewportHeight: number;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ scrollY, scrollYNative, viewportHeight }),
    [scrollY, scrollYNative, viewportHeight],
  );
  return <ScrollMetricsContext.Provider value={value}>{children}</ScrollMetricsContext.Provider>;
}

export function useScrollMetrics() {
  return useContext(ScrollMetricsContext);
}

export function useSectionTop() {
  return useContext(SectionTopContext);
}


type SectionAnchors = {
  content: MutableRefObject<ComponentRef<typeof View> | null>;
  watch: (measure: () => void) => () => void;
};

export type SectionAnchorController = {
  value: SectionAnchors;
  remeasure: () => void;
};

const SectionAnchorContext = createContext<SectionAnchors | null>(null);

const REMEASURE_QUIET = 160;

export function useSectionAnchors(): SectionAnchorController {
  const content = useRef<ComponentRef<typeof View> | null>(null);
  const sections = useRef(new Set<() => void>());
  const quiet = useRef<ReturnType<typeof setTimeout> | null>(null);

  const value = useMemo<SectionAnchors>(
    () => ({
      content,
      watch: (measure) => {
        sections.current.add(measure);
        return () => {
          sections.current.delete(measure);
        };
      },
    }),
    [],
  );

  const remeasure = useCallback(() => {
    if (quiet.current) {
      clearTimeout(quiet.current);
    }
    quiet.current = setTimeout(() => {
      quiet.current = null;
      sections.current.forEach((measure) => measure());
    }, REMEASURE_QUIET);
  }, []);

  useEffect(
    () => () => {
      if (quiet.current) {
        clearTimeout(quiet.current);
      }
    },
    [],
  );

  return useMemo(() => ({ value, remeasure }), [value, remeasure]);
}

export function useScrollRevealController(viewportHeight: number): ScrollRevealController {
  const watchers = useRef(new Set<Watcher>());
  const offset = useRef(0);
  const viewport = useRef(viewportHeight);
  viewport.current = viewportHeight;

  const check = useCallback((watcher: Watcher) => {
    if (offset.current + viewport.current * TRIGGER >= watcher.top) {
      watchers.current.delete(watcher);
      watcher.fire();
      return true;
    }
    return false;
  }, []);

  const value = useMemo<ScrollRevealValue>(
    () => ({
      watch: (top, fire) => {
        const watcher: Watcher = { top, fire };
        if (check(watcher)) {
          return () => undefined;
        }
        watchers.current.add(watcher);
        return () => {
          watchers.current.delete(watcher);
        };
      },
    }),
    [check],
  );

  const notify = useCallback(
    (next: number) => {
      offset.current = next;
      if (watchers.current.size) {
        watchers.current.forEach(check);
      }
    },
    [check],
  );

  return useMemo(() => ({ value, notify }), [value, notify]);
}

export function ScrollRevealProvider({
  value,
  anchors,
  scrollY,
  scrollYNative,
  viewportHeight,
  children,
}: {
  value: ScrollRevealValue;
  anchors?: SectionAnchors;
  scrollY?: Animated.Value;
  scrollYNative?: Animated.Value;
  viewportHeight?: number;
  children: ReactNode;
}) {
  const inner = (
    <ScrollRevealContext.Provider value={value}>
      <SectionAnchorContext.Provider value={anchors ?? null}>
        <View ref={anchors?.content} collapsable={false} style={styles.anchor}>
          {children}
        </View>
      </SectionAnchorContext.Provider>
    </ScrollRevealContext.Provider>
  );

  if (!scrollY || viewportHeight === undefined) {
    return inner;
  }

  return (
    <ScrollMetricsProvider
      scrollY={scrollY}
      scrollYNative={scrollYNative}
      viewportHeight={viewportHeight}>
      {inner}
    </ScrollMetricsProvider>
  );
}

export function RevealSection({
  children,
  style,
  onTop,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onTop?: (y: number) => void;
}) {
  const reveal = useContext(ScrollRevealContext);
  const anchors = useContext(SectionAnchorContext);
  const host = useRef<ComponentRef<typeof View> | null>(null);
  const [top, setTop] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(reveal === null);

  const report = useRef(onTop);
  report.current = onTop;

  const at = useCallback((y: number) => {
    setTop((current) => (current === y ? current : y));
    report.current?.(y);
  }, []);

  useEffect(() => {
    if (top === null || revealed || !reveal) {
      return;
    }
    return reveal.watch(top, () => setRevealed(true));
  }, [top, revealed, reveal]);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      at(event.nativeEvent.layout.y);
    },
    [at],
  );

  useEffect(() => {
    if (!anchors) {
      return;
    }
    return anchors.watch(() => {
      const node = host.current;
      const content = anchors.content.current;
      if (!node || !content) {
        return;
      }
      node.measureLayout(
        content,
        (_x, y) => at(y),
        () => undefined,
      );
    });
  }, [anchors, at]);

  return (
    <View ref={host} collapsable={false} style={style} onLayout={handleLayout}>
      <SectionTopContext.Provider value={top}>
        <RevealedContext.Provider value={revealed}>{children}</RevealedContext.Provider>
      </SectionTopContext.Provider>
    </View>
  );
}

export function Reveal({
  children,
  delay = 0,
  distance = REVEAL_DISTANCE,
  from = 'bottom',
  duration = REVEAL_MS,
  scaleFrom = REVEAL_SCALE,
  style,
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
  from?: RevealFrom;
  duration?: number;
  scaleFrom?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const revealed = useContext(RevealedContext);
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    if (!revealed) {
      return;
    }
    if (reducedMotion) {
      progress.setValue(1);
      setLanded(true);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay: delay * DELAY_SCALE,
      easing: REVEAL_EASING,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) {
        setLanded(true);
      }
    });
    return () => animation.stop();
  }, [revealed, delay, duration, reducedMotion, progress]);

  const motion = useMemo(() => {
    const reach = from === 'left' ? -distance : distance;
    const travel = progress.interpolate({ inputRange: [0, 1], outputRange: [reach, 0] });

    return {
      opacity: progress.interpolate({
        inputRange: [0, 0.42, 1],
        outputRange: [0, 0.72, 1],
      }),
      transform: [
        from === 'bottom' ? { translateY: travel } : { translateX: travel },
        {
          scale: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [scaleFrom, 1],
          }),
        },
      ],
    };
  }, [progress, from, distance, scaleFrom]);

  return (
    <Animated.View style={[motion, landed ? null : LAYER_HINT, style]}>{children}</Animated.View>
  );
}

export function useRevealed() {
  return useContext(RevealedContext);
}

const styles = StyleSheet.create({
  anchor: {
    width: '100%',
    flexGrow: 1,
  },
});
