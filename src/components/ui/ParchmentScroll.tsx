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

/** Thickness of a roll, and how far it hangs past the sheet. */
const ROLL = 34;
const OVERHANG = ROLL * 0.58;
/** Height of the stage while the scroll is still wound up. */
const ROLLED = 96;

type ParchmentScrollProps = {
  children: ReactNode;
  /** Fires once the sheet has finished unrolling — start the pen here. */
  onOpen?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * A sealed scroll that unrolls from both ends when you break the wax.
 *
 * The sheet grows out of its own centre — the content is centred inside a clip
 * whose height animates, so the middle of the letter is revealed first and the
 * text runs away towards both rolls at once. The rolls ride the top and bottom
 * edges and thin out as paper comes off them, and the spring is left slightly
 * underdamped so the whole thing settles with a bounce rather than stopping
 * dead.
 *
 * The height animation has to run in JS, so the wax gets its own natively
 * driven value — mixing the two drivers inside one style would throw.
 */
export function ParchmentScroll({
  children,
  onOpen,
  contentStyle,
  style,
  accessibilityLabel = 'Break the seal and unroll the letter',
}: ParchmentScrollProps) {
  const reducedMotion = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  const unroll = useRef(new Animated.Value(0)).current;
  const wax = useRef(new Animated.Value(0)).current;

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
      onOpen?.();
      return;
    }

    Animated.sequence([
      Animated.delay(200),
      Animated.spring(unroll, {
        toValue: 1,
        damping: 14,
        stiffness: 88,
        mass: 1.1,
        // Left deliberately springy: paper under tension does not stop dead.
        overshootClamping: false,
        restDisplacementThreshold: 0.4,
        restSpeedThreshold: 0.4,
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onOpen?.();
      }
    });
  }, [open, unroll, wax, onOpen, reducedMotion]);

  const full = contentHeight > 0 ? contentHeight : ROLLED;

  const height = unroll.interpolate({
    inputRange: [0, 1],
    outputRange: [ROLLED, full],
  });

  return (
    <View style={[styles.root, style]}>
      <Animated.View
        style={[
          styles.stage,
          {
            height,
            // A shade of flex as the sheet comes under tension, and a settle
            // either side of true once it is open.
            transform: [
              {
                rotate: unroll.interpolate({
                  inputRange: [0, 0.45, 0.75, 1],
                  outputRange: ['0deg', '0.45deg', '-0.25deg', '0deg'],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}>
        <Animated.View
          style={[
            styles.sheet,
            GradientStyles.parchment,
            {
              transform: [
                {
                  scaleX: unroll.interpolate({
                    inputRange: [0, 0.4, 1],
                    outputRange: [0.965, 1.008, 1],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}>
          <View style={styles.clip}>
            <Animated.View
              onLayout={measure}
              style={[
                contentStyle,
                {
                  opacity: unroll.interpolate({
                    inputRange: [0, 0.16, 0.6],
                    outputRange: [0, 0, 1],
                    extrapolate: 'clamp',
                  }),
                },
              ]}>
              {children}
            </Animated.View>
          </View>

          {/* the sheet never reads as a flat rectangle: both long edges curl */}
          <View pointerEvents="none" style={[styles.curlLeft, GradientStyles.parchmentCurlLeft]} />
          <View
            pointerEvents="none"
            style={[styles.curlRight, GradientStyles.parchmentCurlRight]}
          />
          {/* and both rolls throw a shadow down onto it */}
          <View pointerEvents="none" style={[styles.shadeTop, GradientStyles.parchmentShadeTop]} />
          <View
            pointerEvents="none"
            style={[styles.shadeBottom, GradientStyles.parchmentShadeBottom]}
          />
        </Animated.View>

        <Roll position="top" unroll={unroll} />
        <Roll position="bottom" unroll={unroll} />

        {/* the ribbon, which slides off as the wax gives */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ribbon,
            GradientStyles.scrollRibbon,
            {
              opacity: wax.interpolate({
                inputRange: [0, 0.35, 1],
                outputRange: [1, 0.7, 0],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  translateX: wax.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -46],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        />

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
    </View>
  );
}

/** One end of the scroll: a lit cylinder that thins as paper comes off it. */
function Roll({
  position,
  unroll,
}: {
  position: 'top' | 'bottom';
  unroll: Animated.Value;
}) {
  return (
    <Animated.View
      style={[
        styles.roll,
        position === 'top' ? { top: -OVERHANG } : { bottom: -OVERHANG },
        {
          transform: [
            {
              scaleY: unroll.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.54],
                extrapolate: 'clamp',
              }),
            },
          ],
        },
      ]}>
      <View style={[StyleSheet.absoluteFill, GradientStyles.scrollRoll]} />
      <View pointerEvents="none" style={[styles.rollCore, GradientStyles.scrollRollCore]} />
      <View pointerEvents="none" style={styles.rollSpecular} />
      <View pointerEvents="none" style={[styles.rollCap, styles.rollCapLeft]} />
      <View pointerEvents="none" style={[styles.rollCap, styles.rollCapRight]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    paddingVertical: OVERHANG,
  },
  stage: {
    width: '100%',
  },
  sheet: {
    ...StyleSheet.absoluteFill,
    borderRadius: 3,
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
  roll: {
    position: 'absolute',
    left: -7,
    right: -7,
    height: ROLL,
    borderRadius: ROLL / 2,
    overflow: 'hidden',
    backgroundColor: '#F6D9DC',
    shadowColor: '#7A1132',
    shadowOpacity: 0.34,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  /** The seam of the wrap, showing through the roll. */
  rollCore: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ROLL * 0.46,
    height: ROLL * 0.3,
  },
  rollSpecular: {
    position: 'absolute',
    top: ROLL * 0.2,
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  /** The roll seen end-on. */
  rollCap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 16,
    backgroundColor: 'rgba(160, 80, 108, 0.22)',
  },
  rollCapLeft: {
    left: 0,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  rollCapRight: {
    right: 0,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  ribbon: {
    position: 'absolute',
    left: -7,
    right: -7,
    top: '50%',
    height: 26,
    marginTop: -13,
    backgroundColor: '#E22C56',
    shadowColor: '#7A1132',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
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
