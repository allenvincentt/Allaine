import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { DefaultTheme } from '@/constants/defaultTheme';
import { GradientStyles } from '@/constants/gradient';
import { useResponsive } from '@/hooks/useTheme';

const TURNS = 2000;
const PERIOD = 7000;
const GROOVES = 7;

type JogWheelProps = {
  playing: boolean;
  onPress: () => void;
  label: string;
};

/** The record you press to hear "our song" before the question. */
export function JogWheel({ playing, onPress, label }: JogWheelProps) {
  const { clamp } = useResponsive();
  const size = clamp(180, 24, 240);
  const haloSize = clamp(230, 32, 300);

  const spin = useRef(new Animated.Value(0)).current;
  const spinAt = useRef(0);
  const halo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = spin.addListener(({ value }) => {
      spinAt.current = value;
    });
    return () => spin.removeListener(id);
  }, [spin]);

  // Resuming continues from the angle the record stopped at, so pausing never
  // snaps the label back to the top.
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
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(halo, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [halo]);

  const rotate = spin.interpolate({
    inputRange: [0, TURNS],
    outputRange: ['0deg', `${TURNS * 360}deg`],
  });

  return (
    <View style={styles.root}>
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
              transform: [{ rotate }],
            },
          ]}>
          {Array.from({ length: GROOVES }, (_, index) => {
            const inset = 10 + index * ((size * 0.32 - 10) / GROOVES);
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

          <View style={[styles.labelDisc, { borderRadius: size / 2 }]}>
            <Text style={[styles.icon, { fontSize: size * 0.14 }]}>{playing ? '❚❚' : '▶'}</Text>
          </View>

          <View style={styles.spindle} />
        </Animated.View>
      </Pressable>

      <Text style={styles.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  halo: {
    position: 'absolute',
    top: 0,
    ...GradientStyles.haloSoft,
  },
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
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
    paddingLeft: 2,
  },
  spindle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1A0810',
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
