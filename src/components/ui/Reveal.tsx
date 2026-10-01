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

/* ——— how a section arrives ———
 * Slow on purpose. The page is a letter, and nothing in it should look like it
 * is in a hurry — every block travels further than it used to, over roughly
 * twice as long, on an ease that spends most of its time decelerating. */

/** How long one block takes to arrive. */
const REVEAL_MS = 1800;
/** How far it travels to get there. */
const REVEAL_DISTANCE = 48;
/** …and how much smaller it starts, so it settles forward as well as up. */
const REVEAL_SCALE = 0.955;
/**
 * Call sites pass a delay in "one step is ~100ms" units, which was right for
 * the old 900ms reveal and is far too tight for this one. Stretching them here
 * keeps every stagger on the page in proportion without touching any of them.
 */
const DELAY_SCALE = 1.7;
/**
 * Almost flat by the end: a long, soft landing with no bounce. The first third
 * covers most of the distance, which is what stops the slower timing reading
 * as sluggish rather than deliberate.
 */
const REVEAL_EASING = Easing.bezier(0.16, 1, 0.3, 1);

const LAYER_HINT =
  Platform.OS === 'web'
    ? ({ willChange: 'transform, opacity' } as unknown as ViewStyle)
    : null;

/**
 * How much of the viewport a section's top must have crossed before it starts.
 *
 * A shade earlier than it used to be. The animation is twice as long now, so
 * it needs to begin a little sooner if it is to be finished by the time the
 * block is properly in front of the reader.
 */
const TRIGGER = 0.95;

/** Which way a block comes in from. */
export type RevealFrom = 'bottom' | 'left' | 'right';

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

/* ——— scroll-linked motion ———
 * `RevealedContext` answers "has this block arrived yet", which is all most of
 * the page needs. A couple of blocks want the scroll position itself — the
 * stacked timeline builds its stack against it — so the offset is published as
 * an `Animated.Value` that can be interpolated without any React work per
 * frame, alongside the height of the window it is being read against. */

export type ScrollMetrics = {
  /**
   * The scroller's `contentOffset.y`, live, as the *page* understands it —
   * which is not always the raw one. Written from JS, so a listener on it is
   * called synchronously and a whole number can be read off it.
   */
  scrollY: Animated.Value;
  /**
   * The same offset again, published straight from the scroll event by
   * `Animated.event` with the native driver.
   *
   * It exists because the two jobs are different and only one of them can be
   * done in JavaScript. Anything that wants to *read* the offset — which frame
   * is showing, whether a section has arrived — needs a number, and gets it
   * from `scrollY`. Anything that wants to *move with* the offset — a stage
   * pinned to the top of the screen, a page held in a stack — must not, because
   * a JS-driven transform is applied a frame after the scroll it is answering,
   * and a lock that lags the thing it is locked to is exactly the judder this
   * page had on a phone.
   *
   * Absent on the web, where there is no native driver and `position: sticky`
   * does the holding without asking JavaScript anything. Callers fall back to
   * `scrollY`.
   */
  scrollYNative?: Animated.Value;
  /** The height of the viewport that offset is measured against. */
  viewportHeight: number;
};

const ScrollMetricsContext = createContext<ScrollMetrics | null>(null);

/**
 * The top of the enclosing `RevealSection`, in scroll-content coordinates.
 *
 * A child's own `onLayout` y is relative to its parent, so a direct child of a
 * section can add the two together and know where it sits in the scroll.
 */
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

/** Null outside a provider — callers are expected to fall back to a timed run. */
export function useScrollMetrics() {
  return useContext(ScrollMetricsContext);
}

/** Null until the enclosing section has laid out. */
export function useSectionTop() {
  return useContext(SectionTopContext);
}

/* ——— where a section actually is, still ———
 *
 * `onLayout` is the cheap answer, and it is the right one until something
 * *above* a section changes size. The letter is exactly that: the scroll is 96
 * pixels of wound paper until the wax is broken and the whole sheet after it,
 * and every section below moves down by the difference.
 *
 * Nothing tells them so. React Native re-runs `onLayout` for a view whose
 * origin moved; the web does not — `react-native-web` reports layout from a
 * `ResizeObserver`, and a view that has only been pushed down the page has not
 * resized. So each section under the letter went on reporting the offset it
 * had while the scroll was still sealed, and the carousel — which reads that
 * offset to know where its span of scrolling begins — started turning frames a
 * letter's height early, with the reader still up in the paragraphs and the
 * photographs a screen and a half below them.
 *
 * So a section is measured again whenever the content it sits in changes
 * height, against the one view that wraps all of them. `measureLayout` answers
 * in that view's coordinates, which are the scroller's own, on both platforms
 * and whatever it was that moved.
 */

type SectionAnchors = {
  /** The view every section's offset is measured against. */
  content: MutableRefObject<ComponentRef<typeof View> | null>;
  /** Registers a section's re-measure. Returns an unsubscribe. */
  watch: (measure: () => void) => () => void;
};

export type SectionAnchorController = {
  /** Handed to `ScrollRevealProvider`. */
  value: SectionAnchors;
  /** Handed to the scroller's `onContentSizeChange`. */
  remeasure: () => void;
};

const SectionAnchorContext = createContext<SectionAnchors | null>(null);

/**
 * How long the content has to hold still before the sections are measured.
 *
 * The unroll animates a height, so the content grows on every frame of it —
 * and a measurement per frame is five sections re-rendering under the one
 * animation on the page that cannot leave the main thread. Trailing only: the
 * offsets are wanted before the reader can scroll to anything that reads them,
 * which is a great deal longer than this, and never mid-spring.
 */
const REMEASURE_QUIET = 160;

/**
 * Keeps every section's offset honest across a layout change above it.
 *
 * Built by the page, handed to `ScrollRevealProvider`, and poked whenever the
 * scroll content changes height. Mirrors `useScrollRevealController`: the
 * controller lives with the scroller that has the news, the value with the
 * sections that need it.
 */
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

/**
 * Wraps the scroll content. `value` is what tells a section it has arrived;
 * `scrollY`/`viewportHeight` are optional and only matter to the handful of
 * blocks that animate against the scroll position itself rather than against a
 * one-shot reveal.
 */
export function ScrollRevealProvider({
  value,
  anchors,
  scrollY,
  scrollYNative,
  viewportHeight,
  children,
}: {
  value: ScrollRevealValue;
  /** From `useSectionAnchors`. Without it a section is measured once, at
   *  layout, and is wrong from the moment anything above it grows. */
  anchors?: SectionAnchors;
  scrollY?: Animated.Value;
  scrollYNative?: Animated.Value;
  viewportHeight?: number;
  children: ReactNode;
}) {
  const inner = (
    <ScrollRevealContext.Provider value={value}>
      <SectionAnchorContext.Provider value={anchors ?? null}>
        {/* The sections' shared origin. It is laid out at the very top of the
            scroll content and stretched to it, so a section's offset inside
            this view is its offset inside the scroller — the same number
            `onLayout` gives, from a view that can be asked at any time rather
            than only when it happens to resize. */}
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

/**
 * Wraps a top-level block of the page. Must be a direct child of the scroll
 * content so `onLayout` reports an offset in content coordinates.
 */
export function RevealSection({
  children,
  style,
  onTop,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Where this section starts inside the scroll — at layout, and again every
   *  time something above it has moved it. */
  onTop?: (y: number) => void;
}) {
  const reveal = useContext(ScrollRevealContext);
  const anchors = useContext(SectionAnchorContext);
  const host = useRef<ComponentRef<typeof View> | null>(null);
  const [top, setTop] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(reveal === null);

  /* Read through a ref so the subscription below is not torn down and rebuilt
     every time the page hands this a fresh arrow, which it does on each of its
     own renders. */
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

  /* …and again whenever the content this sits in changed height, since that is
     the one kind of move `onLayout` will not report. See `useSectionAnchors`. */
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

/**
 * Fades its children in and carries them into place once the enclosing section
 * is revealed.
 *
 * `from` decides the axis. The default lift is the page's ordinary arrival;
 * `left` and `right` are for the rare block that is supposed to travel — pass
 * a `distance` of a screen width and the child comes in off the edge of it.
 */
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
  /** 1 to travel without also settling forward. */
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

  /* Built once per block, not once per render of whatever contains it.
     An `interpolate` is a node in the animated graph rather than a number, so
     writing these inline meant that any state change in the page above —
     the hero leaving the screen, a paragraph of the letter landing, the
     scroll range being remeasured — stood up three fresh nodes for every
     `Reveal` mounted, which is most of the page. Nothing they are built from
     changes while the block is on screen. */
  const motion = useMemo(() => {
    const reach = from === 'left' ? -distance : distance;
    const travel = progress.interpolate({ inputRange: [0, 1], outputRange: [reach, 0] });

    return {
      // Held at nothing for the first breath of the delay-free case too, so
      // a block never flickers in before it has started moving.
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
  /** Takes the content container's shape exactly, so wrapping the sections in
   *  it moves nothing: a column of full-width blocks that still grows to fill
   *  a viewport the page is shorter than. */
  anchor: {
    width: '100%',
    flexGrow: 1,
  },
});
