import { BlurView } from 'expo-blur';
import { type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { GradientStyles } from '@/constants/gradient';

type Frost = keyof typeof GradientStyles;

type GlassSurfaceProps = {
  children?: ReactNode;
  /** Layout and shadow live on the outer view so the blur can clip freely. */
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
  intensity?: number;
  gradient?: Frost;
  borderColor?: string;
  tintColor?: string;
};

/**
 * The frosted card the design leans on — `backdrop-filter: blur(20px)
 * saturate(150%)` over a white ramp with a 1px highlight edge.
 *
 * Shadow sits on the outer view and the blur on a clipped inner one; putting
 * both on one view loses the shadow to `overflow: hidden` on iOS.
 */
export function GlassSurface({
  children,
  style,
  contentStyle,
  radius = 22,
  intensity = 34,
  gradient = 'glass',
  borderColor = 'rgba(255, 255, 255, 0.72)',
  tintColor = 'rgba(255, 255, 255, 0.34)',
}: GlassSurfaceProps) {
  return (
    <View style={[{ borderRadius: radius }, style]}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
        <BlurView
          intensity={intensity}
          tint="light"
          style={StyleSheet.absoluteFill}
          blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tintColor }]} />
        <View style={[StyleSheet.absoluteFill, GradientStyles[gradient]]} />
      </View>

      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: 1, borderColor }]}
      />

      <View style={contentStyle}>{children}</View>
    </View>
  );
}
