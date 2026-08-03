import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CursorHeartGlow } from '@/components/ui/CursorHeartGlow';
import { FallingPetals } from '@/components/ui/FallingPetals';
import { FlipCard } from '@/components/ui/FlipCard';
import { GlassPill } from '@/components/ui/GlassPill';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { HeartConfetti, type HeartConfettiHandle } from '@/components/ui/HeartConfetti';
import { JogWheel } from '@/components/ui/JogWheel';
import {
  LilyBloomAnimation,
  type LilyBloomAnimationHandle,
} from '@/components/ui/LilyBloomAnimation';
import { PhotoMarquee } from '@/components/ui/PhotoMarquee';
import { ProposalModal } from '@/components/ui/ProposalModal';
import {
  Reveal,
  RevealSection,
  ScrollRevealProvider,
  useScrollRevealController,
} from '@/components/ui/Reveal';
import { Timeline } from '@/components/ui/Timeline';
import {
  FOOTER,
  HERO,
  LETTER,
  PHOTOS,
  PHOTOS_SECTION,
  REASONS,
  REASONS_SECTION,
  SIGNATURE,
  SONG,
  TIMELINE,
  TIMELINE_SECTION,
} from '@/constants/content';
import { DefaultTheme } from '@/constants/defaultTheme';
import { GradientStyles } from '@/constants/gradient';
import { useAudioScene } from '@/hooks/useAudioScene';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useResponsive } from '@/hooks/useTheme';

const MIN_CARD = 230;
const CARD_GAP = 18;

export default function LandingPage() {
  const { clamp, width, height, isCompact } = useResponsive();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { musicOn, toggleMusic, songPlaying, songTouched, songEnded, toggleSong } = useAudioScene();

  const scrollRef = useRef<ScrollView | null>(null);
  /** The scrolling DOM node on web; null everywhere else. See `sampleOffset`. */
  const scrollNode = useRef<{ scrollTop: number } | null>(null);
  const confetti = useRef<HeartConfettiHandle>(null);
  const lily = useRef<LilyBloomAnimationHandle>(null);
  const letterTop = useRef(0);

  const scrollY = useRef(new Animated.Value(0)).current;
  const [scrollRange, setScrollRange] = useState(1);
  const contentHeight = useRef(0);
  const viewportHeight = useRef(height);

  const reveal = useScrollRevealController(height);

  const [modalOpen, setModalOpen] = useState(false);
  const [said, setSaid] = useState(false);
  const [cinematic, setCinematic] = useState(false);

  const pagePadding = clamp(20, 5, 64);

  /**
   * 1 for the ordinary page, 0 in cinematic mode.
   *
   * Cinematic mode dims the page rather than replacing it: the sections, the
   * chrome and the controls fade out, but everything stays mounted and the
   * scroller keeps working, so the background clip goes on scrubbing to the
   * scroll exactly as before. Unmounting the page would take its layout — and
   * with it the scroll range the clip is keyed to — down with it.
   */
  const ui = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(ui, {
      toValue: cinematic ? 0 : 1,
      duration: reducedMotion ? 0 : 600,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [ui, cinematic, reducedMotion]);

  /** The inverse, for the one thing that is only visible in cinematic mode. */
  const cinematicUi = useMemo(
    () => ui.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    [ui],
  );

  /* The song finishing is what asks the question. */
  const wasPlaying = useRef(false);
  useEffect(() => {
    if (wasPlaying.current && !songPlaying && songTouched) {
      setModalOpen(true);
    }
    wasPlaying.current = songPlaying;
  }, [songPlaying, songTouched]);

  const handleScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: false,
        listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          reveal.notify(offsetY);
          lily.current?.notify(offsetY);
        },
      }),
    [scrollY, reveal],
  );

  /**
   * On web the forwarded ref *is* the scrolling element, so the scroll position
   * can be read straight from it. The video scrubs off this rather than off the
   * scroll events, which arrive throttled and with no trailing edge — during a
   * fling the last event is stale by however far the momentum carried past it.
   * Returning null hands the video back to its event feed.
   */
  const attachScroll = useCallback((instance: ScrollView | null) => {
    scrollRef.current = instance;
    const host = instance as unknown as {
      getScrollableNode?: () => unknown;
    } | null;
    const node = host?.getScrollableNode?.() ?? host;
    scrollNode.current =
      typeof (node as { scrollTop?: unknown } | null)?.scrollTop === 'number'
        ? (node as { scrollTop: number })
        : null;
  }, []);

  const sampleOffset = useCallback(() => scrollNode.current?.scrollTop ?? null, []);

  const recomputeRange = useCallback(() => {
    setScrollRange(Math.max(1, contentHeight.current - viewportHeight.current));
  }, []);

  const onContentSizeChange = useCallback(
    (_w: number, h: number) => {
      contentHeight.current = h;
      recomputeRange();
    },
    [recomputeRange],
  );

  const onScrollViewLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportHeight.current = event.nativeEvent.layout.height;
      recomputeRange();
    },
    [recomputeRange],
  );

  const scrollToLetter = useCallback(() => {
    scrollRef.current?.scrollTo({ y: Math.max(0, letterTop.current - 24), animated: true });
  }, []);

  const pop = useCallback((x: number, y: number, count = 9, scale = 0.8) => {
    confetti.current?.pop(x, y, count, scale);
  }, []);

  const sayYes = useCallback(
    (x: number, y: number) => {
      setSaid(true);
      confetti.current?.celebrate();
      confetti.current?.pop(x, y, 26, 1.1);
    },
    [],
  );

  const gridWidth = Math.min(width - pagePadding * 2, 1080);
  const columns = Math.max(1, Math.floor((gridWidth + CARD_GAP) / (MIN_CARD + CARD_GAP)));
  const cardWidth =
    columns === 1 ? undefined : (gridWidth - CARD_GAP * (columns - 1)) / columns;

  return (
    <View style={styles.root}>
      <LilyBloomAnimation
        ref={lily}
        scrollRange={scrollRange}
        sampleOffset={sampleOffset}
        dim={cinematic ? 1 : 0}
        opacity={cinematic ? 1 : 0.82}
      />

      {/* Atmosphere, not chrome — deliberately outside the `ui` fade and never
          unmounted, so a cinematic toggle cannot pause, hide or restart it and
          the drift carries straight on mid-fall. Its own zIndex 3 puts it above
          the scroller, which is what keeps it visible once the page underneath
          has faded away. Do not fold this into the fade. */}
      <FallingPetals />

      <Animated.ScrollView
        ref={attachScroll}
        style={[styles.scroll, { opacity: ui }]}
        contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
        onScroll={handleScroll}
        onContentSizeChange={onContentSizeChange}
        onLayout={onScrollViewLayout}
        // 16 throttles this to a leading-edge event every ~16ms with nothing on
        // the trailing edge, which is what left the scrubbing a frame behind.
        scrollEventThrottle={1}
        showsVerticalScrollIndicator={false}>
        <ScrollRevealProvider value={reveal.value}>
          {/* ——— hero ——— */}
          <RevealSection
            style={[
              styles.hero,
              {
                minHeight: height - insets.top,
                paddingHorizontal: pagePadding,
                paddingTop: clamp(90, 14, 150) + insets.top,
                paddingBottom: clamp(60, 9, 110),
              },
            ]}>
            <Pressable
              onPress={(event) => pop(event.nativeEvent.pageX, event.nativeEvent.pageY, 9, 0.8)}
              style={styles.heroTap}>
              <Reveal>
                <GlassSurface
                  radius={999}
                  intensity={26}
                  gradient="glass"
                  contentStyle={styles.badge}>
                  <Text style={styles.badgeText}>{HERO.badge}</Text>
                </GlassSurface>
              </Reveal>

              <Reveal delay={120}>
                <Text
                  style={[
                    styles.heroTitle,
                    { fontSize: clamp(56, 14, 150), lineHeight: clamp(56, 14, 150) * 1.06 },
                  ]}>
                  {HERO.titleLead} <ShimmerName name={HERO.titleName} /> <Beat>❤️</Beat>
                </Text>
              </Reveal>

              <Reveal delay={240}>
                <Text style={[styles.heroSubtitle, { fontSize: clamp(19, 2.6, 27) }]}>
                  {HERO.subtitle}
                </Text>
              </Reveal>

              <Reveal delay={360} style={styles.heroActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={scrollToLetter}
                  style={({ pressed }) => [styles.heroCta, pressed && styles.pressed]}>
                  <Text style={styles.heroCtaLabel}>{HERO.cta}</Text>
                </Pressable>
              </Reveal>
            </Pressable>

            <Bob style={styles.scrollHint}>
              <Text style={styles.eyebrowDark}>{HERO.scrollHint}</Text>
            </Bob>
          </RevealSection>

          {/* ——— the letter ——— */}
          <RevealSection
            onLayout={(event) => {
              letterTop.current = event.nativeEvent.layout.y;
            }}
            style={[
              styles.section,
              { paddingHorizontal: pagePadding, paddingVertical: clamp(70, 10, 140) },
            ]}>
            <Reveal>
              <GlassSurface
                radius={28}
                intensity={38}
                gradient="glassBright"
                tintColor="rgba(255, 255, 255, 0.44)"
                style={styles.letterCard}
                contentStyle={{ padding: clamp(28, 6, 64) }}>
                <Text style={styles.eyebrow}>{LETTER.eyebrow}</Text>
                <Text style={[styles.sectionTitle, { fontSize: clamp(34, 6.4, 62) }]}>
                  {LETTER.title}
                </Text>

                {LETTER.body.map((paragraph) => (
                  <Text
                    key={paragraph}
                    style={[styles.letterParagraph, { fontSize: clamp(18, 2.5, 23) }]}>
                    {paragraph}
                  </Text>
                ))}

                <Text style={[styles.letterClosing, { fontSize: clamp(20, 2.9, 27) }]}>
                  {LETTER.closing}
                </Text>

                <View style={styles.signatureRow}>
                  <View>
                    <Text style={styles.eyebrow}>{LETTER.signOffLabel}</Text>
                    <Text style={[styles.signature, { fontSize: clamp(30, 5, 42) }]}>
                      {SIGNATURE}
                    </Text>
                  </View>
                  <Beat style={styles.letterSeal}>💌</Beat>
                </View>
              </GlassSurface>
            </Reveal>
          </RevealSection>

          {/* ——— photographs ——— */}
          <RevealSection style={[styles.section, { paddingVertical: clamp(50, 8, 110) }]}>
            <View style={[styles.sectionHead, { paddingHorizontal: pagePadding }]}>
              <Reveal>
                <Text style={[styles.eyebrow, styles.centered]}>{PHOTOS_SECTION.eyebrow}</Text>
              </Reveal>
              <Reveal delay={100}>
                <Text
                  style={[
                    styles.sectionTitle,
                    styles.centered,
                    { fontSize: clamp(38, 7, 80), marginTop: 14 },
                  ]}>
                  {PHOTOS_SECTION.title}
                </Text>
              </Reveal>
            </View>

            <PhotoMarquee photos={PHOTOS} />
          </RevealSection>

          {/* ——— the timeline ——— */}
          <RevealSection
            style={[
              styles.section,
              { paddingHorizontal: pagePadding, paddingVertical: clamp(60, 9, 120) },
            ]}>
            <View style={styles.constrained}>
              <Reveal>
                <Text style={styles.eyebrow}>{TIMELINE_SECTION.eyebrow}</Text>
              </Reveal>
              <Reveal delay={100}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { fontSize: clamp(38, 7, 80), marginTop: 14, marginBottom: clamp(38, 6, 60) },
                  ]}>
                  {TIMELINE_SECTION.title}
                </Text>
              </Reveal>

              <Timeline entries={TIMELINE} />
            </View>
          </RevealSection>

          {/* ——— reasons ——— */}
          <RevealSection
            style={[
              styles.section,
              { paddingHorizontal: pagePadding, paddingVertical: clamp(60, 9, 120) },
            ]}>
            <View style={styles.constrainedWide}>
              <View style={styles.sectionHead}>
                <Reveal>
                  <Text style={[styles.eyebrow, styles.centered]}>{REASONS_SECTION.eyebrow}</Text>
                </Reveal>
                <Reveal delay={100}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      styles.centered,
                      { fontSize: clamp(38, 7, 80), marginTop: 14 },
                    ]}>
                    {REASONS_SECTION.title}
                  </Text>
                </Reveal>
              </View>

              <View style={[styles.grid, { marginTop: clamp(32, 5, 54) }]}>
                {REASONS.map((reason, index) => (
                  <Reveal
                    key={reason.index}
                    delay={index * 70}
                    style={cardWidth ? { width: cardWidth } : styles.gridFull}>
                    <FlipCard reason={reason} onFlip={(x, y) => pop(x, y, 7, 0.7)} />
                  </Reveal>
                ))}
              </View>
            </View>
          </RevealSection>

          {/* ——— the song ——— */}
          <RevealSection
            style={[
              styles.section,
              {
                paddingHorizontal: pagePadding,
                paddingTop: clamp(60, 9, 110),
                paddingBottom: clamp(80, 12, 150),
              },
            ]}>
            <Reveal style={[styles.songCard, { padding: clamp(36, 8, 90) }]}>
              <Text style={[styles.eyebrow, styles.onRose, styles.centered]}>{SONG.eyebrow}</Text>
              <Text style={[styles.songTitle, { fontSize: clamp(32, 6.4, 72) }]}>
                {SONG.title}
              </Text>
              <Text style={[styles.songSubtitle, { fontSize: clamp(16, 2, 20) }]}>
                {SONG.subtitle}
              </Text>

              <View style={{ marginTop: clamp(36, 5.5, 56) }}>
                <JogWheel
                  playing={songPlaying}
                  onPress={toggleSong}
                  label={
                    songPlaying
                      ? SONG.playing
                      : songEnded
                        ? SONG.ended
                        : songTouched
                          ? SONG.replay
                          : SONG.idle
                  }
                />
              </View>
            </Reveal>
          </RevealSection>

          {/* ——— footer ——— */}
          <RevealSection style={[styles.footer, { paddingHorizontal: pagePadding }]}>
            <View style={styles.footerRow}>
              <View style={styles.footerRule} />
              <Text style={styles.footerLabel}>{FOOTER.label}</Text>
              <View style={styles.footerRule} />
            </View>
            <Text style={[styles.footerTagline, { fontSize: clamp(17, 2.2, 21) }]}>
              {FOOTER.tagline} <Beat>❤️</Beat>
            </Text>
          </RevealSection>
        </ScrollRevealProvider>

        {/* Cinematic mode's way out. It lives inside the scroller, as its last
            child, which does two jobs at once: it covers the faded-out page so
            none of it can still be tapped, and because its scrollable ancestor
            is the scroller itself, a wheel or a drag over it still scrolls the
            page — and so still drives the clip. A full-screen overlay outside
            the scroller would swallow both. */}
        {cinematic && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Leave cinematic mode"
            onPress={() => setCinematic(false)}
            style={StyleSheet.absoluteFill}
          />
        )}
      </Animated.ScrollView>

      <CursorHeartGlow />

      {/* scroll progress */}
      <Animated.View
        pointerEvents="none"
        style={[styles.progressTrack, { top: insets.top, opacity: ui }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              // Scaled rather than widened: a width in percent is a layout
              // property, so every scroll event would reflow the page — the same
              // main thread the scrub's decoding is competing for. A transform
              // only recomposites.
              transform: [
                {
                  scaleX: scrollY.interpolate({
                    inputRange: [0, scrollRange],
                    outputRange: [0, 1],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>

      {/* floating controls — faded and made inert together, so a control that
          has gone invisible can never still be the thing under a tap */}
      <Animated.View
        pointerEvents={cinematic ? 'none' : 'auto'}
        style={[styles.pillLeft, { bottom: clamp(14, 3, 28) + insets.bottom, opacity: ui }]}>
        <GlassPill
          label={musicOn ? 'Mute music' : 'Play music'}
          glyph={musicOn ? '♪' : '✕'}
          onPress={toggleMusic}
          accessibilityLabel="Background music"
        />
      </Animated.View>
      <Animated.View
        pointerEvents={cinematic ? 'none' : 'auto'}
        style={[styles.pillRight, { bottom: clamp(14, 3, 28) + insets.bottom, opacity: ui }]}>
        <GlassPill
          label={isCompact ? 'Cinematic' : 'Cinematic mode'}
          glyph="✦"
          onPress={() => setCinematic(true)}
        />
      </Animated.View>

      <ProposalModal
        visible={modalOpen}
        said={said}
        onClose={() => setModalOpen(false)}
        onYes={sayYes}
        onAgain={(x, y) => {
          confetti.current?.celebrate();
          confetti.current?.pop(x, y, 22, 1);
        }}
      />

      <HeartConfetti ref={confetti} />

      {/* The one thing cinematic mode adds rather than takes away. Inert, so the
          tap it is describing goes to the page underneath like any other. */}
      {cinematic && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.cinematicHint,
            { bottom: clamp(24, 5, 48) + insets.bottom, opacity: cinematicUi },
          ]}>
          <Text style={styles.cinematicHintText}>Tap anywhere to return</Text>
        </Animated.View>
      )}
    </View>
  );
}

/* ————————————————— small motion helpers ————————————————— */

function useLoop(duration: number, enabled = true) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [value, duration, enabled]);

  return value;
}

/** The `beat` keyframe — a double heartbeat. */
function Beat({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const reducedMotion = useReducedMotion();
  const beat = useLoop(1200, !reducedMotion);

  return (
    <Animated.Text
      style={[
        style,
        { transform: [{ scale: beat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] },
      ]}>
      {children}
    </Animated.Text>
  );
}

function Bob({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reducedMotion = useReducedMotion();
  const bob = useLoop(1400, !reducedMotion);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: bob.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }),
          transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, 9] }) }],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

/** Text cannot take a gradient fill here, so the name breathes between the two
 *  ends of the rose ramp instead — the same read as the `shimmer` keyframe. */
function ShimmerName({ name }: { name: string }) {
  const reducedMotion = useReducedMotion();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer, reducedMotion]);

  return (
    <Animated.Text
      style={[
        styles.heroName,
        {
          color: shimmer.interpolate({
            inputRange: [0, 1],
            outputRange: [DefaultTheme.colors.primary, DefaultTheme.colors.primarySoft],
          }),
        },
      ]}>
      {name}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DefaultTheme.colors.background,
  },
  scroll: {
    flex: 1,
    zIndex: 2,
  },
  content: {
    flexGrow: 1,
  },

  /* hero */
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTap: {
    width: '100%',
    maxWidth: 1000,
    alignItems: 'center',
    alignSelf: 'center',
  },
  badge: {
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  badgeText: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11.5,
    letterSpacing: 2.8,
    textTransform: 'uppercase',
    color: '#A83258',
    textAlign: 'center',
  },
  heroTitle: {
    marginTop: 28,
    fontFamily: DefaultTheme.fonts.display,
    color: DefaultTheme.colors.ink,
    textAlign: 'center',
  },
  heroName: {
    fontFamily: DefaultTheme.fonts.displayItalicRegular,
    fontStyle: 'italic',
  },
  heroSubtitle: {
    marginTop: 26,
    maxWidth: 620,
    fontFamily: DefaultTheme.fonts.displayItalic,
    fontStyle: 'italic',
    lineHeight: 36,
    color: DefaultTheme.colors.inkFaint,
    textAlign: 'center',
  },
  heroActions: {
    marginTop: 38,
  },
  heroCta: {
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 999,
    ...GradientStyles.base,
    backgroundColor: DefaultTheme.colors.primary,
    shadowColor: DefaultTheme.colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8,
  },
  heroCtaLabel: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: DefaultTheme.colors.white,
  },
  scrollHint: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },

  /* shared section furniture */
  section: {
    width: '100%',
  },
  sectionHead: {
    alignItems: 'center',
    marginBottom: 34,
  },
  constrained: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  constrainedWide: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
  },
  centered: {
    textAlign: 'center',
  },
  eyebrow: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11.5,
    letterSpacing: 3.2,
    textTransform: 'uppercase',
    color: DefaultTheme.colors.label,
  },
  eyebrowDark: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: DefaultTheme.colors.label,
  },
  onRose: {
    color: 'rgba(255, 255, 255, 0.82)',
  },
  sectionTitle: {
    fontFamily: DefaultTheme.fonts.display,
    color: DefaultTheme.colors.ink,
  },

  /* letter */
  letterCard: {
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    shadowColor: '#96193C',
    shadowOpacity: 0.4,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 28 },
    elevation: 8,
  },
  letterParagraph: {
    marginTop: 20,
    fontFamily: DefaultTheme.fonts.display,
    lineHeight: 34,
    color: DefaultTheme.colors.inkSoft,
  },
  letterClosing: {
    marginTop: 24,
    fontFamily: DefaultTheme.fonts.displayItalicRegular,
    fontStyle: 'italic',
    lineHeight: 38,
    color: DefaultTheme.colors.primaryDark,
  },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 28,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: DefaultTheme.colors.hairline,
  },
  signature: {
    marginTop: 6,
    fontFamily: DefaultTheme.fonts.script,
    color: DefaultTheme.colors.accent,
  },
  letterSeal: {
    fontSize: 26,
    lineHeight: 32,
  },

  /* reasons */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  gridFull: {
    width: '100%',
  },

  /* song */
  songCard: {
    width: '100%',
    maxWidth: 1060,
    alignSelf: 'center',
    alignItems: 'center',
    borderRadius: 34,
    overflow: 'hidden',
    ...GradientStyles.question,
    backgroundColor: DefaultTheme.colors.primarySoft,
    shadowColor: '#96193C',
    shadowOpacity: 0.85,
    shadowRadius: 70,
    shadowOffset: { width: 0, height: 40 },
    elevation: 14,
  },
  songTitle: {
    marginTop: 26,
    fontFamily: DefaultTheme.fonts.display,
    color: DefaultTheme.colors.white,
    textAlign: 'center',
  },
  songSubtitle: {
    marginTop: 20,
    maxWidth: 480,
    fontFamily: DefaultTheme.fonts.displayItalic,
    fontStyle: 'italic',
    lineHeight: 30,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
  },

  /* footer */
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  footerRule: {
    width: 40,
    height: 1,
    backgroundColor: '#E7A2BC',
  },
  footerLabel: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: DefaultTheme.colors.label,
  },
  footerTagline: {
    marginTop: 16,
    fontFamily: DefaultTheme.fonts.displayItalic,
    fontStyle: 'italic',
    color: DefaultTheme.colors.inkFaint,
    textAlign: 'center',
  },

  /* chrome */
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    zIndex: 60,
  },
  progressFill: {
    width: '100%',
    height: '100%',
    transformOrigin: 'left',
    ...GradientStyles.base,
    backgroundColor: DefaultTheme.colors.primary,
  },
  pillLeft: {
    position: 'absolute',
    left: 16,
    zIndex: 70,
  },
  pillRight: {
    position: 'absolute',
    right: 16,
    zIndex: 70,
  },
  cinematicHint: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 80,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  cinematicHintText: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 2.8,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.85)',
  },
});
