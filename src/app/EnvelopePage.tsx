import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

/** Blocks the pen works through: the greeting, the body, then the signature. */
const BLOCKS = 2 + ENVELOPE.body.length;

export default function EnvelopePage() {
  const router = useRouter();
  const { clamp, width } = useResponsive();
  const reducedMotion = useReducedMotion();
  const { startMusic } = useAudioScene();

  const [opened, setOpened] = useState(false);
  /** How many blocks of the letter the pen has finished. */
  const [written, setWritten] = useState(0);
  const [writing, setWriting] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const fracture = useRef(new Animated.Value(0)).current;
  const flap = useRef(new Animated.Value(0)).current;
  const note = useRef(new Animated.Value(0)).current;
  const scene = useRef(new Animated.Value(1)).current;
  const letter = useRef(new Animated.Value(0)).current;
  const veil = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;
  const cta = useRef(new Animated.Value(0)).current;

  const envelopeWidth = Math.min(width * 0.9, 520);
  const envelopeHeight = envelopeWidth / 1.72;
  const flapHeight = envelopeHeight * 0.53;
  const pocketHeight = envelopeHeight * 0.62;
  /* Big enough that the die, the rings and the monogram all read — the seal is
     the only thing on this screen you can touch. */
  const sealSize = clamp(64, 13, 92);

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
          toValue: 1,
          duration: FLAP_MS,
          // Dips slightly negative first: the flap presses down against the
          // seal before it gives, then swings up and settles.
          easing: Easing.bezier(0.5, -0.12, 0.22, 1),
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
     the swing — the two faces are swapped there, where the join cannot be seen. */
  const flapMotion = useMemo(
    () => ({
      angle: flap.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-172deg'] }),
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
      // Light falls off as the paper turns away, and comes part-way back once
      // the inner face is up.
      shade: flap.interpolate({
        inputRange: [0, 0.52, 1],
        outputRange: [0, 0.4, 0.14],
        extrapolate: 'clamp',
      }),
    }),
    [flap],
  );

  const flapRadius = flapHeight * 0.9;

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
                // A few degrees of lean is what separates an object sitting on
                // a surface from a rectangle painted on one.
                { rotateX: '8deg' },
                { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
              ],
            },
          ]}>
          {/* contact shadow */}
          <View
            pointerEvents="none"
            style={[
              styles.ground,
              GradientStyles.envelopeGround,
              {
                left: envelopeWidth * 0.03,
                right: envelopeWidth * 0.03,
                bottom: -envelopeHeight * 0.14,
                height: envelopeHeight * 0.32,
              },
            ]}
          />

          {/* back panel */}
          <View pointerEvents="none" style={[styles.shell, GradientStyles.envelopeShell]} />

          {/* the lining, on show only once the flap is up */}
          <View
            pointerEvents="none"
            style={[styles.lining, GradientStyles.envelopeLining, { height: flapHeight * 1.06 }]}
          />

          {/* the note, tucked inside until the flap lifts */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.note,
              GradientStyles.paper,
              {
                transform: [
                  {
                    translateY: note.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -envelopeHeight * 0.6],
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

          {/* the shadow the front pocket throws up the back panel */}
          <View
            pointerEvents="none"
            style={[
              styles.pocketShade,
              GradientStyles.envelopeSeam,
              { bottom: pocketHeight - 1, height: envelopeHeight * 0.13 },
            ]}
          />

          {/* front pocket */}
          <View pointerEvents="none" style={[styles.pocket, { height: pocketHeight }]}>
            <View style={[StyleSheet.absoluteFill, GradientStyles.envelopePocket]} />
            <View style={[StyleSheet.absoluteFill, GradientStyles.envelopeSheen]} />
            <View style={styles.pocketLip} />
          </View>

          {/* the flap */}
          <Animated.View
            style={[
              styles.flapWrap,
              {
                height: flapHeight,
                zIndex: opened ? 1 : 5,
                transform: [{ perspective: 1400 }, { rotateX: flapMotion.angle }],
              },
            ]}>
            <Animated.View
              style={[
                styles.flapFace,
                GradientStyles.envelopeFlapFace,
                {
                  borderBottomLeftRadius: flapRadius,
                  borderBottomRightRadius: flapRadius,
                  opacity: flapMotion.face,
                },
              ]}>
              <View
                style={[
                  StyleSheet.absoluteFill,
                  GradientStyles.envelopeSheen,
                  { borderBottomLeftRadius: flapRadius, borderBottomRightRadius: flapRadius },
                ]}
              />
              <View style={styles.flapLip} />
            </Animated.View>

            <Animated.View
              style={[
                styles.flapFace,
                GradientStyles.envelopeFlapBack,
                {
                  borderBottomLeftRadius: flapRadius,
                  borderBottomRightRadius: flapRadius,
                  opacity: flapMotion.back,
                  transform: [{ rotateX: '180deg' }],
                },
              ]}
            />

            <Animated.View
              pointerEvents="none"
              style={[
                styles.flapShade,
                {
                  borderBottomLeftRadius: flapRadius,
                  borderBottomRightRadius: flapRadius,
                  opacity: flapMotion.shade,
                },
              ]}
            />
          </Animated.View>

          {/* the wax */}
          <View
            style={[
              styles.sealSlot,
              { top: flapHeight - sealSize / 2, marginLeft: -sealSize / 2 },
            ]}>
            <WaxSeal
              size={sealSize}
              monogram={SEAL_MONOGRAM}
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
        <ScrollView
          style={styles.letterScroll}
          contentContainerStyle={[styles.letterCard, { padding: clamp(28, 6, 58) }]}
          showsVerticalScrollIndicator={false}>
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
        </ScrollView>
      </Animated.View>
    </Animated.View>
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: '#FFC6D9',
    shadowColor: '#7A1132',
    shadowOpacity: 0.34,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
    elevation: 10,
  },
  lining: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    zIndex: 1,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    backgroundColor: '#E58AAD',
  },
  note: {
    position: 'absolute',
    left: '6%',
    right: '6%',
    bottom: '7%',
    height: '86%',
    zIndex: 2,
    borderRadius: 6,
    alignItems: 'center',
    paddingTop: '6%',
    backgroundColor: DefaultTheme.colors.surface,
    shadowColor: '#781432',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  noteRule: {
    width: 30,
    height: 1,
    marginBottom: 10,
    backgroundColor: '#F0C3D3',
  },
  noteName: {
    fontFamily: DefaultTheme.fonts.script,
    color: '#E7A2BC',
  },
  pocketShade: {
    position: 'absolute',
    left: 1,
    right: 1,
    zIndex: 3,
  },
  pocket: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 4,
    overflow: 'hidden',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: '#FFC3D9',
    shadowColor: '#7A1132',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -3 },
  },
  /** The folded top edge of the pocket, catching the light. */
  pocketLip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  flapWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    transformOrigin: 'top',
  },
  flapFace: {
    ...StyleSheet.absoluteFill,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFC3D8',
  },
  flapLip: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  flapShade: {
    ...StyleSheet.absoluteFill,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#5A1128',
  },
  sealSlot: {
    position: 'absolute',
    left: '50%',
    zIndex: 6,
  },

  /* ——— the letter ——— */
  letterWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  letterScroll: {
    width: '100%',
    maxWidth: 660,
    maxHeight: '86%',
    flexGrow: 0,
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
  letterCard: {
    ...GradientStyles.paper,
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
