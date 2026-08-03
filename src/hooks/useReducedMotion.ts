import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * The source design gates every ambient animation behind
 * `prefers-reduced-motion`. This is the platform equivalent.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;

    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive) {
        setReduced(value);
      }
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);

    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
