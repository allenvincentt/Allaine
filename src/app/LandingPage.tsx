import { Image } from "expo-image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react";
import {
  Animated,
  Easing,
  Platform,
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Defs,
  Path,
  Stop,
  LinearGradient as SvgGradient,
} from "react-native-svg";

import { GradientButton } from "@/components/ui/buttons/GradientButton";
import { CursorHeartGlow } from "@/components/ui/CursorHeartGlow";
import { FallingPetals } from "@/components/ui/FallingPetals";
import { FlipCard } from "@/components/ui/FlipCard";
import { GlassPill } from "@/components/ui/GlassPill";
import { GlassSurface } from "@/components/ui/GlassSurface";
import { Handwriting } from "@/components/ui/Handwriting";
import {
  HeartConfetti,
  type HeartConfettiHandle,
} from "@/components/ui/HeartConfetti";
import { JogWheel } from "@/components/ui/JogWheel";
import {
  LilyBloomAnimation,
  type LilyBloomAnimationHandle,
} from "@/components/ui/LilyBloomAnimation";
import { ParchmentScroll } from "@/components/ui/ParchmentScroll";
import {
  CAROUSEL_MEDIA,
  PhotoCarousel,
  photoCarouselSpan,
  photoSlideLength,
} from "@/components/ui/PhotoMarquee";
import { ProposalModal } from "@/components/ui/ProposalModal";
import {
  Reveal,
  RevealSection,
  ScrollRevealProvider,
  useRevealed,
  useScrollRevealController,
  useSectionAnchors,
} from "@/components/ui/Reveal";
import { Timeline } from "@/components/ui/Timeline";
import { TracedText } from "@/components/ui/TracedText";
import {
  HERO,
  LETTER,
  PHOTOS_SECTION,
  REASONS,
  REASONS_SECTION,
  SIGNATURE,
  SONG,
  TIMELINE,
  TIMELINE_SECTION,
  type ChapterKey,
} from "@/constants/content";
import { DefaultTheme, ITALIC } from "@/constants/defaultTheme";
import { gradientStyle, GradientStyles } from "@/constants/gradient";
import { useAudioScene } from "@/hooks/useAudioScene";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useResponsive } from "@/hooks/useTheme";

const MIN_CARD = 230;
const CARD_GAP = 18;

const MOBILE_APP = Platform.OS !== "web";

const LOGO = require("@/assets/LogoSVG.svg");

const HAND_SCROLL = Platform.OS === "web";

const SCROLL_THROTTLE = HAND_SCROLL ? 1 : 16;

const BUFFER_SHARE_COMPACT = 0.5;
const BUFFER_SHARE_STACKED = 0.72;

const HERO_TRACE_DELAY = 420;

const GESTURE_GAP = 140;

const SEEK_GRACE = 900;

const LOCK_COMMIT = 0.5;

const LOCK_IDLE = 90;

const LOCK_MOVE_MS = 340;
const LOCK_EASE = Easing.bezier(0.22, 1, 0.36, 1);

const LOCK_SLACK = 2.5;

const SONG_ENTRANCE_MS = 2200;

const LETTER_MARGIN = 24;
const LETTER_LINE = 0.34;

type WebScroller = {
  scrollTop: number;
  addEventListener?: (
    type: string,
    listener: () => void,
    options?: { passive: boolean },
  ) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

const HEART_GLOW = gradientStyle(
  "radial-gradient(circle, rgba(255,124,164,0.9) 0%, rgba(255,96,140,0.4) 34%, rgba(226,44,86,0.14) 56%, rgba(226,44,86,0) 72%)",
);

export default function LandingPage() {
  const { clamp, width, height, isCompact } = useResponsive();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const {
    musicOn,
    toggleMusic,
    songPlaying,
    songTouched,
    songEnded,
    toggleSong,
  } = useAudioScene();

  const scrollRef = useRef<ScrollView | null>(null);
  const scrollNode = useRef<WebScroller | null>(null);
  const confetti = useRef<HeartConfettiHandle>(null);
  const lily = useRef<LilyBloomAnimationHandle>(null);
  const chapterTops = useRef<Partial<Record<ChapterKey, number>>>({});

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollYNative = useRef(new Animated.Value(0)).current;
  const scrollTop = useRef(0);
  const [scrollRange, setScrollRange] = useState(1);
  const contentHeight = useRef(0);
  const viewportHeight = useRef(height);

  const reveal = useScrollRevealController(height);
  const anchors = useSectionAnchors();

  const [modalOpen, setModalOpen] = useState(false);
  const [said, setSaid] = useState(false);
  const [cinematic, setCinematic] = useState(false);

  const [heroLive, setHeroLive] = useState(true);
  const heroLiveRef = useRef(true);

  const [pageBuilt, setPageBuilt] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setPageBuilt(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const [letterOpen, setLetterOpen] = useState(false);
  const [letterWritten, setLetterWritten] = useState(0);
  const [letterSkipped, setLetterSkipped] = useState(false);
  const advanceLetter = useCallback(
    () => setLetterWritten((count) => count + 1),
    [],
  );

  const pagePadding = clamp(20, 5, 64);

  const heroSubtitleSize = MOBILE_APP ? clamp(19, 4.6, 26) : clamp(15, 2.1, 23);

  const stacked = width < 900;

  const buffer = reducedMotion
    ? 0
    : Math.round(
        height *
          (isCompact
            ? BUFFER_SHARE_COMPACT
            : stacked
              ? BUFFER_SHARE_STACKED
              : 1),
      );

  const ui = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(ui, {
      toValue: cinematic ? 0 : 1,
      duration: reducedMotion ? 0 : 600,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [ui, cinematic, reducedMotion]);

  const cinematicUi = useMemo(
    () => ui.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    [ui],
  );

  const wasPlaying = useRef(false);
  useEffect(() => {
    if (wasPlaying.current && !songPlaying && songTouched) {
      setModalOpen(true);
    }
    wasPlaying.current = songPlaying;
  }, [songPlaying, songTouched]);

  const carouselSpan = photoCarouselSpan(CAROUSEL_MEDIA.length, height);
  const carouselSlide = photoSlideLength(height);

  const commitReach = Math.ceil(carouselSlide * LOCK_COMMIT);

  const carouselOwnsScroll = !cinematic;

  const seekUntil = useRef(0);

  const gestureSpent = useRef(false);
  const gestureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushed = useRef(0);

  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockFrame = useRef<number | null>(null);
  const locking = useRef(false);
  const lockWrote = useRef(0);
  const dragging = useRef(false);
  const restFrame = useRef(0);
  const carouselLive = useRef(false);

  const noteGesture = useCallback(() => {
    if (!HAND_SCROLL) {
      return;
    }
    if (gestureTimer.current) {
      clearTimeout(gestureTimer.current);
    }
    gestureTimer.current = setTimeout(() => {
      gestureTimer.current = null;
      gestureSpent.current = false;
      pushed.current = 0;
    }, GESTURE_GAP);
  }, []);

  const inCarousel = useCallback(
    (offsetY: number) => {
      const top = chapterTops.current.photos;
      return (
        top !== undefined &&
        carouselSpan > 0 &&
        carouselOwnsScroll &&
        offsetY >= top &&
        offsetY <= top + carouselSpan
      );
    },
    [carouselSpan, carouselOwnsScroll],
  );

  const holdCarousel = useCallback(
    (offsetY: number) => {
      if (!HAND_SCROLL) {
        return offsetY;
      }
      const top = chapterTops.current.photos;
      const scroller = scrollRef.current;
      if (
        top === undefined ||
        !scroller ||
        !inCarousel(offsetY)
      ) {
        return offsetY;
      }
      if (Date.now() < seekUntil.current) {
        return offsetY;
      }

      const from = scrollTop.current;
      const arriving = !inCarousel(from);
      if (arriving) {
        gestureSpent.current = true;
        pushed.current = 0;
      }

      const rest = top + restFrame.current * carouselSlide;
      const reach = gestureSpent.current ? 0 : commitReach;
      const held = Math.min(rest + reach, Math.max(rest - reach, offsetY));
      if (held === offsetY) {
        return offsetY;
      }

      if (!arriving) {
        const ignored = offsetY - held;
        if (ignored * pushed.current < 0) {
          pushed.current = 0;
        }
        pushed.current += ignored;
      }

      scroller.scrollTo({ y: held, animated: false });
      return held;
    },
    [inCarousel, carouselSlide, commitReach],
  );

  const releaseLock = useCallback(() => {
    if (lockTimer.current) {
      clearTimeout(lockTimer.current);
      lockTimer.current = null;
    }
    if (lockFrame.current !== null) {
      cancelAnimationFrame(lockFrame.current);
      lockFrame.current = null;
    }
    locking.current = false;
  }, []);

  const leaveCarousel = useCallback(
    (offsetY: number) => {
      carouselLive.current = false;
      releaseLock();
      if (gestureTimer.current) {
        clearTimeout(gestureTimer.current);
        gestureTimer.current = null;
      }
      gestureSpent.current = false;
      pushed.current = 0;

      const top = chapterTops.current.photos;
      restFrame.current =
        top !== undefined && offsetY > top ? CAROUSEL_MEDIA.length - 1 : 0;
    },
    [releaseLock],
  );

  const runLock = useCallback(
    (frame?: number) => {
      lockTimer.current = null;
      const top = chapterTops.current.photos;
      const scroller = scrollRef.current;
      if (top === undefined || !scroller) {
        return;
      }
      if (!HAND_SCROLL && dragging.current) {
        return;
      }
      if (Date.now() < seekUntil.current) {
        return;
      }
      const from = scrollTop.current;
      if (!inCarousel(from)) {
        return;
      }

      const onto = Math.min(
        CAROUSEL_MEDIA.length - 1,
        Math.max(0, frame ?? Math.round((from - top) / carouselSlide)),
      );
      const target = top + onto * carouselSlide;

      if (Math.abs(target - from) < 0.5) {
        restFrame.current = onto;
        return;
      }

      if (
        frame === undefined &&
        onto === restFrame.current &&
        gestureTimer.current !== null
      ) {
        const back = from - target;
        if (back * pushed.current < 0) {
          pushed.current = 0;
        }
        pushed.current += back;
      }

      restFrame.current = onto;

      if (reducedMotion || !HAND_SCROLL) {
        scroller.scrollTo({ y: target, animated: !reducedMotion });
        return;
      }

      const started = Date.now();
      locking.current = true;
      lockWrote.current = from;

      const step = () => {
        lockFrame.current = null;
        if (!locking.current) {
          return;
        }
        const through = Math.min(1, (Date.now() - started) / LOCK_MOVE_MS);
        const y = from + (target - from) * LOCK_EASE(through);
        lockWrote.current = y;
        scroller.scrollTo({ y, animated: false });

        if (through >= 1) {
          locking.current = false;
          return;
        }
        lockFrame.current = requestAnimationFrame(step);
      };

      lockFrame.current = requestAnimationFrame(step);
    },
    [inCarousel, carouselSlide, reducedMotion],
  );

  const commitLock = useCallback(() => {
    if (!HAND_SCROLL) {
      return false;
    }
    const top = chapterTops.current.photos;
    if (
      top === undefined ||
      !inCarousel(scrollTop.current) ||
      Date.now() < seekUntil.current
    ) {
      return false;
    }
    const offsetY = scrollTop.current;

    const rest = top + restFrame.current * carouselSlide;
    const asked = offsetY - rest + pushed.current;
    if (Math.abs(asked) < commitReach) {
      return false;
    }

    const onto = Math.min(
      CAROUSEL_MEDIA.length - 1,
      Math.max(0, restFrame.current + (asked > 0 ? 1 : -1)),
    );
    if (onto === restFrame.current) {
      pushed.current = 0;
      return false;
    }

    if (lockTimer.current) {
      clearTimeout(lockTimer.current);
      lockTimer.current = null;
    }
    gestureSpent.current = true;
    pushed.current = 0;
    runLock(onto);
    return true;
  }, [inCarousel, carouselSlide, commitReach, runLock]);

  const armLock = useCallback(() => {
    if (!inCarousel(scrollTop.current)) {
      return;
    }
    if (!HAND_SCROLL && dragging.current) {
      return;
    }
    if (lockTimer.current) {
      clearTimeout(lockTimer.current);
    }
    lockTimer.current = setTimeout(() => runLock(), LOCK_IDLE);
  }, [inCarousel, runLock]);

  useEffect(
    () => () => {
      releaseLock();
      if (gestureTimer.current) {
        clearTimeout(gestureTimer.current);
      }
    },
    [releaseLock],
  );

  useEffect(() => {
    releaseLock();
    if (gestureTimer.current) {
      clearTimeout(gestureTimer.current);
      gestureTimer.current = null;
    }
    gestureSpent.current = false;
    pushed.current = 0;

    if (!carouselOwnsScroll) {
      carouselLive.current = false;
      return;
    }

    const top = chapterTops.current.photos;
    if (top === undefined || carouselSpan <= 0) {
      return;
    }
    const offsetY = scrollTop.current;
    carouselLive.current = inCarousel(offsetY);
    restFrame.current =
      offsetY <= top
        ? 0
        : offsetY >= top + carouselSpan
          ? CAROUSEL_MEDIA.length - 1
          : Math.round((offsetY - top) / carouselSlide);
    armLock();
  }, [
    carouselOwnsScroll,
    carouselSpan,
    carouselSlide,
    releaseLock,
    armLock,
    inCarousel,
  ]);

  const scrubOffset = useCallback(
    (offsetY: number) => {
      const top = chapterTops.current.photos;
      if (
        top === undefined ||
        carouselSpan <= 0 ||
        offsetY <= top ||
        !carouselOwnsScroll
      ) {
        return offsetY;
      }
      return offsetY >= top + carouselSpan ? offsetY - carouselSpan : top;
    },
    [carouselSpan, carouselOwnsScroll],
  );

  const noteHero = useCallback((offsetY: number) => {
    const live = offsetY < viewportHeight.current;
    if (live === heroLiveRef.current) {
      return;
    }
    heroLiveRef.current = live;
    setHeroLive(live);
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const raw = event.nativeEvent.contentOffset.y;

      if (locking.current) {
        let at = raw;
        if (Math.abs(raw - lockWrote.current) >= LOCK_SLACK) {
          if (!inCarousel(raw)) {
            releaseLock();
          } else {
            noteGesture();
            at = lockWrote.current;
            scrollRef.current?.scrollTo({ y: at, animated: false });
          }
        }

        if (locking.current) {
          scrollTop.current = at;
          scrollY.setValue(at);
          reveal.notify(at);
          noteHero(at);
          lily.current?.notify(scrubOffset(at));
          return;
        }
      }

      if (!inCarousel(raw)) {
        if (carouselLive.current) {
          leaveCarousel(raw);
        }

        scrollTop.current = raw;
        scrollY.setValue(raw);
        reveal.notify(raw);
        noteHero(raw);
        lily.current?.notify(scrubOffset(raw));
        return;
      }
      carouselLive.current = true;

      noteGesture();
      const offsetY = holdCarousel(raw);

      scrollTop.current = offsetY;
      scrollY.setValue(offsetY);
      reveal.notify(offsetY);
      noteHero(offsetY);
      lily.current?.notify(scrubOffset(offsetY));

      if (!commitLock()) {
        armLock();
      }
    },
    [
      scrollY,
      reveal,
      scrubOffset,
      holdCarousel,
      commitLock,
      armLock,
      noteGesture,
      releaseLock,
      inCarousel,
      leaveCarousel,
      noteHero,
    ],
  );

  const onScroll = useMemo(
    () =>
      HAND_SCROLL
        ? handleScroll
        : Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollYNative } } }],
            {
              useNativeDriver: true,
              listener: handleScroll,
            },
          ),
    [handleScroll, scrollYNative],
  );

  const attachScroll = useCallback((instance: ScrollView | null) => {
    scrollRef.current = instance;
    const host = instance as unknown as {
      getScrollableNode?: () => unknown;
    } | null;
    const node = host?.getScrollableNode?.() ?? host;
    scrollNode.current =
      typeof (node as { scrollTop?: unknown } | null)?.scrollTop === "number"
        ? (node as WebScroller)
        : null;
  }, []);

  const sampleOffset = useCallback(() => {
    const offsetY = scrollNode.current?.scrollTop;
    return offsetY === undefined ? null : scrubOffset(offsetY);
  }, [scrubOffset]);

  const recomputeRange = useCallback(() => {
    setScrollRange(Math.max(1, contentHeight.current - viewportHeight.current));
  }, []);

  const onContentSizeChange = useCallback(
    (_w: number, h: number) => {
      contentHeight.current = h;
      recomputeRange();
      anchors.remeasure();
    },
    [recomputeRange, anchors],
  );

  const onScrollViewLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportHeight.current = event.nativeEvent.layout.height;
      recomputeRange();
    },
    [recomputeRange],
  );

  const markChapter = useCallback(
    (key: ChapterKey) => (y: number) => {
      chapterTops.current[key] = y;
    },
    [],
  );

  const scrollToOffset = useCallback(
    (offsetY: number) => {
      const top = chapterTops.current.photos;
      if (top !== undefined && carouselSlide > 0) {
        restFrame.current = Math.min(
          CAROUSEL_MEDIA.length - 1,
          Math.max(0, Math.round((offsetY - top) / carouselSlide)),
        );
      }
      gestureSpent.current = false;
      pushed.current = 0;
      seekUntil.current = Date.now() + SEEK_GRACE;
      releaseLock();
      scrollRef.current?.scrollTo({
        y: Math.max(0, offsetY),
        animated: !reducedMotion,
      });
    },
    [reducedMotion, carouselSlide, releaseLock],
  );

  const scrollToChapter = useCallback(
    (key: ChapterKey) => {
      const top = chapterTops.current[key];
      if (top === undefined) {
        return;
      }
      const lead = key === "photos" ? 0 : 24;
      scrollToOffset(Math.max(0, top - lead));
    },
    [scrollToOffset],
  );

  const seekCarousel = scrollToOffset;

  const scrollToLetter = useCallback(
    () => scrollToChapter("letter"),
    [scrollToChapter],
  );

  const letterLines = useRef<(ComponentRef<typeof View> | null)[]>([]);
  const following = useRef(false);

  const releaseFollow = useCallback(() => {
    following.current = false;
  }, []);

  const onBeginDrag = useCallback(() => {
    dragging.current = true;
    releaseFollow();
  }, [releaseFollow]);

  const onEndDrag = useCallback(() => {
    dragging.current = false;
    armLock();
  }, [armLock]);

  const frameLine = useCallback(
    (index: number) => {
      const line = letterLines.current[index];
      const scroller = scrollRef.current;
      if (!following.current || !line || !scroller) {
        return;
      }

      line.measureInWindow((_x, y, _width, lineHeight) => {
        if (!following.current) {
          return;
        }

        const top = insets.top + LETTER_MARGIN;
        const foot = height - insets.bottom - LETTER_MARGIN;
        const room = foot - top;

        if (y >= top && y + lineHeight <= foot) {
          return;
        }

        const target =
          lineHeight >= room ? top : top + (room - lineHeight) * LETTER_LINE;

        scroller.scrollTo({
          y: Math.max(0, scrollTop.current + y - target),
          animated: !reducedMotion,
        });
      });
    },
    [height, insets.bottom, insets.top, reducedMotion],
  );

  useEffect(() => {
    if (letterOpen) {
      following.current = true;
    }
  }, [letterOpen]);

  useEffect(() => {
    if (!letterOpen) {
      return;
    }
    if (letterWritten === 0) {
      if (following.current) {
        scrollToLetter();
      }
      return;
    }
    if (reducedMotion || letterSkipped) {
      frameLine(LETTER.body.length + 1);
      return;
    }
    frameLine(letterWritten);
  }, [
    letterOpen,
    letterWritten,
    letterSkipped,
    reducedMotion,
    frameLine,
    scrollToLetter,
  ]);

  useEffect(() => {
    const node = scrollNode.current;
    if (!node?.addEventListener) {
      return;
    }

    node.addEventListener("wheel", releaseFollow, { passive: true });
    node.addEventListener("touchmove", releaseFollow, { passive: true });
    node.addEventListener("touchstart", releaseFollow, { passive: true });
    return () => {
      node.removeEventListener?.("wheel", releaseFollow);
      node.removeEventListener?.("touchmove", releaseFollow);
      node.removeEventListener?.("touchstart", releaseFollow);
    };
  }, [releaseFollow]);

  const pop = useCallback((x: number, y: number, count = 9, scale = 0.8) => {
    confetti.current?.pop(x, y, count, scale);
  }, []);

  const sayYes = useCallback((x: number, y: number) => {
    setSaid(true);
    confetti.current?.celebrate();
    confetti.current?.pop(x, y, 26, 1.1);
  }, []);

  const heroHint = (
    <Bob
      live={heroLive}
      style={[
        styles.heroHint,
        stacked && styles.heroHintStacked,
        MOBILE_APP && styles.heroHintCentred,
      ]}
    >
      <Text style={styles.eyebrowDark}>{HERO.scrollHint}</Text>
      <Text style={styles.heroHintArrow}>↓</Text>
    </Bob>
  );

  const gridWidth = Math.min(width - pagePadding * 2, 1080);
  const columns = Math.max(
    1,
    Math.floor((gridWidth + CARD_GAP) / (MIN_CARD + CARD_GAP)),
  );
  const cardWidth =
    columns === 1
      ? undefined
      : (gridWidth - CARD_GAP * (columns - 1)) / columns;

  const letterSection = useMemo(
    () => (
      <RevealSection
        onTop={markChapter("letter")}
        style={[
          styles.section,
          {
            paddingHorizontal: pagePadding,
            paddingVertical: clamp(70, 10, 140),
          },
        ]}
      >
        <Reveal>
          <View style={styles.scrollHolder}>
            <ParchmentScroll
              onOpen={() => setLetterOpen(true)}
              contentStyle={{ padding: clamp(28, 6, 64) }}
            >
              <Text style={styles.eyebrow}>{LETTER.eyebrow}</Text>
              <Text
                style={[styles.sectionTitle, { fontSize: clamp(34, 6.4, 62) }]}
              >
                {LETTER.title}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Finish writing the letter"
                disabled={!letterOpen}
                onPress={() => setLetterSkipped(true)}
              >
                {LETTER.body.map((paragraph, index) => (
                  <View
                    key={paragraph}
                    ref={(node) => {
                      letterLines.current[index] = node;
                    }}
                    collapsable={false}
                  >
                    <Handwriting
                      text={paragraph}
                      active={letterOpen && letterWritten >= index}
                      skip={letterSkipped}
                      onDone={advanceLetter}
                      speed={700}
                      delay={index === 0 ? 260 : 0}
                      containerStyle={styles.letterParagraph}
                      style={[
                        styles.letterParagraphText,
                        {
                          fontSize: clamp(18, 2.5, 23),
                          lineHeight: 34,
                        },
                      ]}
                    />
                  </View>
                ))}

                <View
                  ref={(node) => {
                    letterLines.current[LETTER.body.length] = node;
                  }}
                  collapsable={false}
                >
                  <Handwriting
                    text={LETTER.closing}
                    active={letterOpen && letterWritten >= LETTER.body.length}
                    skip={letterSkipped}
                    onDone={advanceLetter}
                    speed={520}
                    containerStyle={styles.letterClosing}
                    style={[
                      styles.letterClosingText,
                      { fontSize: clamp(20, 2.9, 27), lineHeight: 38 },
                    ]}
                  />
                </View>
              </Pressable>

              <View
                ref={(node) => {
                  letterLines.current[LETTER.body.length + 1] = node;
                }}
                collapsable={false}
                style={styles.signatureRow}
              >
                <View>
                  <Text style={styles.eyebrow}>{LETTER.signOffLabel}</Text>
                  <Text
                    style={[styles.signature, { fontSize: clamp(30, 5, 42) }]}
                  >
                    {SIGNATURE}
                  </Text>
                </View>
                <Beat style={styles.letterSeal}>💌</Beat>
              </View>
            </ParchmentScroll>
          </View>
        </Reveal>
      </RevealSection>
    ),
    [
      markChapter,
      pagePadding,
      clamp,
      letterOpen,
      letterWritten,
      letterSkipped,
      advanceLetter,
    ],
  );

  const photosSection = useMemo(
    () => (
      <RevealSection onTop={markChapter("photos")} style={styles.section}>
        <PhotoCarousel
          photos={CAROUSEL_MEDIA}
          eyebrow={PHOTOS_SECTION.eyebrow}
          title={PHOTOS_SECTION.title}
          onSeek={seekCarousel}
          dormant={cinematic}
        />
      </RevealSection>
    ),
    [markChapter, seekCarousel, cinematic],
  );

  const timelineSection = useMemo(
    () => (
      <RevealSection
        onTop={markChapter("timeline")}
        style={[
          styles.section,
          styles.timelineSection,
          {
            paddingHorizontal: pagePadding,
            paddingVertical: clamp(60, 9, 120),
          },
        ]}
      >
        <View style={styles.constrained}>
          <Reveal>
            <Text style={styles.eyebrow}>{TIMELINE_SECTION.eyebrow}</Text>
          </Reveal>
          <Reveal delay={100}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  fontSize: clamp(38, 7, 80),
                  marginTop: 14,
                  marginBottom: clamp(38, 6, 60),
                },
              ]}
            >
              {TIMELINE_SECTION.title}
            </Text>
          </Reveal>
        </View>

        <Timeline entries={TIMELINE} style={styles.constrained} />
      </RevealSection>
    ),
    [markChapter, pagePadding, clamp],
  );

  const reasonsSection = useMemo(
    () => (
      <RevealSection
        onTop={markChapter("reasons")}
        style={[
          styles.section,
          {
            paddingHorizontal: pagePadding,
            paddingVertical: clamp(60, 9, 120),
          },
        ]}
      >
        <View style={styles.constrainedWide}>
          <View style={styles.sectionHead}>
            <Reveal>
              <Text style={[styles.eyebrow, styles.centered]}>
                {REASONS_SECTION.eyebrow}
              </Text>
            </Reveal>
            <Reveal delay={100}>
              <Text
                style={[
                  styles.sectionTitle,
                  styles.centered,
                  { fontSize: clamp(38, 7, 80), marginTop: 14 },
                ]}
              >
                {REASONS_SECTION.title}
              </Text>
            </Reveal>
          </View>

          <View style={[styles.grid, { marginTop: clamp(32, 5, 54) }]}>
            {REASONS.map((reason, index) => (
              <Reveal
                key={reason.index}
                delay={index * 70}
                style={cardWidth ? { width: cardWidth } : styles.gridFull}
              >
                <FlipCard
                  reason={reason}
                  onFlip={(x, y) => pop(x, y, 7, 0.7)}
                />
              </Reveal>
            ))}
          </View>
        </View>
      </RevealSection>
    ),
    [markChapter, pagePadding, clamp, cardWidth, pop],
  );

  const songSection = useMemo(
    () => (
      <RevealSection
        onTop={markChapter("song")}
        style={[
          styles.section,
          styles.songSection,
          {
            paddingHorizontal: pagePadding,
            paddingTop: clamp(80, 12, 150),
            paddingBottom: clamp(96, 14, 180),
          },
        ]}
      >
        <Reveal
          from="left"
          distance={width + 320}
          duration={SONG_ENTRANCE_MS}
          scaleFrom={1}
        >
          <JogWheel
            playing={songPlaying}
            onPress={toggleSong}
            size={clamp(250, 38, 440)}
            captionStyle={styles.songCaption}
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
        </Reveal>

        <Reveal
          from="right"
          distance={width + 320}
          duration={SONG_ENTRANCE_MS}
          scaleFrom={1}
          style={styles.songLineWrap}
        >
          <Text
            style={[
              styles.songLine,
              {
                fontSize: clamp(24, 4, 44),
                lineHeight: clamp(24, 4, 44) * 1.34,
              },
            ]}
          >
            {SONG.line}
          </Text>
        </Reveal>
      </RevealSection>
    ),
    [
      markChapter,
      pagePadding,
      clamp,
      width,
      songPlaying,
      songEnded,
      songTouched,
      toggleSong,
    ],
  );

  return (
    <View style={styles.root}>
      <LilyBloomAnimation
        ref={lily}
        scrollRange={Math.max(
          1,
          carouselOwnsScroll ? scrollRange - carouselSpan : scrollRange,
        )}
        sampleOffset={sampleOffset}
        dim={cinematic ? 1 : 0}
        /* Nearly full even by day. The clip is blended with `screen` and then
           washed and vignetted on the way out, so what reaches the reader is
           already a fraction of this — holding it back another fifth here was
           most of why the bloom was hard to see at all. */
        opacity={cinematic ? 1 : 0.96}
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
        contentContainerStyle={[
          styles.content,
          // Enough to keep the last line clear of the floating pills and no
          // more. The 120 this used to be was clearance for the footer.
          { paddingBottom: 32 + insets.bottom },
        ]}
        onScroll={onScroll}
        onScrollBeginDrag={onBeginDrag}
        onScrollEndDrag={onEndDrag}
        onMomentumScrollEnd={armLock}
        onContentSizeChange={onContentSizeChange}
        onLayout={onScrollViewLayout}
        // Every event on the web, where the hold has to answer each pixel
        // before it is painted; once per frame on a phone, where the native
        // position locks subscribe to the same throttled stream this governs
        // — starving them was the stage and the journal shaking against the
        // scroll. See `SCROLL_THROTTLE`.
        scrollEventThrottle={SCROLL_THROTTLE}
        showsVerticalScrollIndicator={false}
      >
        {/* One provider for the whole scroller: it tells a section when it has
            arrived, and hands the scroll offset itself to the few blocks —
            the stacked timeline — that animate against it directly. */}
        <ScrollRevealProvider
          value={reveal.value}
          anchors={anchors.value}
          scrollY={scrollY}
          scrollYNative={HAND_SCROLL ? undefined : scrollYNative}
          viewportHeight={height}
        >
          <RevealSection
            style={[
              styles.hero,
              {
                minHeight: height - insets.top,
                paddingHorizontal: pagePadding,
                paddingTop: clamp(isCompact ? 26 : 64, 10, 108) + insets.top,
                paddingBottom: clamp(isCompact ? 22 : 44, 7, 84),
              },
            ]}
          >
            <Pressable
              onPress={(event) =>
                pop(event.nativeEvent.pageX, event.nativeEvent.pageY, 9, 0.8)
              }
              style={[styles.heroStage, MOBILE_APP && styles.heroStageCentred]}
            >
              <View
                style={[
                  styles.heroBand,
                  stacked && styles.heroBandStacked,
                  stacked && isCompact && styles.heroBandCompact,
                  MOBILE_APP && styles.heroBandCentred,
                ]}
              >
                <View
                  style={[
                    styles.heroCorner,
                    stacked && styles.heroCornerStacked,
                    MOBILE_APP && styles.heroCornerCentred,
                  ]}
                >
                  <Reveal delay={120}>
                    <HeroTitle size={clamp(44, 10.5, 118)} live={heroLive} />
                  </Reveal>
                </View>

                <View
                  style={[
                    styles.heroCornerEnd,
                    stacked && styles.heroCornerStacked,
                    MOBILE_APP && styles.heroCornerCentred,
                  ]}
                >
                  <Reveal
                    delay={190}
                    style={[
                      styles.heroSubtitleWrap,
                      stacked && styles.heroSubtitleWrapStacked,
                      MOBILE_APP && styles.heroSubtitleWrapCentred,
                    ]}
                  >
                    <Text
                      style={[
                        styles.heroSubtitle,
                        stacked && styles.heroSubtitleStacked,
                        MOBILE_APP && styles.heroSubtitleCentred,
                        {
                          fontSize: heroSubtitleSize,
                          lineHeight: heroSubtitleSize * 1.55,
                        },
                      ]}
                    >
                      {HERO.subtitle}
                    </Text>
                  </Reveal>
                </View>
              </View>

              <View
                style={[
                  styles.heroCentre,
                  stacked && styles.heroCentreStacked,
                  isCompact && styles.heroCentreCompact,
                  MOBILE_APP && styles.heroCentreApp,
                ]}
              >
                <Reveal delay={260}>
                  <HeroHeart
                    size={isCompact ? clamp(92, 22, 132) : clamp(132, 24, 296)}
                    live={heroLive}
                  />
                </Reveal>
              </View>

              <View
                style={[
                  styles.heroFoot,
                  stacked && styles.heroFootStacked,
                  stacked && isCompact && styles.heroFootCompact,
                  MOBILE_APP && styles.heroFootCentred,
                ]}
              >
                <View
                  style={[
                    styles.heroCorner,
                    stacked && styles.heroCornerStacked,
                    MOBILE_APP && styles.heroCornerCentred,
                  ]}
                >
                  <Reveal>
                    <HeroMark />
                  </Reveal>

                  {!MOBILE_APP && (
                    <View style={styles.heroIndex}>
                      {HERO.chapters.map((chapter, index) => (
                        <Reveal key={chapter.key} delay={110 + index * 45}>
                          <ChapterLink
                            label={chapter.label}
                            onPress={() => scrollToChapter(chapter.key)}
                          />
                        </Reveal>
                      ))}
                    </View>
                  )}
                </View>

                {!stacked && heroHint}

                <Reveal
                  delay={300}
                  style={
                    MOBILE_APP
                      ? styles.heroCardWrapApp
                      : stacked
                        ? undefined
                        : styles.heroCardWrap
                  }
                >
                  <InviteCard onPress={scrollToLetter} />
                </Reveal>

                {stacked && heroHint}
              </View>
            </Pressable>
          </RevealSection>

          {pageBuilt && (
            <>
              <ScrollBuffer height={buffer} />

              {letterSection}

              <ScrollBuffer height={buffer} />

              {photosSection}

              <ScrollBuffer height={buffer} />

              {timelineSection}

              <ScrollBuffer height={buffer} />

              {reasonsSection}

              <ScrollBuffer height={buffer} />

              {songSection}

            </>
          )}
        </ScrollRevealProvider>

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

      <Animated.View
        pointerEvents="none"
        style={[styles.progressTrack, { top: insets.top, opacity: ui }]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            {
              transform: [
                {
                  scaleX: (HAND_SCROLL ? scrollY : scrollYNative).interpolate({
                    inputRange: [0, scrollRange],
                    outputRange: [0, 1],
                    extrapolate: "clamp",
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>

      <Animated.View
        pointerEvents={cinematic ? "none" : "auto"}
        style={[
          styles.pillLeft,
          { bottom: clamp(14, 3, 28) + insets.bottom, opacity: ui },
        ]}
      >
        <GlassPill
          label={musicOn ? "Mute music" : "Play music"}
          glyph={musicOn ? "♪" : "✕"}
          onPress={toggleMusic}
          accessibilityLabel="Background music"
        />
      </Animated.View>
      <Animated.View
        pointerEvents={cinematic ? "none" : "auto"}
        style={[
          styles.pillRight,
          { bottom: clamp(14, 3, 28) + insets.bottom, opacity: ui },
        ]}
      >
        <GlassPill
          label={isCompact ? "Cinematic" : "Cinematic mode"}
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

      {cinematic && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.cinematicHint,
            { bottom: clamp(24, 5, 48) + insets.bottom, opacity: cinematicUi },
          ]}
        >
          <Text style={styles.cinematicHintText}>Tap anywhere to return</Text>
        </Animated.View>
      )}
    </View>
  );
}

function ScrollBuffer({ height }: { height: number }) {
  if (height <= 0) {
    return null;
  }
  return <View pointerEvents="none" style={{ height }} />;
}

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
          isInteraction: false,
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.ease),
          isInteraction: false,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [value, duration, enabled]);

  return value;
}

function Beat({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const revealed = useRevealed();
  const beat = useLoop(1200, !reducedMotion && revealed);

  return (
    <Animated.Text
      style={[
        style,
        {
          transform: [
            {
              scale: beat.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.18],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.Text>
  );
}

function HeroMark() {
  return (
    <View style={styles.markRow}>
      <Monogram size={30} />
      <Text style={styles.markLabel}>{HERO.mark}</Text>
    </View>
  );
}

function Monogram({ size }: { size: number }) {
  return (
    <Image
      source={LOGO}
      style={{ width: size, height: size }}
      contentFit="contain"
      transition={0}
      accessibilityLabel={HERO.mark}
    />
  );
}

function ChapterLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const hover = useRef(new Animated.Value(0)).current;

  const animate = (toValue: number) => {
    Animated.timing(hover, {
      toValue,
      duration: toValue === 1 ? 200 : 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Jump to ${label}`}
      onPress={onPress}
      onHoverIn={() => animate(1)}
      onHoverOut={() => animate(0)}
      onPressIn={() => animate(1)}
      onPressOut={() => animate(0)}
      style={styles.chapterPress}
    >
      <Animated.View
        style={[
          styles.chapterRow,
          {
            transform: [
              {
                translateX: hover.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 7],
                }),
              },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.chapterRule,
            {
              opacity: hover.interpolate({
                inputRange: [0, 1],
                outputRange: [0.45, 1],
              }),
              transform: [
                {
                  scaleX: hover.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.6],
                  }),
                },
              ],
            },
          ]}
        />
        <Text style={styles.chapterLabel}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function InviteCard({ onPress }: { onPress: () => void }) {
  return (
    <GlassSurface
      radius={26}
      intensity={30}
      gradient="glassBright"
      contentStyle={styles.cardContent}
      style={styles.cardShell}
    >
      <View style={styles.cardHead}>
        <Monogram size={44} />
        <View style={styles.cardHeadText}>
          <Text style={styles.cardName}>{HERO.note.name}</Text>
          <Text style={styles.cardRole}>{HERO.note.role}</Text>
        </View>
      </View>

      <GradientButton
        onPress={onPress}
        accessibilityLabel={HERO.cta}
        style={styles.cardCta}
      >
        <Text style={styles.heroCtaLabel}>{HERO.cta}</Text>
        <Text style={styles.heroCtaArrow}>→</Text>
      </GradientButton>
    </GlassSurface>
  );
}

/**
 * The centrepiece: the heartbeat, and nothing around it.
 *
 * There used to be two hairline rings here with a mote travelling round each of
 * them. They were drawn to give the middle of the page something quietly in
 * motion — and the middle of the page turned out to be the one place the hero
 * has nothing it needs to say, because it is where the bloom is. Two circles
 * and two orbits laid over the flower is exactly the obstruction the corners
 * were pulled apart to avoid, so they are gone and the beat is on its own.
 *
 * The box stays the size it was. It is empty now, but it is what holds the
 * middle band open between the two corner bands, and the heart is centred in
 * it exactly as it was centred in the rings.
 */
function HeroHeart({ size, live }: { size: number; live: boolean }) {
  return (
    <View style={[styles.heroHeart, { width: size, height: size }]}>
      <HeartPulse size={size * 0.3} live={live} />
    </View>
  );
}

/**
 * "For Elle", drawn rather than typed.
 *
 * Two blocks rather than one, because the lead and the name are set in
 * different faces and only a single face can be handed to a glyph at a time.
 * `indexOffset` carries the stagger across the join — the name picks the count
 * up where the lead left it, so one line appears to run through both.
 *
 * Both blocks are anchored left: the headline holds a corner of the hero now
 * rather than sitting in the middle of it, and a wrapped line that centred
 * itself would break that edge.
 */
function HeroTitle({ size, live }: { size: number; live: boolean }) {
  const revealed = useRevealed();

  return (
    <View
      style={[styles.heroTitleRow, MOBILE_APP && styles.heroTitleRowCentred]}
    >
      <TracedText
        text={HERO.titleLead}
        fontFamily={DefaultTheme.fonts.display}
        fontSize={size}
        lineHeight={size * 1.06}
        color={DefaultTheme.colors.ink}
        stroke={DefaultTheme.colors.primary}
        active={revealed}
        paused={!live}
        delay={HERO_TRACE_DELAY}
        style={styles.tracedLeft}
      />

      {/* The word space. It cannot live inside either block — it belongs to
          neither face, and a traced glyph has no trailing advance. */}
      <View style={{ width: size * 0.24 }} />

      <ShimmerName
        name={HERO.titleName}
        size={size}
        active={revealed}
        live={live}
        // +1 for the space, so the count does not stall on it.
        indexOffset={HERO.titleLead.length + 1}
        style={styles.tracedLeft}
      />
    </View>
  );
}

/**
 * The hero heart.
 *
 * Lub, dub, rest — but eased rather than cut. Each leg of the beat is a sine
 * in and out, so the glyph is never doing anything abruptly, and the cycle
 * both begins and ends at rest, which is what lets it repeat without a seam.
 * The glow behind it rides the same value, blooming on the squeeze and sitting
 * low through the rest, which is what stops it reading as a blinking light.
 */
function HeartPulse({ size, live }: { size: number; live: boolean }) {
  const reducedMotion = useReducedMotion();
  const beat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    /* The beat is two layers — a glyph and a radial bloom behind it — moving
       against each other forever. Native-driven, so it never touches
       JavaScript, but it does hand the compositor a pair of full-time animated
       layers to keep redrawing behind everything the reader has scrolled on
       to. It stops when the hero does, like the headline. See `heroLive`. */
    if (reducedMotion || !live) {
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        // the squeeze…
        Animated.timing(beat, {
          toValue: 1,
          duration: 400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        // …most of the way back…
        Animated.timing(beat, {
          toValue: 0.34,
          duration: 280,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        // …the smaller second thump on the rebound…
        Animated.timing(beat, {
          toValue: 0.78,
          duration: 320,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        // …and down to still.
        Animated.timing(beat, {
          toValue: 0,
          duration: 640,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        // The rest, which is most of a heartbeat and all of why it reads as one.
        Animated.delay(760),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [beat, reducedMotion, live]);

  /* Wide enough for the glow to fall off inside its own box, which also
     supplies the space that used to be the literal space before the emoji. */
  const box = size * 1.9;

  return (
    <View style={[styles.heartSlot, { width: box, height: box }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.heartGlow,
          HEART_GLOW,
          {
            width: box,
            height: box,
            borderRadius: box / 2,
            opacity: beat.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.82],
            }),
            transform: [
              {
                scale: beat.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.86, 1.12],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={{
          transform: [
            {
              scale: beat.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.12],
              }),
            },
          ],
        }}
      >
        <HeartGlyph size={size} />
      </Animated.View>
    </View>
  );
}

/**
 * The heart itself — drawn, rather than an emoji.
 *
 * `❤️` is not one picture: it is whatever glyph the reader's platform happens
 * to ship. A desktop browser renders the glossy, gradient-lit one the design
 * was composed around; a phone renders its own vendor's flat scarlet lozenge.
 * Same character, two different objects, and the centrepiece of the hero was
 * the one thing on the page that changed shape depending on where it was
 * opened.
 *
 * So it is a path now, in the page's own rose, lit from the same upper-left the
 * rest of the design is lit from — one heart everywhere, and one that belongs
 * to this palette rather than to Segoe or Noto.
 */
function HeartGlyph({ size }: { size: number }) {
  /* ——— the browser keeps its emoji ———
   *
   * The drawn path below exists because `❤️` is not one picture: every platform
   * ships its own, so the centrepiece of the hero changed shape depending on
   * where the page was opened. That is a real problem *in the app*, where the
   * vendor glyph is a flat scarlet lozenge that belongs to no palette here —
   * and it is not a problem in a desktop browser, which renders the glossy,
   * gradient-lit heart the design was actually composed around. So the site
   * goes back to the emoji it was drawn with and the app keeps the path, which
   * is the one arrangement in which both of them look like the reference. */
  if (!MOBILE_APP) {
    return (
      <Text
        selectable={false}
        style={{ fontSize: size, lineHeight: size * 1.2 }}
      >
        ❤️
      </Text>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        {/* The house angle, so the heart is lit like every other surface. */}
        <SvgGradient id="heartBody" x1="0" y1="0.1" x2="1" y2="0.95">
          <Stop offset="0" stopColor="#FF6E92" />
          <Stop offset="0.42" stopColor={DefaultTheme.colors.primary} />
          <Stop offset="1" stopColor="#A80B2E" />
        </SvgGradient>
        {/* The specular: a soft bloom on the left lobe, not a drawn shine. */}
        <SvgGradient id="heartSheen" x1="0.1" y1="0" x2="0.7" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.72} />
          <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0.12} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </SvgGradient>
      </Defs>

      <Path
        d="M16 29.1c-.45 0-.88-.16-1.22-.44C6.5 21.9 1.9 16.3 1.9 10.75 1.9 6.2 5.5 2.7 10 2.7c2.55 0 4.85 1.2 6 3.15 1.15-1.95 3.45-3.15 6-3.15 4.5 0 8.1 3.5 8.1 8.05 0 5.55-4.6 11.15-12.88 17.91-.34.28-.77.44-1.22.44z"
        fill="url(#heartBody)"
      />
      {/* The lift across the top lobes, clipped to the heart by being a smaller
          copy of it rather than by a mask — one shape, so it can never slip. */}
      <Path
        d="M16 29.1c-.45 0-.88-.16-1.22-.44C6.5 21.9 1.9 16.3 1.9 10.75 1.9 6.2 5.5 2.7 10 2.7c2.55 0 4.85 1.2 6 3.15 1.15-1.95 3.45-3.15 6-3.15 4.5 0 8.1 3.5 8.1 8.05 0 5.55-4.6 11.15-12.88 17.91-.34.28-.77.44-1.22.44z"
        fill="url(#heartSheen)"
      />
    </Svg>
  );
}

function Bob({
  children,
  style,
  live = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** False once the hero has scrolled away — see `heroLive`. */
  live?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const bob = useLoop(1400, !reducedMotion && live);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: bob.interpolate({
            inputRange: [0, 1],
            outputRange: [0.75, 1],
          }),
          transform: [
            {
              translateY: bob.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 9],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * The name, drawn in the same line as the lead — and still breathing between
 * the two ends of the rose ramp once the ink is down, exactly as the original
 * `shimmer` keyframe did.
 *
 * The breathing is a native cross-fade now rather than an animated fill. A
 * colour cannot be handed to the native driver, so the old animated-colour
 * version was a `useNativeDriver: false` loop ticking at 60fps for as long as
 * the hero was on screen — a JS frame, a prop write per glyph and a
 * main-thread text redraw, every frame, while the reader sat "idle" at the
 * top of the page. `TracedText` draws each glyph twice instead — once in each
 * rose — and fades the copy on this value, which blends to the same colour at
 * every point of the sweep without JavaScript ever being asked for a frame.
 */
function ShimmerName({
  name,
  size,
  active,
  live,
  indexOffset,
  style,
}: {
  name: string;
  size: number;
  active: boolean;
  /** False once the hero has scrolled away — see `heroLive`. */
  live: boolean;
  indexOffset: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    /* Native-driven, so it costs JavaScript nothing — but it still stops with
       the rest of the headline, because a loop that never ends is a layer the
       compositor redraws forever on behalf of a name six screens behind the
       reader. */
    if (reducedMotion || !live) {
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          isInteraction: false,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          isInteraction: false,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer, reducedMotion, live]);

  return (
    <TracedText
      text={name}
      paused={!live}
      fontFamily={DefaultTheme.fonts.displayItalicRegular}
      fontStyle={ITALIC}
      fontSize={size}
      lineHeight={size * 1.06}
      color={DefaultTheme.colors.primary}
      shimmer={shimmer}
      shimmerColor={DefaultTheme.colors.primarySoft}
      stroke={DefaultTheme.colors.primaryDeep}
      active={active}
      delay={HERO_TRACE_DELAY}
      indexOffset={indexOffset}
      style={style}
    />
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
    justifyContent: "center",
  },
  /** The frame everything in the hero is pinned to the edges of. */
  heroStage: {
    flex: 1,
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
  },
  /**
   * The app's hero: one centred column rather than four pinned corners.
   *
   * `justifyContent: 'center'` is what does the vertical half of it, and it can
   * only work because the middle block gives up its `flexGrow` at the same time
   * — see `heroCentreApp`. With the middle still growing there is no free space
   * left in the column for this to distribute, and the hero would sit exactly
   * where it always did.
   */
  heroStageCentred: {
    justifyContent: "center",
    alignItems: "center",
  },
  /** The top band: a corner at each end of it and nothing in between. */
  heroBand: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 32,
  },
  heroBandStacked: {
    flexDirection: "column",
    gap: 24,
  },
  heroBandCompact: {
    gap: 16,
  },
  /** Centred, and no longer stretched to the full width: a band that fills the
   *  frame centres nothing, because each block inside it is already as wide as
   *  the column it would be centred in. */
  heroBandCentred: {
    alignSelf: "stretch",
    alignItems: "center",
  },
  /**
   * One of the four corner blocks.
   *
   * The whole hero is these and the heart. Each one gathers what used to be a
   * band of its own into a single column pinned to its corner of the frame, so
   * the composition is an empty rectangle with something written in each angle
   * of it — and the flower is what fills the rectangle.
   */
  heroCorner: {
    flexShrink: 1,
    alignItems: "flex-start",
  },
  /** The right-hand pair, which hold their own edge rather than the left one. */
  heroCornerEnd: {
    flexShrink: 1,
    alignItems: "flex-end",
  },
  /** Stacked there are no corners to hold — one column, every block against
   *  the reading edge and free to use the whole width of it. */
  heroCornerStacked: {
    width: "100%",
    alignItems: "flex-start",
  },
  /** …and in the app there is no corner to hold at all: every block takes the
   *  middle of the column. Listed after the stacked rule at every call site, so
   *  it is this one that wins. */
  heroCornerCentred: {
    width: "100%",
    alignItems: "center",
  },
  /** Holds the heart in the middle and pushes the two bands apart. `flexGrow`
   *  rather than `flex`, so a short screen lets the hero grow past its minimum
   *  instead of squeezing the centrepiece. */
  heroCentre: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 26,
  },
  /** A stacked hero is already taller than the screen; the middle is where the
   *  slack comes out of it. */
  heroCentreStacked: {
    paddingVertical: 12,
  },
  heroCentreCompact: {
    paddingVertical: 4,
  },
  /**
   * The heart stops pushing the two bands apart.
   *
   * On the site the middle block is the spacer — it grows into whatever the
   * screen has spare, which is what holds the four corners in their corners. A
   * centred hero wants the opposite: the slack has to stay *outside* the
   * column so `heroStageCentred` can put half of it above and half below. So
   * the block shrinks to the heart, and the heart becomes the middle of a
   * centred stack rather than the thing prising one open.
   */
  heroCentreApp: {
    flexGrow: 0,
    paddingVertical: 18,
  },
  heroFoot: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 30,
  },
  heroFootStacked: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 26,
  },
  heroFootCompact: {
    gap: 18,
  },
  heroFootCentred: {
    alignSelf: "stretch",
    alignItems: "center",
  },
  heroCardWrap: {
    width: 306,
    flexShrink: 0,
  },
  /** The invitation keeps a card's width rather than a column's — stretched to
   *  the full frame it stops reading as a card at all — and is centred in it. */
  heroCardWrapApp: {
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
  },

  /* hero — the mark */
  markRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  markLabel: {
    fontFamily: DefaultTheme.fonts.displayItalicRegular,
    fontStyle: ITALIC,
    fontSize: 20,
    letterSpacing: 0.6,
    color: DefaultTheme.colors.ink,
  },

  /* hero — the index */
  /** Sits under the mark in the bottom corner, so the space between the two is
   *  carried here rather than by a gap on the block — the headline in the
   *  opposite corner sets its own, and the two must not be told the same one. */
  heroIndex: {
    gap: 2,
    marginTop: 16,
  },
  chapterPress: {
    paddingVertical: 6,
    // The row is what moves on hover, so the touch target must not.
    alignSelf: "flex-start",
  },
  chapterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  /** The mark in front of the label — the reference's slash, drawn. */
  chapterRule: {
    width: 14,
    height: 1,
    transformOrigin: "left",
    backgroundColor: DefaultTheme.colors.primary,
  },
  chapterLabel: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: DefaultTheme.colors.label,
  },

  /* hero — the paragraph */
  heroSubtitleWrap: {
    maxWidth: 400,
    flexShrink: 1,
    marginTop: 10,
  },
  heroSubtitleWrapStacked: {
    maxWidth: 560,
  },
  /** `fontSize` and `lineHeight` are set by the caller — they scale together. */
  heroSubtitle: {
    fontFamily: DefaultTheme.fonts.displayItalic,
    fontStyle: ITALIC,
    color: DefaultTheme.colors.inkFaint,
    textAlign: "right",
  },
  heroSubtitleStacked: {
    textAlign: "left",
  },
  heroSubtitleCentred: {
    textAlign: "center",
  },
  /** Wider than the site's measure, because the type is a step larger and the
   *  column it is centred in is the whole screen. */
  heroSubtitleWrapCentred: {
    maxWidth: 620,
    marginTop: 18,
  },

  /* hero — the centrepiece */
  heroHeart: {
    alignItems: "center",
    justifyContent: "center",
  },
  heartSlot: {
    alignItems: "center",
    justifyContent: "center",
  },
  heartGlow: {
    position: "absolute",
  },

  /* hero — the headline */
  badge: {
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  badgeText: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11.5,
    letterSpacing: 2.8,
    textTransform: "uppercase",
    color: "#A83258",
  },
  heroTitleRow: {
    marginTop: 22,
    flexDirection: "row",
    // Lets the title break between its blocks on a narrow screen instead of
    // shouldering the name off the edge.
    flexWrap: "wrap",
    alignItems: "center",
  },
  /** In the app the headline takes the middle, and wraps into it. */
  heroTitleRowCentred: {
    justifyContent: "center",
  },
  /** Both halves of the headline hold the left edge, wrapped or not. */
  tracedLeft: {
    justifyContent: "flex-start",
  },

  /* hero — the invitation */
  cardShell: {
    ...DefaultTheme.shadow.soft,
  },
  cardContent: {
    padding: 18,
    gap: 16,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  cardHeadText: {
    flexShrink: 1,
    gap: 3,
  },
  cardName: {
    fontFamily: DefaultTheme.fonts.displayMedium,
    fontSize: 20,
    lineHeight: 24,
    color: DefaultTheme.colors.ink,
  },
  cardRole: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 9.5,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: DefaultTheme.colors.label,
  },
  cardCta: {
    minHeight: 46,
    paddingHorizontal: 22,
  },
  heroCtaLabel: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: DefaultTheme.colors.white,
  },
  heroCtaArrow: {
    fontFamily: DefaultTheme.fonts.body,
    fontSize: 14,
    lineHeight: 16,
    color: DefaultTheme.colors.white,
  },

  /* hero — the hint */
  heroHint: {
    alignItems: "center",
    gap: 8,
    paddingBottom: 6,
  },
  heroHintStacked: {
    alignItems: "flex-start",
    paddingBottom: 0,
  },
  heroHintCentred: {
    alignItems: "center",
    alignSelf: "center",
    paddingBottom: 0,
  },
  heroHintArrow: {
    fontFamily: DefaultTheme.fonts.body,
    fontSize: 13,
    lineHeight: 15,
    color: DefaultTheme.colors.primary,
  },

  /* shared section furniture */
  section: {
    width: "100%",
  },
  /** See the journal section — this keeps a page that is still arriving in
   *  front of the section underneath it. */
  timelineSection: {
    zIndex: 1,
  },
  sectionHead: {
    alignItems: "center",
    marginBottom: 34,
  },
  constrained: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
  },
  constrainedWide: {
    width: "100%",
    maxWidth: 1080,
    alignSelf: "center",
  },
  centered: {
    textAlign: "center",
  },
  eyebrow: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11.5,
    letterSpacing: 3.2,
    textTransform: "uppercase",
    color: DefaultTheme.colors.label,
  },
  eyebrowDark: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: DefaultTheme.colors.label,
  },
  sectionTitle: {
    fontFamily: DefaultTheme.fonts.display,
    color: DefaultTheme.colors.ink,
  },

  /* letter */
  scrollHolder: {
    width: "100%",
    maxWidth: 820,
    alignSelf: "center",
  },
  letterParagraph: {
    marginTop: 20,
  },
  letterParagraphText: {
    fontFamily: DefaultTheme.fonts.display,
    color: DefaultTheme.colors.inkSoft,
  },
  letterClosing: {
    marginTop: 24,
  },
  letterClosingText: {
    fontFamily: DefaultTheme.fonts.displayItalicRegular,
    fontStyle: ITALIC,
    color: DefaultTheme.colors.primaryDark,
  },
  signatureRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    flexWrap: "wrap",
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },
  gridFull: {
    width: "100%",
  },

  /* song */
  /** The clip that lets both halves start a screen's width outside the page
   *  without the page itself growing sideways to accommodate them. */
  songSection: {
    alignItems: "center",
    overflow: "hidden",
  },
  songLineWrap: {
    width: "100%",
    maxWidth: 760,
    marginTop: 54,
  },
  /** `fontSize` and `lineHeight` are set by the caller — they scale together. */
  songLine: {
    fontFamily: DefaultTheme.fonts.displayItalic,
    fontStyle: ITALIC,
    color: DefaultTheme.colors.ink,
    textAlign: "center",
  },
  /** Off the rose card now, so the caption is ink like everything else. */
  songCaption: {
    fontSize: 12.5,
    color: DefaultTheme.colors.label,
  },

  /* chrome */
  progressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    zIndex: 60,
  },
  progressFill: {
    width: "100%",
    height: "100%",
    transformOrigin: "left",
    ...GradientStyles.base,
    backgroundColor: DefaultTheme.colors.primary,
  },
  pillLeft: {
    position: "absolute",
    left: 16,
    zIndex: 70,
  },
  pillRight: {
    position: "absolute",
    right: 16,
    zIndex: 70,
  },
  cinematicHint: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 80,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  cinematicHintText: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 2.8,
    textTransform: "uppercase",
    color: "rgba(255, 255, 255, 0.85)",
  },
});
