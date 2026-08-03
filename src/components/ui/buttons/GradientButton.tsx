import { forwardRef, useRef, type ReactNode } from "react";
import {
    Animated,
    Easing,
    Pressable,
    StyleSheet,
    View,
    type GestureResponderEvent,
    type StyleProp,
    type ViewStyle,
} from "react-native";

import { DefaultTheme } from "@/constants/defaultTheme";
import { Gradient, gradientStyle } from "@/constants/gradient";

export type GradientButtonVariant = "pill" | "fab";
/** The rose ramp, or the white one for buttons sitting on rose. */
export type GradientButtonTone = "primary" | "light";

export const GradientButtonFabSize = 56;

type GradientButtonProps = {
  children: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  variant?: GradientButtonVariant;
  tone?: GradientButtonTone;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * `gradientStyle` writes both the native and the web property, so each ramp is
 * built once here rather than branching on platform at every layer.
 */
const TONES: Record<
  GradientButtonTone,
  { base: ViewStyle; hover: ViewStyle; pressed: ViewStyle; shadowColor: string }
> = {
  primary: {
    base: gradientStyle(Gradient.base),
    hover: gradientStyle(Gradient.hover),
    pressed: gradientStyle(Gradient.pressed),
    shadowColor: "#8E0F35",
  },
  light: {
    base: gradientStyle(Gradient.label),
    hover: gradientStyle(Gradient.labelHover),
    pressed: gradientStyle(Gradient.labelPressed),
    shadowColor: "#780A28",
  },
};

export const GradientButton = forwardRef<View, GradientButtonProps>(
  function GradientButton(
    {
      children,
      onPress,
      disabled = false,
      variant = "pill",
      tone = "primary",
      style,
      accessibilityLabel,
    },
    ref,
  ) {
    const fab = variant === "fab";
    const ramp = TONES[tone];

    const scale = useRef(new Animated.Value(1)).current;
    const hoverProgress = useRef(new Animated.Value(0)).current;
    const pressProgress = useRef(new Animated.Value(0)).current;

    const animateTiming = (
      value: Animated.Value,
      toValue: number,
      duration: number,
    ) => {
      Animated.timing(value, {
        toValue,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    };

    /* Compress on the way down, spring back on release — the give is what
       makes it feel like a button rather than a rectangle that changed colour. */
    const collapse = () => {
      Animated.timing(scale, {
        toValue: 0.96,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    };

    const expand = () => {
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 300,
        useNativeDriver: false,
      }).start();
    };

    const lift = hoverProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -3],
    });

    /* Slight at rest, and only deep enough on hover to sell the lift. */
    const shadowOpacity = hoverProgress.interpolate({
      inputRange: [0, 1],
      outputRange: fab ? [0.14, 0.2] : [0.1, 0.16],
    });
    const shadowRadius = hoverProgress.interpolate({
      inputRange: [0, 1],
      outputRange: fab ? [12, 16] : [9, 13],
    });

    return (
      <Animated.View
        style={[
          styles.root,
          fab && styles.rootFab,
          style,
          disabled && styles.rootDisabled,
          {
            shadowColor: ramp.shadowColor,
            shadowOpacity,
            shadowRadius,
            transform: [{ translateY: lift }, { scale }],
          },
        ]}
      >
        <View style={styles.clip}>
          <View pointerEvents="none" style={[styles.layer, ramp.base]} />
          <Animated.View
            pointerEvents="none"
            style={[styles.layer, ramp.hover, { opacity: hoverProgress }]}
          />
          <Animated.View
            pointerEvents="none"
            style={[styles.layer, ramp.pressed, { opacity: pressProgress }]}
          />
        </View>
        <View pointerEvents="none" style={styles.content}>
          {children}
        </View>
        <Pressable
          ref={ref}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          disabled={disabled}
          style={styles.pressable}
          onPress={onPress}
          onHoverIn={() => {
            if (!disabled) {
              animateTiming(hoverProgress, 1, 220);
            }
          }}
          onHoverOut={() => {
            if (!disabled) {
              animateTiming(hoverProgress, 0, 220);
            }
          }}
          onPressIn={() => {
            if (!disabled) {
              collapse();
              animateTiming(pressProgress, 1, 100);
            }
          }}
          onPressOut={() => {
            if (!disabled) {
              expand();
              animateTiming(pressProgress, 0, 220);
            }
          }}
        />
      </Animated.View>
    );
  },
);

const styles = StyleSheet.create({
  root: {
    minHeight: 52,
    paddingHorizontal: 30,
    borderRadius: DefaultTheme.radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  rootFab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: GradientButtonFabSize,
    height: GradientButtonFabSize,
    minHeight: GradientButtonFabSize,
    paddingHorizontal: 0,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
    zIndex: 20,
  },
  rootDisabled: {
    opacity: 0.5,
  },
  clip: {
    ...StyleSheet.absoluteFill,
    borderRadius: DefaultTheme.radius.pill,
    overflow: "hidden",
  },
  layer: {
    ...StyleSheet.absoluteFill,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  pressable: {
    ...StyleSheet.absoluteFill,
    outlineWidth: 0,
    cursor: "pointer",
  },
});
