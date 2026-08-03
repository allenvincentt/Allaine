import { forwardRef, useRef, type ReactNode } from "react";
import {
    Animated,
    Easing,
    Platform,
    Pressable,
    StyleSheet,
    View,
    type GestureResponderEvent,
    type StyleProp,
    type ViewStyle,
} from "react-native";

import { DefaultTheme } from "@/constants/defaultTheme";
import { Gradient } from "@/constants/gradient";

export type GradientButtonVariant = "pill" | "fab";

export const GradientButtonFabSize = 56;

type GradientButtonProps = {
  children: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  variant?: GradientButtonVariant;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const webGradientBase: ViewStyle & { backgroundImage: string } = {
  backgroundImage: Gradient.base,
};
const webGradientHover: ViewStyle & { backgroundImage: string } = {
  backgroundImage: Gradient.hover,
};
const webGradientPressed: ViewStyle & { backgroundImage: string } = {
  backgroundImage: Gradient.pressed,
};

export const GradientButton = forwardRef<View, GradientButtonProps>(
  function GradientButton(
    {
      children,
      onPress,
      disabled = false,
      variant = "pill",
      style,
      accessibilityLabel,
    },
    ref,
  ) {
    const fab = variant === "fab";
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

    const collapse = () => {
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    };

    const expand = () => {
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 260,
        useNativeDriver: false,
      }).start();
    };

    const lift = hoverProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -4],
    });

    return (
      <Animated.View
        style={[
          styles.root,
          fab && styles.rootFab,
          style,
          disabled && styles.rootDisabled,
          { transform: [{ translateY: lift }, { scale }] },
        ]}
      >
        <View style={styles.clip}>
          <View
            pointerEvents="none"
            style={[
              styles.gradientBase,
              Platform.OS === "web" && webGradientBase,
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.gradientHover,
              Platform.OS === "web" && webGradientHover,
              { opacity: hoverProgress },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.gradientPressed,
              Platform.OS === "web" && webGradientPressed,
              { opacity: pressProgress },
            ]}
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
    shadowColor: "#2C2C24",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 11 },
    elevation: 6,
  },
  rootFab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: GradientButtonFabSize,
    height: GradientButtonFabSize,
    minHeight: GradientButtonFabSize,
    paddingHorizontal: 0,
    shadowOpacity: 0.3,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 9,
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
  gradientBase: {
    ...StyleSheet.absoluteFill,
    experimental_backgroundImage: Gradient.base,
  },
  gradientHover: {
    ...StyleSheet.absoluteFill,
    experimental_backgroundImage: Gradient.hover,
  },
  gradientPressed: {
    ...StyleSheet.absoluteFill,
    experimental_backgroundImage: Gradient.pressed,
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
  },
});
