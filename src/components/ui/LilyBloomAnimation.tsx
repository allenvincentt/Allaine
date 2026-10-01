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

/**
 * The scrub build, not the original: same footage, re-encoded with a keyframe
 * every 5 frames instead of two in the whole clip.
 *
 * Seeking backwards is the one thing playback cannot do, so scrolling up is
 * served by seeks — and a seek costs the decode from the previous keyframe
 * forward. On the original that was up to 148 frames for a single picture,
 * which is why scrolling up stepped. Here it is at most 4.
 *
 * ——— and 720p rather than 1080p ———
 *
 * Because almost none of those rows were ever reaching the reader. The layer is
 * fitted with `cover`, and cover fills by whichever side needs the most
 * magnification — on a portrait handset that is the height, by a factor of
 * better than two, which means three quarters of the source's *width* is
 * cropped away before `BRANCH_ZOOM_COMPACT` has even been applied. The decoder
 * was still decoding all of it: two million pixels a frame, on every played
 * frame and again on every frame of every seek, on the same thread the page is
 * being scrolled on. At 1280×720 that is 2.25× less work per frame for a
 * picture that is then washed, vignetted and composited with `screen` at the
 * back of the page — which is to say, for no difference anybody can see.
 *
 * Frame count, frame rate, duration and keyframe spacing are all identical to
 * the 1080p build, so nothing that reads this clip by time had to move. The
 * original is kept beside it: re-point this line to go back.
 */
const LILY = require('@/assets/videos/LilyFlowerBloom2.scrub.720.mp4');

/**
 * The full scroll range maps onto this window of the source clip, in seconds.
 * Nothing outside it is ever shown: the clip is parked at the start until the
 * page is scrolled, and the chase below cannot run past the end.
 */
const SCRUB_START_SECONDS = 2;
const SCRUB_END_SECONDS = 8;

/* ——— how much of the clip is on screen ———
 *
 * The source is a wide shot: several stems, several blooms, and the one that
 * actually opens is a modest part of the frame. Covered to a phone — tall,
 * narrow, and cropped on the long side — that bloom came out a couple of
 * hundred pixels across, sat behind a wash and a vignette, and was composited
 * with `screen`, which can only ever *add* light to a page that is already
 * pale. Three separate reasons for the same outcome: a background that was
 * technically playing and effectively invisible.
 *
 * So the frame is pushed in until a single branch fills the screen. It is a
 * crop, not a re-encode: `contentFit="cover"` still decides the fit, and this
 * scales what `cover` produced, with `root`'s `overflow: hidden` taking the
 * rest. `SHIFT` slides that crop off centre as a fraction of the screen —
 * positive is right and down — because the stem worth keeping is rarely in the
 * exact middle of a shot.
 *
 * ——— and how much of it a phone needs ———
 *
 * Far less, because `contentFit="cover"` has already done most of the pushing
 * in by the time the frame reaches a tall, narrow screen. Cover fills by the
 * shorter side, so a 16:9 source covering a portrait phone is scaled until its
 * *height* fits and better than two thirds of its width is thrown away before
 * this scale is applied at all. Multiplying that by the figure a desktop needs
 * lands on a couple of petals blown up past the point of being a flower — a
 * wash of pink filling the screen, which is what the background looked like on
 * a phone and is the one thing a crop this deliberate must not produce.
 *
 * So the zoom is a ramp rather than a number: the full push-in on a window wide
 * enough that cover is barely cropping anything, almost none of it on a phone
 * where cover is already framing a branch by itself, and a straight line
 * between the two. The widths either end are viewport widths in px.
 *
 * All of these are framing rather than logic. Nothing else reads them, and
 * changing them cannot break the scrub; if the crop lands on the wrong stem,
 * move it by eye.
 */
const BRANCH_ZOOM_WIDE = 2.15;
const BRANCH_ZOOM_COMPACT = 1.12;
const BRANCH_ZOOM_COMPACT_WIDTH = 420;
const BRANCH_ZOOM_WIDE_WIDTH = 900;
const BRANCH_SHIFT = { x: -0.06, y: 0.05 };

/* ————————————————— how the clip is moved —————————————————
 *
 * By *playing* it toward the scroll position, not by seeking to it.
 *
 * A seek is random access: the decoder has to restart from the previous
 * keyframe and decode forward to the target. However the seeks are scheduled,
 * every one of them lands as a discrete jump, so a seek-driven scrub can only
 * ever be a slideshow of the frames the decoder happened to reach — which is
 * exactly the frame-at-a-time stepping this replaces.
 *
 * Playback is sequential, the one case a video codec is actually built for. It
 * costs a fraction as much per frame and, more to the point, it moves the
 * picture *continuously in real time* — the element paints every intermediate
 * frame on its own clock, at whatever refresh rate it can sustain, with no help
 * from this loop.
 *
 * So the loop's whole job is choosing a speed: `playbackRate` is set from the
 * distance still to cover, which makes the decoder itself the interpolator. It
 * is always moving, and always moving at the speed the page is. Seeking is left
 * for the two things playback cannot do — jump a long gap, and go backwards.
 */

/**
 * Proportional gain, as a time constant in seconds: the rate picked is the one
 * that would close the entire remaining gap in this long. Short enough to stay
 * pinned to the scroll, long enough to read as gliding rather than snapping.
 *
 * It is also what makes the chase incapable of overshooting. The rate is always
 * `gap / CHASE_SECONDS`, so one frame of playback advances the clip by
 * `gap × frame / CHASE_SECONDS` — a small fraction of the gap while the frame
 * time stays well under the time constant. The clip approaches the target and
 * stops there; it can never cross it, and so can never run past the window end.
 */
const CHASE_SECONDS = 0.28;

/**
 * Rate ceiling. Every multiple is a real multiple of decode work — at 4× a 1080p
 * source needs 120 frames/s — so this is where "catches up faster" turns back
 * into "drops frames", which is the thing being fixed. Gaps too big to close at
 * this rate are handed to a seek instead.
 */
const MAX_RATE = 4;
/**
 * Rate floor. The tail of an exponential approach is arbitrarily slow, so below
 * this the last fraction of a frame is covered at a constant crawl instead of
 * asymptotically. Still far too slow to cross the target within one frame.
 */
const MIN_RATE = 0.25;

/**
 * Hysteresis around the target, in seconds of clip. Playback starts when the gap
 * opens past a frame and stops once it is inside an eighth of one; keeping the
 * two apart is what stops a slow drift from stuttering the element between
 * playing and paused every frame.
 */
const PLAY_ABOVE_SECONDS = 1 / 30;
const PAUSE_BELOW_SECONDS = 1 / 120;

/**
 * A forward gap this large is not worth playing through even at the ceiling, so
 * it buys one seek's stall to close it — the jump from a cold `currentTime` of 0
 * into the window, or a fling faster than the clip can be played.
 *
 * It has to stay clear of `MAX_RATE × CHASE_SECONDS` (1.12s), which is the gap a
 * scroll running at the rate ceiling settles into and holds. Sitting below that
 * would make sustained fast scrolling flap between chasing and seeking — the
 * stutter this whole approach exists to remove — so the margin above it is the
 * point, not slack.
 */
const SEEK_AHEAD_SECONDS = 1.5;

/**
 * Backwards is the one direction playback cannot go, so scrolling up is served
 * by seeks and stays as coarse as the decoder is. The threshold keeps sub-frame
 * jitter from spending a decode on a frame already on screen.
 */
const SEEK_BEHIND_SECONDS = 1 / 30;

/** Rate changes smaller than this aren't worth a property write. */
const RATE_EPSILON = 0.02;

/**
 * A seek that never reports back (a decoder hiccup, a `seeked` swallowed during
 * a tab switch) would otherwise park the pacer forever. Release it after this.
 *
 * Since the web path issues one seek per completion, this is the only thing that
 * can free it, so it trades two ways: too short abandons decodes that were still
 * coming, too long freezes the picture whenever an event really is lost. Against
 * the scrub build's four-frame seeks it sits about two orders of magnitude clear
 * of an honest one, so it only ever fires on a genuine loss. It would need
 * raising again for a source with sparse keyframes.
 */
const SEEK_WATCHDOG_MS = 250;

/**
 * Native reports no seek completion — `currentTime` is fire and forget — so
 * there is nothing to retarget against and the native path keeps a plain
 * minimum spacing between writes instead.
 *
 * And "fire and forget" is exactly why the spacing has to be generous. On the
 * web a seek is self-pacing: one is in flight, the next is aimed wherever the
 * page has reached by the time it retires, and the decoder is never asked for
 * two things at once. Native has no such feedback, so this interval is the
 * *only* thing standing between a scroll and a queue of seeks — and at 64ms a
 * fast scroll issued about fifteen a second, each one a fresh decode from a
 * keyframe, piling into a player that had not finished the last. That is a
 * decoder thrashing, and it is felt as the whole page stuttering rather than
 * as the background being coarse.
 *
 * At 120 it is roughly eight a second, which the decoder can actually retire.
 * The picture during a fling is a little steppier for it — that is the trade,
 * and it is the right way round: the scrub is only ever *watched* once the
 * scrolling slows, and by then the gap has closed enough that the chase is
 * playing the clip rather than seeking it. See `SEEK_AHEAD_SECONDS`.
 */
const NATIVE_SEEK_INTERVAL_MS = 120;

/** Give up polling for the clip's `duration` after this many idle ticks (~4s at 60fps). */
const MAX_WAIT_TICKS = 240;

/**
 * Android renders a `VideoView` into a `SurfaceView` by default, and a
 * `SurfaceView` is not part of the view hierarchy's drawing at all — it is a
 * separate compositor layer punched in behind the window. Nothing drawn in the
 * tree can be composited *with* it, which takes out both of the things this
 * clip is: a layer faded up by an `Animated` opacity, and a layer blended into
 * the page with `screen`. The result on a phone was a background that never
 * appeared. A `TextureView` draws like any other view, so the fade, the blend
 * and the scrims over the top all behave the way they do on the web.
 *
 * The trade the docs name is power and performance, and it is the right one
 * here: this is one muted, offscreen-composited clip that is the whole reason
 * the page has a background.
 */
const SURFACE = Platform.OS === 'android' ? ('textureView' as const) : undefined;

/**
 * Whether scrubbing mode has to be taken off the player before it will play.
 *
 * On Android it does, and this is not a tuning knob — `scrubbingModeEnabled`
 * *suppresses playback* there for as long as it is set. Pinned on, as it was,
 * the chase below was writing `playbackRate` and calling `play()` into a player
 * that had been told to ignore both, so the one mechanism this whole component
 * moves the picture with was dead on the platform it was meant to help. The
 * clip only ever advanced on the seeks, and on a phone that is a background
 * that does nothing when the page is scrolled.
 *
 * So the flag now follows the decision the loop is already making every frame:
 * on for a seek, which is the interaction it exists to optimise, and off the
 * moment the clip is asked to play.
 */
const SCRUB_MODE_BLOCKS_PLAYBACK = Platform.OS === 'android';

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** How far in the crop is pushed on a viewport this wide. See `BRANCH_ZOOM_WIDE`. */
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
  /** Feed this the raw scroll offset in px on every scroll event — cheap, no React work. */
  notify: (offsetY: number) => void;
};

type LilyBloomAnimationProps = {
  /**
   * Scrollable content height minus viewport height, in px. When provided, the
   * clip is driven by the scroll offset's position within that range — played
   * toward it at whatever speed keeps up, and parked when it arrives — rather
   * than looping on its own.
   */
  scrollRange?: number;
  /**
   * Reads the scroller's *live* offset, or returns null where that cannot be
   * read (native, or before the scroller mounts) and `notify` is the only feed.
   * Called once per animation frame, so it must be a cheap property read.
   */
  sampleOffset?: () => number | null;
  opacity?: number;
  /**
   * 0 for the daylight page, 1 for night. Darkens the field the clip sits on and
   * pulls back the pink scrims laid over it, so the bloom — which is composited
   * with `screen` — lifts off a dark backdrop instead of washing into a bright
   * one. The scrub keeps running either way; this only changes what it is seen
   * against.
   */
  dim?: number;
  style?: StyleProp<ViewStyle>;
};

export const LilyBloomAnimation = forwardRef<LilyBloomAnimationHandle, LilyBloomAnimationProps>(
  function LilyBloomAnimation({ scrollRange, sampleOffset, opacity = 0.82, dim = 0, style }, ref) {
    const reducedMotion = useReducedMotion();
    const fade = useRef(new Animated.Value(0)).current;
    const scrubbing = scrollRange !== undefined;

    const viewRef = useRef<VideoView>(null);

    /* The crop that picks one branch out of the wide shot. Held against the
       window rather than the layer's own box: this is a full-bleed background,
       and measuring it would cost a layout pass to learn what the window
       already knows. See `BRANCH_ZOOM_WIDE`. */
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const framing = useMemo(() => {
      const zoom = branchZoom(screenWidth);
      /* The layer can only be slid as far as the scale has grown it. Past that
         the edge it was slid away from comes off the screen and the flat field
         behind shows through as a band down the side — which never happened at
         a zoom of 2.15 and happens immediately at the one a phone now gets. */
      const roomX = (screenWidth * (zoom - 1)) / 2;
      const roomY = (screenHeight * (zoom - 1)) / 2;
      // A pixel short of the limit, so rounding on the way to the compositor
      // cannot leave a hairline of the field showing along the edge.
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
        // A no-op on web (expo-video keeps it as a dummy to match the native
        // interface) — the web path is paced off the `seeked` event instead.
        // On native it is what keeps a scrub seek cheap. Scrubbing mode itself
        // is *not* set here: it is turned on and off around each seek, because
        // on Android leaving it on stops the clip playing at all. See
        // `SCRUB_MODE_BLOCKS_PLAYBACK`.
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

    /** Whether the opening fade has run, so later `opacity` changes retarget it. */
    const revealedRef = useRef(false);
    const opacityRef = useRef(opacity);
    opacityRef.current = opacity;

    // Reads the latest opacity through a ref rather than closing over it, so
    // this keeps one identity for the life of the component — the reveal below
    // is a one-shot on a timer, and it must not be rearmed by a mode change.
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

    // `onFirstFrameRender` never fires on some web builds, so reveal on a timer
    // too — whichever lands first wins, and the second is a no-op re-run.
    useEffect(() => {
      const timer = setTimeout(revealVideo, 1200);
      return () => clearTimeout(timer);
    }, [revealVideo]);

    // Once it is showing, follow later changes to `opacity` directly — night
    // mode lifts the clip to full, and that should not wait out another reveal.
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

    /* ——————————————————— scroll scrubbing ———————————————————
     *
     * The loop never positions the clip itself. It only ever answers one
     * question per frame — *how fast should this be moving right now* — and
     * leaves the moving to the element, which does it continuously and on its
     * own clock. That split is what the smoothness rests on: the picture is no
     * longer produced a frame at a time by whatever this loop managed to ask
     * for, it is simply playing, and the loop steers it.
     *
     * The target is always *where the page is*, never *how far the last event
     * moved*, so a wheel's coarse ~100px notches and a touchpad's fine ~3px
     * stream both come out as the same continuous motion.
     */
    const rangeRef = useRef(1);
    const lastOffsetRef = useRef(0);
    const targetRef = useRef(0);
    // Read every frame by the loop; kept in a ref so a new callback identity
    // cannot force `tick` to be rebuilt mid-scroll.
    const sampleRef = useRef(sampleOffset);
    sampleRef.current = sampleOffset;

    const rafRef = useRef<number | null>(null);
    const waitTicksRef = useRef(0);

    const videoElRef = useRef<HTMLVideoElement | null>(null);
    const detachRef = useRef<(() => void) | null>(null);
    const seekPendingRef = useRef(false);
    const seekIssuedAtRef = useRef(0);
    /** Whether the clip has been asked to play, so play/pause is only written on a change. */
    const playingRef = useRef(false);
    const rateRef = useRef(1);
    /** Whether the player is currently in scrubbing mode. See `setScrubbing`. */
    const scrubModeRef = useRef(false);
    /**
     * The last positive `duration` the player reported.
     *
     * Android publishes it once the source is prepared and can report 0 again
     * across a track change or a surface swap; without a latch, one such frame
     * would send the loop back to the "nothing is known yet" branch and stall
     * the picture mid-scroll for no reason. A clip's length does not change.
     */
    const durationRef = useRef(0);

    const stopLoop = useCallback(() => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }, []);

    /**
     * Scrubbing mode, held only for as long as there is scrubbing to do.
     *
     * The platforms want opposite things from it and both are served by tying
     * it to the seek: Android needs it *off* before it will play at all, and
     * both want it *on* for a burst of seeks. Written only on a change, since
     * it reconfigures the decoder.
     */
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

    /** Play/pause is a state change on the element, so only write real changes. */
    const setPlayback = useCallback(
      (next: boolean) => {
        if (playingRef.current === next) {
          return;
        }
        playingRef.current = next;
        if (next) {
          // Order matters on Android: playback is suppressed for as long as
          // scrubbing mode is set, so it has to come off before the `play`.
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

    /**
     * Binds to the underlying `<video>` the first time it exists. `nativeRef` is
     * the HTMLVideoElement on web and a native view handle everywhere else, so
     * the instance check is also the platform check.
     */
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
        // The loop stays awake for the duration of a seek, so this is normally
        // redundant — it is here for the paths that park it anyway, so a landing
        // frame can never be the thing nobody follows up on.
        kick();
      };
      element.addEventListener('seeked', release);
      // A seek past the buffered edge resolves as an error rather than a
      // `seeked`; without this the pacer would wait out the watchdog every time.
      element.addEventListener('error', release);

      // A hidden tab stops delivering animation frames but does not stop
      // playback, so the chase would lose its steering while the clip kept
      // running — out through the end of the window and into footage that is no
      // part of this. Stop it at the door and pick the chase back up on return.
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
        // Prefer the scroller's live offset over the last one an event carried.
        // Scroll events are a lossy feed: react-native-web drops every event
        // that lands inside the `scrollEventThrottle` window and emits nothing
        // on the trailing edge, so the newest event during a fast or sustained
        // scroll can be a long way behind where the page actually is — and the
        // gap only closes ~100ms after the scrolling stops. Reading the scroller
        // itself makes the target exact on every frame regardless. Events still
        // matter: `notify` is what wakes the loop up.
        const sampled = sampleRef.current?.();
        if (sampled != null) {
          lastOffsetRef.current = sampled;
          targetRef.current = clamp01(sampled / rangeRef.current);
        }

        /* Nothing can be aimed at until the clip's length is known — and once
           it is, this stops asking. Every read here is a synchronous hop into
           the player, made on the same thread the scroll is being read on,
           sixty times a second for the whole of every scroll; a clip's length
           does not change, so all but the first of those were spent
           re-learning the one number this loop already had written down. The
           latch was already here for Android's zeroes — see `durationRef` —
           which is exactly what makes skipping the read safe. */
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

        // Idempotent; the listener attaches the first time the element exists.
        // A real element also *is* the platform check — only web has one.
        const element = bindElement();
        if (seekPendingRef.current && now - seekIssuedAtRef.current > SEEK_WATCHDOG_MS) {
          seekPendingRef.current = false;
        }

        const end = Math.min(SCRUB_END_SECONDS, duration);
        const start = Math.min(SCRUB_START_SECONDS, end);
        const targetTime = start + targetRef.current * (end - start);

        // The element's own clock is the feedback signal — where the picture
        // actually is, not where it was last asked to be. Read straight off the
        // element on web; the player's getter allocates to reach the same value.
        const currentTime = element ? element.currentTime : player.currentTime;
        const gap = targetTime - currentTime;

        /* — the two things playback cannot do, plus the case that must not move
             continuously at all: reduced motion takes the cut instead of the
             glide, but still only when the gap is worth a decode. — */
        const mustSeek =
          gap > SEEK_AHEAD_SECONDS ||
          gap < -SEEK_BEHIND_SECONDS ||
          (reducedMotion && Math.abs(gap) > PAUSE_BELOW_SECONDS);

        if (mustSeek) {
          setPlayback(false);
          // The interaction scrubbing mode exists for. Held for the run of
          // seeks rather than struck around each one, so the decoder is not
          // reconfigured twice a frame during a fling.
          setScrubbing(true);

          // Web — exactly one seek in flight, aimed wherever the page has got to
          // by the moment the previous one retires. Writing `currentTime` again
          // mid-seek does not put a frame up any sooner; it only moves the
          // goalposts for a decode already running, so the work done so far is
          // thrown away. Issuing on completion spends every decode on the newest
          // position instead. Native reports nothing back, so it keeps a plain
          // minimum spacing between writes.
          const paced = element
            ? !seekPendingRef.current
            : now - seekIssuedAtRef.current >= NATIVE_SEEK_INTERVAL_MS;

          if (paced) {
            player.currentTime = targetTime;
            seekIssuedAtRef.current = now;
            // Only web can clear this, via the `seeked` listener. Leaving it
            // false on native is what lets the loop settle there immediately
            // after the last write instead of waiting out the watchdog.
            seekPendingRef.current = element !== null;
          }
        } else if (gap > PLAY_ABOVE_SECONDS || (playingRef.current && gap > PAUSE_BELOW_SECONDS)) {
          /* — the ordinary case: pick a speed and let the element move — */
          setScrubbing(false);
          const rate = Math.min(MAX_RATE, Math.max(MIN_RATE, gap / CHASE_SECONDS));
          if (Math.abs(rate - rateRef.current) > RATE_EPSILON) {
            player.playbackRate = rate;
            rateRef.current = rate;
          }
          setPlayback(true);
        } else {
          setPlayback(false);
          // Parked. Coming off scrubbing mode here means the next chase can
          // start playing on its own first frame rather than spending one
          // reconfiguring the decoder — and on Android it is also what stops a
          // clip that happens to settle after a seek from being left in the one
          // state it cannot play out of.
          setScrubbing(false);
        }

        // Park when there is nothing this loop would do with another frame:
        // stopped, nothing in flight, and the gap inside the band that neither
        // starts playback nor justifies a seek. That band is wider than the one
        // playback stops at, and testing the narrow one here would leave the
        // loop awake at 60fps forever every time a scroll happened to settle
        // inside the hysteresis. The next scroll event — or a landing `seeked` —
        // starts it up again.
        const quiet = gap <= PLAY_ABOVE_SECONDS && gap >= -SEEK_BEHIND_SECONDS;
        if (!playingRef.current && !seekPendingRef.current && quiet) {
          stopLoop();
          return;
        }

        rafRef.current = requestAnimationFrame((next) => tickRef.current(next));
      },
      [player, reducedMotion, bindElement, stopLoop, setPlayback, setScrubbing],
    );

    // The rAF callback reaches `tick` through this ref so that a re-created
    // `tick` (a `reducedMotion` flip, say) takes effect on the very next frame
    // without having to tear the running loop down and start it again.
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
          // Absolute position within the scrollable range — never a per-event
          // delta. This is what makes a wheel notch and a touchpad glide agree.
          const next = clamp01(offsetY / rangeRef.current);
          /* A parked loop is not woken to re-learn a number it already has.
             Through the whole of the carousel's span the fold hands this the
             same offset on every scroll event — see `scrubOffset` — and every
             wake was one tick whose first act is reading the player's clock,
             a synchronous hop into native made on the busiest frames the page
             has. A running loop still takes every update; parked, only a
             target that actually moved is worth a frame. */
          if (rafRef.current === null && next === targetRef.current) {
            return;
          }
          targetRef.current = next;
          kick();
        },
      }),
      [scrubbing, kick],
    );

    // Start scrubbing on mount so the opening frame lands even before the first
    // scroll — from a cold `currentTime` of 0 that first gap is a long one, so
    // it resolves as a seek into the window. Stop the loop and leave the clip
    // paused on the way out; the chase is the only thing that ever plays it.
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

    // Re-sync against the last known offset whenever the scrollable range is
    // (re)computed, so a resize can't leave the frame stuck on a stale mapping.
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
        {/* ——— the blend, paid for only when it changes ———
            `screen` forces everything up to the nearest isolation boundary
            through an offscreen buffer every time it is drawn — and it is
            drawn every time *anything on the page* moves, because the window
            redraws as one: a petal drifting past the scroller was enough to
            re-run a full-screen blend for a clip that was parked. So the
            boundary and the blend live together on this group, and on Android
            the group is rendered to its own hardware texture: the offscreen
            pass now re-runs only when something inside it changes — a decoded
            frame, the reveal fade, the night dim — and an idle page composites
            one cached texture instead. The scrims above are outside it, on a
            cached texture of their own, for the same reason. */}
        <View
          renderToHardwareTextureAndroid
          style={[StyleSheet.absoluteFill, styles.blendGroup]}>
          <View style={[StyleSheet.absoluteFill, styles.field]} />

          {/* Under the clip, not over it — `screen` blending adds light, so
              what sits behind decides whether the bloom glows or washes out. */}
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
              // Android only, and load-bearing there — see `SURFACE`.
              surfaceType={SURFACE}
              // No shutter over the first frame; the layer is faded up by hand.
              useExoShutter={false}
              onFirstFrameRender={revealVideo}
            />
          </Animated.View>
        </View>

        {/* The daylight wash. Pulled back at night, or its pink would sit on top
            of the dark field and undo it. */}
        <Animated.View
          /* Three full-screen ramps, none of which ever changes — and all three
             sitting directly over a video that invalidates the layer beneath
             them on every frame it decodes. Left to itself Android re-draws all
             three gradients across the whole screen at the clip's frame rate,
             for a picture that is identical every time. Cached once as a
             texture it is composited instead, and the one thing about it that
             does move — the night fade — is an alpha on that texture, which is
             exactly what a hardware layer is for. */
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
  /** The isolation boundary rides with the blend so the offscreen pass covers
   *  exactly the layers `screen` composites against — the field and the night
   *  — and can be cached as one piece. See the render block. */
  blendGroup: {
    isolation: 'isolate',
  },
  field: {
    ...GradientStyles.field,
  },
  night: {
    // Near-black with the plum left in, so the night still belongs to this
    // palette rather than reading as a grey screen dropped over it.
    backgroundColor: '#0B0308',
  },
  videoLayer: {
    ...StyleSheet.absoluteFill,
    mixBlendMode: 'screen',
  },
  video: {
    // A `<video>` is a replaced element — absolute + inset:0 alone leaves its
    // used width/height at the source's intrinsic size, so it must be forced.
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
