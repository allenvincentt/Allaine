import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useRevealed } from '@/components/ui/Reveal';
import { DefaultTheme } from '@/constants/defaultTheme';
import { GradientStyles, gradientStyle } from '@/constants/gradient';
import type { Reason } from '@/constants/content';

const CARD_HEIGHT = 230;

const HOVER_MS = 320;
const HOVER_LIFT = 10;
const FRONT_FLOOR = 0.24;
const BACK_FLOOR = 0.5;

const CAN_BLUR = Platform.OS !== 'android';
const FROST_INTENSITY = 30;

const HOUSE_ANGLE = '106deg';
const WASH_GLASS = gradientStyle(
  `linear-gradient(${HOUSE_ANGLE}, rgba(254,254,254,0.795) 0%, rgba(254,254,254,0.655) 100%)`,
);
const WASH_HIGHLIGHT = gradientStyle(
  `linear-gradient(${HOUSE_ANGLE}, rgba(254,171,201,0.769) 0%, rgba(243,133,164,0.649) 100%)`,
);

const CAN_HOVER = Platform.OS === 'web';

type FlipCardProps = {
  reason: Reason;
  onFlip?: (x: number, y: number) => void;
  style?: StyleProp<ViewStyle>;
};

export function FlipCard({ reason, onFlip, style }: FlipCardProps) {
  const revealed = useRevealed();
  const [flipped, setFlipped] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const hover = useRef(new Animated.Value(0)).current;

  const handlePress = (event: GestureResponderEvent) => {
    const next = !flipped;
    setFlipped(next);

    Animated.timing(progress, {
      toValue: next ? 1 : 0,
      duration: 850,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();

    if (next) {
      onFlip?.(event.nativeEvent.pageX, event.nativeEvent.pageY);
    }
  };

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

  const motion = useMemo(
    () => ({
      frontRotation: progress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '-180deg'],
      }),
      backRotation: progress.interpolate({
        inputRange: [0, 1],
        outputRange: ['180deg', '0deg'],
      }),
      lift: hover.interpolate({ inputRange: [0, 1], outputRange: [0, -HOVER_LIFT] }),
      photoFade: hover.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
      frontFade: hover.interpolate({ inputRange: [0, 1], outputRange: [1, FRONT_FLOOR] }),
      backFade: hover.interpolate({ inputRange: [0, 1], outputRange: [1, BACK_FLOOR] }),
    }),
    [progress, hover],
  );

  const frontTransform = useMemo(
    () => [{ perspective: 1200 }, { rotateY: motion.frontRotation }],
    [motion],
  );
  const backTransform = useMemo(
    () => [{ perspective: 1200 }, { rotateY: motion.backRotation }],
    [motion],
  );
  const liftTransform = useMemo(() => [{ translateY: motion.lift }], [motion]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${reason.title}. Tap to read why.`}
      onPress={handlePress}
      onHoverIn={() => settle(1)}
      onHoverOut={() => settle(0)}
      style={[styles.root, style]}>
      <Animated.View style={[styles.lift, { transform: liftTransform }]}>
        <Animated.View
          style={[
            styles.face,
            reason.highlight ? styles.faceHighlight : styles.faceGlass,
            { transform: frontTransform },
          ]}>
          {CAN_HOVER && reason.image && revealed ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.photo, { opacity: motion.photoFade }]}>
              <Image source={reason.image} style={styles.photoLayer} contentFit="cover" />
              <View style={[styles.photoLayer, styles.photoVeil]} />
            </Animated.View>
          ) : null}

          {CAN_BLUR ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.frost, { opacity: motion.frontFade }]}>
              <BlurView intensity={FROST_INTENSITY} tint="light" style={styles.frostLayer} />
              <View
                style={[
                  styles.frostLayer,
                  reason.highlight ? styles.tintHighlight : styles.tintGlass,
                ]}
              />
            </Animated.View>
          ) : (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.frostLayer,
                reason.highlight ? styles.washHighlight : styles.washGlass,
                { opacity: motion.frontFade },
              ]}
            />
          )}

          <View style={[styles.content, styles.frontContent]}>
            <Text style={[styles.index, reason.highlight && styles.indexHighlight]}>
              {reason.index}
            </Text>
            <Text style={styles.title}>{reason.title}</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.face, styles.back, { transform: backTransform }]}>
          <Animated.View
            pointerEvents="none"
            style={[styles.backFill, { opacity: motion.backFade }]}
          />

          <View style={[styles.content, styles.backContent]}>
            <Text style={styles.backText}>{reason.body}</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export const FlipCardHeight = CARD_HEIGHT;

const styles = StyleSheet.create({
  root: {
    height: CARD_HEIGHT,
  },
  lift: {
    flex: 1,
  },
  face: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
    backfaceVisibility: 'hidden',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  frontContent: {
    justifyContent: 'space-between',
  },
  backContent: {
    justifyContent: 'center',
  },
  frost: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
    overflow: 'hidden',
  },
  frostLayer: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
  },
  photo: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
    overflow: 'hidden',
  },
  photoLayer: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
  },
  photoVeil: {
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
  },
  washGlass: WASH_GLASS,
  washHighlight: WASH_HIGHLIGHT,
  tintGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    ...GradientStyles.glass,
  },
  tintHighlight: {
    backgroundColor: 'rgba(255, 163, 196, 0.4)',
    ...GradientStyles.glassAccent,
  },
  faceGlass: {},
  faceHighlight: {},
  back: {},
  backFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
    ...GradientStyles.soft,
  },
  index: {
    fontFamily: DefaultTheme.fonts.displayRegular,
    fontSize: 15,
    color: DefaultTheme.colors.labelSoft,
  },
  indexHighlight: {
    color: DefaultTheme.colors.white,
  },
  title: {
    fontFamily: DefaultTheme.fonts.displayRegular,
    fontSize: 26,
    lineHeight: 30,
    color: DefaultTheme.colors.ink,
  },
  backText: {
    fontFamily: DefaultTheme.fonts.bodyLight,
    fontSize: 16,
    lineHeight: 26,
    color: DefaultTheme.colors.white,
  },
});
