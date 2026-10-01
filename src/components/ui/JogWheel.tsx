import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import { useRevealed } from '@/components/ui/Reveal';
import { DefaultTheme } from '@/constants/defaultTheme';
import { GradientStyles } from '@/constants/gradient';
import { useResponsive } from '@/hooks/useTheme';

const TURNS = 2000;
/** Milliseconds per revolution. Fast enough that the turn reads at a glance. */
const PERIOD = 2600;
const GROOVES = 7;

const MARKERS = [{ angle: 0, opacity: 0.5 }];

const HALO_RATIO = 230 / 180;

type JogWheelProps = {
  playing: boolean;
  onPress: () => void;
  label: string;
  size?: number;
  captionStyle?: StyleProp<TextStyle>;
};

export function JogWheel({ playing, onPress, label, size: given, captionStyle }: JogWheelProps) {
  const { clamp } = useResponsive();
  const revealed = useRevealed();
  const size = given ?? clamp(180, 24, 240);
  const haloSize = size * HALO_RATIO;

  const spin = useRef(new Animated.Value(0)).current;
  const spinAt = useRef(0);
  const halo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!playing) {
      return;
    }
    const id = spin.addListener(({ value }) => {
      spinAt.current = value;
    });
    return () => spin.removeListener(id);
  }, [spin, playing]);

  useEffect(() => {
    if (!playing) {
      spin.stopAnimation();
      return;
    }

    const animation = Animated.timing(spin, {
      toValue: TURNS,
      duration: Math.max(PERIOD, (TURNS - spinAt.current) * PERIOD),
      easing: Easing.linear,
      isInteraction: false,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [playing, spin]);

  useEffect(() => {
    if (!revealed) {
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          isInteraction: false,
          useNativeDriver: true,
        }),
        Animated.timing(halo, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          isInteraction: false,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [halo, revealed]);

  const rotate = spin.interpolate({
    inputRange: [0, TURNS],
    outputRange: ['0deg', `${TURNS * 360}deg`],
  });

  /* The record's own furniture is sized off the record, so it can be asked for
     at any diameter without the rim, the marker and the label drifting out of
     proportion with it. */
  const rim = Math.max(4, size * 0.033);
  const iconSize = size * 0.14;

  return (
    <View style={[styles.root, { gap: Math.max(22, size * 0.1) }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.95] }),
            transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
          },
        ]}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause our song' : 'Play our song'}
        onPress={onPress}>
        <Animated.View
          style={[
            styles.disc,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: rim,
              transform: [{ rotate }],
            },
          ]}>
          {Array.from({ length: GROOVES }, (_, index) => {
            const inset = size * 0.056 + index * ((size * 0.32 - size * 0.056) / GROOVES);
            return (
              <View
                key={index}
                pointerEvents="none"
                style={[
                  styles.groove,
                  {
                    top: inset,
                    left: inset,
                    right: inset,
                    bottom: inset,
                    borderRadius: size / 2,
                  },
                ]}
              />
            );
          })}

          {/* Concentric grooves say nothing about which way round the record is,
              so a few radial marks give the spin something to be read against. */}
          {MARKERS.map(({ angle, opacity }) => (
            <View
              key={angle}
              pointerEvents="none"
              style={[styles.markerTrack, { transform: [{ rotate: `${angle}deg` }] }]}>
              <View
                style={[
                  styles.marker,
                  {
                    top: size * 0.055,
                    height: size * 0.28,
                    width: Math.max(1.5, size * 0.011),
                    borderRadius: size * 0.011,
                    opacity,
                  },
                ]}
              />
            </View>
          ))}

          <View style={[styles.labelDisc, { borderRadius: size / 2 }]}>
            <Text
              style={[
                styles.icon,
                {
                  fontSize: iconSize,
                  lineHeight: iconSize * 1.16,
                  // The play glyph carries its own left-hand bearing; nudging it
                  // over is what puts the triangle's mass on the label's centre.
                  marginLeft: playing ? 0 : iconSize * 0.06,
                },
              ]}>
              {playing ? '❚❚' : '▶'}
            </Text>
          </View>
        </Animated.View>
      </Pressable>

      <Text style={[styles.caption, captionStyle]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /** `gap` is set by the caller — it scales with the record. */
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    top: 0,
    ...GradientStyles.haloSoft,
  },
  /** `borderWidth` is the rim, and is set by the caller for the same reason. */
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'rgba(255, 255, 255, 0.26)',
    backgroundColor: '#2A0A15',
    shadowColor: '#500519',
    shadowOpacity: 0.8,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 22 },
    elevation: 12,
  },
  groove: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  labelDisc: {
    width: '36%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...GradientStyles.label,
    backgroundColor: '#FFE6EE',
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  icon: {
    color: DefaultTheme.colors.primaryDeep,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  markerTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  marker: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  caption: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11.5,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.88)',
    textAlign: 'center',
  },
});
