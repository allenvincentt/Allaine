import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text } from 'react-native';

import { useReducedMotion } from '@/hooks/useReducedMotion';

const GLOW_SIZE = 140;

/**
 * How much of the remaining distance the glow closes each frame. High enough
 * that it reads as stuck to the cursor — it is within a pixel or two after
 * about four frames — while still rounding off the corners of a fast flick.
 */
const FOLLOW = 0.45;

/**
 * A soft white heart that trails the pointer, web-only since it needs a
 * persistent cursor (touch has none, and native has no `window`/`document`).
 *
 * Driven off a rAF loop that eases towards the last known pointer position
 * rather than off a tween per event: a tween restarted on every `pointermove`
 * spends its whole life in the slow part of its own curve, which is what left
 * the glow lagging behind the cursor. The loop parks itself once it has caught
 * up, so an idle pointer costs nothing.
 */
export function CursorHeartGlow() {
  const reducedMotion = useReducedMotion();
  const position = useRef(new Animated.ValueXY({ x: -GLOW_SIZE, y: -GLOW_SIZE })).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'web' || reducedMotion || typeof window === 'undefined') {
      return;
    }

    const target = { x: -GLOW_SIZE, y: -GLOW_SIZE };
    const current = { x: -GLOW_SIZE, y: -GLOW_SIZE };
    let frame: number | null = null;
    let placed = false;
    let shown = false;

    const step = () => {
      const dx = target.x - current.x;
      const dy = target.y - current.y;

      if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
        current.x = target.x;
        current.y = target.y;
        position.x.setValue(current.x);
        position.y.setValue(current.y);
        frame = null;
        return;
      }

      current.x += dx * FOLLOW;
      current.y += dy * FOLLOW;
      position.x.setValue(current.x);
      position.y.setValue(current.y);
      frame = requestAnimationFrame(step);
    };

    const wake = () => {
      if (frame === null) {
        frame = requestAnimationFrame(step);
      }
    };

    const fade = (toValue: number) => {
      Animated.timing(opacity, {
        toValue,
        duration: toValue === 1 ? 200 : 280,
        useNativeDriver: true,
      }).start();
    };

    const handleMove = (event: PointerEvent) => {
      target.x = event.clientX - GLOW_SIZE / 2;
      target.y = event.clientY - GLOW_SIZE / 2;

      if (!placed) {
        // First sighting: appear under the cursor rather than flying in from
        // the corner it was parked in.
        placed = true;
        current.x = target.x;
        current.y = target.y;
        position.x.setValue(current.x);
        position.y.setValue(current.y);
      }

      wake();

      if (!shown) {
        shown = true;
        fade(1);
      }
    };

    const handleHidden = () => {
      if (shown) {
        shown = false;
        fade(0);
      }
    };

    window.addEventListener('pointermove', handleMove);
    document.addEventListener('mouseleave', handleHidden);
    window.addEventListener('blur', handleHidden);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      document.removeEventListener('mouseleave', handleHidden);
      window.removeEventListener('blur', handleHidden);
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
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
