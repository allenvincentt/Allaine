import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { DefaultTheme } from '@/constants/defaultTheme';
import { Gradient, GradientStops } from '@/constants/gradient';

export function useTheme() {
  return DefaultTheme;
}

export type Responsive = {
  width: number;
  height: number;
  /** Viewport width percentage, in px. */
  vw: (percent: number) => number;
  /** Viewport height percentage, in px. */
  vh: (percent: number) => number;
  /** The CSS `clamp(min, {vw}vw, max)` this design is written in. */
  clamp: (min: number, vwPercent: number, max: number) => number;
  isCompact: boolean;
  isWide: boolean;
};

/**
 * The source design is a responsive web page built almost entirely out of
 * `clamp(min, Nvw, max)`. Rebuilding that against `useWindowDimensions` keeps
 * the type scale and rhythm identical on a phone and in a desktop browser.
 */
export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const vw = (percent: number) => (percent / 100) * width;
    const vh = (percent: number) => (percent / 100) * height;

    return {
      width,
      height,
      vw,
      vh,
      clamp: (min: number, vwPercent: number, max: number) =>
        Math.min(max, Math.max(min, vw(vwPercent))),
      isCompact: width < 640,
      isWide: width >= 1024,
    };
  }, [width, height]);
}

export { DefaultTheme, Gradient, GradientStops };
