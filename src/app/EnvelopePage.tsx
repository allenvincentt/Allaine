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

const NOTE_WIDTH = 0.86;
const NOTE_HEIGHT = 0.84;
const NOTE_REST = 0.1;
const NOTE_TRAVEL = 0.68;

const FLAP_SHADOW = [
  { drop: 0.008, alpha: 0.2 },
  { drop: 0.019, alpha: 0.12 },
  { drop: 0.032, alpha: 0.06 },
] as const;

const BLOCKS = 2 + ENVELOPE.body.length;

export default function EnvelopePage() {
  const router = useRouter();
  const { clamp, width, height } = useResponsive();
  const reducedMotion = useReducedMotion();
  const { startMusic } = useAudioScene();

  const [opened, setOpened] = useState(false);
  const [written, setWritten] = useState(0);
  const [writing, setWriting] = useState(false);
  const [skipped, setSkipped] = useState(false);
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
  const flapHeight = envelopeHeight * FLAP_RATIO;
  const sealSize = Math.max(52, envelopeWidth * SEAL_RATIO);

  const noteWidth = envelopeWidth * NOTE_WIDTH;
  const noteHeight = envelopeHeight * NOTE_HEIGHT;

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
          toValue: FLAP_OVERSHOOT,
          duration: FLAP_MS,
          easing: Easing.bezier(0.5, -0.12, 0.22, 1),
          useNativeDriver: true,
        }),
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
      shade: flap.interpolate({
        inputRange: [0, 0.52, 1],
        outputRange: [0, 0.42, 0.15],
        extrapolate: 'clamp',
      }),
      cast: flap.interpolate({
        inputRange: [0, 0.16],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
    }),
    [flap],
  );

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
              transform: [
                { perspective: 1600 },
                { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
              ],
            },
          ]}>
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

          <View pointerEvents="none" style={[styles.shell, GradientStyles.envelopeShell]}>
            <View style={[StyleSheet.absoluteFill, GradientStyles.envelopeGrainLight]} />
            <View style={[StyleSheet.absoluteFill, GradientStyles.envelopeGrainDark]} />
            <View style={[StyleSheet.absoluteFill, GradientStyles.envelopeSheen]} />
            <View style={[StyleSheet.absoluteFill, GradientStyles.envelopeVignette]} />
            <View style={[StyleSheet.absoluteFill, GradientStyles.envelopeEdge]} />
          </View>

          <View pointerEvents="none" style={styles.liningSlot}>
            <FlapSilhouette span={envelopeWidth} reach={flapHeight} arc={arc}>
              <View style={[StyleSheet.absoluteFill, GradientStyles.envelopeLining]} />
            </FlapSilhouette>
          </View>

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

          <Animated.View
            style={[
              styles.flapSlot,
              {
                height: flapHeight,
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
        <ScrollView
          style={styles.letterViewport}
          contentContainerStyle={styles.letterViewportContent}
          showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.letterCard,
              { padding: clamp(28, 6, 58), paddingBottom: clamp(36, 7, 68) },
            ]}>
          <View style={styles.rule} />

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


type FlapArc = {
  radius: number;
  cx: number;
  cy: number;
  sagitta: number;
};

function flapArc(span: number, reach: number, bow: number): FlapArc {
  const half = span / 2;
  const chord = Math.hypot(half, reach);
  const sagitta = span * bow;
  const radius = (chord * chord) / (8 * sagitta) + sagitta / 2;
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
  drop?: number;
  rise?: number;
  edges?: boolean;
  children: ReactNode;
  overlay?: ReactNode;
};

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
        borderTopLeftRadius: rise ? 0 : BODY_RADIUS - 1,
        borderTopRightRadius: rise ? 0 : BODY_RADIUS - 1,
        overflow: 'hidden',
      }}>
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

  ground: {
    position: 'absolute',
    borderRadius: 999,
  },
  shell: {
    ...StyleSheet.absoluteFill,
    zIndex: Z.shell,
    borderRadius: BODY_RADIUS,
    borderWidth: 1,
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
  noteSlot: {
    ...StyleSheet.absoluteFill,
    zIndex: Z.note,
  },
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
  flapFold: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  flapFoldRidge: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 233, 226, 0.42)',
  },
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

  letterWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  letterViewport: {
    width: '100%',
    maxHeight: '100%',
    flexGrow: 0,
  },
  letterViewportContent: {
    width: '100%',
    alignItems: 'center',
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
