import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GradientButton } from '@/components/ui/buttons/GradientButton';
import { Handwriting } from '@/components/ui/Handwriting';
import { WaxSeal } from '@/components/ui/WaxSeal';
import { ENVELOPE, RECIPIENT, SEAL_MONOGRAM, SIGNATURE } from '@/constants/content';
import { DefaultTheme } from '@/constants/defaultTheme';
import { GradientStyles } from '@/constants/gradient';
import { useAudioScene } from '@/hooks/useAudioScene';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useResponsive } from '@/hooks/useTheme';

const BACKDROP = require('@/assets/images/photo-01.jpg');

const FRACTURE_MS = 660;
const FLAP_DELAY = 220;
const FLAP_MS = 1180;
const NOTE_DELAY = 800;
const HANDOFF = 1980;

const ENVELOPE_RATIO = 0.743;
const FLAP_RATIO = 0.545;
const SEAL_RATIO = 0.215;
const FLAP_BOW = 0.026;
const FLAP_CREASE = 0.34;
const BODY_RADIUS = 8;
const FLAP_OVERSHOOT = 1.045;
const FLAP_EDGE_ON = 0.52;

const Z = {
  flapBehind: 0,
  shell: 1,
  lining: 2,
  note: 3,
  flapShadow: 4,
  flapFront: 5,
  seal: 6,
} as const;

/* ——— the letter in the pocket, in numbers ———
 * All in points off the envelope's own box rather than percentages: it is
 * drawn inside the throat's clip, whose frame is not the envelope's, so a
 * percentage here would resolve against the wrong thing. */
const NOTE_WIDTH = 0.86;
const NOTE_HEIGHT = 0.84;
/** Where the sheet sits while it is still down in the envelope. */
const NOTE_REST = 0.1;
/** How far it is drawn up out of the throat. */
const NOTE_TRAVEL = 0.68;

/** The flap's shadow, in layers: how far each is dropped, and how dark it is.
 *  Three flat copies of the silhouette rather than one, because there is no
 *  blur here — a soft shadow has to be built out of steps. */
const FLAP_SHADOW = [
  { drop: 0.008, alpha: 0.2 },
  { drop: 0.019, alpha: 0.12 },
  { drop: 0.032, alpha: 0.06 },
] as const;

/** Blocks the pen works through: the greeting, the body, then the signature. */
const BLOCKS = 2 + ENVELOPE.body.length;

export default function EnvelopePage() {
  const router = useRouter();
  const { clamp, width, height } = useResponsive();
  const reducedMotion = useReducedMotion();
  const { startMusic } = useAudioScene();

  const [opened, setOpened] = useState(false);
  /** How many blocks of the letter the pen has finished. */
  const [written, setWritten] = useState(0);
  const [writing, setWriting] = useState(false);
  const [skipped, setSkipped] = useState(false);
  /** Whether the flap has turned past edge-on and is now behind the envelope. */
  const [flapTurned, setFlapTurned] = useState(false);

  const fracture = useRef(new Animated.Value(0)).current;
  const flap = useRef(new Animated.Value(0)).current;
  const note = useRef(new Animated.Value(0)).current;
  const scene = useRef(new Animated.Value(1)).current;
  const letter = useRef(new Animated.Value(0)).current;
  const veil = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;
  const cta = useRef(new Animated.Value(0)).current;

  const envelopeWidth = Math.min(width * 0.82, 620, height * 0.6);
  const envelopeHeight = envelopeWidth * ENVELOPE_RATIO;
  /** How far the flap's point stands off the top edge. */
  const flapHeight = envelopeHeight * FLAP_RATIO;
  const sealSize = Math.max(52, envelopeWidth * SEAL_RATIO);

  const noteWidth = envelopeWidth * NOTE_WIDTH;
  const noteHeight = envelopeHeight * NOTE_HEIGHT;

  /* `flapArc` multiplies the bow by the span itself — handing it a bow that
     has already been scaled squares the sagitta, which sends the arc's centre
     to the wrong side of the chord and clips the whole flap away. */
  const arc = useMemo(
    () => flapArc(envelopeWidth, flapHeight, FLAP_BOW),
    [envelopeWidth, flapHeight],
  );

  const done = written >= BLOCKS;

  useEffect(() => {
    if (reducedMotion) {
      return;
    }
    const drift = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 3600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 3600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    drift.start();
    return () => drift.stop();
  }, [float, reducedMotion]);

  /* The flap starts lying on the front of the envelope and ends up behind it,
     so somewhere in the swing it has to change places with the letter. The
     only place that can happen unseen is the frame where the flap is edge-on
     and has no width to it, which is exactly where the two faces already swap. */
  useEffect(() => {
    const id = flap.addListener(({ value }) => setFlapTurned(value > FLAP_EDGE_ON));
    return () => flap.removeListener(id);
  }, [flap]);

  useEffect(() => {
    if (!done) {
      return;
    }
    const animation = Animated.timing(cta, {
      toValue: 1,
      duration: 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [done, cta]);

  const advance = useCallback(() => setWritten((count) => count + 1), []);

  const open = useCallback(() => {
    if (opened) {
      return;
    }
    setOpened(true);
    startMusic();

    Animated.parallel([
      Animated.timing(fracture, {
        toValue: 1,
        duration: FRACTURE_MS,
        easing: Easing.bezier(0.32, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(FLAP_DELAY),
        Animated.timing(flap, {
          // Carried a little past level, so the sheet has somewhere to fall
          // back from — a flap that stops dead on its mark reads as a hinge.
          toValue: FLAP_OVERSHOOT,
          duration: FLAP_MS,
          // Dips slightly negative first: the flap presses down against the
          // seal before it gives, then swings up.
          easing: Easing.bezier(0.5, -0.12, 0.22, 1),
          useNativeDriver: true,
        }),
        // …and the paper settles onto its own weight. Left underdamped: one
        // clear fall and a much smaller second one, then still.
        Animated.spring(flap, {
          toValue: 1,
          damping: 11,
          stiffness: 74,
          mass: 0.9,
          overshootClamping: false,
          restDisplacementThreshold: 0.001,
          restSpeedThreshold: 0.01,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(NOTE_DELAY),
        Animated.timing(note, {
          toValue: 1,
          duration: 1250,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(HANDOFF),
        Animated.parallel([
          Animated.timing(scene, {
            toValue: 0,
            duration: 900,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
            useNativeDriver: true,
          }),
          Animated.timing(letter, {
            toValue: 1,
            duration: 1000,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(({ finished }) => {
      if (finished) {
        setWriting(true);
      }
    });
  }, [opened, startMusic, fracture, flap, note, scene, letter]);

  const enterSite = useCallback(() => {
    Animated.timing(veil, {
      toValue: 0,
      duration: 850,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => router.replace('/LandingPage'));
  }, [veil, router]);

  /* The flap is edge-on to the camera at 90°, which is 0.52 of the way through
     the swing — the two faces are swapped there, where the join cannot be seen.
     Only the angle is left free to extrapolate, so the settle at the end of the
     swing carries past -168° and comes back; everything else is clamped, and
     cannot be dragged out of range by it. */
  const flapMotion = useMemo(
    () => ({
      angle: flap.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-168deg'] }),
      face: flap.interpolate({
        inputRange: [0, 0.51, 0.53, 1],
        outputRange: [1, 1, 0, 0],
        extrapolate: 'clamp',
      }),
      back: flap.interpolate({
        inputRange: [0, 0.51, 0.53, 1],
        outputRange: [0, 0, 1, 1],
        extrapolate: 'clamp',
      }),
      // Light falls off as the sheet turns away, and comes part-way back once
      // the inner face is up.
      shade: flap.interpolate({
        inputRange: [0, 0.52, 1],
        outputRange: [0, 0.42, 0.15],
        extrapolate: 'clamp',
      }),
      /** A flap that has lifted is no longer lying on the body to shade it. */
      cast: flap.interpolate({
        inputRange: [0, 0.16],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
    }),
    [flap],
  );

  /**
   * What the breaking wax does to the sheet it was stuck to: the point is
   * pulled down against the seal, gives all at once, and rebounds.
   */
  const sealTug = useMemo(
    () =>
      fracture.interpolate({
        inputRange: [0, 0.3, 0.46, 0.7, 1],
        outputRange: [0, 2.2, -2.6, 0.6, 0],
        extrapolate: 'clamp',
      }),
    [fracture],
  );

  return (
    <Animated.View style={[styles.root, { opacity: veil }]}>
      <Image source={BACKDROP} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim]} />

      <Animated.View
        pointerEvents={opened ? 'none' : 'auto'}
        style={[
          styles.sceneWrap,
          {
            opacity: scene,
            transform: [
              { translateY: scene.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
              { scale: scene.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
            ],
          },
        ]}>
        <Animated.View
          style={[
            styles.envelope,
            {
              width: envelopeWidth,
              height: envelopeHeight,
              // Square on to the camera: what lifts the envelope off the
              // backdrop is the shadow underneath it, not a lean. The
              // perspective is kept for the flap, which does turn.
              transform: [
                { perspective: 1600 },
                { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
              ],
            },
          ]}>
          {/* The shadow it floats in — a wide ambient pool, and a tighter core
              directly beneath where the sheet is closest to the surface. */}
          <View
            pointerEvents="none"
            style={[
              styles.ground,
              GradientStyles.envelopeGround,
              {
                left: -envelopeWidth * 0.08,
                right: -envelopeWidth * 0.08,
                bottom: -envelopeHeight * 0.24,
                height: envelopeHeight * 0.5,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.ground,
              GradientStyles.envelopeGroundCore,
              {
                left: envelopeWidth * 0.1,
                right: envelopeWidth * 0.1,
                bottom: -envelopeHeight * 0.1,
                height: envelopeHeight * 0.22,
              },
            ]}
          />

          {/* the body */}
          <View pointerEvents="none" style={[styles.shell, GradientStyles.envelopeShell]}>
            <View style={[StyleSheet.absoluteFill, GradientStyles.envelopeGrainLight]} />
            <View style={[StyleSheet.absoluteFill, GradientStyles.envelopeGrainDark]} />
            <View style={[StyleSheet.absoluteFill, GradientStyles.envelopeSheen]} />
            <View style={[StyleSheet.absoluteFill, GradientStyles.envelopeVignette]} />
            <View style={[StyleSheet.absoluteFill, GradientStyles.envelopeEdge]} />
          </View>

          {/* The inside of the envelope, on show only once the flap is up —
              and cut to exactly the shape the flap vacates. A plain rectangle
              here would show as two dark wedges either side of the flap, since
              there is nothing in front of it any more to hide them. */}
          <View pointerEvents="none" style={styles.liningSlot}>
            <FlapSilhouette span={envelopeWidth} reach={flapHeight} arc={arc}>
              <View style={[StyleSheet.absoluteFill, GradientStyles.envelopeLining]} />
            </FlapSilhouette>
          </View>

          {/* ——— the letter, in the pocket ———
              Laid over the lining, so it is a sheet sitting *in* the envelope
              rather than behind it, and cut to the throat plus everything above
              it. That clip is the whole thing: while the sheet is down in the
              envelope only the part framed by the opening shows, and the front
              panel covers the rest; as it rises, it clears the top edge and
              comes fully into view. It never passes in front of the body and
              never appears from behind it. */}
          <View pointerEvents="none" style={styles.noteSlot}>
            <FlapSilhouette
              span={envelopeWidth}
              reach={flapHeight}
              arc={arc}
              rise={envelopeHeight}>
              <Animated.View
                style={[
                  styles.note,
                  GradientStyles.paper,
                  {
                    left: (envelopeWidth - noteWidth) / 2,
                    top: envelopeHeight * NOTE_REST,
                    width: noteWidth,
                    height: noteHeight,
                    transform: [
                      {
                        translateY: note.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -envelopeHeight * NOTE_TRAVEL],
                        }),
                      },
                      { scale: note.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
                      {
                        rotate: note.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '-1.2deg'],
                        }),
                      },
                    ],
                  },
                ]}>
                <View style={styles.noteRule} />
                <Text style={[styles.noteName, { fontSize: clamp(20, 4.6, 30) }]}>{RECIPIENT}</Text>
              </Animated.View>
            </FlapSilhouette>
          </View>

          {/* The shadow the flap lays on the body: the same silhouette, dropped
              a little, so all that survives of each copy is a band along the
              two cut edges. */}
          <Animated.View
            pointerEvents="none"
            style={[styles.flapShadowSlot, { height: envelopeHeight, opacity: flapMotion.cast }]}>
            {FLAP_SHADOW.map((layer) => (
              <FlapSilhouette
                key={layer.drop}
                span={envelopeWidth}
                reach={flapHeight}
                arc={arc}
                drop={envelopeWidth * layer.drop}>
                <View
                  style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(40,5,9,${layer.alpha})` }]}
                />
              </FlapSilhouette>
            ))}
          </Animated.View>

          {/* ——— the flap ——— */}
          <Animated.View
            style={[
              styles.flapSlot,
              {
                height: flapHeight,
                // Once it is past edge-on it is behind the envelope, and so
                // behind the letter coming out of it.
                zIndex: flapTurned ? Z.flapBehind : Z.flapFront,
                transform: [
                  { perspective: 1400 },
                  { rotateX: flapMotion.angle },
                  { translateY: sealTug },
                ],
              },
            ]}>
            <FlapSilhouette
              span={envelopeWidth}
              reach={flapHeight}
              arc={arc}
              edges
              overlay={
                <Animated.View
                  style={[StyleSheet.absoluteFill, styles.flapShade, { opacity: flapMotion.shade }]}
                />
              }>
              <Animated.View style={[StyleSheet.absoluteFill, { opacity: flapMotion.face }]}>
                <View style={[StyleSheet.absoluteFill, GradientStyles.envelopeFlapFace]} />
                <View style={[StyleSheet.absoluteFill, GradientStyles.envelopeFlapLift]} />
                <View style={[StyleSheet.absoluteFill, GradientStyles.envelopeFlapSheen]} />
              </Animated.View>

              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  GradientStyles.envelopeFlapBack,
                  { opacity: flapMotion.back },
                ]}
              />
            </FlapSilhouette>
          </Animated.View>

          {/* the wax */}
          <View
            style={[styles.sealSlot, { top: flapHeight - sealSize / 2, marginLeft: -sealSize / 2 }]}>
            <WaxSeal
              size={sealSize}
              monogram={SEAL_MONOGRAM}
              emblem="monogram"
              fracture={fracture}
              onPress={open}
              disabled={opened}
              glow={!opened}
              accessibilityLabel="Break the seal and open the letter"
            />
          </View>
        </Animated.View>
      </Animated.View>

      {/* the letter itself */}
      <Animated.View
        pointerEvents={opened ? 'auto' : 'none'}
        style={[
          styles.letterWrap,
          {
            opacity: letter,
            transform: [
              { scale: letter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
            ],
          },
        ]}>
        {/* The scroller is the *viewport*, not the letter — the letter is a
            plain card inside it. A ScrollView clips, and while the card was the
            scroller that clip fell exactly on the card's own edge, which is the
            one place the quill is supposed to be allowed to hang over. Moved
            out here, the clip lands on the window instead and the pen can lie
            across the edge of the paper. */}
        <ScrollView
          style={styles.letterViewport}
          contentContainerStyle={styles.letterViewportContent}
          showsVerticalScrollIndicator={false}>
          {/* A little more paper under the button than beside it — a stretched
              button reads as tight against an edge it is actually clear of. */}
          <View
            style={[
              styles.letterCard,
              { padding: clamp(28, 6, 58), paddingBottom: clamp(36, 7, 68) },
            ]}>
          <View style={styles.rule} />

          {/* Tapping the page puts the rest of the ink down at once. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Finish writing the letter"
            disabled={done}
            onPress={() => setSkipped(true)}>
            <Handwriting
              text={ENVELOPE.greeting}
              active={writing}
              skip={skipped}
              onDone={advance}
              speed={330}
              style={[
                styles.greeting,
                {
                  fontSize: clamp(26, 4.6, 36),
                  lineHeight: clamp(26, 4.6, 36) * 1.24,
                },
              ]}
            />

            {ENVELOPE.body.map((paragraph, index) => (
              <Handwriting
                key={paragraph}
                text={paragraph}
                active={writing && written > index}
                skip={skipped}
                onDone={advance}
                speed={700}
                delay={index === 0 ? 240 : 0}
                containerStyle={styles.paragraph}
                style={[styles.paragraphText, { fontSize: clamp(17, 2.5, 21), lineHeight: 32 }]}
              />
            ))}

            <Text style={styles.signOff}>{ENVELOPE.signOff}</Text>

            <Handwriting
              text={SIGNATURE}
              active={writing && written > ENVELOPE.body.length}
              skip={skipped}
              onDone={advance}
              speed={200}
              style={[
                styles.signature,
                { fontSize: clamp(28, 5, 38), lineHeight: clamp(28, 5, 38) * 1.3 },
              ]}
            />
          </Pressable>

          <Animated.View
            pointerEvents={done ? 'auto' : 'none'}
            style={{
              opacity: cta,
              transform: [
                { translateY: cta.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
              ],
            }}>
            <GradientButton
              onPress={enterSite}
              style={styles.cta}
              accessibilityLabel={ENVELOPE.cta}>
              <Text style={styles.ctaLabel}>{ENVELOPE.cta}</Text>
            </GradientButton>
          </Animated.View>
          </View>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

/* ————————————————— the flap ————————————————— */

type FlapArc = {
  radius: number;
  /** Centre of the *left* edge's circle, in the flap's own frame. */
  cx: number;
  cy: number;
  /** How far the arc stands off its chord at the middle, in px. */
  sagitta: number;
};

/**
 * The circle whose boundary is the flap's left cut edge.
 *
 * Given the chord — the flap's top corner to its point — and how far the edge
 * bows off it, there is exactly one such circle: its radius follows from the
 * sagitta relation, and its centre sits on the chord's perpendicular bisector
 * on the *inside* of the flap. That last part is the whole trick. It means the
 * flap's side of a curved edge is simply the inside of a circle, and a circle
 * is a shape this platform can clip to, which nothing else about a bowed
 * triangle is.
 *
 * The circle comes out enormous — a two per cent bow belongs to an arc several
 * times the width of the envelope — and that is fine. It is a transparent
 * clip; nothing is ever painted at that size.
 */
function flapArc(span: number, reach: number, bow: number): FlapArc {
  const half = span / 2;
  const chord = Math.hypot(half, reach);
  const sagitta = span * bow;
  const radius = (chord * chord) / (8 * sagitta) + sagitta / 2;
  /* Out from the chord's midpoint, along its normal, into the flap. */
  const offset = radius - sagitta;

  return {
    radius,
    sagitta,
    cx: half / 2 + (reach / chord) * offset,
    cy: reach / 2 - (half / chord) * offset,
  };
}

type FlapSilhouetteProps = {
  span: number;
  reach: number;
  arc: FlapArc;
  /** Shift the whole shape down, for the shadow copies. */
  drop?: number;
  /**
   * Stop cutting this far above the hinge.
   *
   * The silhouette itself is untouched — the two arcs still decide where the
   * throat's edges run. All this does is stop the *box* from trimming the
   * region above the envelope's top edge, which turns the clip from "the
   * throat" into "the throat, and everything out in the open above it". That
   * is the shape the letter has to be cut to: framed by the opening while it
   * is still down in the envelope, and whole once it has cleared the top.
   */
  rise?: number;
  /** Whether to shade the two cut edges. Off for the shadow copies. */
  edges?: boolean;
  /** Painted across the flap's full width, in its own frame. */
  children: ReactNode;
  /** Painted over everything, cut edges included — the turning flap's shade. */
  overlay?: ReactNode;
};

/**
 * The flap, cut to its two curved edges.
 *
 * Both cuts are made at once, by nesting. The flap's side of the left edge is
 * the inside of one circle, the right edge's is the inside of its mirror, and
 * the outer box trims the hinge line — so the shape is three nested clips and
 * a single fill.
 *
 * Nesting rather than drawing the two halves side by side is the whole point.
 * Two halves have to meet down the centre, and there is no good answer for the
 * join: butt them and sub-pixel rounding opens a hairline, overlap them and
 * every translucent coat is composited twice in the overlap. Either way you
 * get a line down the middle of the flap, which is exactly where the eye is.
 * One fill in one clip cannot have a seam.
 */
function FlapSilhouette({
  span,
  reach,
  arc,
  drop = 0,
  rise = 0,
  edges,
  children,
  overlay,
}: FlapSilhouetteProps) {
  const { radius, cx, cy } = arc;
  /* The right edge's circle is the left one's mirror image. */
  const mirrored = span - cx;
  const circle = {
    position: 'absolute' as const,
    width: radius * 2,
    height: radius * 2,
    borderRadius: radius,
    overflow: 'hidden' as const,
  };

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top: drop - rise,
        width: span,
        height: reach + rise,
        // The flap's top corners are the envelope's top corners, so they have
        // to be cut the same way or two square nubs stand proud of the body.
        // Nothing to round once the box reaches past them, though.
        borderTopLeftRadius: rise ? 0 : BODY_RADIUS - 1,
        borderTopRightRadius: rise ? 0 : BODY_RADIUS - 1,
        overflow: 'hidden',
      }}>
      {/* `rise` moves the box's own origin up, so the arcs are pushed back
          down by the same amount and stay where the flap's frame puts them. */}
      <View style={[circle, { left: cx - radius, top: cy - radius + rise }]}>
        <View style={[circle, { left: mirrored - cx, top: 0 }]}>
          <View
            style={{
              position: 'absolute',
              left: radius - mirrored,
              top: radius - cy,
              width: span,
              height: reach,
            }}>
            {children}
            {edges ? (
              <>
                {/* The score first, then the cut over the top of it: the fold
                    is inside the flap and the guillotined edge is its border,
                    so they have to stack in that order or the crease paints
                    over the very edge it is supposed to run parallel to. */}
                <FlapFold span={span} reach={reach} side="left" sagitta={arc.sagitta} />
                <FlapFold span={span} reach={reach} side="right" sagitta={arc.sagitta} />
                <FlapEdge span={span} reach={reach} side="left" sagitta={arc.sagitta} />
                <FlapEdge span={span} reach={reach} side="right" sagitta={arc.sagitta} />
              </>
            ) : null}
            {overlay}
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * The diagonal fold down one side of the flap — the score the die left when
 * the blank was cut, and the line that tells you at a glance which part of
 * this rectangle is going to open.
 *
 * Laid along the chord and turned onto it exactly as `FlapEdge` is, then set a
 * little way *inside* it, so it runs the full length of the edge and stays
 * clear of the shading along the cut. Because the cut itself bows away from
 * the chord and the crease does not, the gap between them widens towards the
 * middle of the edge and closes at the corner and the point — which is both
 * what a scored fold does against a die-cut edge and, more to the point, what
 * stops the two lines reading as one thick one.
 *
 * Two hairlines, because that is all a fold is: the paper tents up on one side
 * of the score and dives on the other.
 */
function FlapFold({
  span,
  reach,
  side,
  sagitta,
}: {
  span: number;
  reach: number;
  side: 'left' | 'right';
  sagitta: number;
}) {
  const half = span / 2;
  const chord = Math.hypot(half, reach);
  const slant = (Math.atan2(reach, half) * 180) / Math.PI;
  const left = side === 'left';
  const line = Math.max(1.2, span * 0.003);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: left ? 0 : half,
        top: left ? 0 : reach,
        width: chord,
        height: 0,
        transformOrigin: 'left',
        transform: [{ rotate: `${left ? slant : -slant}deg` }],
      }}>
      <View
        style={[
          styles.flapFold,
          GradientStyles.envelopeFlapCrease,
          { bottom: sagitta * FLAP_CREASE, height: line * 5 },
        ]}>
        <View style={[styles.flapFoldRidge, { bottom: line, height: line }]} />
        <View style={[styles.flapFoldValley, { height: line }]} />
      </View>
    </View>
  );
}

/**
 * The shading along one cut edge, laid out along the chord and then turned
 * onto it. Its dark end is set a sagitta *past* the chord, so wherever the arc
 * happens to run it is the arc, not the strip, that decides where the shading
 * stops — and the darkest tone always lands exactly on the edge.
 */
function FlapEdge({
  span,
  reach,
  side,
  sagitta,
}: {
  span: number;
  reach: number;
  side: 'left' | 'right';
  sagitta: number;
}) {
  const half = span / 2;
  const chord = Math.hypot(half, reach);
  const slant = (Math.atan2(reach, half) * 180) / Math.PI;
  const left = side === 'left';

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: left ? 0 : half,
        top: left ? 0 : reach,
        width: chord,
        height: 0,
        transformOrigin: 'left',
        transform: [{ rotate: `${left ? slant : -slant}deg` }],
      }}>
      <View
        style={[
          styles.flapEdge,
          GradientStyles.envelopeFlapEdge,
          { bottom: -sagitta, height: Math.max(7, span * 0.05) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: DefaultTheme.colors.veil,
    overflow: 'hidden',
  },
  scrim: {
    ...GradientStyles.envelopeScrim,
  },
  sceneWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  envelope: {
    alignSelf: 'center',
  },

  /* ——— the envelope, back to front ——— */
  ground: {
    position: 'absolute',
    borderRadius: 999,
  },
  shell: {
    ...StyleSheet.absoluteFill,
    zIndex: Z.shell,
    borderRadius: BODY_RADIUS,
    borderWidth: 1,
    // Barely there. A guillotined card catches a thread of light on its cut
    // edge; anything brighter draws the rectangle instead of the envelope.
    borderColor: 'rgba(255, 224, 218, 0.14)',
    overflow: 'hidden',
    backgroundColor: '#A32E33',
    shadowColor: '#4A0A1E',
    shadowOpacity: 0.4,
    shadowRadius: 38,
    shadowOffset: { width: 0, height: 24 },
    elevation: 12,
  },
  liningSlot: {
    ...StyleSheet.absoluteFill,
    zIndex: Z.lining,
  },
  /** The throat's clip. Above the lining, below the front panel. */
  noteSlot: {
    ...StyleSheet.absoluteFill,
    zIndex: Z.note,
  },
  /** Sized in points by the caller — it is drawn inside a clip whose frame is
   *  not the envelope's, so a percentage here would resolve against the wrong
   *  box. */
  note: {
    position: 'absolute',
    borderRadius: 3,
    alignItems: 'center',
    paddingTop: '7%',
    backgroundColor: DefaultTheme.colors.surface,
    shadowColor: '#2E1010',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  noteRule: {
    width: 30,
    height: 1,
    marginBottom: 10,
    backgroundColor: '#E8C8C8',
  },
  noteName: {
    fontFamily: DefaultTheme.fonts.script,
    color: '#C89494',
  },

  flapShadowSlot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: Z.flapShadow,
  },
  /** `zIndex` is set by the caller: it turns over mid-swing. */
  flapSlot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    transformOrigin: 'top',
  },
  flapShade: {
    backgroundColor: '#2A0508',
  },
  flapEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  /** The strip a fold is drawn in: the two hairlines at the foot of it, and a
   *  breath of shading running back into the flap to seat them in the paper. */
  flapFold: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  /** The flap's side of the score, standing into the light. */
  flapFoldRidge: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 233, 226, 0.42)',
  },
  /** …and the bottom of it, which the light does not reach at all. */
  flapFoldValley: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(46, 6, 10, 0.52)',
  },

  sealSlot: {
    position: 'absolute',
    left: '50%',
    zIndex: Z.seal,
  },

  /* ——— the letter ——— */
  letterWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  /** The window the letter scrolls in. Runs the full width it is given, so
   *  what it trims is the edge of the screen rather than the edge of the page. */
  letterViewport: {
    // The wrap's own padding is the margin off the screen; holding the window
    // back another 14% on top of that only moved the clip further up the card.
    width: '100%',
    maxHeight: '100%',
    flexGrow: 0,
  },
  letterViewportContent: {
    // Definite, or the container is shrink-to-fit and the card's own `width:
    // '100%'` has nothing to resolve against — it collapses to whatever the
    // text happens to measure instead of reaching its 660 cap.
    width: '100%',
    alignItems: 'center',
    // room for the card's own shadow, which is no longer the scroller's border
    paddingVertical: 16,
  },
  letterCard: {
    width: '100%',
    maxWidth: 660,
    ...GradientStyles.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DefaultTheme.colors.hairline,
    backgroundColor: DefaultTheme.colors.surface,
    shadowColor: '#96193C',
    shadowOpacity: 0.42,
    shadowRadius: 44,
    shadowOffset: { width: 0, height: 26 },
    elevation: 14,
  },
  rule: {
    alignSelf: 'center',
    width: 38,
    height: 1,
    marginBottom: 24,
    ...GradientStyles.hairline,
    backgroundColor: '#E7A2BC',
  },
  greeting: {
    fontFamily: DefaultTheme.fonts.displayRegular,
    color: DefaultTheme.colors.ink,
  },
  paragraph: {
    marginTop: 20,
  },
  paragraphText: {
    fontFamily: DefaultTheme.fonts.display,
    color: DefaultTheme.colors.inkSoft,
  },
  signOff: {
    marginTop: 30,
    marginBottom: 6,
    fontFamily: DefaultTheme.fonts.body,
    fontSize: 12,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: DefaultTheme.colors.label,
  },
  signature: {
    fontFamily: DefaultTheme.fonts.script,
    color: DefaultTheme.colors.accent,
  },
  cta: {
    marginTop: 34,
    alignSelf: 'stretch',
  },
  ctaLabel: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 2.8,
    textTransform: 'uppercase',
    color: DefaultTheme.colors.white,
  },
});
