import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import {
  createVideoPlayer,
  useVideoPlayer,
  VideoView,
  type VideoPlayer,
  type VideoThumbnail,
} from 'expo-video';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScrollMetrics, useSectionTop } from '@/components/ui/Reveal';
import { PHOTOS } from '@/constants/content';
import { DefaultTheme, ITALIC } from '@/constants/defaultTheme';
import { GradientStyles } from '@/constants/gradient';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useResponsive } from '@/hooks/useTheme';


const BROWSER = Platform.OS === 'web';

const STICK_TOP = { position: 'sticky', top: 0 } as unknown as ViewStyle;

const CAROUSEL = require.context(
  '../../assets/carousel',
  false,
  /\.(jpe?g|png|gif|webp|bmp|mp4|mov|m4v|webm)$/i,
);

const CAROUSEL_POSTERS = require.context('../../assets/carousel-posters', false, /\.(jpe?g|png|webp)$/i);

const VIDEO = /\.(mp4|mov|m4v|webm)$/i;

const SHOW_WHOLE = new Set(['march', 'april']);

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

export type CarouselItem = {
  id: string;
  month: string;
  caption: string;
  kind: 'image' | 'video';
  source: number;
  poster: number | null;
  whole: boolean;
};

function stem(key: string): string {
  const file = key.slice(key.lastIndexOf('/') + 1);
  const dot = file.lastIndexOf('.');
  return dot > 0 ? file.slice(0, dot) : file;
}

function order(name: string): number {
  const month = MONTHS.indexOf(name.toLowerCase());
  return month === -1 ? MONTHS.length : month;
}

const CAPTIONS = new Map(
  PHOTOS.map((photo) => [photo.month.toLowerCase(), photo.caption] as const),
);

const POSTER_FILES = new Map(
  CAROUSEL_POSTERS.keys().map(
    (key) => [stem(key).toLowerCase(), CAROUSEL_POSTERS<number>(key)] as const,
  ),
);

export const CAROUSEL_MEDIA: CarouselItem[] = CAROUSEL.keys()
  .map((key) => {
    const month = stem(key);
    const kind = VIDEO.test(key) ? ('video' as const) : ('image' as const);
    return {
      id: key,
      month,
      caption: CAPTIONS.get(month.toLowerCase()) ?? '',
      kind,
      source: CAROUSEL<number>(key),
      poster: kind === 'video' ? (POSTER_FILES.get(month.toLowerCase()) ?? null) : null,
      whole: SHOW_WHOLE.has(month.toLowerCase()),
    };
  })
  .sort((a, b) => order(a.month) - order(b.month) || a.month.localeCompare(b.month));

const SWAP = 0.5;

const SLIDE_SHARE = 0.45;

const HOVER_LIFT = 10;
const HOVER_MS = 240;

const CARD_RATIO = 1.515;

const COUNTER = 26;

const BACKDROP_BLUR = 72;

const BACKDROP_DIM = 'rgba(26, 5, 13, 0.34)';

const BACKDROP_BLEED = 1.1;

const BACKDROP_IMAGE_BLUR = Platform.OS === 'android' ? 40 : 0;


const POSTER_AT_SECONDS = 0;

const POSTER_MAX = 1280;

const posters = new Map<number, VideoThumbnail | null>();
const posterJobs = new Map<number, Promise<VideoThumbnail | null>>();

let posterQueue: Promise<unknown> = Promise.resolve();

function makePoster(source: number): Promise<VideoThumbnail | null> {
  const running = posterJobs.get(source);
  if (running) {
    return running;
  }

  const job = posterQueue
    .then(async () => {
      if (BROWSER) {
        return null;
      }
      let player: VideoPlayer | null = null;
      try {
        player = createVideoPlayer(source);
        const [thumbnail] = await player.generateThumbnailsAsync([POSTER_AT_SECONDS], {
          maxWidth: POSTER_MAX,
          maxHeight: POSTER_MAX,
        });
        return thumbnail ?? null;
      } catch {
        return null;
      } finally {
        player?.release();
      }
    })
    .then((thumbnail) => {
      posters.set(source, thumbnail);
      return thumbnail;
    });

  posterQueue = job.catch(() => undefined);
  posterJobs.set(source, job);
  return job;
}

function useVideoPoster(source: number | null): VideoThumbnail | null | undefined {
  const [poster, setPoster] = useState<VideoThumbnail | null | undefined>(() =>
    source === null ? null : posters.get(source),
  );
  const [asked, setAsked] = useState(source);

  if (source !== asked) {
    setAsked(source);
    setPoster(source === null ? null : posters.get(source));
  }

  useEffect(() => {
    if (source === null) {
      return;
    }
    let live = true;
    makePoster(source).then((thumbnail) => {
      if (live) {
        setPoster(thumbnail);
      }
    });
    return () => {
      live = false;
    };
  }, [source]);

  return poster;
}

export function photoSlideLength(viewportHeight: number): number {
  return Math.max(1, Math.round(viewportHeight * SLIDE_SHARE));
}

export function photoCarouselSpan(count: number, viewportHeight: number): number {
  return Math.max(0, count - 1) * photoSlideLength(viewportHeight);
}

const twoDigit = (value: number) => (value < 10 ? `0${value}` : `${value}`);

type FrameDriver = Animated.Value | Animated.AnimatedInterpolation<number>;

const NEIGHBOURS = 1;

const MEDIA_NEIGHBOURS = 2;

const CARDS_AHEAD = 5;

type PhotoCarouselProps = {
  photos: CarouselItem[];
  eyebrow: string;
  title: string;
  hint?: string;
  onSeek?: (offsetY: number) => void;
  dormant?: boolean;
};

export function PhotoCarousel({
  photos,
  eyebrow,
  title,
  hint,
  onSeek,
  dormant = false,
}: PhotoCarouselProps) {
  const { width, height, clamp } = useResponsive();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const metrics = useScrollMetrics();
  const sectionTop = useSectionTop();

  const [measured, setMeasured] = useState(0);
  const frameWidth = measured || width;
  const onStageLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.ceil(event.nativeEvent.layout.width);
    setMeasured((current) => (current === next ? current : next));
  }, []);

  const count = photos.length;
  const viewport = metrics?.viewportHeight ?? height;
  const slide = photoSlideLength(viewport);
  const span = photoCarouselSpan(count, viewport);

  const stacked = width < 860;
  const pad = clamp(22, 5, 72);

  const cardWidth = stacked ? clamp(94, 24, 132) : clamp(140, 14, 208);
  const cardHeight = Math.round(cardWidth * CARD_RATIO);
  const gap = clamp(12, 1.6, 26);
  const step = cardWidth + gap;
  const railStart = stacked ? pad : frameWidth * 0.72;

  const footBottom = insets.bottom + (stacked ? 78 : clamp(20, 3, 36));
  const railBottom = footBottom + COUNTER + clamp(18, 2.4, 32);
  const railTop = Math.max(clamp(90, 12, 150), (viewport - cardHeight) / 2);

  const monthSize = clamp(46, 9, 118);
  const captionSize = clamp(15, 1.7, 21);

  const captionBox = useMemo<ViewStyle>(
    () =>
      stacked
        ? { left: pad, right: pad, bottom: railBottom + cardHeight + clamp(20, 3, 36) }
        : {
            left: pad,
            top: 0,
            bottom: 0,
            width: Math.max(220, railStart - pad - clamp(26, 3, 64)),
            justifyContent: 'center',
          },
    [stacked, pad, railBottom, cardHeight, railStart, clamp],
  );

  const driver = metrics?.scrollYNative ?? metrics?.scrollY ?? null;
  const scrubbing = driver !== null && sectionTop !== null && slide > 0 && count >= 2;

  const settled = useRef(new Animated.Value(0)).current;

  const frame = useMemo<FrameDriver>(() => {
    if (!scrubbing || driver === null || sectionTop === null) {
      return settled;
    }
    return driver.interpolate({
      inputRange: [sectionTop, sectionTop + span],
      outputRange: [0, count - 1],
      extrapolate: 'clamp',
    });
  }, [scrubbing, driver, sectionTop, span, count, settled]);

  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);

  useEffect(() => {
    const scrollY = metrics?.scrollY;
    if (!scrollY || sectionTop === null || slide <= 0 || count < 2) {
      return;
    }

    const id = scrollY.addListener(({ value }) => {
      if (value < sectionTop - viewport || value > sectionTop + span + viewport) {
        return;
      }

      const at = Math.min(count - 1, Math.max(0, (value - sectionTop) / slide));
      const next = Math.min(count - 1, Math.max(0, Math.floor(at + SWAP)));
      if (next === indexRef.current) {
        return;
      }
      indexRef.current = next;
      setIndex(next);
    });

    return () => scrollY.removeListener(id);
  }, [metrics, sectionTop, slide, span, viewport, count]);

  useEffect(() => {
    if (scrubbing) {
      return;
    }
    settled.setValue(index);
  }, [scrubbing, index, settled]);

  const goTo = useCallback(
    (next: number) => {
      const target = Math.min(count - 1, Math.max(0, next));
      if (target === indexRef.current) {
        return;
      }
      if (onSeek && sectionTop !== null) {
        onSeek(sectionTop + target * slide);
        return;
      }
      indexRef.current = target;
      setIndex(target);
    },
    [count, onSeek, sectionTop, slide],
  );

  const pin = useMemo(() => {
    if (BROWSER || driver === null || sectionTop === null || span <= 0) {
      return null;
    }
    return driver.interpolate({
      inputRange: [sectionTop, sectionTop + span],
      outputRange: [0, span],
      extrapolate: 'clamp',
    });
  }, [driver, sectionTop, span]);

  const stripShift = useMemo(
    () =>
      frame.interpolate({
        inputRange: [0, Math.max(1, count - 1)],
        outputRange: [0, -Math.max(1, count - 1) * frameWidth],
      }),
    [frame, count, frameWidth],
  );

  const railShift = useMemo(
    () =>
      frame.interpolate({
        inputRange: [0, Math.max(1, count - 1)],
        outputRange: [railStart - step, railStart - step - Math.max(1, count - 1) * step],
      }),
    [frame, count, railStart, step],
  );

  return (
    <View style={{ height: viewport + span }}>
      <Animated.View
        onLayout={onStageLayout}
        style={[
          styles.stage,
          { height: viewport },
          BROWSER ? STICK_TOP : styles.stagePinned,
          pin ? { transform: [{ translateY: pin }] } : null,
        ]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.strip,
            {
              width: frameWidth * Math.max(1, count),
              transform: [{ translateX: stripShift }],
            },
          ]}>
          {photos.map((item, itemIndex) => (
            <FeaturedFrame
              key={item.id}
              item={item}
              left={itemIndex * frameWidth}
              width={frameWidth}
              near={Math.abs(itemIndex - index) <= NEIGHBOURS}
              stocked={Math.abs(itemIndex - index) <= MEDIA_NEIGHBOURS}
              current={itemIndex === index}
              playing={itemIndex === index && !reducedMotion && !dormant}
            />
          ))}
        </Animated.View>

        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wash]} />
        {!stacked && <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrimSide]} />}
        <View
          pointerEvents="none"
          style={[styles.scrimHead, { height: Math.min(230, viewport * 0.3) }]}
        />
        <View
          pointerEvents="none"
          style={[styles.scrimFoot, { height: viewport * (stacked ? 0.66 : 0.44) }]}
        />

        <View
          pointerEvents="none"
          style={[styles.head, { top: insets.top + clamp(20, 3, 44), left: pad, right: pad }]}>
          <View style={styles.headText}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={[styles.headTitle, { fontSize: clamp(21, 2.4, 32) }]}>{title}</Text>
          </View>
          {!stacked && hint ? <Text style={styles.hint}>{hint} ↓</Text> : null}
        </View>

        {photos.map((item, itemIndex) =>
          Math.abs(itemIndex - index) <= NEIGHBOURS ? (
            <FrameCaption
              key={item.id}
              item={item}
              index={itemIndex}
              count={count}
              frame={frame}
              box={captionBox}
              monthSize={monthSize}
              captionSize={captionSize}
              centred={stacked}
            />
          ) : null,
        )}

        <Animated.View
          style={[
            styles.rail,
            stacked ? { bottom: railBottom } : { top: railTop },
            { gap, transform: [{ translateX: railShift }] },
          ]}>
          {photos.map((item, itemIndex) => (
            <PreviewCard
              key={item.id}
              item={item}
              index={itemIndex}
              frame={frame}
              width={cardWidth}
              height={cardHeight}
              active={itemIndex > index}
              live={itemIndex >= index && itemIndex <= index + CARDS_AHEAD}
              onSelect={goTo}
            />
          ))}
        </Animated.View>

        <View pointerEvents="none" style={[styles.foot, { bottom: footBottom }]}>
          <View style={styles.counter}>
            <Text style={styles.counterNow}>{twoDigit(index + 1)}</Text>
            <View style={styles.counterRule} />
            <Text style={styles.counterAll}>{twoDigit(count)}</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const FeaturedFrame = memo(function FeaturedFrame({
  item,
  left,
  width,
  near,
  stocked,
  current,
  playing,
}: {
  item: CarouselItem;
  left: number;
  width: number;
  near: boolean;
  stocked: boolean;
  current: boolean;
  playing: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      style={[styles.frame, { left, width, opacity: near ? 1 : 0 }]}>
      {!stocked ? null : item.whole ? (
        <>
          <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
            <FrameMedia
              item={item}
              playing={false}
              current={false}
              mounted={stocked}
              fit="cover"
              blur={BACKDROP_IMAGE_BLUR}
            />
          </View>
          <BlurView intensity={BACKDROP_BLUR} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.backdropDim]} />

          <FrameMedia
            item={item}
            playing={playing}
            current={current}
            mounted={stocked}
            fit="contain"
          />
        </>
      ) : (
        <FrameMedia item={item} playing={playing} current={current} mounted={stocked} fit="cover" />
      )}
    </View>
  );
});

function FrameMedia({
  item,
  playing,
  current,
  mounted,
  fit,
  blur = 0,
}: {
  item: CarouselItem;
  playing: boolean;
  current: boolean;
  mounted: boolean;
  fit: 'cover' | 'contain';
  blur?: number;
}) {
  const generated = useVideoPoster(
    item.kind === 'video' && !playing && item.poster === null ? item.source : null,
  );
  const still = item.poster ?? generated;

  if (item.kind !== 'video') {
    return (
      <Image
        source={item.source}
        style={styles.mediaFill}
        contentFit={fit}
        transition={0}
        blurRadius={blur}
      />
    );
  }

  if (playing) {
    return <FrameVideo source={item.source} playing fit={fit} />;
  }

  if (still) {
    return (
      <Image
        source={still}
        style={styles.mediaFill}
        contentFit={fit}
        transition={0}
        blurRadius={blur}
      />
    );
  }

  return (BROWSER ? mounted : current) ? (
    <FrameVideo source={item.source} playing={false} fit={fit} />
  ) : null;
}

function FrameVideo({
  source,
  playing,
  fit = 'cover',
}: {
  source: number;
  playing: boolean;
  fit?: 'cover' | 'contain';
}) {
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });

  useEffect(() => {
    if (playing) {
      player.replay();
      return;
    }
    player.pause();
  }, [player, playing]);

  return (
    <VideoView
      player={player}
      style={styles.mediaFill}
      contentFit={fit}
      nativeControls={false}
    />
  );
}

const FrameCaption = memo(function FrameCaption({
  item,
  index,
  count,
  frame,
  box,
  monthSize,
  captionSize,
  centred,
}: {
  item: CarouselItem;
  index: number;
  count: number;
  frame: FrameDriver;
  box: ViewStyle;
  monthSize: number;
  captionSize: number;
  centred: boolean;
}) {
  const { opacity, translateY } = useMemo(
    () => ({
      opacity: frame.interpolate({
        inputRange: [index - 0.5, index - 0.16, index + 0.16, index + 0.5],
        outputRange: [0, 1, 1, 0],
        extrapolate: 'clamp',
      }),
      translateY: frame.interpolate({
        inputRange: [index - 1, index, index + 1],
        outputRange: [30, 0, -30],
        extrapolate: 'clamp',
      }),
    }),
    [frame, index],
  );

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.caption,
        box,
        centred && styles.captionCentred,
        { opacity, transform: [{ translateY }] },
      ]}>
      <Text style={styles.captionIndex}>
        {twoDigit(index + 1)} — {twoDigit(count)}
      </Text>
      <Text style={[styles.month, { fontSize: monthSize, lineHeight: monthSize * 1.02 }]}>
        {item.month}
      </Text>
      <View style={styles.captionRule} />
      {item.caption ? (
        <Text
          numberOfLines={3}
          style={[
            styles.captionText,
            centred && styles.centredText,
            { fontSize: captionSize, lineHeight: captionSize * 1.5 },
          ]}>
          {item.caption}
        </Text>
      ) : null}
    </Animated.View>
  );
});

const PreviewCard = memo(function PreviewCard({
  item,
  index,
  frame,
  width,
  height,
  active,
  live,
  onSelect,
}: {
  item: CarouselItem;
  index: number;
  frame: FrameDriver;
  width: number;
  height: number;
  active: boolean;
  live: boolean;
  onSelect: (index: number) => void;
}) {
  const hover = useRef(new Animated.Value(0)).current;
  const press = useCallback(() => onSelect(index), [onSelect, index]);
  const generated = useVideoPoster(
    item.kind === 'video' && item.poster === null ? item.source : null,
  );
  const still = item.poster ?? generated;

  const settle = useCallback(
    (to: number) => {
      Animated.timing(hover, {
        toValue: to,
        duration: HOVER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [hover],
  );

  const motion = useMemo<Animated.WithAnimatedObject<ViewStyle>>(() => {
    if (!live) {
      return { opacity: 0 };
    }
    return {
      opacity: frame.interpolate({
        inputRange: [index - 4.4, index - 3.7, index - 0.8, index - 0.06],
        outputRange: [0, 1, 1, 0],
        extrapolate: 'clamp',
      }),
      transform: [
        {
          translateY: hover.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -HOVER_LIFT],
          }),
        },
        {
          scale: frame.interpolate({
            inputRange: [index - 2, index - 1, index - 0.06],
            outputRange: [0.92, 1, 1.06],
            extrapolate: 'clamp',
          }),
        },
        { scale: hover.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
      ],
    };
  }, [live, frame, index, hover]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Show ${item.month}`}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
      pointerEvents={active ? 'auto' : 'none'}
      disabled={!active}
      onPress={press}
      onHoverIn={() => settle(1)}
      onHoverOut={() => settle(0)}
      onPressIn={() => settle(1)}
      onPressOut={() => settle(0)}>
      <Animated.View style={[styles.card, { width, height }, motion]}>
        {!live ? null : item.kind === 'video' ? (
          still ? (
            <Image
              source={still}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={280}
            />
          ) : BROWSER ? (
            <FrameVideo source={item.source} playing={false} />
          ) : null
        ) : (
          <Image source={item.source} style={StyleSheet.absoluteFill} contentFit="cover" transition={280} />
        )}

        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.cardScrim]} />

        <Animated.View pointerEvents="none" style={[styles.cardRing, { opacity: hover }]} />

        <View pointerEvents="none" style={styles.cardLabel}>
          <Text style={styles.cardMonth} numberOfLines={1}>
            {item.month}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  stage: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: DefaultTheme.colors.veil,
  },
  stagePinned: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },

  strip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  frame: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },

  mediaFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  backdrop: {
    transform: [{ scale: BACKDROP_BLEED }],
  },
  backdropDim: {
    backgroundColor: BACKDROP_DIM,
  },

  wash: {
    ...GradientStyles.stageWash,
  },
  scrimSide: {
    ...GradientStyles.stageScrimSide,
  },
  scrimHead: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    ...GradientStyles.stageScrimHead,
  },
  scrimFoot: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    ...GradientStyles.stageScrimFoot,
  },

  head: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 20,
  },
  headText: {
    flexShrink: 1,
    gap: 8,
  },
  eyebrow: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: DefaultTheme.colors.primaryPale,
  },
  headTitle: {
    fontFamily: DefaultTheme.fonts.displayItalicRegular,
    fontStyle: ITALIC,
    color: DefaultTheme.colors.white,
    textShadowColor: 'rgba(40, 6, 18, 0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  hint: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 10.5,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.7)',
    paddingTop: 4,
  },

  caption: {
    position: 'absolute',
  },
  captionCentred: {
    alignItems: 'center',
  },
  captionIndex: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 3.4,
    color: DefaultTheme.colors.primaryPale,
  },
  month: {
    marginTop: 10,
    fontFamily: DefaultTheme.fonts.display,
    color: DefaultTheme.colors.white,
    textShadowColor: 'rgba(40, 6, 18, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 24,
  },
  captionRule: {
    width: 56,
    height: 2,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 1,
    ...GradientStyles.base,
    backgroundColor: DefaultTheme.colors.primary,
  },
  captionText: {
    maxWidth: 460,
    fontFamily: DefaultTheme.fonts.displayItalic,
    fontStyle: ITALIC,
    color: 'rgba(255, 255, 255, 0.88)',
    textShadowColor: 'rgba(40, 6, 18, 0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  centredText: {
    textAlign: 'center',
  },

  rail: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: DefaultTheme.colors.surfaceTint,
    shadowColor: '#3A0F1E',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8,
  },
  cardScrim: {
    ...GradientStyles.captionScrim,
  },
  cardRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  cardLabel: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 11,
  },
  cardMonth: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 10.5,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: DefaultTheme.colors.white,
  },

  foot: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: COUNTER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  counterNow: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 2.4,
    color: DefaultTheme.colors.white,
  },
  counterRule: {
    width: 26,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  counterAll: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 2.4,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
