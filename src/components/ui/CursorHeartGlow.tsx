import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text } from 'react-native';

import { useReducedMotion } from '@/hooks/useReducedMotion';

const GLOW_SIZE = 140;
const FOLLOW_DURATION = 160;

/**
 * A soft white heart that trails the pointer, web-only since it needs a
 * persistent cursor (touch has none, and native has no `window`/`document`).
 */
export function CursorHeartGlow() {
  const reducedMotion = useReducedMotion();
  const position = useRef(new Animated.ValueXY({ x: -GLOW_SIZE, y: -GLOW_SIZE })).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'web' || reducedMotion || typeof window === 'undefined') {
      return;
    }

    const handleMove = (event: PointerEvent) => {
      Animated.timing(position, {
        toValue: { x: event.clientX - GLOW_SIZE / 2, y: event.clientY - GLOW_SIZE / 2 },
        duration: FOLLOW_DURATION,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    };

    const handleHidden = () => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start();
    };

    window.addEventListener('pointermove', handleMove);
    document.addEventListener('mouseleave', handleHidden);
    window.addEventListener('blur', handleHidden);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      document.removeEventListener('mouseleave', handleHidden);
      window.removeEventListener('blur', handleHidden);
    };
  }, [position, opacity, reducedMotion]);

  if (Platform.OS !== 'web' || reducedMotion) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.root,
        {
          opacity,
          transform: [{ translateX: position.x }, { translateY: position.y }],
        },
      ]}>
      <Text style={styles.heart}>❤</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  heart: {
    fontSize: GLOW_SIZE * 0.62,
    color: 'rgba(255, 255, 255, 0.3)',
    textShadowColor: 'rgba(255, 255, 255, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 34,
  },
});
