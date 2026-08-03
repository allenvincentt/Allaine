import { useEffect, useMemo, useRef } from "react";
import {
    Animated,
    Easing,
    Platform,
    Pressable,
    StyleSheet,
    View,
    type AccessibilityState,
    type GestureResponderEvent,
    type LayoutChangeEvent,
    type PointerEvent,
    type StyleProp,
    type TextStyle,
    type ViewStyle,
} from "react-native";

import { AppIcon } from "@/components/ui/AppIcon";
import { DefaultTheme } from "@/constants/defaultTheme";
import type { AppIconName } from "@/constants/icons";

type GlowingButtonVariant = "solid" | "ghost";

type AnimatedNumber =
  | Animated.AnimatedInterpolation<number>
  | Animated.Value
  | number;

type GlowingButtonProps = {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  variant?: GlowingButtonVariant;
  icon?: AppIconName;
  active?: boolean;
  labelOpacity?: AnimatedNumber;
  iconOffsetX?: AnimatedNumber;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  onLayout?: (event: LayoutChangeEvent) => void;
};

const glowSize = 132;
const GLOW_IMAGE =
  "radial-gradient(circle, rgba(255,240,246,0.98) 0%, rgba(255,157,196,0.58) 24%, rgba(226,44,86,0.22) 48%, rgba(226,44,86,0) 72%)";
const webGlowStyle: ViewStyle & { backgroundImage: string } = {
  backgroundImage: GLOW_IMAGE,
};

export const GlowingButtonGhostMetrics = {
  height: 44,
  paddingHorizontal: 12,
  gap: 12,
  iconSlot: 22,
  iconSize: 18,
  spacing: 4,
} as const;

const SOLID_EMPHASIS_COLOR = DefaultTheme.colors.primaryDark;

export function GlowingButton({
  label,
  onPress,
  style,
  textStyle,
  variant = "solid",
  icon,
  active = false,
  labelOpacity,
  iconOffsetX,
  accessibilityLabel,
  accessibilityState,
  onLayout,
}: GlowingButtonProps) {
  const ghost = variant === "ghost";
  const restColor = ghost
    ? DefaultTheme.colors.muted
    : DefaultTheme.colors.primary;
  const emphasisColor = ghost
    ? DefaultTheme.colors.primary
    : SOLID_EMPHASIS_COLOR;

  const scale = useRef(new Animated.Value(1)).current;
  const hoverProgress = useRef(new Animated.Value(0)).current;
  const activeProgress = useRef(new Animated.Value(active ? 1 : 0)).current;
  const pointerX = useRef(new Animated.Value(-glowSize)).current;
  const pointerY = useRef(new Animated.Value(-glowSize)).current;
  const hovered = useRef(false);
  const focused = useRef(false);
  const pressing = useRef(false);

  useEffect(() => {
    Animated.timing(activeProgress, {
      toValue: active ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [active, activeProgress]);

  const emphasis = useMemo(
    () =>
      Animated.add(hoverProgress, activeProgress).interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
    [hoverProgress, activeProgress],
  );

  const glowOpacity = useMemo(
    () =>
      Animated.add(
        hoverProgress,
        Animated.multiply(activeProgress, 0.45),
      ).interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
    [hoverProgress, activeProgress],
  );

  const animateHover = (
    toValue: number,
    duration = toValue === 1 ? 180 : 360,
  ) => {
    hoverProgress.stopAnimation();
    Animated.timing(hoverProgress, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const positionGlow = (x: number, y: number) => {
    pointerX.setValue(x - glowSize / 2);
    pointerY.setValue(y - glowSize / 2);
  };

  const releaseGlow = () => {
    if (hovered.current || focused.current) {
      animateHover(1);
      return;
    }

    hoverProgress.stopAnimation();
    Animated.sequence([
      Animated.delay(140),
      Animated.timing(hoverProgress, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  };

  const animateScale = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      damping: 17,
      stiffness: 240,
      mass: 0.7,
      useNativeDriver: false,
    }).start();
  };

  const centerGlow = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    pointerX.setValue(width / 2 - glowSize / 2);
    pointerY.setValue(height / 2 - glowSize / 2);
  };

  const followPointer = (event: PointerEvent) => {
    positionGlow(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
  };

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        styles.shell,
        ghost && styles.shellGhost,
        style,
        {
          shadowOpacity: emphasis.interpolate({
            inputRange: [0, 1],
            outputRange: ghost ? [0, 0.18] : [0.13, 0.25],
          }),
          transform: [
            {
              translateY: hoverProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, ghost ? -1 : -2],
              }),
            },
            { scale },
          ],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.surface,
          ghost && styles.surfaceGhost,
          ghost && {
            backgroundColor: hoverProgress.interpolate({
              inputRange: [0, 1],
              outputRange: ["rgba(255,255,255,0)", "rgba(255,255,255,0.45)"],
            }),
          },
        ]}
        onLayout={centerGlow}
      >
        <Animated.View
          style={[
            styles.glow,
            Platform.OS === "web" && webGlowStyle,
            {
              opacity: glowOpacity,
              transform: [{ translateX: pointerX }, { translateY: pointerY }],
            },
          ]}
        />
        <Animated.View
          style={[styles.reflection, ghost && { opacity: activeProgress }]}
        />
        <View style={[styles.content, ghost && styles.contentGhost]}>
          {icon && (
            <Animated.View
              style={[
                styles.iconSlot,
                { transform: [{ translateX: iconOffsetX ?? 0 }] },
              ]}
            >
              <Animated.View
                style={[
                  styles.iconLayer,
                  {
                    opacity: emphasis.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0],
                    }),
                  },
                ]}
              >
                <AppIcon
                  name={icon}
                  size={GlowingButtonGhostMetrics.iconSize}
                  tintColor={restColor}
                />
              </Animated.View>
              <Animated.View style={[styles.iconLayer, { opacity: emphasis }]}>
                <AppIcon
                  name={icon}
                  size={GlowingButtonGhostMetrics.iconSize}
                  tintColor={emphasisColor}
                />
              </Animated.View>
            </Animated.View>
          )}
          <View style={[styles.labelWrap, ghost && styles.labelWrapGhost]}>
            <Animated.Text
              accessible={false}
              numberOfLines={1}
              adjustsFontSizeToFit={!ghost}
              minimumFontScale={0.8}
              maxFontSizeMultiplier={1.2}
              style={[
                styles.label,
                ghost && styles.labelGhost,
                {
                  opacity: labelOpacity ?? 1,
                  color: emphasis.interpolate({
                    inputRange: [0, 1],
                    outputRange: [restColor, emphasisColor],
                  }),
                  textShadowColor: emphasis.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["rgba(226,44,86,0)", "rgba(226,44,86,0.28)"],
                  }),
                  textShadowRadius: emphasis.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 6],
                  }),
                  transform: ghost
                    ? []
                    : [
                        {
                          scale: hoverProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.035],
                          }),
                        },
                      ],
                },
                textStyle,
              ]}
            >
              {label}
            </Animated.Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={accessibilityState}
          onPress={onPress}
          onPointerMove={followPointer}
          onPointerEnter={() => {
            hovered.current = true;
            animateHover(1);
          }}
          onPointerLeave={() => {
            hovered.current = false;
            if (!pressing.current && !focused.current) {
              animateHover(0);
            }
          }}
          onFocus={() => {
            focused.current = true;
            animateHover(1);
          }}
          onBlur={() => {
            focused.current = false;
            if (!hovered.current && !pressing.current) {
              animateHover(0);
            }
          }}
          onPressIn={(event) => {
            pressing.current = true;
            positionGlow(
              event.nativeEvent.locationX,
              event.nativeEvent.locationY,
            );
            animateScale(0.97);
            animateHover(1, 110);
          }}
          onPressOut={() => {
            pressing.current = false;
            animateScale(1);
            releaseGlow();
          }}
          style={styles.pressable}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 54,
    borderRadius: DefaultTheme.radius.md,
    shadowColor: DefaultTheme.colors.primary,
    shadowOpacity: 0.13,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  shellGhost: {
    minHeight: GlowingButtonGhostMetrics.height,
    height: GlowingButtonGhostMetrics.height,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 0,
  },
  surface: {
    flex: 1,
    minHeight: 54,
    overflow: "hidden",
    borderRadius: DefaultTheme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(226,44,86,0.38)",
    backgroundColor: DefaultTheme.colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  surfaceGhost: {
    minHeight: GlowingButtonGhostMetrics.height,
    borderWidth: 0,
    backgroundColor: "transparent",
    alignItems: "stretch",
  },
  glow: {
    position: "absolute",
    top: 0,
    left: 0,
    width: glowSize,
    height: glowSize,
    borderRadius: glowSize / 2,
    pointerEvents: "none",
    experimental_backgroundImage: GLOW_IMAGE,
  },
  reflection: {
    position: "absolute",
    top: 2,
    right: 18,
    left: 18,
    height: 1,
    borderRadius: DefaultTheme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.92)",
    pointerEvents: "none",
  },
  content: {
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  contentGhost: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: GlowingButtonGhostMetrics.paddingHorizontal,
    gap: GlowingButtonGhostMetrics.gap,
  },
  iconSlot: {
    width: GlowingButtonGhostMetrics.iconSlot,
    height: GlowingButtonGhostMetrics.iconSlot,
    alignItems: "center",
    justifyContent: "center",
  },
  iconLayer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  labelWrap: {
    zIndex: 1,
    pointerEvents: "none",
  },
  labelWrapGhost: {
    flex: 1,
  },
  label: {
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 14,
    letterSpacing: 0.1,
    textShadowOffset: { width: 0, height: 2 },
  },
  labelGhost: {
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13.5,
    letterSpacing: 0.1,
    textAlign: "left",
  },
  pressable: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
    borderRadius: DefaultTheme.radius.md,
    cursor: "pointer",
  },
});
