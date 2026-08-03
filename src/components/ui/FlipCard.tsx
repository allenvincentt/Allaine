import { BlurView } from 'expo-blur';
import { useRef, useState } from 'react';
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

import { DefaultTheme } from '@/constants/defaultTheme';
import { GradientStyles } from '@/constants/gradient';
import type { Reason } from '@/constants/content';

const CARD_HEIGHT = 230;

type FlipCardProps = {
  reason: Reason;
  onFlip?: (x: number, y: number) => void;
  style?: StyleProp<ViewStyle>;
};

/** One of the "Reasons, and there are many" cards — glass on the front, rose on the back. */
export function FlipCard({ reason, onFlip, style }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

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

  const frontRotation = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backRotation = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${reason.title}. Tap to read why.`}
      onPress={handlePress}
      style={[styles.root, style]}>
      <Animated.View
        style={[
          styles.face,
          styles.front,
          reason.highlight ? styles.faceHighlight : styles.faceGlass,
          { transform: [{ perspective: 1200 }, { rotateY: frontRotation }] },
        ]}>
        <View pointerEvents="none" style={styles.frost}>
          <BlurView
            intensity={30}
            tint="light"
            style={StyleSheet.absoluteFill}
            blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              reason.highlight ? styles.tintHighlight : styles.tintGlass,
            ]}
          />
        </View>

        <Text style={[styles.index, reason.highlight && styles.indexHighlight]}>
          {reason.index}
        </Text>
        <Text style={styles.title}>{reason.title}</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.face,
          styles.back,
          { transform: [{ perspective: 1200 }, { rotateY: backRotation }] },
        ]}>
        <Text style={styles.backText}>{reason.body}</Text>
      </Animated.View>
    </Pressable>
  );
}

export const FlipCardHeight = CARD_HEIGHT;

const styles = StyleSheet.create({
  root: {
    height: CARD_HEIGHT,
  },
  face: {
    ...StyleSheet.absoluteFill,
    padding: 24,
    borderRadius: 22,
    borderWidth: 1,
    backfaceVisibility: 'hidden',
    shadowColor: '#96193C',
    shadowOpacity: 0.32,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 6,
  },
  front: {
    justifyContent: 'space-between',
  },
  /**
   * The blur and the white ramp both live in here: the face itself stays
   * transparent so the frost reads through, and the clip keeps the blur inside
   * the corner radius without eating the face's shadow.
   */
  frost: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
    overflow: 'hidden',
  },
  tintGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    ...GradientStyles.glass,
  },
  tintHighlight: {
    backgroundColor: 'rgba(255, 163, 196, 0.4)',
    ...GradientStyles.glassAccent,
  },
  faceGlass: {
    borderColor: 'rgba(255, 255, 255, 0.72)',
  },
  faceHighlight: {
    borderColor: 'rgba(255, 255, 255, 0.55)',
  },
  back: {
    justifyContent: 'center',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...GradientStyles.soft,
    shadowColor: DefaultTheme.colors.primary,
    shadowOpacity: 0.5,
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
