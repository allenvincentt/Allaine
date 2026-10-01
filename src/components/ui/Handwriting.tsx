import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { QuillPen } from '@/components/ui/QuillPen';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Phase = 'idle' | 'writing' | 'done';

type Box = { x: number; y: number; width: number };

type Slot = { start: number; end: number };

type Frame = { t: number; p: number; glide?: boolean };

const EMPTY_BOX: Box = { x: 0, y: 0, width: 0 };

const HOP = 1;

const EM = 0.46;

type HandwritingProps = {
  text: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  active?: boolean;
  skip?: boolean;
  speed?: number;
  delay?: number;
  align?: 'left' | 'center';
  nibColor?: string;
  onDone?: () => void;
};

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
  const hover = useRef(new Animated.Value(0)).current;
  const hand = useRef(new Animated.Value(0)).current;

  const [boxes, setBoxes] = useState<Box[]>(() => words.map(() => EMPTY_BOX));
  const [phase, setPhase] = useState<Phase>('idle');
  const [written, setWritten] = useState(0);
  const announced = useRef(false);
  const reached = useRef(0);

  const { slots, total } = useMemo(() => {
    const laid: Slot[] = [];
    let run = 0;
    words.forEach((word, index) => {
      laid.push({ start: run, end: run + word.length });
      run += word.length + (index < words.length - 1 ? HOP : 0);
    });
    return { slots: laid, total: run };
  }, [words]);

  useEffect(() => {
    announced.current = false;
    reached.current = 0;
    setBoxes(words.map(() => EMPTY_BOX));
    setPhase('idle');
    setWritten(0);
    pen.setValue(0);
    hover.setValue(0);
  }, [words, pen, hover]);

  const measure = useCallback((index: number, box: Box) => {
    setBoxes((previous) => {
      const current = previous[index];
      if (
        current &&
        Math.abs(current.width - box.width) < 0.5 &&
        Math.abs(current.x - box.x) < 0.5 &&
        Math.abs(current.y - box.y) < 0.5
      ) {
        return previous;
      }
      const next = previous.slice();
      next[index] = box;
      return next;
    });
  }, []);

  const measured =
    boxes.length === words.length && boxes.length > 0 && boxes.every((box) => box.width > 0);

  const track = useMemo(() => {
    if (!measured) {
      return null;
    }

    const input: number[] = [];
    const x: number[] = [];
    const y: number[] = [];
    const lift: number[] = [];
    const baseline = (lineHeight - fontSize) / 2 + fontSize * 0.82;

    boxes.forEach((box, index) => {
      const slot = slots[index];
      if (!slot) {
        return;
      }

      input.push(slot.start, slot.end);
      x.push(box.x, box.x + box.width);
      y.push(box.y + baseline, box.y + baseline);
      lift.push(0, 0);

      const next = boxes[index + 1];
      const after = slots[index + 1];
      if (!next || !after) {
        return;
      }
      input.push((slot.end + after.start) / 2);
      x.push((box.x + box.width + next.x) / 2);
      y.push((box.y + next.y) / 2 + baseline);
      lift.push(1);
    });

    if (input.length < 2) {
      return null;
    }

    return {
      x: pen.interpolate({ inputRange: input, outputRange: x, extrapolate: 'clamp' }),
      y: pen.interpolate({ inputRange: input, outputRange: y, extrapolate: 'clamp' }),
      lift: pen.interpolate({ inputRange: input, outputRange: lift, extrapolate: 'clamp' }),
    };
  }, [measured, boxes, slots, pen, fontSize, lineHeight]);

  useEffect(() => {
    if (skip && phase !== 'done') {
      setPhase('done');
    }
  }, [skip, phase]);

  useEffect(() => {
    if (phase !== 'idle' || !active) {
      return;
    }
    setPhase(reducedMotion ? 'done' : 'writing');
  }, [phase, active, reducedMotion]);

  useEffect(() => {
    if (phase !== 'writing') {
      return;
    }
    const drift = Animated.loop(
      Animated.sequence([
        Animated.timing(hand, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(hand, {
          toValue: 0,
          duration: 2100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    drift.start();
    return () => drift.stop();
  }, [phase, hand]);

  useEffect(() => {
    if (phase !== 'writing') {
      return;
    }

    const frames = schedule(words, slots, delay, fontSize, speed);
    const last = frames[frames.length - 1];

    let cursor = 0;
    let resume = 0;
    if (reached.current > 0) {
      while (cursor < frames.length - 1 && frames[cursor + 1].p <= reached.current) {
        cursor += 1;
      }
      resume = frames[cursor].t;
    }

    let raf = 0;
    let origin = 0;
    let mark = -1;
    let liftOff: Animated.CompositeAnimation | null = null;

    const land = () => {
      liftOff = Animated.timing(hover, {
        toValue: 0,
        duration: 280,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      });
      liftOff.start(({ finished }) => {
        if (finished) {
          setPhase('done');
        }
      });
    };

    const step = (now: number) => {
      if (!origin) {
        origin = now - resume;
      }
      const elapsed = now - origin;

      while (cursor < frames.length - 1 && frames[cursor + 1].t <= elapsed) {
        cursor += 1;
      }

      let at = last.p;
      if (cursor < frames.length - 1) {
        const from = frames[cursor];
        const to = frames[cursor + 1];
        const span = to.t - from.t;
        let k = span > 0 ? (elapsed - from.t) / span : 1;
        k = k < 0 ? 0 : k > 1 ? 1 : k;
        if (to.glide) {
          k = k * k * (3 - 2 * k);
        }
        at = from.p + (to.p - from.p) * k;
      }

      pen.setValue(at);
      reached.current = at;

      const inked = Math.floor(at);
      if (inked !== mark) {
        mark = inked;
        setWritten(inked);
      }

      if (elapsed >= last.t) {
        land();
        return;
      }
      raf = requestAnimationFrame(step);
    };

    const settle = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(hover, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);

    settle.start();
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      settle.stop();
      liftOff?.stop();
    };
  }, [phase, words, slots, delay, speed, fontSize, pen, hover]);

  useEffect(() => {
    if (phase !== 'done' || announced.current) {
      return;
    }
    announced.current = true;
    pen.setValue(total);
    hover.setValue(0);
    onDone?.();
  }, [phase, onDone, pen, hover, total]);

  const inked = phase === 'done' ? total : written;
  const quillLength = Math.min(206, Math.max(96, fontSize * 6.6));

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
          key={`${index}-${word}`}
          word={word}
          index={index}
          style={style}
          shown={drawn(inked - (slots[index]?.start ?? 0), word.length)}
          onMeasure={measure}
        />
      ))}

      {phase === 'writing' && track && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.quill,
            {
              opacity: hover,
              transform: [
                { translateX: track.x },
                { translateY: track.y },
                {
                  translateY: Animated.add(
                    track.lift.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -fontSize * 0.34],
                    }),
                    hover.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-fontSize * 1.1, 0],
                    }),
                  ),
                },
                {
                  rotate: hand.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['33deg', '36.4deg'],
                  }),
                },
              ],
            },
          ]}>
          <Animated.View
            style={[
              styles.bead,
              {
                width: Math.max(2, fontSize * 0.13),
                height: Math.max(1.6, fontSize * 0.1),
                borderRadius: fontSize * 0.07,
                left: -fontSize * 0.065,
                top: -fontSize * 0.05,
                backgroundColor: nibColor ?? ink,
                shadowColor: nibColor ?? ink,
                opacity: track.lift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.62, 0.12],
                }),
              },
            ]}
          />
          <QuillPen length={quillLength} ink={nibColor ?? ink} />
        </Animated.View>
      )}
    </View>
  );
}

type WordProps = {
  word: string;
  index: number;
  style?: StyleProp<TextStyle>;
  shown: number;
  onMeasure: (index: number, box: Box) => void;
};

const Word = memo(function Word({ word, index, style, shown, onMeasure }: WordProps) {
  const hand = useMemo(
    () => ({
      tilt: (noise(word, index) - 0.5) * 1.5,
      drift: (noise(word, index + 31) - 0.5) * 1.4,
      density: 0.9 + noise(word, index + 97) * 0.1,
    }),
    [word, index],
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { x, y, width } = event.nativeEvent.layout;
      onMeasure(index, { x, y, width });
    },
    [onMeasure, index],
  );

  const cell = useMemo(
    () => ({ transform: [{ rotate: `${hand.tilt}deg` }, { translateY: hand.drift }] }),
    [hand],
  );

  return (
    <View style={[styles.cell, cell]} onLayout={handleLayout}>
      <Text style={[style, styles.slot]}>{word}</Text>

      {shown > 0 && (
        <Text style={[style, styles.ink, { opacity: hand.density }]}>
          {shown >= word.length ? word : word.slice(0, shown)}
        </Text>
      )}
    </View>
  );
});

function schedule(
  words: string[],
  slots: Slot[],
  delay: number,
  fontSize: number,
  speed: number,
): Frame[] {
  const frames: Frame[] = [{ t: delay, p: 0 }];
  const stroke = Math.max(9, ((fontSize * EM) / speed) * 1000);
  let t = delay;

  words.forEach((word, index) => {
    const rhythm = 0.84 + noise(word, index) * 0.34;

    for (let letter = 0; letter < word.length; letter += 1) {
      const grain = 0.7 + noise(word, index * 31 + letter) * 0.6;
      t += Math.max(7, (stroke / rhythm) * grain * (letter === 0 ? 1.35 : 1));
      frames.push({ t, p: slots[index].start + letter + 1 });
    }

    const after = slots[index + 1];
    if (!after) {
      return;
    }
    t += restAfter(word) * (0.8 + noise(word, index + 7) * 0.5);
    frames.push({ t, p: after.start, glide: true });
  });

  return frames;
}

function drawn(past: number, length: number) {
  if (past <= 0) {
    return 0;
  }
  return past >= length ? length : past;
}

function restAfter(word: string) {
  if (/[.!?…]["'”’)\]]?$/.test(word)) {
    return 340;
  }
  if (/[,;:—–]["'”’)\]]?$/.test(word)) {
    return 185;
  }
  return 96;
}

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
    overflow: 'visible',
  },
  rowCenter: {
    justifyContent: 'center',
  },
  cell: {
    overflow: 'visible',
  },
  slot: {
    color: 'transparent',
    opacity: 0,
  },
  ink: {
    position: 'absolute',
    left: 0,
    right: -2,
    top: 0,
  },
  quill: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    overflow: 'visible',
    zIndex: 3,
  },
  bead: {
    position: 'absolute',
    zIndex: 1,
    shadowOpacity: 0.55,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
});
