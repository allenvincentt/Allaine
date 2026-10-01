import { Image } from 'expo-image';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TimelineEntry } from '@/constants/content';
import { DefaultTheme, ITALIC } from '@/constants/defaultTheme';
import { GradientStyles } from '@/constants/gradient';
import { useRevealed, useScrollMetrics, useSectionTop } from '@/components/ui/Reveal';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useResponsive } from '@/hooks/useTheme';

/* ——— "The days I keep re-reading", as a journal ———
 *
 * Five pages, each with a photograph pinned to it and a long entry written
 * beside it, and they stack: a page climbs the screen until it reaches its
 * place — a little further down for each one, so the page beneath always keeps
 * a strip showing — and holds there while the next one comes up over it.
 *
 * The pages are *paper*, not glass. Everything else on this page is frosted,
 * and this was too until it stacked: five translucent sheets laid over one
 * another means every entry reads through every entry above it, and the whole
 * thing turns to soup. A diary is made of opaque pages. So is this.
 */

/* ——— how the holding is done ———
 *
 * On the web, by the browser: `position: sticky`, which the compositor honours
 * without asking JavaScript anything.
 *
 * It is worth saying why, because the obvious version does not work. Holding a
 * page by hand means reading the scroll offset and pushing the page back down
 * by the same amount — but on the web that offset arrives in a scroll event
 * *after* the browser has already painted the new position. One frame of every
 * scroll tick shows the page where it would have been without the push, so a
 * fast wheel throws a held page a hundred pixels up the screen and snaps it
 * back. There is no throttle setting that fixes it; the lag is the event model.
 *
 * Native has no `sticky` and no such lag, so it gets the hand-made version
 * below, driven off the same scroll offset.
 */
const BROWSER = Platform.OS === 'web';

/**
 * How much of a page survives under the one that lands on top of it.
 *
 * Kept tight. Every strip pushes the pages under it further down the screen,
 * and a page has to fit *below* its own resting place to be readable while it
 * is being held there — so the peeks are the budget the writing is paid out
 * of, not a free flourish.
 */
const PEEK_MIN = 62;
const PEEK_MAX = 76;

/** Space above the head row — the head then fills the rest of the peek. */
const PAD_TOP = 16;

/** How far below the top of the screen the first page comes to rest. */
const INSET_MIN = 16;
const INSET_MAX = 34;

/** Slack left under the deepest held page before the stack is called off. */
const TAIL = 10;

/**
 * The smallest screen the stack is worth attempting on at all.
 *
 * Not a phone test — phones stack now, see `restOf`. It is a floor under the
 * arithmetic: below this there is no reading of "hold a page still" that leaves
 * anything on the screen to read, and a landscape phone or a split-screen pane
 * is better off with a plain column.
 */
const STACK_MIN_VIEWPORT = 420;

/** Deck width at which the print moves beside the writing rather than above. */
const SPREAD_AT = 640;

/** The last of the way in: a page is set down this far below its place first. */
const ENTER_RISE = 44;
const ENTER_EASE = Easing.out(Easing.cubic);

/**
 * The entrance curve, baked into a range rather than handed over as an easing.
 *
 * `interpolate` takes an `easing`, but the *native* animated module does not.
 * Its allowlist is the two ranges and the three extrapolation keys; anything
 * else is reported by `validateInterpolation` through `console.error` — a
 * LogBox error in development — and then dropped. So the pages here were
 * paying for the complaint and arriving linearly anyway, because the hold is
 * driven off the natively published offset and every interpolation hung from it
 * goes native with it.
 *
 * Sampling the curve into the range says the same thing in the vocabulary the
 * native node actually has. The interpolation walks straight lines between the
 * samples, which at this many steps is inside a pixel of the real curve for the
 * whole of a page's travel.
 */
const ENTER_STEPS = 12;
const ENTER_CURVE = Array.from({ length: ENTER_STEPS + 1 }, (_, step) => step / ENTER_STEPS);

/** `sticky` is a web-only position; React Native's types stop at `absolute`. */
const stickAt = (top: number): ViewStyle => ({ position: 'sticky', top }) as unknown as ViewStyle;

type TimelineProps = {
  entries: TimelineEntry[];
  style?: StyleProp<ViewStyle>;
};

export function Timeline({ entries, style }: TimelineProps) {
  const { clamp, height: windowHeight } = useResponsive();
  const reducedMotion = useReducedMotion();
  const metrics = useScrollMetrics();
  const sectionTop = useSectionTop();
  const insets = useSafeAreaInsets();

  /** Where the journal sits inside the section, and each page inside it. */
  const [deckOffset, setDeckOffset] = useState<number | null>(null);
  const [deckWidth, setDeckWidth] = useState(0);
  const [boxes, setBoxes] = useState<Record<number, { y: number; height: number }>>({});

  const peek = clamp(PEEK_MIN, 6.4, PEEK_MAX);
  const inset = clamp(INSET_MIN, 2.2, INSET_MAX);
  const gap = clamp(30, 4.5, 64);
  const spread = deckWidth >= SPREAD_AT;
  const viewport = metrics?.viewportHeight ?? windowHeight;

  /**
   * The highest a page may ever be held.
   *
   * The scroller runs full bleed, so offset 0 inside it is the top of the
   * *screen* — behind the clock and the battery, not below them. Everything
   * here is measured from that edge, so the safe area has to be added back or
   * the first page comes to rest under the status bar and the head row it is
   * holding up there, which is the one part of a page that has to survive being
   * covered, is the part the system draws over.
   */
  const ceiling = insets.top + inset;

  /**
   * Where page `index` comes to rest on the screen.
   *
   * Two answers, and which one applies is decided by the page rather than by
   * the device.
   *
   * The first is the journal's: a little further down for each page, so the one
   * beneath always keeps a strip showing. That is the composition, and it holds
   * wherever there is room for it — which on a wide screen is every page, so
   * nothing about the desktop changes.
   *
   * The second is what a page does when there is not. A held page cannot be
   * scrolled, so every pixel of it below the fold is a pixel of the entry
   * nobody will ever read — and on a phone a page is comfortably taller than
   * the whole screen, which is why the stack used to be abandoned there
   * entirely. But a page only has to *stop* somewhere; it does not have to stop
   * at the top. Held with its foot on the bottom of the screen instead, the
   * reader has scrolled through all of it by the time it stops, and it then
   * holds exactly as the others do while the next page climbs over it. Same
   * gesture, same stack, nothing hidden — the peek is what is given up, and it
   * was never on screen to give up.
   *
   * `Math.min` is doing both: the bottom-aligned place is below the journal's
   * one only for a page that fits, and for those it is not chosen.
   *
   * And `Math.max` is the floor under all of it. Bottom-aligning a page taller
   * than the screen puts its top *above* the screen — the taller the page the
   * further above — so the head row climbed behind the status bar and the reader
   * was left with a stack whose top card had no number and no tag on it, sliced
   * off by the system clock. A page is never held higher than the safe area,
   * whatever that costs it at the foot: what is below the fold can still be
   * reached by scrolling on to the next page, and what is behind the status bar
   * cannot be reached at all.
   */
  const restOf = useCallback(
    (index: number) => {
      const ideal = ceiling + index * peek;
      const box = boxes[index];
      if (box === undefined || box.height <= 0) {
        return ideal;
      }
      return Math.max(ceiling, Math.min(ideal, viewport - TAIL - box.height));
    },
    [ceiling, peek, boxes, viewport],
  );

  /**
   * Whether the pages are held at all.
   *
   * Only a measurement stands between here and stacking now: every page has to
   * have reported a height, because that is what decides where each of them
   * stops. This is the *only* thing the browser needs a measurement for —
   * `sticky` does the holding itself, off nothing but a `top`, so a slow layout
   * delays the decision to stack and never the stacking.
   */
  const measured = useMemo(
    () => entries.every((_, index) => (boxes[index]?.height ?? 0) > 0),
    [entries, boxes],
  );

  const stacked =
    !reducedMotion && entries.length > 1 && measured && viewport >= STACK_MIN_VIEWPORT;

  const handleDeckLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, width } = event.nativeEvent.layout;
    setDeckOffset((current) => (current === y ? current : y));
    setDeckWidth((current) => (current === width ? current : width));
  }, []);

  const handlePageLayout = useCallback((index: number, y: number, height: number) => {
    setBoxes((current) => {
      const box = current[index];
      if (box !== undefined && box.y === y && box.height === height) {
        return current;
      }
      return { ...current, [index]: { y, height } };
    });
  }, []);

  /**
   * Native only, this and everything it feeds: where each page sits inside the
   * scroll, so the holding can be done by hand. The browser never gets here.
   */
  const deckTop = sectionTop !== null && deckOffset !== null ? sectionTop + deckOffset : null;

  /**
   * The last geometry handed to each page, kept so a recompute that lands on
   * the same numbers hands back the same *object*.
   *
   * This is what keeps a page from being re-rendered mid-scroll. A page's
   * `motion` — the native interpolations doing the holding — is memoised
   * against its geometry, and replacing the object replaces the nodes: the
   * new transform spends a frame attaching, and for that frame the page rides
   * the raw scroll instead of being held. On a pinned page that is a visible
   * jump over the safe area and an immediate correction — a shake, once per
   * anything that recomputed the deck while the reader was inside it.
   */
  const pageCache = useRef<PageGeometry[]>([]);

  const pages = useMemo(() => {
    if (BROWSER || !stacked || metrics === null || deckTop === null) {
      return null;
    }
    if (entries.some((_, index) => boxes[index] === undefined)) {
      return null;
    }

    /** The scroll offset at which page `index` reaches its resting place. */
    const settles = (index: number) => deckTop + boxes[index].y - restOf(index);

    // Every page stops being held at the same moment, the one where the last
    // page lands, and the finished stack leaves as one piece. The browser's own
    // `sticky` lets them go one at a time as the deck runs out from under them,
    // which is the same idea and a shade softer.
    const releases = settles(entries.length - 1);

    const computed = entries.map((_, index) => {
      const from = settles(index);
      const enterTo = Math.min(deckTop + boxes[index].y - viewport * 0.68, from);
      return {
        from,
        until: releases,
        /** How far this page has to be pushed to stay put until then. */
        hold: Math.max(0, releases - from),
        enterFrom: Math.min(deckTop + boxes[index].y - viewport * 0.94, enterTo - 1),
        enterTo,
      };
    });

    // Same numbers, same object — see `pageCache`.
    const merged = computed.map((geometry, index) => {
      const previous = pageCache.current[index];
      return previous &&
        previous.from === geometry.from &&
        previous.until === geometry.until &&
        previous.hold === geometry.hold &&
        previous.enterFrom === geometry.enterFrom &&
        previous.enterTo === geometry.enterTo
        ? previous
        : geometry;
    });
    pageCache.current = merged;
    return merged;
  }, [stacked, metrics, deckTop, boxes, entries, restOf, viewport]);

  const plateWidth = clamp(180, 20, 250);
  const photoHeight = spread ? plateWidth * 1.16 : Math.min(deckWidth * 0.62, 300);

  return (
    <View style={[styles.deck, style]} onLayout={handleDeckLayout}>
      {entries.map((entry, index) => (
        <JournalPage
          key={entry.title}
          entry={entry}
          index={index}
          stickAtTop={BROWSER && stacked ? restOf(index) : null}
          page={pages ? pages[index] : null}
          /* The native offset where there is one: the hold is a position lock,
             and a lock computed a frame late is a page that shivers against the
             scroll instead of standing still in it. */
          scrollY={metrics?.scrollYNative ?? metrics?.scrollY ?? null}
          onLayout={handlePageLayout}
          peek={peek}
          gap={gap}
          spread={spread}
          plateWidth={plateWidth}
          photoHeight={photoHeight}
          clamp={clamp}
        />
      ))}

      {/* A held page lets go when its container runs out from under it, and the
          container runs out on the very pixel the last page lands — so without
          this the finished stack is coming apart before anyone has seen it
          whole. This buys it a beat with every page in its place.

          It has to be a box with height, not padding on the deck: a sticky box
          is confined to its containing block's *content*, and padding is not
          content. Nobody sees the space — a held stack fills the screen, and
          this is underneath it. */}
      {BROWSER && stacked ? (
        <View pointerEvents="none" style={{ height: (entries.length - 1) * peek }} />
      ) : null}
    </View>
  );
}

type PageGeometry = {
  from: number;
  until: number;
  hold: number;
  enterFrom: number;
  enterTo: number;
};

/**
 * The print, and only the print, listens for the section's reveal.
 *
 * The prints wait for the section: mounted with the page, every photograph
 * was a decoded bitmap held from the first frame for a journal five screens
 * below the reader — memory a squeezed device pays back in collection pauses
 * the whole page feels. The plate keeps its size either way (`window` has its
 * own height and background), and the section reveals at 95% of a viewport
 * away, so the print is decoding while the page is still travelling in.
 *
 * It is its own component, deliberately. Subscribing the *page* to the reveal
 * re-rendered it at the exact moment it was arriving on screen — and a
 * re-render of the view carrying the hold's native transform spends a frame
 * re-attaching it, during which the page rides the raw scroll: a jump over
 * the safe area and an immediate correction, felt as the stack shaking.
 * A leaf can re-render without the pinned page above it noticing.
 */
const JournalPrint = memo(function JournalPrint({
  photo,
  height,
}: {
  photo: TimelineEntry['photo'];
  height: number;
}) {
  const revealed = useRevealed();

  return (
    <View style={[styles.window, { height }]}>
      {revealed ? (
        <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={320} />
      ) : null}
    </View>
  );
});

/**
 * Memoised against everything, and everything it takes is stable: the entry
 * is a constant, the geometry keeps its identity while its numbers do — see
 * `pageCache` — and the rest are numbers and stable callbacks. So nothing
 * that happens elsewhere on the page while the reader is inside the stack —
 * a sibling measuring, a section below revealing — can re-render a page
 * whose own hold has not changed, which is what keeps the pin attached.
 */
const JournalPage = memo(function JournalPage({
  entry,
  index,
  stickAtTop,
  page,
  scrollY,
  onLayout,
  peek,
  gap,
  spread,
  plateWidth,
  photoHeight,
  clamp,
}: {
  entry: TimelineEntry;
  index: number;
  /** Web: the page's resting place, handed straight to `position: sticky`. */
  stickAtTop: number | null;
  /** Native: everything needed to hold the page there by hand instead. */
  page: PageGeometry | null;
  scrollY: Animated.Value | null;
  onLayout: (index: number, y: number, height: number) => void;
  peek: number;
  gap: number;
  spread: boolean;
  plateWidth: number;
  photoHeight: number;
  clamp: (min: number, vw: number, max: number) => number;
}) {
  const motion = useMemo(() => {
    if (page === null || scrollY === null) {
      return null;
    }

    const arrival = scrollY.interpolate({
      inputRange: ENTER_CURVE.map(
        (step) => page.enterFrom + (page.enterTo - page.enterFrom) * step,
      ),
      outputRange: ENTER_CURVE.map((step) => ENTER_EASE(step)),
      extrapolate: 'clamp',
    });

    // Linear, and deliberately so — this one is a position lock, not an
    // animation. An eased push would slide the page against the scroll.
    const push = scrollY.interpolate({
      inputRange: page.hold > 0 ? [page.from, page.until] : [0, 1],
      outputRange: [0, page.hold],
      extrapolate: 'clamp',
    });

    return {
      opacity: arrival.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.92, 1] }),
      transform: [
        { translateY: push },
        { translateY: arrival.interpolate({ inputRange: [0, 1], outputRange: [ENTER_RISE, 0] }) },
      ],
    };
  }, [page, scrollY]);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      onLayout(index, y, height);
    },
    [onLayout, index],
  );

  /* Prints go into a diary at whatever angle the hand that stuck them there
     happened to hold them. Alternating is enough to read as careless. */
  const tilt = index % 2 === 0 ? '-1.7deg' : '1.4deg';
  const titleSize = clamp(26, 3.4, 34);
  const bodySize = clamp(17, 2.1, 19.5);
  const indexSize = clamp(26, 2.8, 34);

  return (
    <Animated.View
      onLayout={handleLayout}
      style={[
        styles.page,
        { zIndex: index, marginTop: index === 0 ? 0 : gap },
        stickAtTop === null ? null : stickAt(stickAtTop),
        motion,
      ]}>
      <View
        style={[
          styles.sheet,
          entry.highlight ? styles.sheetToday : styles.sheetPaper,
          { paddingHorizontal: clamp(22, 2.8, 32), paddingBottom: clamp(20, 2.4, 28) },
        ]}>
        {/* The head is exactly as tall as the peek, so what survives under the
            next page is this row and nothing else — never half a heading. */}
        <View style={[styles.head, { height: peek - PAD_TOP }]}>
          <Text
            style={[
              styles.index,
              entry.highlight && styles.indexToday,
              { fontSize: indexSize, lineHeight: indexSize * 1.08 },
            ]}>
            {String(index + 1).padStart(2, '0')}
          </Text>

          <View style={[styles.tag, entry.highlight && styles.tagToday]}>
            <Text style={[styles.tagText, entry.highlight && styles.tagTextToday]}>
              {entry.tag}
            </Text>
          </View>
        </View>

        <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.18 }]}>
          {entry.title}
        </Text>

        <View style={[styles.spread, spread && styles.spreadWide, { gap: spread ? 26 : 22 }]}>
          <View
            style={[
              styles.plate,
              spread ? { width: plateWidth } : styles.plateFull,
              { transform: [{ rotate: tilt }] },
            ]}>
            <View style={styles.print}>
              <JournalPrint photo={entry.photo} height={photoHeight} />
              <Text style={styles.printCaption} numberOfLines={2}>
                {entry.caption}
              </Text>
            </View>
          </View>

          <View style={styles.column}>
            <Text
              style={[
                styles.body,
                entry.highlight && styles.bodyToday,
                { fontSize: bodySize, lineHeight: bodySize * 1.74 },
              ]}>
              {entry.body}
            </Text>

            <Text
              style={[
                styles.note,
                entry.highlight && styles.noteToday,
                { fontSize: clamp(19, 2.3, 24) },
              ]}>
              {entry.note}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  deck: {
    width: '100%',
  },
  page: {
    width: '100%',
  },
  /**
   * The shadow is thrown *upward* on purpose. Every page comes to rest below
   * the one before it and covers its body, so the only edge the reader ever
   * sees is the top one — and that is the edge that has to look like paper
   * lying on paper.
   */
  sheet: {
    paddingTop: PAD_TOP,
    borderRadius: 26,
    borderWidth: 1,
    shadowColor: '#96193C',
    shadowOpacity: 0.32,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -12 },
    elevation: 10,
  },
  /**
   * Warm white stock, and a rose hairline where a glass card would have had a
   * white one — on paper this pale, a white edge is no edge at all.
   *
   * `backgroundColor` under the ramp is not belt and braces: it is the fill
   * anywhere the gradient does not land, and it is what guarantees the page is
   * opaque even if the ramp is dropped.
   */
  sheetPaper: {
    backgroundColor: DefaultTheme.colors.surface,
    ...GradientStyles.paper,
    borderColor: 'rgba(226, 44, 86, 0.14)',
  },
  /** The last page, on rose stock rather than white. */
  sheetToday: {
    backgroundColor: DefaultTheme.colors.surfaceMuted,
    ...GradientStyles.label,
    borderColor: 'rgba(226, 44, 86, 0.26)',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: DefaultTheme.colors.hairline,
  },
  index: {
    fontFamily: DefaultTheme.fonts.displayRegular,
    letterSpacing: 1,
    color: DefaultTheme.colors.labelSoft,
  },
  indexToday: {
    color: DefaultTheme.colors.primary,
  },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(226, 44, 86, 0.1)',
  },
  tagToday: {
    backgroundColor: DefaultTheme.colors.primary,
  },
  tagText: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 10.5,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: DefaultTheme.colors.label,
  },
  tagTextToday: {
    color: DefaultTheme.colors.white,
  },
  title: {
    marginTop: 14,
    marginBottom: 16,
    fontFamily: DefaultTheme.fonts.displayRegular,
    color: DefaultTheme.colors.ink,
  },

  /* the page itself: a print, and the writing next to it */
  spread: {
    flexDirection: 'column',
  },
  spreadWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  plate: {
    alignSelf: 'flex-start',
  },
  /** Narrow: the print goes above the writing, with room either side for the
   *  tilt to lean into rather than push past the edge of the page. */
  plateFull: {
    alignSelf: 'stretch',
    marginHorizontal: 8,
  },
  /** A photographic print: paper border all round, a deeper one at the foot
   *  for the caption, and a shadow that says it is lying on top of the page.
   *  Pure white, a shade brighter than the stock, so it reads as a separate
   *  piece of paper rather than a panel printed on this one. */
  print: {
    padding: 9,
    paddingBottom: 12,
    borderRadius: 5,
    backgroundColor: DefaultTheme.colors.white,
    shadowColor: '#96193C',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  window: {
    width: '100%',
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: DefaultTheme.colors.surfaceTint,
  },
  printCaption: {
    marginTop: 10,
    fontFamily: DefaultTheme.fonts.displayItalicRegular,
    fontStyle: ITALIC,
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'center',
    color: DefaultTheme.colors.label,
  },
  column: {
    flex: 1,
  },
  body: {
    fontFamily: DefaultTheme.fonts.display,
    color: DefaultTheme.colors.inkSoft,
  },
  bodyToday: {
    color: DefaultTheme.colors.ink,
  },
  /** The line written across the foot of the page after the fact. */
  note: {
    marginTop: 18,
    fontFamily: DefaultTheme.fonts.script,
    textAlign: 'right',
    color: DefaultTheme.colors.accent,
  },
  noteToday: {
    color: DefaultTheme.colors.primaryDark,
  },
});
