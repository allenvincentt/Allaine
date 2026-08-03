import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

const ENTRANCE_EASING = Easing.out(Easing.cubic);

export function useEntranceProgress(duration = 900, delay = 0, enabled = true) {
  const progress = useRef(new Animated.Value(0)).current;
  const played = useRef(false);

  useEffect(() => {
    if (!enabled || played.current) {
      return;
    }

    played.current = true;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: ENTRANCE_EASING,
      isInteraction: false,
      useNativeDriver: false,
    });

    animation.start();
    return () => animation.stop();
  }, [progress, duration, delay, enabled]);

  return progress;
}

export function useCountUp(target: number, duration = 1000, delay = 0, enabled = true) {
  const progress = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const listener = progress.addListener(({ value }) => {
      setDisplay(Math.round(value * target));
    });

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: ENTRANCE_EASING,
      isInteraction: false,
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished) {
        setDisplay(target);
      }
    });

    return () => {
      animation.stop();
      progress.removeListener(listener);
    };
  }, [progress, target, duration, delay, enabled]);

  return display;
}
