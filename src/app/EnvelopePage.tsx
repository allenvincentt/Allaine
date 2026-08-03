import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ENVELOPE, RECIPIENT, SIGNATURE } from '@/constants/content';
import { DefaultTheme } from '@/constants/defaultTheme';
import { GradientStyles } from '@/constants/gradient';
import { useAudioScene } from '@/hooks/useAudioScene';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useResponsive } from '@/hooks/useTheme';

const BACKDROP = require('@/assets/images/photo-01.jpg');

/** Colours sampled from the middle of the envelope gradients — the border
 *  triangles that build the pocket and flap can only take flat fills. */
const POCKET_COLOR = '#FFB0CA';
const FLAP_COLOR = '#FFBCD3';

const FLAP_MS = 1150;
const NOTE_DELAY = 560;
const HANDOFF = 1650;

export default function EnvelopePage() {
  const router = useRouter();
  const { clamp, width } = useResponsive();
  const reducedMotion = useReducedMotion();
  const { startMusic } = useAudioScene();

  const [opened, setOpened] = useState(false);

  const flap = useRef(new Animated.Value(0)).current;
  const seal = useRef(new Animated.Value(1)).current;
  const note = useRef(new Animated.Value(0)).current;
  const scene = useRef(new Animated.Value(1)).current;
  const letter = useRef(new Animated.Value(0)).current;
  const veil = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;
  const hint = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;

  const envelopeWidth = Math.min(width * 0.9, 540);
  const envelopeHeight = envelopeWidth / 1.52;

  useEffect(() => {
    if (reducedMotion) {
      return;
    }
    const loops = [
      loop(float, 3500),
      loop(hint, 1300),
      loop(halo, 2500),
    ];
    loops.forEach((animation) => animation.start());
    return () => loops.forEach((animation) => animation.stop());
  }, [float, hint, halo, reducedMotion]);

  const open = useCallback(() => {
    if (opened) {
      return;
    }
    setOpened(true);
    startMusic();

    Animated.parallel([
      Animated.timing(seal, {
        toValue: 0,
        duration: 520,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),
      Animated.timing(flap, {
        toValue: 1,
        duration: FLAP_MS,
        easing: Easing.bezier(0.6, 0.02, 0.2, 1),
        useNativeDriver: true,
      }),
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
    ]).start();
  }, [opened, startMusic, seal, flap, note, scene, letter]);

  const enterSite = useCallback(() => {
    Animated.timing(veil, {
      toValue: 0,
      duration: 850,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => router.replace('/LandingPage'));
  }, [veil, router]);

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open the letter"
          onPress={open}
          style={{ width: envelopeWidth }}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.halo,
              {
                width: envelopeWidth * 1.5,
                height: envelopeHeight * 1.5,
                borderRadius: envelopeWidth,
                left: -envelopeWidth * 0.25,
                top: -envelopeHeight * 0.25,
                opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.95] }),
                transform: [
                  { scale: halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
                ],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.envelope,
              {
                width: envelopeWidth,
                height: envelopeHeight,
                transform: [
                  {
                    translateY: float.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -14],
                    }),
                  },
                ],
              },
            ]}>
            {/* back panel */}
            <View style={[styles.envelopeBack, { borderRadius: 12 }]} />

            {/* the note, tucked inside until the flap lifts */}
            <Animated.View
              style={[
                styles.note,
                {
                  transform: [
                    {
                      translateY: note.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -envelopeHeight * 0.58],
                      }),
                    },
                    { scale: note.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
                  ],
                },
              ]}>
              <Text style={[styles.noteName, { fontSize: clamp(20, 4.6, 30) }]}>{RECIPIENT}</Text>
            </Animated.View>

            {/* front pocket: two slopes meeting in the middle, plus the base */}
            <View pointerEvents="none" style={styles.pocket}>
              <View
                style={[
                  styles.slopeLeft,
                  {
                    borderBottomWidth: envelopeHeight * 0.47,
                    borderRightWidth: envelopeWidth / 2,
                  },
                ]}
              />
              <View
                style={[
                  styles.slopeRight,
                  {
                    borderBottomWidth: envelopeHeight * 0.47,
                    borderLeftWidth: envelopeWidth / 2,
                  },
                ]}
              />
              <View style={[styles.pocketBase, { top: envelopeHeight * 0.47 }]} />
            </View>

            {/* the flap */}
            <Animated.View
              style={[
                styles.flapWrap,
                {
                  zIndex: opened ? 1 : 5,
                  transform: [
                    { perspective: 1500 },
                    {
                      rotateX: flap.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '-178deg'],
                      }),
                    },
                  ],
                },
              ]}>
              <View
                style={[
                  styles.flap,
                  {
                    borderTopWidth: envelopeHeight * 0.47,
                    borderLeftWidth: envelopeWidth / 2,
                    borderRightWidth: envelopeWidth / 2,
                  },
                ]}
              />
            </Animated.View>

            {/* wax seal */}
            <Animated.View
              style={[
                styles.seal,
                {
                  width: clamp(52, 11, 68),
                  height: clamp(52, 11, 68),
                  borderRadius: clamp(52, 11, 68) / 2,
                  top: envelopeHeight * 0.47 - clamp(52, 11, 68) / 2,
                  marginLeft: -clamp(52, 11, 68) / 2,
                  opacity: seal,
                  transform: [
                    { scale: seal.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
                    {
                      rotate: seal.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['-18deg', '0deg'],
                      }),
                    },
                  ],
                },
              ]}>
              <Text style={[styles.sealLetter, { fontSize: clamp(22, 4.6, 28) }]}>
                {RECIPIENT.charAt(0)}
              </Text>
            </Animated.View>
          </Animated.View>

          <View style={styles.caption}>
            <Text style={styles.captionEyebrow}>{ENVELOPE.eyebrow}</Text>
            <Animated.Text
              style={[
                styles.captionHint,
                {
                  fontSize: clamp(18, 3.4, 24),
                  opacity: hint.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }),
                  transform: [
                    { translateY: hint.interpolate({ inputRange: [0, 1], outputRange: [0, 9] }) },
                  ],
                },
              ]}>
              {ENVELOPE.hint} ↓
            </Animated.Text>
          </View>
        </Pressable>
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

          <Text style={[styles.greeting, { fontSize: clamp(24, 4.4, 34) }]}>
            {ENVELOPE.greeting}
          </Text>

          {ENVELOPE.body.map((paragraph) => (
            <Text key={paragraph} style={[styles.paragraph, { fontSize: clamp(17, 2.5, 21) }]}>
              {paragraph}
            </Text>
          ))}

          <Text style={styles.signOff}>{ENVELOPE.signOff}</Text>
          <Text style={[styles.signature, { fontSize: clamp(28, 5, 38) }]}>{SIGNATURE}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={enterSite}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
            <Text style={styles.ctaLabel}>{ENVELOPE.cta}</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

function loop(value: Animated.Value, duration: number) {
  return Animated.loop(
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
  halo: {
    position: 'absolute',
    ...GradientStyles.halo,
  },
  envelope: {
    alignSelf: 'center',
  },
  envelopeBack: {
    ...StyleSheet.absoluteFill,
    ...GradientStyles.envelope,
    backgroundColor: '#FFC6D9',
    shadowColor: '#96193C',
    shadowOpacity: 0.55,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 34 },
    elevation: 12,
  },
  note: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    bottom: '6%',
    height: '88%',
    zIndex: 2,
    borderRadius: 6,
    alignItems: 'center',
    paddingTop: '5%',
    backgroundColor: DefaultTheme.colors.surface,
    ...GradientStyles.paper,
    shadowColor: '#781432',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  noteName: {
    fontFamily: DefaultTheme.fonts.script,
    color: '#E7A2BC',
  },
  pocket: {
    ...StyleSheet.absoluteFill,
    zIndex: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  slopeLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderBottomColor: POCKET_COLOR,
    borderRightColor: 'transparent',
  },
  slopeRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderBottomColor: POCKET_COLOR,
    borderLeftColor: 'transparent',
  },
  pocketBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: POCKET_COLOR,
  },
  flapWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    transformOrigin: 'top',
  },
  flap: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopColor: FLAP_COLOR,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  seal: {
    position: 'absolute',
    left: '50%',
    zIndex: 6,
    alignItems: 'center',
    justifyContent: 'center',
    ...GradientStyles.seal,
    backgroundColor: DefaultTheme.colors.primaryDeep,
    shadowColor: '#780A28',
    shadowOpacity: 0.8,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  sealLetter: {
    fontFamily: DefaultTheme.fonts.displayRegular,
    color: 'rgba(255, 255, 255, 0.92)',
  },
  caption: {
    alignItems: 'center',
    marginTop: 36,
  },
  captionEyebrow: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 3.4,
    textTransform: 'uppercase',
    color: DefaultTheme.colors.label,
  },
  captionHint: {
    marginTop: 10,
    fontFamily: DefaultTheme.fonts.displayItalic,
    fontStyle: 'italic',
    color: '#7A1132',
  },
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
    shadowOpacity: 0.6,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 40 },
    elevation: 16,
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
    marginBottom: 22,
    fontFamily: DefaultTheme.fonts.displayRegular,
    color: DefaultTheme.colors.ink,
  },
  paragraph: {
    marginBottom: 18,
    fontFamily: DefaultTheme.fonts.display,
    lineHeight: 32,
    color: DefaultTheme.colors.inkSoft,
  },
  signOff: {
    marginTop: 8,
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
    paddingVertical: 17,
    borderRadius: 999,
    alignItems: 'center',
    ...GradientStyles.base,
    backgroundColor: DefaultTheme.colors.primary,
    shadowColor: DefaultTheme.colors.primary,
    shadowOpacity: 0.95,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8,
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  ctaLabel: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 2.8,
    textTransform: 'uppercase',
    color: DefaultTheme.colors.white,
  },
});
