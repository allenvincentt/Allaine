import { useVideoPlayer, VideoView } from 'expo-video';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { GradientStyles } from '@/constants/gradient';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const LILY = require('@/assets/videos/LilyFlowerBloom2.scrub.720.mp4');

const SCRUB_START_SECONDS = 2;
const SCRUB_END_SECONDS = 8;

const BRANCH_ZOOM_WIDE = 2.15;
const BRANCH_ZOOM_COMPACT = 1.12;
const BRANCH_ZOOM_COMPACT_WIDTH = 420;
const BRANCH_ZOOM_WIDE_WIDTH = 900;
const BRANCH_SHIFT = { x: -0.06, y: 0.05 };


const CHASE_SECONDS = 0.28;

const MAX_RATE = 4;
const MIN_RATE = 0.25;

const PLAY_ABOVE_SECONDS = 1 / 30;
const PAUSE_BELOW_SECONDS = 1 / 120;

const SEEK_AHEAD_SECONDS = 1.5;

const SEEK_BEHIND_SECONDS = 1 / 30;

const RATE_EPSILON = 0.02;

const SEEK_WATCHDOG_MS = 250;

const NATIVE_SEEK_INTERVAL_MS = 120;

const MAX_WAIT_TICKS = 240;

const SURFACE = Platform.OS === 'android' ? ('textureView' as const) : undefined;

const SCRUB_MODE_BLOCKS_PLAYBACK = Platform.OS === 'android';

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function branchZoom(width: number): number {
  const through = clamp01(
    (width - BRANCH_ZOOM_COMPACT_WIDTH) / (BRANCH_ZOOM_WIDE_WIDTH - BRANCH_ZOOM_COMPACT_WIDTH),
  );
  return BRANCH_ZOOM_COMPACT + (BRANCH_ZOOM_WIDE - BRANCH_ZOOM_COMPACT) * through;
}

function asVideoElement(candidate: unknown): HTMLVideoElement | null {
  return typeof HTMLVideoElement !== 'undefined' && candidate instanceof HTMLVideoElement
    ? candidate
    : null;
}

export type LilyBloomAnimationHandle = {
  notify: (offsetY: number) => void;
};

type LilyBloomAnimationProps = {
  scrollRange?: number;
  sampleOffset?: () => number | null;
  opacity?: number;
  dim?: number;
  style?: StyleProp<ViewStyle>;
};

export const LilyBloomAnimation = forwardRef<LilyBloomAnimationHandle, LilyBloomAnimationProps>(
  function LilyBloomAnimation({ scrollRange, sampleOffset, opacity = 0.82, dim = 0, style }, ref) {
    const reducedMotion = useReducedMotion();
    const fade = useRef(new Animated.Value(0)).current;
    const scrubbing = scrollRange !== undefined;

    const viewRef = useRef<VideoView>(null);

    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const framing = useMemo(() => {
      const zoom = branchZoom(screenWidth);
      const roomX = (screenWidth * (zoom - 1)) / 2;
      const roomY = (screenHeight * (zoom - 1)) / 2;
      const hold = (shift: number, room: number) => {
        const limit = Math.max(0, room - 1);
        return Math.min(limit, Math.max(-limit, shift));
      };

      return {
        transform: [
          { translateX: hold(BRANCH_SHIFT.x * screenWidth, roomX) },
          { translateY: hold(BRANCH_SHIFT.y * screenHeight, roomY) },
          { scale: zoom },
        ],
      };
    }, [screenWidth, screenHeight]);

    const player = useVideoPlayer(LILY, (instance) => {
      instance.muted = true;
      if (scrubbing) {
        instance.seekTolerance = { toleranceBefore: 1 / 12, toleranceAfter: 1 / 12 };
      } else {
        instance.loop = true;
        instance.playbackRate = 0.6;
        instance.play();
      }
    });

    useEffect(() => {
      if (scrubbing) {
        return;
      }
      if (reducedMotion) {
        player.pause();
      } else {
        player.play();
      }
    }, [player, reducedMotion, scrubbing]);

    const revealedRef = useRef(false);
    const opacityRef = useRef(opacity);
    opacityRef.current = opacity;

    const revealVideo = useCallback(() => {
      if (revealedRef.current) {
        return;
      }
      revealedRef.current = true;
      Animated.timing(fade, {
        toValue: opacityRef.current,
        duration: 1400,
        useNativeDriver: true,
      }).start();
    }, [fade]);

    useEffect(() => {
      const timer = setTimeout(revealVideo, 1200);
      return () => clearTimeout(timer);
    }, [revealVideo]);

    useEffect(() => {
      if (!revealedRef.current) {
        return;
      }
      Animated.timing(fade, {
        toValue: opacity,
        duration: 700,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    }, [fade, opacity]);

    const night = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.timing(night, {
        toValue: dim,
        duration: reducedMotion ? 0 : 700,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    }, [night, dim, reducedMotion]);

    const rangeRef = useRef(1);
    const lastOffsetRef = useRef(0);
    const targetRef = useRef(0);
    const sampleRef = useRef(sampleOffset);
    sampleRef.current = sampleOffset;

    const rafRef = useRef<number | null>(null);
    const waitTicksRef = useRef(0);

    const videoElRef = useRef<HTMLVideoElement | null>(null);
    const detachRef = useRef<(() => void) | null>(null);
    const seekPendingRef = useRef(false);
    const seekIssuedAtRef = useRef(0);
    const playingRef = useRef(false);
    const rateRef = useRef(1);
    const scrubModeRef = useRef(false);
    const durationRef = useRef(0);

    const stopLoop = useCallback(() => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }, []);

    const setScrubbing = useCallback(
      (next: boolean) => {
        if (scrubModeRef.current === next) {
          return;
        }
        scrubModeRef.current = next;
        player.scrubbingModeOptions = { scrubbingModeEnabled: next };
      },
      [player],
    );

    const setPlayback = useCallback(
      (next: boolean) => {
        if (playingRef.current === next) {
          return;
        }
        playingRef.current = next;
        if (next) {
          if (SCRUB_MODE_BLOCKS_PLAYBACK) {
            setScrubbing(false);
          }
          player.play();
        } else {
          player.pause();
        }
      },
      [player, setScrubbing],
    );

    const tickRef = useRef<(now: number) => void>(() => {});

    const kick = useCallback(() => {
      if (rafRef.current === null) {
        waitTicksRef.current = 0;
        rafRef.current = requestAnimationFrame((now) => tickRef.current(now));
      }
    }, []);

    const bindElement = useCallback(() => {
      if (videoElRef.current) {
        return videoElRef.current;
      }
      const element = asVideoElement(viewRef.current?.nativeRef?.current);
      if (!element) {
        return null;
      }
      videoElRef.current = element;

      const release = () => {
        seekPendingRef.current = false;
        kick();
      };
      element.addEventListener('seeked', release);
      element.addEventListener('error', release);

      const onVisibility = () => {
        if (document.visibilityState === 'hidden') {
          setPlayback(false);
        } else {
          kick();
        }
      };
      document.addEventListener('visibilitychange', onVisibility);

      detachRef.current = () => {
        element.removeEventListener('seeked', release);
        element.removeEventListener('error', release);
        document.removeEventListener('visibilitychange', onVisibility);
      };
      return element;
    }, [kick, setPlayback]);

    useEffect(() => () => detachRef.current?.(), []);

    const tick = useCallback(
      (now: number) => {
        const sampled = sampleRef.current?.();
        if (sampled != null) {
          lastOffsetRef.current = sampled;
          targetRef.current = clamp01(sampled / rangeRef.current);
        }

        if (durationRef.current <= 0) {
          const reported = player.duration;
          if (reported > 0) {
            durationRef.current = reported;
          }
        }
        const duration = durationRef.current;
        if (duration <= 0) {
          waitTicksRef.current += 1;
          if (waitTicksRef.current > MAX_WAIT_TICKS) {
            stopLoop();
            return;
          }
          rafRef.current = requestAnimationFrame((next) => tickRef.current(next));
          return;
        }
        waitTicksRef.current = 0;

        const element = bindElement();
        if (seekPendingRef.current && now - seekIssuedAtRef.current > SEEK_WATCHDOG_MS) {
          seekPendingRef.current = false;
        }

        const end = Math.min(SCRUB_END_SECONDS, duration);
        const start = Math.min(SCRUB_START_SECONDS, end);
        const targetTime = start + targetRef.current * (end - start);

        const currentTime = element ? element.currentTime : player.currentTime;
        const gap = targetTime - currentTime;

        const mustSeek =
          gap > SEEK_AHEAD_SECONDS ||
          gap < -SEEK_BEHIND_SECONDS ||
          (reducedMotion && Math.abs(gap) > PAUSE_BELOW_SECONDS);

        if (mustSeek) {
          setPlayback(false);
          setScrubbing(true);

          const paced = element
            ? !seekPendingRef.current
            : now - seekIssuedAtRef.current >= NATIVE_SEEK_INTERVAL_MS;

          if (paced) {
            player.currentTime = targetTime;
            seekIssuedAtRef.current = now;
            seekPendingRef.current = element !== null;
          }
        } else if (gap > PLAY_ABOVE_SECONDS || (playingRef.current && gap > PAUSE_BELOW_SECONDS)) {
          setScrubbing(false);
          const rate = Math.min(MAX_RATE, Math.max(MIN_RATE, gap / CHASE_SECONDS));
          if (Math.abs(rate - rateRef.current) > RATE_EPSILON) {
            player.playbackRate = rate;
            rateRef.current = rate;
          }
          setPlayback(true);
        } else {
          setPlayback(false);
          setScrubbing(false);
        }

        const quiet = gap <= PLAY_ABOVE_SECONDS && gap >= -SEEK_BEHIND_SECONDS;
        if (!playingRef.current && !seekPendingRef.current && quiet) {
          stopLoop();
          return;
        }

        rafRef.current = requestAnimationFrame((next) => tickRef.current(next));
      },
      [player, reducedMotion, bindElement, stopLoop, setPlayback, setScrubbing],
    );

    useEffect(() => {
      tickRef.current = tick;
    }, [tick]);

    useImperativeHandle(
      ref,
      () => ({
        notify: (offsetY: number) => {
          if (!scrubbing) {
            return;
          }
          lastOffsetRef.current = offsetY;
          const next = clamp01(offsetY / rangeRef.current);
          if (rafRef.current === null && next === targetRef.current) {
            return;
          }
          targetRef.current = next;
          kick();
        },
      }),
      [scrubbing, kick],
    );

    useEffect(() => {
      if (!scrubbing) {
        return;
      }
      kick();
      return () => {
        stopLoop();
        setPlayback(false);
      };
    }, [scrubbing, kick, stopLoop, setPlayback]);

    useEffect(() => {
      rangeRef.current = Math.max(1, scrollRange ?? 1);
      if (!scrubbing) {
        return;
      }
      targetRef.current = clamp01(lastOffsetRef.current / rangeRef.current);
      kick();
    }, [scrollRange, scrubbing, kick]);

    return (
      <View pointerEvents="none" style={[styles.root, style]}>
        <View
          renderToHardwareTextureAndroid
          style={[StyleSheet.absoluteFill, styles.blendGroup]}>
          <View style={[StyleSheet.absoluteFill, styles.field]} />

          <Animated.View style={[StyleSheet.absoluteFill, styles.night, { opacity: night }]} />

          <Animated.View style={[styles.videoLayer, { opacity: fade }]}>
            <VideoView
              ref={viewRef}
              player={player}
              style={[styles.video, framing]}
              contentFit="cover"
              nativeControls={false}
              allowsPictureInPicture={false}
              playsInline
              surfaceType={SURFACE}
              useExoShutter={false}
              onFirstFrameRender={revealVideo}
            />
          </Animated.View>
        </View>

        <Animated.View
          renderToHardwareTextureAndroid
          style={[
            StyleSheet.absoluteFill,
            { opacity: night.interpolate({ inputRange: [0, 1], outputRange: [1, 0.12] }) },
          ]}>
          <View style={[StyleSheet.absoluteFill, styles.scrimCenter]} />
          <View style={[StyleSheet.absoluteFill, styles.scrimTop]} />
          <View style={[StyleSheet.absoluteFill, styles.vignette]} />
        </Animated.View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    zIndex: 0,
  },
  blendGroup: {
    isolation: 'isolate',
  },
  field: {
    ...GradientStyles.field,
  },
  night: {
    backgroundColor: '#0B0308',
  },
  videoLayer: {
    ...StyleSheet.absoluteFill,
    mixBlendMode: 'screen',
  },
  video: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  scrimCenter: {
    ...GradientStyles.scrimCenter,
  },
  scrimTop: {
    ...GradientStyles.scrimTop,
  },
  vignette: {
    ...GradientStyles.vignette,
  },
});
