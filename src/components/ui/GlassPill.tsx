import { BlurView } from 'expo-blur';
import { useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { DefaultTheme } from '@/constants/defaultTheme';
import { GradientStyles } from '@/constants/gradient';

type GlassPillProps = {
  label: string;
  glyph: string;
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function GlassPill({ label, glyph, onPress, accessibilityLabel, style }: GlassPillProps) {
  const lift = useRef(new Animated.Value(0)).current;

  const animate = (toValue: number) => {
    Animated.timing(lift, {
      toValue,
      duration: toValue === 1 ? 110 : 320,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.shell,
        style,
        {
          transform: [
            { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }) },
          ],
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={onPress}
        onPressIn={() => animate(1)}
        onPressOut={() => animate(0)}
        style={styles.pressable}>
        <View pointerEvents="none" style={styles.frost}>
          <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.tint]} />
        </View>

        <View style={styles.badge}>
          <Text style={styles.glyph}>{glyph}</Text>
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 999,
    shadowColor: '#BE2850',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 11,
    paddingLeft: 13,
    paddingRight: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.75)',
  },
  frost: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
    overflow: 'hidden',
  },
  tint: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    ...GradientStyles.glassBright,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...GradientStyles.soft,
    backgroundColor: DefaultTheme.colors.primary,
  },
  glyph: {
    fontSize: 10,
    lineHeight: 13,
    color: DefaultTheme.colors.white,
  },
  label: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: DefaultTheme.colors.primaryDark,
  },
});
