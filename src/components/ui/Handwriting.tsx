import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useReducedMotion } from '@/hooks/useReducedMotion';

type Phase = 'idle' | 'writing' | 'done';

type HandwritingProps = {
  text: string;
  /** Font, size, colour, line height — whatever you would give a `<Text>`. */
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** The pen starts the first time this is true. */
  active?: boolean;
  /** Jump to the finished text — wire this to a tap-to-skip. */
  skip?: boolean;
  /** Nib speed, in points of ink laid down per second. */
  speed?: number;
  /** Beat before the first stroke, ms. */
  delay?: number;
  align?: 'left' | 'center';
  /** Defaults to the text colour. */
  nibColor?: string;
  onDone?: () => void;
};

/**
 * Ink laid down the way a pen lays it: continuously, left to right, one word
 * at a time, with the nib slowing into the end of each word and resting before
 * the next — longer after a comma, longer still after a full stop.
 *
 * Each word is drawn behind its own clip, and the clip slides right while the
 * text inside counter-slides left by exactly as much, so the letters stay
 * nailed to the page while the ink edge sweeps across them. Both halves of
 * that are transforms, which keeps the whole paragraph on the native driver —
 * a fade or a per-character re-render could not hold 60fps at this word count.
 *
 * Once a block is finished its animation is thrown away and the words render
 * as plain text, so a long letter only ever has one paragraph animating.
 */
export function Handwriting({
  text,
  style,
  containerStyle,
  active = true,
  skip = false,
  speed = 620,
  delay = 0,
  align = 'left',
  nibColor,
  onDone,
}: HandwritingProps) {
  const reducedMotion = useReducedMotion();

  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);

  const flat = useMemo(() => (StyleSheet.flatten(style) ?? {}) as TextStyle, [style]);
  const fontSize = typeof flat.fontSize === 'number' ? flat.fontSize : 16;
  const lineHeight = typeof flat.lineHeight === 'number' ? flat.lineHeight : fontSize * 1.5;
  const ink = typeof flat.color === 'string' ? flat.color : '#000000';
  const spaceWidth = fontSize * 0.3;

  const pen = useRef(new Animated.Value(0)).current;
  const [widths, setWidths] = useState<number[]>(() => words.map(() => 0));
  const [phase, setPhase] = useState<Phase>('idle');
  const announced = useRef(false);

  useEffect(() => {
    announced.current = false;
    setWidths(words.map(() => 0));
    setPhase('idle');
    pen.setValue(0);
  }, [words, pen]);

  const measure = useCallback((index: number, width: number) => {
    setWidths((previous) => {
      if (Math.abs((previous[index] ?? 0) - width) < 0.5) {
        return previous;
      }
      const next = previous.slice();
      next[index] = width;
      return next;
    });
  }, []);

  /* Every word is given a stretch of the ink timeline as wide as the word is,
     so one value sweeping 0 → total draws the whole block in reading order.
     Zero-width words would collapse an interpolation range, hence the floor. */
  const { offsets, total } = useMemo(() => {
    const starts: number[] = [];
    let run = 0;
    for (const width of widths) {
      starts.push(run);
      run += Math.max(width, 1);
    }
    return { offsets: starts, total: run };
  }, [widths]);

  const measured = widths.length > 0 && widths.every((width) => width > 0);

  /* The plan is read once, when the pen starts. Keeping it in a ref means a
     window resize mid-sentence cannot restart the paragraph. */
  const plan = useRef({ words, widths, offsets });
  plan.current = { words, widths, offsets };

  useEffect(() => {
    if (skip && phase !== 'done') {
      setPhase('done');
    }
  }, [skip, phase]);

  useEffect(() => {
    if (phase !== 'idle' || !active || !measured) {
      return;
    }
    setPhase(reducedMotion ? 'done' : 'writing');
  }, [phase, active, measured, reducedMotion]);

  useEffect(() => {
    if (phase !== 'writing') {
      return;
    }

    const { words: line, widths: sizes, offsets: starts } = plan.current;
    const steps: Animated.CompositeAnimation[] = [];

    if (delay > 0) {
      steps.push(Animated.delay(delay));
    }

    line.forEach((word, index) => {
      const width = sizes[index];
      /* No two words come out at the same speed. */
      const rhythm = 0.84 + noise(word, index) * 0.34;

      steps.push(
        Animated.timing(pen, {
          toValue: starts[index] + width,
          duration: Math.max(80, (width / speed) * 1000 * rhythm),
          // Into and out of every word: the hand accelerates off the page and
          // settles again at the end of it.
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      );

      if (index < line.length - 1) {
        steps.push(Animated.delay(restAfter(word) * (0.8 + noise(word, index + 7) * 0.5)));
      }
    });

    const animation = Animated.sequence(steps);
    animation.start(({ finished }) => {
      if (finished) {
        setPhase('done');
      }
    });

    return () => animation.stop();
  }, [phase, delay, speed, pen]);

  useEffect(() => {
    if (phase !== 'done' || announced.current) {
      return;
    }
    announced.current = true;
    pen.setValue(total);
    onDone?.();
  }, [phase, onDone, pen, total]);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
      style={[
        styles.row,
        { columnGap: spaceWidth },
        align === 'center' && styles.rowCenter,
        containerStyle,
      ]}>
      {words.map((word, index) => (
        <Word
          // Words repeat; the index is what identifies the slot.
          key={`${index}-${word}`}
          word={word}
          index={index}
          style={style}
          phase={phase}
          pen={pen}
          width={widths[index] ?? 0}
          offset={offsets[index] ?? 0}
          fontSize={fontSize}
          lineHeight={lineHeight}
          nibColor={nibColor ?? ink}
          onMeasure={measure}
        />
      ))}
    </View>
  );
}

type WordProps = {
  word: string;
  index: number;
  style?: StyleProp<TextStyle>;
  phase: Phase;
  pen: Animated.Value;
  width: number;
  offset: number;
  fontSize: number;
  lineHeight: number;
  nibColor: string;
  onMeasure: (index: number, width: number) => void;
};

function Word({
  word,
  index,
  style,
  phase,
  pen,
  width,
  offset,
  fontSize,
  lineHeight,
  nibColor,
  onMeasure,
}: WordProps) {
  /* Handwriting is never perfectly level and never perfectly even. */
  const hand = useMemo(
    () => ({
      tilt: (noise(word, index) - 0.5) * 1.5,
      drift: (noise(word, index + 31) - 0.5) * 1.4,
      density: 0.9 + noise(word, index + 97) * 0.1,
    }),
    [word, index],
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => onMeasure(index, event.nativeEvent.layout.width),
    [onMeasure, index],
  );

  const cell = {
    transform: [{ rotate: `${hand.tilt}deg` }, { translateY: hand.drift }],
  };

  if (phase === 'done') {
    return (
      <View style={cell} onLayout={handleLayout}>
        <Text style={[style, { opacity: hand.density }]}>{word}</Text>
      </View>
    );
  }

  const drawn = width > 0;
  const range = { inputRange: [offset, offset + width], extrapolate: 'clamp' as const };
  const nibHeight = fontSize * 0.58;

  return (
    <View style={cell} onLayout={handleLayout}>
      {/* Sets the slot. Invisible, but it is what everything is measured off. */}
      <Text style={[style, styles.ghost]}>{word}</Text>

      {/* Only while the pen is on this block: at rest the nib interpolation
          sits on its own first breakpoint, which would leave a stray dot of
          ink on every paragraph that has not been started yet. */}
      {drawn && phase === 'writing' && (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.clip,
              {
                width,
                transform: [{ translateX: pen.interpolate({ ...range, outputRange: [-width, 0] }) }],
              },
            ]}>
            <Animated.Text
              numberOfLines={1}
              style={[
                style,
                {
                  width,
                  opacity: hand.density,
                  transform: [
                    { translateX: pen.interpolate({ ...range, outputRange: [width, 0] }) },
                  ],
                },
              ]}>
              {word}
            </Animated.Text>
          </Animated.View>

          {/* the nib, sitting on the wet edge of the stroke */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.nib,
              {
                width: Math.max(1.6, fontSize * 0.085),
                height: nibHeight,
                borderRadius: fontSize * 0.05,
                top: (lineHeight - fontSize) / 2 + fontSize * 0.24,
                backgroundColor: nibColor,
                shadowColor: nibColor,
                opacity: pen.interpolate({
                  inputRange: [offset - 0.5, offset, offset + width, offset + width + 0.5],
                  outputRange: [0, 0.72, 0.72, 0],
                  extrapolate: 'clamp',
                }),
                transform: [
                  { translateX: pen.interpolate({ ...range, outputRange: [0, width] }) },
                  { rotate: '-16deg' },
                ],
              },
            ]}
          />
        </>
      )}
    </View>
  );
}

/** How long the hand rests after a word, in ms. Punctuation earns a pause. */
function restAfter(word: string) {
  if (/[.!?…]["'”’)\]]?$/.test(word)) {
    return 340;
  }
  if (/[,;:—–]["'”’)\]]?$/.test(word)) {
    return 185;
  }
  return 72;
}

/** Stable 0–1 jitter, so a re-render never reshuffles the handwriting. */
function noise(seed: string, salt: number) {
  let hash = 2166136261 ^ salt;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  rowCenter: {
    justifyContent: 'center',
  },
  ghost: {
    opacity: 0,
  },
  clip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  nib: {
    position: 'absolute',
    left: 0,
    shadowOpacity: 0.5,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
});
