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

/* ——— "Us, in pictures", as a projector ———
 *
 * (The file is still called `PhotoMarquee` — the two counter-scrolling belts
 * that used to be here have been replaced by the carousel below, and the path
 * was kept so nothing else had to move. Rename both together if you like.)
 *
 * One frame at a time, and it is the whole page: the stage fills the viewport
 * edge to edge, and everything else — the month, the line under it, the cards
 * for what is coming — is laid over the print rather than beside it.
 *
 * The section is a *slide* of scroll tall per frame, and the stage is held
 * against the top of the viewport for all of them. So the reader's vertical
 * scroll never moves the page while they are inside it; it drives the carousel
 * instead, sideways, and it drives every part of it off the same number.
 *
 * A slide is deliberately shorter than the screen it fills — see
 * `SLIDE_SHARE`. The frame is the whole page; the scrolling it costs is not.
 */

/* ——— how the stage is held ———
 *
 * On the web, by the browser: `position: sticky`, which the compositor honours
 * without asking JavaScript anything. Holding it by hand means reading the
 * scroll offset and pushing the stage back down by the same amount — and on
 * the web that offset arrives in a scroll event *after* the browser has
 * painted, so one frame of every scroll tick shows a full-screen photograph
 * out of place. Native has no `sticky` and no such lag, so it gets the
 * hand-made version, driven off the same offset. (The journal holds its pages
 * the same way, for the same reasons — see `Timeline`.)
 */
const BROWSER = Platform.OS === 'web';

/** `sticky` is a web-only position; React Native's types stop at `absolute`. */
const STICK_TOP = { position: 'sticky', top: 0 } as unknown as ViewStyle;

/* ——— every frame in the folder ———
 *
 * The carousel is not a written-out list any more: it is whatever is sitting in
 * `src/assets/carousel`. Metro reads the directory at build time through
 * `require.context` — which is why the path, the recursion flag and the filter
 * are all literals here, and have to stay literals. Drop a file in, and it is a
 * slide; take one out, and it is gone. Nothing else has to be edited.
 *
 * Both halves of the pattern are deliberate. The image half is what `expo-image`
 * can decode, the video half what `expo-video` can play, and each extension is
 * also one Metro treats as an asset — a file type outside this list would be
 * bundled as *source* and fail at require time rather than politely not appear.
 *
 * `heic` is deliberately absent, and must stay absent. Metro will happily bundle
 * one and iOS will happily show it, but no browser can decode the format, so a
 * HEIC dropped in here is a slide that is simply blank on the web — and blank in
 * the one place it is hardest to notice. Convert to JPEG before filing.
 */
const CAROUSEL = require.context(
  '../../assets/carousel',
  false,
  /\.(jpe?g|png|gif|webp|bmp|mp4|mov|m4v|webm)$/i,
);

/**
 * The still frame a clip is drawn as wherever it is not being played — see the
 * poster block below for why that matters, which is that the alternative is a
 * hardware decoder held open for a picture that never moves.
 *
 * A file here is matched to a clip by name: `March.jpg` is `March.mp4`'s
 * poster. It is optional — a clip without one falls back to having its opening
 * frame pulled out at runtime — but on a phone that fallback cannot be relied
 * on, so anything filed in the carousel is worth a poster filed here too:
 *
 *   ffmpeg -y -i src/assets/carousel/NAME.mp4 -frames:v 1 \
 *     -vf "scale='min(1440,iw)':'min(1440,ih)':force_original_aspect_ratio=decrease" \
 *     -q:v 3 src/assets/carousel-posters/NAME.jpg
 *
 * Its own directory rather than a corner of `carousel`, so that the rule up
 * there stays exactly what it says: everything in that folder is a slide.
 */
const CAROUSEL_POSTERS = require.context('../../assets/carousel-posters', false, /\.(jpe?g|png|webp)$/i);

/** Which of the two players a file belongs to, worked out from its extension. */
const VIDEO = /\.(mp4|mov|m4v|webm)$/i;

/* ——— the frames that cannot be cropped ———
 *
 * `cover` fills the stage by scaling until the shorter side fits and throwing
 * the rest away, and for the photographs that is the right trade: they are
 * landscape or 4:3, the crop is slight, and filling the screen is worth it.
 *
 * The two clips are the exceptions, and for the same reason. Both were shot on
 * a phone held upright, so covering a tall, narrow stage with them means
 * scaling well past the frame and keeping a slot through the middle — and on
 * `March` that slot lands on the side of a face, blown up close enough that the
 * picture stops being of anybody. So these are shown *whole* instead, with the
 * screen around them filled by the same frame again, scaled to cover and
 * blurred past recognition. Nothing is cropped and nothing is letterboxed
 * against a flat colour, because the surround is the frame's own light.
 *
 * This is a judgement about particular pictures rather than a rule that can be
 * computed, so it is written down as one. A frame named here is shown whole; add
 * to the set if another one is ever filed that cannot survive the crop.
 *
 * Declared above `CAROUSEL_MEDIA` and it has to stay above it: that list is
 * built as this module loads and reads this on the way past.
 */
const SHOW_WHOLE = new Set(['march', 'april']);

/** The order the months are read in, so `April.mov` files in after `March`. */
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

/**
 * One slide of the carousel.
 *
 * `month` is the headline the frame is filed under — taken from the file's own
 * name, so `February.JPG` is "February" — and `caption` the line written
 * beneath it, looked up from the written copy by that month.
 */
export type CarouselItem = {
  id: string;
  month: string;
  caption: string;
  kind: 'image' | 'video';
  /** A `require`d asset: a module id on native, a URL on the web. */
  source: number;
  /**
   * For a clip, the still it is drawn as wherever it is not playing — the file
   * filed under the same name in `carousel-posters`, or `null` if there is
   * none, which sends the frame to the runtime fallback. Always `null` for a
   * photograph: it is its own still.
   */
  poster: number | null;
  /** Shown entire against a blurred copy of itself. See `SHOW_WHOLE`. */
  whole: boolean;
};

/** `./February.JPG` → `February`. */
function stem(key: string): string {
  const file = key.slice(key.lastIndexOf('/') + 1);
  const dot = file.lastIndexOf('.');
  return dot > 0 ? file.slice(0, dot) : file;
}

/** Named months first, in calendar order; anything else after them, by name. */
function order(name: string): number {
  const month = MONTHS.indexOf(name.toLowerCase());
  return month === -1 ? MONTHS.length : month;
}

/* The captions still live with the rest of the writing rather than in the
   filenames, so they are matched to a frame by its month. A file with no line
   written for it is shown without one — a missing caption must never be the
   thing that keeps a photograph off the page. */
const CAPTIONS = new Map(
  PHOTOS.map((photo) => [photo.month.toLowerCase(), photo.caption] as const),
);

/** The posters, under the same names their clips are filed under. */
const POSTER_FILES = new Map(
  CAROUSEL_POSTERS.keys().map(
    (key) => [stem(key).toLowerCase(), CAROUSEL_POSTERS<number>(key)] as const,
  ),
);

/**
 * Every supported file in `src/assets/carousel`, in the order they are shown.
 *
 * Built once at module load: the directory cannot change while the app is
 * running, and the page needs the count before it can work out how tall the
 * section is.
 */
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

/**
 * How far through a slide the carousel is taken to have changed hands.
 *
 * Exactly halfway, and it could not be anywhere else: the frames travel as one
 * strip, so the one occupying most of the screen is by definition the one past
 * the midpoint. Everything that reads a whole number — the counter, the month,
 * which card is still ahead — turns on this pixel and no other.
 */
const SWAP = 0.5;

/**
 * How much scrolling one frame is worth, as a share of the screen.
 *
 * Under half a screen, which is the difference between reading the carousel
 * and working it. The frame still fills the viewport — that is the stage, not
 * this — but the *scroll* it costs is short, so a wheel flick or a thumb's
 * length of drag is enough to carry one slide off and the next one on. Raising
 * it makes every transition heavier by exactly the same proportion.
 */
const SLIDE_SHARE = 0.45;

/** How far a preview card rises under the pointer, and how long it takes. */
const HOVER_LIFT = 10;
const HOVER_MS = 240;

/** The preview cards, at the reference's 165 × 250. */
const CARD_RATIO = 1.515;

/** The counter under the frame, which is all that is left down there. */
const COUNTER = 26;

/** How hard the surround is blurred. Past the point of reading it as a picture:
 *  it is meant to be colour and light behind the frame, not a second image. */
const BACKDROP_BLUR = 72;

/** Pushed back, so the frame in front of it is unmistakably the subject. */
const BACKDROP_DIM = 'rgba(26, 5, 13, 0.34)';

/**
 * How far past the edges the surround is scaled.
 *
 * A blur samples outwards, so a backdrop drawn exactly to the edges has nothing
 * to sample past them and fades towards transparency in a band around the rim.
 * Oversizing it puts that band off-screen.
 */
const BACKDROP_BLEED = 1.1;

/**
 * Android draws the surround pre-blurred rather than live-blurred, in px.
 *
 * The `BlurView` over it still mounts there — its default Android method is
 * the dark translucent tint the design counts on — but the *blur* comes from
 * handing the backdrop's own still to `expo-image` with a `blurRadius`, which
 * is applied once when the bitmap is drawn and never again. The Dimezis live
 * blur this replaces re-captured and re-blurred a full screen of window on
 * every frame anything on the page moved — petals included — for a backdrop
 * that is a static picture. iOS and the web keep the live blur, where the
 * compositor does it cheaply, and where the no-poster fallback can still be a
 * paused clip that a bitmap blur could not touch.
 */
const BACKDROP_IMAGE_BLUR = Platform.OS === 'android' ? 40 : 0;

/* ——— a still is not a decoder ———
 *
 * Most of the places a clip appears in this section are not playing it: the
 * blurred surround behind a frame shown whole, the frame either side of the one
 * on screen, and the card queued in the rail. Every one of those used to be
 * drawn with a *paused player*, which looks like a still and costs what a
 * playing clip costs — a hardware video decoder, of which a phone has only a
 * handful, and a full-screen surface to put it on.
 *
 * With two clips in the folder that came to seven held at once around the
 * middle of the strip: two surrounds, two frames, two cards, and the background
 * bloom the page is already spending one on. That is not a slow carousel. It is
 * the platform refusing to hand out another codec instance and the app going
 * away underneath the reader — which is what scrolling the photographs did on a
 * phone, and the whole reason this block exists.
 *
 * So a still is drawn as a still, and the still to draw is a file: a poster
 * sitting in `carousel-posters` under the clip's own name. See
 * `CAROUSEL_POSTERS`. It is a picture like any other picture on the page —
 * decoded once, cached by `expo-image`, and correct on every platform.
 *
 * What follows is what happens when there is no such file, and it is a fallback
 * rather than the path: `generateThumbnailsAsync` pulls the opening frame out
 * at runtime through the platform's metadata retriever, holding nothing open
 * afterwards. Made once per clip for the life of the app and remembered here,
 * since the folder cannot change while it is running.
 *
 * It is a fallback because it cannot be relied on. A `require`d clip resolves
 * to a bare raw-resource name in an Android release build; ExoPlayer knows what
 * to do with one, but the retriever underneath this call is handed the string
 * as a URI and cannot open it, so the whole thing throws on exactly the build
 * the reader is holding. And on the web it is not implemented at all — which
 * costs nothing there, since a `<video>` is not a scarce piece of hardware and
 * a browser will happily run all seven; the last fallback below is the paused
 * player the section has always used, unchanged.
 */

/** The frame a clip opens on — which is also the frame `replay` puts back up
 *  when the slide takes the screen, so the swap cannot be seen. */
const POSTER_AT_SECONDS = 0;

/** A generous screen's worth. It is only ever drawn full-bleed behind a blur
 *  set past legibility, or into a card a couple of hundred pixels wide. */
const POSTER_MAX = 1280;

/** Absent while a still is being made; `null` once it is known there will not
 *  be one, which is what sends a caller back to the paused player. */
const posters = new Map<number, VideoThumbnail | null>();
const posterJobs = new Map<number, Promise<VideoThumbnail | null>>();

/** One at a time. Each job builds a player to name the asset it is reading, and
 *  the entire point of this block is not to have several of those at once. */
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
        // Released in the same breath. It exists only to say which file the
        // frame is pulled from; no view is ever mounted against it.
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

/**
 * The still for a clip, or what is known about it so far.
 *
 * `undefined` while it is being made, `null` once it is settled that there will
 * not be one. Pass `null` for a source and nothing is asked for at all, which
 * is how a still image — and the one clip actually playing — opt out.
 *
 * Every frame in the strip mounts one of these when the page is built, long
 * before the reader has scrolled anywhere near the section, so the stills are
 * made and cached during the buffers above it rather than under a thumb.
 */
function useVideoPoster(source: number | null): VideoThumbnail | null | undefined {
  const [poster, setPoster] = useState<VideoThumbnail | null | undefined>(() =>
    source === null ? null : posters.get(source),
  );
  const [asked, setAsked] = useState(source);

  /* A still that has already been made is on screen in the very commit that
     asks for it. Leaving that to an effect would cost a frame of empty stage
     behind every clip the reader scrolls off — the frame stops playing and asks
     for its still in the same render — and reading the cache straight into the
     return value instead is not safe under the React compiler, which is free to
     memoise it against a `source` that has not changed. So it is adjusted here,
     which is React's own answer to an input changing: the component renders
     again before anything is painted, and the value it returns is plain state. */
  if (source !== asked) {
    setAsked(source);
    setPoster(source === null ? null : posters.get(source));
  }

  useEffect(() => {
    if (source === null) {
      return;
    }
    let live = true;
    /* Cached or not, the same call. `makePoster` hands back the job it already
       ran for this clip, which settles on a microtask with the answer it
       settled on the first time — so there is no second path here that could
       leave a mounted frame stuck on "still being made" because the still it
       was waiting for happened to land a moment too early. */
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

/**
 * How much scrolling one frame is worth, in pixels.
 *
 * The page has to know this figure as well as the carousel does — it is the
 * interval the scroll is measured in — so it is worked out here and exported
 * rather than guessed at twice.
 *
 * Rounded, and that rounding is load-bearing. A browser's `scrollTop` is a
 * whole number of pixels, so a fractional slide puts every frame boundary on a
 * fraction the scroller cannot actually hold: the lock asks for 3330.5, the page
 * lands on 3331, and the frame it just locked sits two pixels off centre with a
 * sliver of its neighbour showing down the right-hand edge. Whole pixels here
 * make every boundary an offset the scroller can land on exactly, which is what
 * makes a locked frame fill the viewport and nothing else.
 */
export function photoSlideLength(viewportHeight: number): number {
  return Math.max(1, Math.round(viewportHeight * SLIDE_SHARE));
}

/**
 * How much scroll the carousel adds to the page: one slide for every frame
 * after the first.
 *
 * This is the stretch of scrolling that moves nothing down the page, so it is
 * also the stretch the background clip has to be told to sit out.
 */
export function photoCarouselSpan(count: number, viewportHeight: number): number {
  return Math.max(0, count - 1) * photoSlideLength(viewportHeight);
}

const twoDigit = (value: number) => (value < 10 ? `0${value}` : `${value}`);

/**
 * Where the carousel is, as a fractional frame.
 *
 * Either a value of its own — the case with no scroller under the section — or,
 * far more usually, an interpolation hung straight off the scroll offset. That
 * distinction is the whole of how this section performs: an interpolation is a
 * *derivation*, so on a phone, where the offset is published by the native
 * driver, every transform below is computed on the scrolling thread and the
 * strip physically cannot fall behind the finger dragging it. Nothing is
 * written per frame and JavaScript is not asked anything.
 */
type FrameDriver = Animated.Value | Animated.AnimatedInterpolation<number>;

/**
 * How far either side of the frame on screen anything is worth drawing.
 *
 * Two frames are on screen during a transition and the rest are somewhere past
 * the edge. This used to be an interpolation per frame — seven full-screen
 * layers each recomputing their own opacity sixty times a second to say
 * "nothing has changed". It is a whole number that changes once per slide, so
 * it is read off the index instead and costs nothing between boundaries.
 */
const NEIGHBOURS = 1;

/**
 * How far either side a frame's *picture* is kept mounted — one slide beyond
 * where it is drawn.
 *
 * The two used to be the same number, and the seam showed as a hitch on every
 * boundary: crossing one is what promotes a new neighbour, so its screen-sized
 * bitmap was being decoded and uploaded inside the very transition it was
 * needed for. A slide of head start puts the decode a full screen before the
 * frame can be seen, with the whole of the lock's travel to finish in. One
 * extra picture per side stays resident for it, which is a fraction of what
 * mounting the whole strip used to hold.
 */
const MEDIA_NEIGHBOURS = 2;

/** How far ahead a preview card is worth drawing — its fade-in starts here. */
const CARDS_AHEAD = 5;

type PhotoCarouselProps = {
  photos: CarouselItem[];
  /** The section's own label, set small in the corner of every frame. */
  eyebrow: string;
  title: string;
  /** Shown once, top right, where there is room for it. */
  hint?: string;
  /**
   * Takes the page to the scroll offset a given frame starts at. Without it the
   * cards still work, but by moving the carousel under a page that has not
   * moved — which is only right when there is no scroller.
   */
  onSeek?: (offsetY: number) => void;
  /**
   * True when the section is mounted but not on the screen — cinematic mode,
   * which fades the whole page out and hands the carousel's stretch of scroll
   * back to the reader.
   *
   * The strip goes on tracking the scroll either way; it costs nothing and it
   * is what makes the section right the instant the page returns. The *clips*
   * are the part that must stop. A reader can now cross the whole span in one
   * fling, which would start and wind back a decoder per frame on the way past
   * — a run of full-screen video work, on the same thread the background clip
   * is being scrubbed on, for pictures at zero opacity.
   */
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

  /* ——— how wide a frame actually is ———
   *
   * The stage, measured — not the window.
   *
   * The two are not the same number in a desktop browser, and the difference is
   * the vertical scrollbar. `useWindowDimensions` reports `window.innerWidth`,
   * which counts the scrollbar's gutter; the stage is `width: 100%` of the
   * scroller's content box, which does not. So every frame was laid out ~15px
   * wider than the screen it was drawn on, and — far worse — the strip was
   * shifted by that same oversized figure per slide. The error compounds: by
   * `March`, the third frame, the strip had been pushed two scrollbars too far
   * left and the frame ended ~30px short of the right-hand edge, showing a bare
   * strip of the stage down the side of the picture. The last frame was out by
   * seven.
   *
   * Measuring closes it at the source. The frames, the strip's travel and the
   * card rail are all laid out against the box they are actually painted in, so
   * a frame covers the stage exactly and the shift lands each one flush.
   * `width` is still what decides the *composition* below — whether the month
   * sits beside the picture or under it is a question about the screen, not
   * about the scrollbar.
   *
   * Falls back to the window until the first layout, which is one frame with
   * nothing on screen yet, and is exact on native where there is no gutter.
   */
  const [measured, setMeasured] = useState(0);
  const frameWidth = measured || width;
  const onStageLayout = useCallback((event: LayoutChangeEvent) => {
    /* Up, never down. A stage on a fractional pixel is normal in a browser, and
       a frame rounded *down* from one is a hairline of bare stage down its
       right edge — the same defect at a twentieth of the size. Rounded up it
       overlaps its neighbour by a fraction of a pixel instead, which is behind
       the frame in front of it and cannot be seen. */
    const next = Math.ceil(event.nativeEvent.layout.width);
    setMeasured((current) => (current === next ? current : next));
  }, []);

  const count = photos.length;
  const viewport = metrics?.viewportHeight ?? height;
  /** What one frame costs in scroll — not the height of the stage. */
  const slide = photoSlideLength(viewport);
  const span = photoCarouselSpan(count, viewport);

  /* ——— the shape of a frame ———
   * Wide, the reference's composition: the month down the left, the cards
   * running off the right edge. Below that there is no room for two columns,
   * so the same pieces stack — cards along the bottom, the month above them —
   * and the frame keeps the rest of the screen. */
  const stacked = width < 860;
  const pad = clamp(22, 5, 72);

  const cardWidth = stacked ? clamp(94, 24, 132) : clamp(140, 14, 208);
  const cardHeight = Math.round(cardWidth * CARD_RATIO);
  const gap = clamp(12, 1.6, 26);
  const step = cardWidth + gap;
  /**
   * Where the *next* frame's card sits, with the rest trailing off-screen.
   *
   * Well into the last third of the screen. The cards are a margin note — what
   * is coming, not what is being looked at — and started any further left they
   * become the composition: at just past halfway the queue covered most of the
   * frame, and the photograph was something happening behind it. Here the
   * first card is the only one fully on the page and the rest run off the right
   * edge, which is the whole of what the rail is for.
   */
  const railStart = stacked ? pad : frameWidth * 0.72;

  /** The counter clears the page's own floating pills on a narrow screen. */
  const footBottom = insets.bottom + (stacked ? 78 : clamp(20, 3, 36));
  const railBottom = footBottom + COUNTER + clamp(18, 2.4, 32);
  const railTop = Math.max(clamp(90, 12, 150), (viewport - cardHeight) / 2);

  const monthSize = clamp(46, 9, 118);
  const captionSize = clamp(15, 1.7, 21);

  /** The box every month/caption block is laid out in — they all share it. */
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

  /* ——— what moves the carousel ———
   *
   * The scroll offset, and nothing else: no easing, no follower, no timer.
   * Every moving part of the section is an interpolation of this one value, so
   * the strip, the month and the cards are always at the same point of the same
   * transition, and all three of them stop the instant the reader does. There
   * is no state here that could carry on without them.
   *
   * The native offset is preferred wherever there is one — see `FrameDriver`.
   * Both feeds carry the same number; only the thread it is turned into pixels
   * on differs, and on a phone that is the difference between a strip that
   * tracks the thumb and one that chases it. */
  const driver = metrics?.scrollYNative ?? metrics?.scrollY ?? null;
  const scrubbing = driver !== null && sectionTop !== null && slide > 0 && count >= 2;

  /** Stands in where there is no scroller: the cards move it themselves. */
  const settled = useRef(new Animated.Value(0)).current;

  const frame = useMemo<FrameDriver>(() => {
    if (!scrubbing || driver === null || sectionTop === null) {
      return settled;
    }
    // Clamped, so the ends of the carousel are ends rather than somewhere the
    // scroll can carry the strip past.
    return driver.interpolate({
      inputRange: [sectionTop, sectionTop + span],
      outputRange: [0, count - 1],
      extrapolate: 'clamp',
    });
  }, [scrubbing, driver, sectionTop, span, count, settled]);

  /* ——— which frame is showing ———
   * A whole number, and the only thing here that is still read in JavaScript —
   * the counter, the month, which clip is allowed to play and which frames are
   * worth drawing all turn on it. It comes off the JS copy of the offset, whose
   * listener is called synchronously, and it changes once per slide rather than
   * once per pixel, so the render it causes is not a per-frame cost. */
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);

  useEffect(() => {
    const scrollY = metrics?.scrollY;
    if (!scrollY || sectionTop === null || slide <= 0 || count < 2) {
      return;
    }

    const id = scrollY.addListener(({ value }) => {
      /* ——— only while the section is on the screen ———
         The strip is a reading of the page's offset, and the page has a great
         deal more offset than this section. Between the frame arriving at the
         bottom of the viewport and the last one leaving the top there is a
         photograph to be looked at and this is what moves it; outside that the
         reader is somewhere else entirely, and their scrolling is not an
         instruction to this. Bounded on both sides, so the section is equally
         inert above and below — and re-entering picks the frame up again from
         the offset itself, which is the only thing it was ever read from. */
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

  /* No scroller to read: the cards are the only thing that moves the carousel,
     so the settled frame is where the strip sits. */
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
      // The page is the source of truth wherever there is one, so a card
      // scrolls to the frame and lets the listener above do the rest.
      if (onSeek && sectionTop !== null) {
        onSeek(sectionTop + target * slide);
        return;
      }
      indexRef.current = target;
      setIndex(target);
    },
    [count, onSeek, sectionTop, slide],
  );

  /**
   * Native only: the push that keeps the stage against the top of the screen.
   *
   * Hung off the native offset, which is the entire reason it can be trusted.
   * Computed in JavaScript it was applied a frame after the scroll it was
   * answering, so every tick of a drag put a full-screen photograph a few
   * pixels out of place and then corrected it — a stage visibly shivering
   * against a strip sliding cleanly sideways, which is what "the animations are
   * fighting each other" looks like from the outside.
   */
  const pin = useMemo(() => {
    if (BROWSER || driver === null || sectionTop === null || span <= 0) {
      return null;
    }
    // Linear, and deliberately so — this is a position lock, not an animation.
    return driver.interpolate({
      inputRange: [sectionTop, sectionTop + span],
      outputRange: [0, span],
      extrapolate: 'clamp',
    });
  }, [driver, sectionTop, span]);

  /** The whole strip of frames, moved as one. See `FeaturedFrame`. */
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
        {/* ——— the frames ———
            One strip, laid out once and moved once. Each frame sits at its own
            fixed offset inside it and never animates on its own. */}
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

        {/* ——— the washes that make it readable ——— */}
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

        {/* ——— the mark ——— */}
        <View
          pointerEvents="none"
          style={[styles.head, { top: insets.top + clamp(20, 3, 44), left: pad, right: pad }]}>
          <View style={styles.headText}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={[styles.headTitle, { fontSize: clamp(21, 2.4, 32) }]}>{title}</Text>
          </View>
          {!stacked && hint ? <Text style={styles.hint}>{hint} ↓</Text> : null}
        </View>

        {/* ——— the month ———
            Only the block on screen and its two neighbours are drawn: the fade
            is over well inside half a slide, so the other four are animating
            themselves from nothing to nothing. */}
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

        {/* ——— what is coming ——— */}
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
              /* What is worth drawing, and for a clip what is worth a decoder.
                 A still card stays mounted whether or not it is drawn — that
                 only costs a hidden view, and churning it would buy nothing —
                 so for those this saves the animating alone. A clip's card is a
                 held player, which is a scarcer thing than a view, and the ones
                 already behind the reader give theirs back. */
              live={itemIndex >= index && itemIndex <= index + CARDS_AHEAD}
              /* The index rather than a closure over it. A fresh arrow per
                 card per render is a fresh prop, and a fresh prop is a card
                 that re-renders whatever `memo` says — which on a boundary is
                 every card in the rail rebuilding its interpolations while the
                 reader is mid-scroll. `goTo` is stable; the index is a number. */
              onSelect={goTo}
            />
          ))}
        </Animated.View>

        {/* ——— where we are ———
            The arrows are gone: there is exactly one way through the carousel
            now, and it is scrolling. */}
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

/**
 * One frame, full bleed, sitting at its own place in the strip.
 *
 * The frames are laid out as a strip one screen wide per slide and the *strip*
 * is what moves: it is offset by `-frame × width`, so the frame whose slide the
 * scroll is on lands exactly on the screen, its neighbour a screen to the right
 * before that and a screen to the left after. Scrolling down walks the strip
 * left, scrolling up walks it right, and the two are not two animations — they
 * are one line read in whichever direction the reader is going.
 *
 * Moving the strip rather than each frame is not a tidying-up. Seven frames
 * each interpolating their own `translateX` and `opacity` off the same scroll
 * is fourteen values recomputed and seven views restyled every frame, to place
 * pictures at offsets that never change relative to one another. One transform
 * on one view says the same thing, and says it in a single step the compositor
 * can take on its own.
 *
 * Nothing here has a duration. The transition is the scroll, so a reader who
 * stops halfway is left looking at two half-frames, and the only thing that
 * will finish the movement is more scrolling.
 *
 * ——— and it is only rebuilt when something about it changed ———
 *
 * The section re-renders on every slide boundary, and a boundary is crossed
 * *during* a scroll — several of them during a fling. Without `memo` that one
 * `setIndex` rebuilds every frame in the strip, every month block and every
 * card in the rail, on the frame the reader is being carried across the
 * boundary on. Only two frames' props actually change at a boundary: the one
 * being left and the one arriving. Everything here takes primitives and a
 * `CarouselItem` that is built once at module load, so identity is the same
 * question as equality.
 */
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
  /** Where this frame sits inside the strip. */
  left: number;
  width: number;
  /** Whether it is close enough to the screen to be worth drawing. */
  near: boolean;
  /** Whether it is close enough for its picture to be kept mounted — one
   *  slide wider than `near`, so the decode never lands inside a transition.
   *  See `MEDIA_NEIGHBOURS`. */
  stocked: boolean;
  /** Whether this frame is the one holding the screen. */
  current: boolean;
  /** True for the frame holding the screen — the only one a video plays on.
   *  Narrower than `current`: reduced motion and cinematic mode both leave the
   *  frame on screen without playing it. */
  playing: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      style={[styles.frame, { left, width, opacity: near ? 1 : 0 }]}>
      {/* ——— a far frame holds nothing ———
          Distance used to decide only the opacity, and an invisible frame
          kept its picture mounted — which is a decoded, screen-sized bitmap
          held in memory for every month in the folder, plus a second one for
          each blurred surround, from the moment the page was built. None of
          it could be seen, and all of it had to be *kept*: the total was most
          of the page's media memory, and a device squeezed for memory pays
          for that in collection pauses felt as the whole page hitching — even
          standing still. A frame past `MEDIA_NEIGHBOURS` now mounts nothing
          at all, and the empty shell holds its place in the strip; the
          picture is decoded again (from cache) one whole slide before it can
          be seen. */}
      {!stocked ? null : item.whole ? (
        <>
          {/* ——— the surround ———
              Held as a still, deliberately, and now actually drawn as one. For
              a photograph the second copy is the same decoded bitmap over again
              and costs nothing worth counting; for a clip it was a *second
              decoder*, running the same file in lockstep with the one in front
              of it, behind a blur set past the point where any motion in it
              could be read. Nobody could ever see what it was paying for. It
              keeps its opening frame — see the poster block above.

              Never `current`, whatever the strip is on: there is no reading of
              this layer that is worth a codec. */}
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

          {/* ——— and the frame itself, all of it ——— */}
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

/**
 * The picture, however it is stored — a still or a clip, the same call either
 * way, so the surround and the subject can be drawn from one line each.
 */
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
  /** Whether this frame is the one holding the screen. */
  current: boolean;
  /** Whether this frame is close enough to the screen to be worth a decoder. */
  mounted: boolean;
  fit: 'cover' | 'contain';
  /** Baked into the drawn bitmap, once — the backdrop's blur on Android. See
   *  `BACKDROP_IMAGE_BLUR`. Only a still can carry it; a clip ignores it. */
  blur?: number;
}) {
  /* Only where a clip is *not* being played — which is everywhere but the one
     frame on screen — and only where no poster was filed for it, since a file
     is the answer and this is the fallback. See the poster block above. */
  const generated = useVideoPoster(
    item.kind === 'video' && !playing && item.poster === null ? item.source : null,
  );
  const still = item.poster ?? generated;

  /* ——— a player is a decoder ———
     And a phone has only a handful of those to hand out: the platform backs
     each one with a hardware codec, and asking for more than it has is not a
     slow carousel, it is the media thread throwing and the app going away.
     Every clip in the strip used to hold one whenever it was anywhere near the
     screen, plus a second for its blurred surround — and the page is already
     spending one on the background bloom and more on the rail. Exactly one is
     held now, for the frame actually being played. A still is never unmounted:
     an image costs a cached bitmap, not a codec. */
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

  /* No still to be had — the web, where the call is unimplemented, or a file
     the retriever could not read. Back to a paused player, and on a phone only
     ever for the frame on screen: a blank neighbour is a moment nobody sees, a
     second codec is the app going away. */
  return (BROWSER ? mounted : current) ? (
    <FrameVideo source={item.source} playing={false} fit={fit} />
  ) : null;
}

/**
 * A clip, held as a frame rather than played as a film.
 *
 * Muted and looping, with no controls: it is wallpaper for the slide it is on,
 * and it is the only thing in the section with a clock of its own. It runs only
 * while its slide holds the screen — a carousel quietly playing six videos
 * behind the edges of the one being looked at is six decoders' worth of work
 * nobody can see. Off screen it is wound back to the start, so a frame returned
 * to always opens the same way.
 */
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
    // `replay` rather than `play`, so a slide scrolled back to opens the way it
    // did the first time instead of resuming wherever it was abandoned.
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

/**
 * The month and the line under it.
 *
 * Every frame's block is laid out in the same box and they are all mounted at
 * once, so the one arriving cannot shift the one leaving. Each is gone well
 * before its neighbour appears — two months half-written over each other is
 * the one thing this must never show.
 */
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
  /* Held, not rebuilt. An `interpolate` is a *node* — on a phone it is
     attached to the native animated graph the offset is published into — so
     writing these into the render body meant tearing two of them down and
     standing two more up for every block on screen every time the index
     changed, which is to say in the middle of the scroll that changed it. The
     inputs are the frame driver and this block's own place in the strip, and
     neither moves while the block is mounted. */
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

/**
 * One of the small frames waiting their turn.
 *
 * A card is only ever shown for the frames *after* the one on screen: it fades
 * in as it enters from the right, holds while it queues, and dissolves as it
 * reaches the front — where the full-bleed strip is sliding the same frame in
 * behind it, so the card reads as having become the page.
 *
 * A video's card is its poster: `expo-image` cannot decode a clip, so it gets
 * the same player as the stage does, paused at its first frame.
 */
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
  /** False once this frame is showing or gone — a faded card is not a target. */
  active: boolean;
  /** Whether the card is anywhere near the queue. See `CARDS_AHEAD`. */
  live: boolean;
  /** Handed this card's own index. Stable, so `memo` above is not defeated. */
  onSelect: (index: number) => void;
}) {
  const hover = useRef(new Animated.Value(0)).current;
  const press = useCallback(() => onSelect(index), [onSelect, index]);
  /* A card never plays anything, so a clip's card is only ever a still — the
     poster filed for it, or the runtime fallback where none was. */
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

  /* A card far enough down the queue is at nought and staying there, so it is
     given a flat style rather than three interpolations that spend the whole
     scroll agreeing with each other about it. */
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
        {/* A clip's card is its poster, and a poster is a picture — not, as it
            used to be, a paused player, which is a hardware decoder held open
            for a thumbnail a couple of hundred pixels wide.

            Where no still can be had the old player comes back, but only on the
            web, where players are not scarce and this is what the rail has
            always done. On a phone a card is never worth a codec: without a
            still it stays the tinted plate and the month written across it,
            which is a card that reads a little plainer, rather than the sixth
            decoder that takes the app down. See the poster block above.

            And a card that is not `live` holds no picture at all. It is
            drawn at zero opacity anyway — see `motion` — so what the mount
            was buying for the far end of the rail was a decoded bitmap per
            month, held from page build. The plate and the label keep the
            card's size; the picture arrives (from cache) as the queue brings
            it within reach. */}
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

        {/* The brighten half of the hover — a white edge that comes up with the
            lift, so the card under the pointer is the one that looks next. */}
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
  /** The frame itself: one viewport, held at the top of the screen. */
  stage: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: DefaultTheme.colors.veil,
  },
  /** Native's pin — the browser gets `position: sticky` instead. */
  stagePinned: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },

  /** Every frame, side by side, moved as one piece. See `FeaturedFrame`. */
  strip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  /**
   * One screen of it. Width comes from the caller — it is the viewport's.
   *
   * ——— and it keeps to its own screen ———
   *
   * A frame shown whole scales its surround past its own edges so the blur over
   * it has no rim — see `BACKDROP_BLEED`. That overhang is 5% of a screen on
   * each side, and with nothing clipping it here it was painted into the
   * *neighbouring* frame's slot: the frame either side of the one on screen is
   * drawn too (see `NEIGHBOURS`), so `April`'s surround reached a twentieth of
   * the way across `March`'s screen and sat down the right-hand edge of it as a
   * bright vertical band — raw footage, because the blur and the dim laid over
   * it are `absoluteFill` on April's own box, and that box is off-screen.
   *
   * So each frame is clipped to the screen it occupies. This takes nothing away
   * from the oversizing: the blur samples what is under it *inside* this box,
   * and the surround still covers every pixel of it. All that is thrown away is
   * the part that was never this frame's to draw.
   */
  frame: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },

  /**
   * A picture filling whatever it is put in — and `absoluteFill` will not do it.
   *
   * On the web `VideoView` *is* the `<video>` element and is handed this style
   * directly, and a `<video>` is a replaced element: absolutely positioned with
   * an `auto` width it takes its own intrinsic size and the `right`/`bottom`
   * offsets are simply dropped. So `absoluteFill` left the 1920×1080 clip
   * hanging off the bottom-right corner of the stage and the 720×1280 one
   * standing as a portrait strip against its left edge, neither of them centred
   * and neither of them filling anything. Asking for the size outright is what
   * makes `contentFit` the thing that decides the framing.
   */
  mediaFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  /** The surround, oversized so its blur has no rim. See `BACKDROP_BLEED`. */
  backdrop: {
    transform: [{ scale: BACKDROP_BLEED }],
  },
  backdropDim: {
    backgroundColor: BACKDROP_DIM,
  },

  /* the washes */
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

  /* the mark */
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

  /* the month */
  caption: {
    position: 'absolute',
  },
  /** Stacked, the block has the width of the screen — so it takes the middle. */
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

  /* the cards */
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

  /* the counter */
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
