import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  Easing,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Watcher = { top: number; fire: () => void };

type ScrollRevealValue = {
  /** Returns an unsubscribe. Fires once the row is 14% inside the viewport. */
  watch: (top: number, fire: () => void) => () => void;
};

export type ScrollRevealController = {
  value: ScrollRevealValue;
  /** Feed this the scroll offset; it is cheap and does no React work. */
  notify: (offset: number) => void;
};

const ScrollRevealContext = createContext<ScrollRevealValue | null>(null);
const RevealedContext = createContext(true);

/**
 * The `IntersectionObserver` reveal from the web original. Sections register
 * their offset inside the scroll content and are told once when they cross the
 * threshold — no per-frame React state, so scrolling stays cheap.
 */
export function useScrollRevealController(viewportHeight: number): ScrollRevealController {
  const watchers = useRef(new Set<Watcher>());
  const offset = useRef(0);
  const viewport = useRef(viewportHeight);
  viewport.current = viewportHeight;

  const check = useCallback((watcher: Watcher) => {
    if (offset.current + viewport.current * 0.86 >= watcher.top) {
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
  children,
}: {
  value: ScrollRevealValue;
  children: ReactNode;
}) {
  return <ScrollRevealContext.Provider value={value}>{children}</ScrollRevealContext.Provider>;
}

/**
 * Wraps a top-level block of the page. Must be a direct child of the scroll
 * content so `onLayout` reports an offset in content coordinates.
 */
export function RevealSection({
  children,
  style,
  onLayout,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const reveal = useContext(ScrollRevealContext);
  const [top, setTop] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(reveal === null);

  useEffect(() => {
    if (top === null || revealed || !reveal) {
      return;
    }
    return reveal.watch(top, () => setRevealed(true));
  }, [top, revealed, reveal]);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setTop(event.nativeEvent.layout.y);
      onLayout?.(event);
    },
    [onLayout],
  );

  return (
    <View style={style} onLayout={handleLayout}>
      <RevealedContext.Provider value={revealed}>{children}</RevealedContext.Provider>
    </View>
  );
}

/** Fades and lifts its children once the enclosing section is revealed. */
export function Reveal({
  children,
  delay = 0,
  distance = 26,
  style,
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const revealed = useContext(RevealedContext);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!revealed) {
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 900,
      delay,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [revealed, delay, progress]);

  return (
    <Animated.View
      style={[
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
        style,
      ]}>
      {children}
    </Animated.View>
  );
}

export function useRevealed() {
  return useContext(RevealedContext);
}
