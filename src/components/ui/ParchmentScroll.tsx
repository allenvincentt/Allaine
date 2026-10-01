import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { WaxSeal } from '@/components/ui/WaxSeal';
import { SEAL_MONOGRAM } from '@/constants/content';
import { GradientStyles } from '@/constants/gradient';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const ROLL = 36;
const OVERHANG = ROLL * 0.5;
const ROD_OUT = ROLL * 0.5;
const FINIAL = ROLL * 0.8;
const FERRULE = ROLL * 0.3;
const CAP = ROD_OUT + FINIAL;
const GUTTER = Math.round(CAP * 0.55);
const ROLLED = 96;
const TIE = 30;

const FOXING = [
  { left: '9%', top: '14%', size: 30 },
  { left: '78%', top: '9%', size: 22 },
  { left: '54%', top: '31%', size: 15 },
  { left: '16%', top: '58%', size: 26 },
  { left: '88%', top: '52%', size: 34 },
  { left: '31%', top: '82%', size: 19 },
  { left: '69%', top: '89%', size: 25 },
] as const;

const FIBRES = [
  { top: '12%', left: '6%', width: '46%' },
  { top: '29%', left: '38%', width: '54%' },
  { top: '47%', left: '10%', width: '33%' },
  { top: '63%', left: '46%', width: '44%' },
  { top: '81%', left: '14%', width: '58%' },
] as const;

type ParchmentScrollProps = {
  children: ReactNode;
  onOpen?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const UNROLL_SPRING = {
  toValue: 1,
  damping: 14,
  stiffness: 88,
  mass: 1.1,
  overshootClamping: false,
  restDisplacementThreshold: 0.4,
  restSpeedThreshold: 0.4,
} as const;

const UNROLL_DELAY = 400;

export function ParchmentScroll({
  children,
  onOpen,
  contentStyle,
  style,
  accessibilityLabel = 'Break the seal and unroll the letter',
}: ParchmentScrollProps) {
  const reducedMotion = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [settled, setSettled] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  const unroll = useRef(new Animated.Value(0)).current;
  const unrollFx = useRef(new Animated.Value(0)).current;
  const wax = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;

  const measure = useCallback((event: LayoutChangeEvent) => {
    setContentHeight(Math.round(event.nativeEvent.layout.height));
  }, []);

  const unrollNow = useCallback(() => {
    if (open) {
      return;
    }
    setOpen(true);

    Animated.timing(wax, {
      toValue: 1,
      duration: reducedMotion ? 0 : 560,
      easing: Easing.bezier(0.32, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();

    if (reducedMotion) {
      unroll.setValue(1);
      unrollFx.setValue(1);
      setSettled(true);
      onOpen?.();
      return;
    }

    Animated.sequence([
      Animated.timing(lift, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(130),
      Animated.timing(lift, {
        toValue: 0,
        duration: 620,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(UNROLL_DELAY),
      Animated.spring(unrollFx, { ...UNROLL_SPRING, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(UNROLL_DELAY),
      Animated.spring(unroll, { ...UNROLL_SPRING, useNativeDriver: false }),
    ]).start(({ finished }) => {
      if (finished) {
        setSettled(true);
        onOpen?.();
      }
    });
  }, [open, unroll, unrollFx, wax, lift, onOpen, reducedMotion]);

  const full = contentHeight > 0 ? contentHeight : ROLLED;

  const height = unroll.interpolate({
    inputRange: [0, 1],
    outputRange: [ROLLED, full],
  });

  return (
    <View style={[styles.root, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ground,
          GradientStyles.scrollGround,
          {
            opacity: lift.interpolate({ inputRange: [0, 1], outputRange: [0.62, 0.3] }),
            transform: [
              { scaleX: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) },
              { scaleY: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) },
            ],
          },
        ]}
      />

      <Animated.View
        style={{
          transform: [
            { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }) },
            { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) },
            {
              rotate: lift.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '-0.7deg'],
              }),
            },
            {
              rotate: unrollFx.interpolate({
                inputRange: [0, 0.45, 0.75, 1],
                outputRange: ['0deg', '0.45deg', '-0.25deg', '0deg'],
                extrapolate: 'clamp',
              }),
            },
          ],
        }}>
        <Animated.View style={[styles.stage, { height }]}>
          <Animated.View
            style={[
              styles.sheet,
              GradientStyles.parchment,
              settled && styles.unclipped,
              {
                transform: [
                  {
                    scaleX: unrollFx.interpolate({
                      inputRange: [0, 0.4, 1],
                      outputRange: [0.965, 1.008, 1],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}>
            <View pointerEvents="none" style={styles.grain}>
              <View style={[StyleSheet.absoluteFill, GradientStyles.parchmentMottle]} />
              {FIBRES.map((fibre) => (
                <View
                  key={fibre.top}
                  style={[styles.fibre, { top: fibre.top, left: fibre.left, width: fibre.width }]}
                />
              ))}
              {FOXING.map((spot) => (
                <View
                  key={`${spot.left}-${spot.top}`}
                  style={[
                    styles.foxing,
                    GradientStyles.parchmentFoxing,
                    {
                      left: spot.left,
                      top: spot.top,
                      width: spot.size,
                      height: spot.size * 0.82,
                      borderRadius: spot.size / 2,
                    },
                  ]}
                />
              ))}
            </View>

            <View style={[styles.clip, settled && styles.unclipped]}>
              <View style={contentHeight > 0 ? { height: contentHeight } : null}>
                <Animated.View
                  onLayout={measure}
                  style={[
                    contentStyle,
                    {
                      opacity: unrollFx.interpolate({
                        inputRange: [0, 0.16, 0.6],
                        outputRange: [0, 0, 1],
                        extrapolate: 'clamp',
                      }),
                    },
                  ]}>
                  {children}
                </Animated.View>
              </View>
            </View>

            <View pointerEvents="none" style={[styles.curlLeft, GradientStyles.parchmentCurlLeft]} />
            <View
              pointerEvents="none"
              style={[styles.curlRight, GradientStyles.parchmentCurlRight]}
            />
            <View pointerEvents="none" style={[styles.ageTop, GradientStyles.parchmentAgeTop]} />
            <View
              pointerEvents="none"
              style={[styles.ageBottom, GradientStyles.parchmentAgeBottom]}
            />
            <View pointerEvents="none" style={[styles.shadeTop, GradientStyles.parchmentShadeTop]} />
            <View
              pointerEvents="none"
              style={[styles.shadeBottom, GradientStyles.parchmentShadeBottom]}
            />
            <View pointerEvents="none" style={styles.deckle} />
          </Animated.View>

          <Roll position="top" unroll={unrollFx} />
          <Roll position="bottom" unroll={unrollFx} />

          <ScrollTie wax={wax} />

          <View pointerEvents={open ? 'none' : 'auto'} style={styles.sealSlot}>
            <WaxSeal
              size={54}
              monogram={SEAL_MONOGRAM}
              fracture={wax}
              onPress={unrollNow}
              disabled={open}
              glow={!open}
              accessibilityLabel={accessibilityLabel}
            />
          </View>

          {!open && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabel}
              onPress={unrollNow}
              style={styles.tapTarget}
            />
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function Roll({ position, unroll }: { position: 'top' | 'bottom'; unroll: Animated.Value }) {
  return (
    <View
      pointerEvents="none"
      style={[styles.rollSlot, position === 'top' ? { top: -OVERHANG } : { bottom: -OVERHANG }]}>
      <Animated.View
        style={[
          styles.rod,
          {
            transform: [
              {
                scaleY: unroll.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.78],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}>
        <View style={[StyleSheet.absoluteFill, GradientStyles.scrollRoll]} />
        <View style={[styles.rodCore, GradientStyles.scrollRollCore]} />
        <View style={styles.rodSpecular} />
        <View style={[styles.ferrule, styles.ferruleLeft, GradientStyles.scrollRodTrim]} />
        <View style={[styles.ferrule, styles.ferruleRight, GradientStyles.scrollRodTrim]} />
        <View style={[styles.pinstripe, styles.pinstripeLeft, GradientStyles.scrollRodTrim]} />
        <View style={[styles.pinstripe, styles.pinstripeRight, GradientStyles.scrollRodTrim]} />
      </Animated.View>

      <Finial side="left" />
      <Finial side="right" />
    </View>
  );
}

function ScrollTie({ wax }: { wax: Animated.Value }) {
  const ease = { extrapolate: 'clamp' as const };

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.tie,
        {
          opacity: wax.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 0.9, 0], ...ease }),
          transform: [
            { translateX: wax.interpolate({ inputRange: [0, 1], outputRange: [0, -58], ...ease }) },
            {
              translateY: wax.interpolate({
                inputRange: [0, 0.4, 1],
                outputRange: [0, 5, 30],
                ...ease,
              }),
            },
            {
              rotate: wax.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-4.5deg'], ...ease }),
            },
            {
              scaleX: wax.interpolate({
                inputRange: [0, 0.3, 1],
                outputRange: [1, 1.015, 0.95],
                ...ease,
              }),
            },
          ],
        },
      ]}>
      <Tail side="left" wax={wax} drop={3.9} />
      <Tail side="right" wax={wax} drop={3.2} />

      <View style={styles.tieBand}>
        <View style={[StyleSheet.absoluteFill, GradientStyles.scrollTie]} />
        <View style={[StyleSheet.absoluteFill, GradientStyles.scrollTieSheen]} />
        <View style={[StyleSheet.absoluteFill, GradientStyles.scrollTieRound]} />
        <View style={styles.tieEdgeTop} />
        <View style={styles.tieEdgeBottom} />
      </View>

      <View style={[styles.tieKnot, GradientStyles.scrollTieKnot]}>
        <View style={styles.tieKnotGlint} />
      </View>
    </Animated.View>
  );
}

function Tail({ side, wax, drop }: { side: 'left' | 'right'; wax: Animated.Value; drop: number }) {
  const left = side === 'left';
  const rest = left ? 9 : -12;
  const swing = left ? 27 : -21;

  return (
    <Animated.View
      style={[
        styles.tieTail,
        left ? styles.tieTailLeft : styles.tieTailRight,
        {
          height: TIE * drop,
          transform: [
            {
              rotate: wax.interpolate({
                inputRange: [0, 1],
                outputRange: [`${rest}deg`, `${swing}deg`],
                extrapolate: 'clamp',
              }),
            },
          ],
        },
      ]}>
      <View style={[StyleSheet.absoluteFill, GradientStyles.scrollTieTail]} />
    </Animated.View>
  );
}

function Finial({ side }: { side: 'left' | 'right' }) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.finial,
        GradientStyles.scrollFinial,
        side === 'left' ? { left: 0 } : { right: 0 },
      ]}>
      <View
        style={[StyleSheet.absoluteFill, GradientStyles.scrollFinialShade, styles.finialShade]}
      />
      <View style={styles.finialGlint} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    paddingVertical: OVERHANG,
    paddingHorizontal: GUTTER,
  },
  ground: {
    position: 'absolute',
    left: '4%',
    right: '4%',
    bottom: -6,
    height: 46,
    borderRadius: 999,
  },
  stage: {
    width: '100%',
  },
  sheet: {
    ...StyleSheet.absoluteFill,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(186, 142, 132, 0.32)',
    overflow: 'hidden',
    backgroundColor: '#FFFCF6',
    shadowColor: '#7A1132',
    shadowOpacity: 0.26,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  clip: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 3,
  },
  unclipped: {
    overflow: 'visible',
  },
  grain: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    borderRadius: 3,
  },
  fibre: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(166, 122, 110, 0.09)',
  },
  foxing: {
    position: 'absolute',
  },
  curlLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 22,
  },
  curlRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 22,
  },
  ageTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 14,
  },
  ageBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 14,
  },
  shadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 26,
  },
  shadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 26,
  },
  deckle: {
    ...StyleSheet.absoluteFill,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 249, 0.5)',
  },

  rollSlot: {
    position: 'absolute',
    left: -CAP,
    right: -CAP,
    height: ROLL,
    zIndex: 2,
  },
  rod: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: FINIAL - 1,
    right: FINIAL - 1,
    borderRadius: ROLL / 2,
    overflow: 'hidden',
    backgroundColor: '#F6E4DC',
    shadowColor: '#7A1132',
    shadowOpacity: 0.34,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  rodCore: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ROLL * 0.46,
    height: ROLL * 0.3,
  },
  rodSpecular: {
    position: 'absolute',
    top: ROLL * 0.2,
    left: FERRULE + ROLL * 0.5,
    right: FERRULE + ROLL * 0.5,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  ferrule: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: FERRULE,
  },
  ferruleLeft: {
    left: 0,
  },
  ferruleRight: {
    right: 0,
  },
  pinstripe: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: Math.max(1.5, ROLL * 0.045),
  },
  pinstripeLeft: {
    left: FERRULE + ROLL * 0.24,
  },
  pinstripeRight: {
    right: FERRULE + ROLL * 0.24,
  },
  finial: {
    position: 'absolute',
    top: (ROLL - FINIAL) / 2,
    width: FINIAL,
    height: FINIAL,
    borderRadius: FINIAL / 2,
    overflow: 'hidden',
    backgroundColor: '#D9BE8A',
    shadowColor: '#7A1132',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 11,
  },
  finialShade: {
    borderRadius: FINIAL / 2,
  },
  finialGlint: {
    position: 'absolute',
    width: FINIAL * 0.3,
    height: FINIAL * 0.2,
    borderRadius: FINIAL * 0.15,
    left: FINIAL * 0.2,
    top: FINIAL * 0.16,
    backgroundColor: 'rgba(255, 253, 240, 0.72)',
    transform: [{ rotate: '-28deg' }],
  },

  tie: {
    position: 'absolute',
    left: -ROD_OUT,
    right: -ROD_OUT,
    top: '50%',
    height: TIE,
    marginTop: -TIE / 2,
    zIndex: 2,
  },
  tieBand: {
    ...StyleSheet.absoluteFill,
    borderRadius: 1.5,
    overflow: 'hidden',
    backgroundColor: '#8E0F35',
    shadowColor: '#4A0A1E',
    shadowOpacity: 0.42,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 7 },
    elevation: 7,
  },
  tieEdgeTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1,
    backgroundColor: 'rgba(255, 208, 226, 0.42)',
  },
  tieEdgeBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1.5,
    backgroundColor: 'rgba(38, 2, 13, 0.5)',
  },
  tieKnot: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: TIE * 1.94,
    height: TIE * 1.12,
    marginLeft: -TIE * 0.97,
    marginTop: -TIE * 0.56,
    borderRadius: TIE * 0.46,
    overflow: 'hidden',
    backgroundColor: '#A81640',
    shadowColor: '#4A0A1E',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  tieKnotGlint: {
    position: 'absolute',
    left: '16%',
    top: '14%',
    width: '30%',
    height: '26%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 224, 236, 0.34)',
    transform: [{ rotate: '-18deg' }],
  },
  tieTail: {
    position: 'absolute',
    left: '50%',
    top: TIE * 0.2,
    width: TIE * 0.54,
    overflow: 'hidden',
    backgroundColor: '#9E1439',
    transformOrigin: 'top',
    shadowColor: '#4A0A1E',
    shadowOpacity: 0.34,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 6 },
  },
  tieTailLeft: {
    marginLeft: -TIE * 0.66,
    borderBottomLeftRadius: TIE * 0.5,
    borderBottomRightRadius: TIE * 0.1,
  },
  tieTailRight: {
    marginLeft: TIE * 0.12,
    borderBottomLeftRadius: TIE * 0.1,
    borderBottomRightRadius: TIE * 0.5,
  },
  sealSlot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -27,
    marginLeft: -27,
    zIndex: 4,
  },
  tapTarget: {
    ...StyleSheet.absoluteFill,
    zIndex: 3,
    cursor: 'pointer',
  },
});
