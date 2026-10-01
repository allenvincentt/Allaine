import { BlurView } from 'expo-blur';
import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { GradientStyles } from '@/constants/gradient';

type Frost = keyof typeof GradientStyles;

type GlassSurfaceProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
  intensity?: number;
  gradient?: Frost;
  borderColor?: string;
  tintColor?: string;
};

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
        <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} />
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
