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


const BROWSER = Platform.OS === 'web';

const PEEK_MIN = 62;
const PEEK_MAX = 76;

const PAD_TOP = 16;

const INSET_MIN = 16;
const INSET_MAX = 34;

const TAIL = 10;

const STACK_MIN_VIEWPORT = 420;

const SPREAD_AT = 640;

const ENTER_RISE = 44;
const ENTER_EASE = Easing.out(Easing.cubic);

const ENTER_STEPS = 12;
const ENTER_CURVE = Array.from({ length: ENTER_STEPS + 1 }, (_, step) => step / ENTER_STEPS);

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

  const [deckOffset, setDeckOffset] = useState<number | null>(null);
  const [deckWidth, setDeckWidth] = useState(0);
  const [boxes, setBoxes] = useState<Record<number, { y: number; height: number }>>({});

  const peek = clamp(PEEK_MIN, 6.4, PEEK_MAX);
  const inset = clamp(INSET_MIN, 2.2, INSET_MAX);
  const gap = clamp(30, 4.5, 64);
  const spread = deckWidth >= SPREAD_AT;
  const viewport = metrics?.viewportHeight ?? windowHeight;

  const ceiling = insets.top + inset;

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

  const deckTop = sectionTop !== null && deckOffset !== null ? sectionTop + deckOffset : null;

  const pageCache = useRef<PageGeometry[]>([]);

  const pages = useMemo(() => {
    if (BROWSER || !stacked || metrics === null || deckTop === null) {
      return null;
    }
    if (entries.some((_, index) => boxes[index] === undefined)) {
      return null;
    }

    const settles = (index: number) => deckTop + boxes[index].y - restOf(index);

    const releases = settles(entries.length - 1);

    const computed = entries.map((_, index) => {
      const from = settles(index);
      const enterTo = Math.min(deckTop + boxes[index].y - viewport * 0.68, from);
      return {
        from,
        until: releases,
        hold: Math.max(0, releases - from),
        enterFrom: Math.min(deckTop + boxes[index].y - viewport * 0.94, enterTo - 1),
        enterTo,
      };
    });

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
  stickAtTop: number | null;
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
  sheetPaper: {
    backgroundColor: DefaultTheme.colors.surface,
    ...GradientStyles.paper,
    borderColor: 'rgba(226, 44, 86, 0.14)',
  },
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
  plateFull: {
    alignSelf: 'stretch',
    marginHorizontal: 8,
  },
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
