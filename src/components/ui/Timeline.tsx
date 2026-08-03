import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import type { TimelineEntry } from '@/constants/content';
import { DefaultTheme } from '@/constants/defaultTheme';
import { GradientStyles } from '@/constants/gradient';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { Reveal } from '@/components/ui/Reveal';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const RAIL_LEFT = 22;
const DOT = 16;

/** "The days I keep re-reading" — a rail with a dot and a glass card per entry. */
export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={styles.rail} />

      {entries.map((entry, index) => (
        <Reveal key={entry.title} delay={index * 80} style={styles.row}>
          {entry.highlight ? <PulsingDot /> : <View style={styles.dot} />}

          <GlassSurface
            radius={22}
            style={styles.card}
            contentStyle={styles.cardBody}
            gradient={entry.highlight ? 'glassAccent' : 'glass'}
            borderColor={
              entry.highlight ? 'rgba(255, 255, 255, 0.62)' : 'rgba(255, 255, 255, 0.7)'
            }
            tintColor={
              entry.highlight ? 'rgba(255, 163, 196, 0.4)' : 'rgba(255, 255, 255, 0.34)'
            }>
            <View style={[styles.tag, entry.highlight && styles.tagHighlight]}>
              <Text style={[styles.tagText, entry.highlight && styles.tagTextHighlight]}>
                {entry.tag}
              </Text>
            </View>

            <Text style={styles.title}>{entry.title}</Text>
            <Text style={[styles.body, entry.highlight && styles.bodyHighlight]}>
              {entry.body}
            </Text>
          </GlassSurface>
        </Reveal>
      ))}
    </View>
  );
}

function PulsingDot() {
  const pulse = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, reducedMotion]);

  return (
    <Animated.View
      style={[
        styles.dot,
        styles.dotHighlight,
        {
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.95] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    paddingLeft: RAIL_LEFT + 40,
    gap: 26,
  },
  rail: {
    position: 'absolute',
    left: RAIL_LEFT,
    top: 8,
    bottom: 8,
    width: 2,
    borderRadius: 2,
    ...GradientStyles.timeline,
    backgroundColor: DefaultTheme.colors.primarySoft,
  },
  row: {
    position: 'relative',
  },
  card: {
    shadowColor: '#96193C',
    shadowOpacity: 0.32,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 20 },
    elevation: 6,
  },
  cardBody: {
    padding: 26,
  },
  dot: {
    position: 'absolute',
    zIndex: 2,
    left: -(40 + DOT / 2),
    top: 28,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.72)',
    ...GradientStyles.soft,
    backgroundColor: DefaultTheme.colors.primary,
  },
  dotHighlight: {
    ...GradientStyles.dotHighlight,
    backgroundColor: DefaultTheme.colors.white,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(226, 44, 86, 0.1)',
  },
  tagHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  tagText: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 10.5,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: DefaultTheme.colors.label,
  },
  tagTextHighlight: {
    color: DefaultTheme.colors.primaryDark,
  },
  title: {
    marginTop: 14,
    marginBottom: 10,
    fontFamily: DefaultTheme.fonts.displayRegular,
    fontSize: 30,
    lineHeight: 35,
    color: DefaultTheme.colors.ink,
  },
  body: {
    fontFamily: DefaultTheme.fonts.bodyLight,
    fontSize: 16,
    lineHeight: 28,
    color: DefaultTheme.colors.inkMuted,
  },
  bodyHighlight: {
    color: DefaultTheme.colors.ink,
  },
});
