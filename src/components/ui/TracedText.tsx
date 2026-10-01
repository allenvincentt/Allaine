import { forwardRef, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Text as SvgText, type TextProps } from 'react-native-svg';

import { useReducedMotion } from '@/hooks/useReducedMotion';

const CAN_TRACE = Platform.OS !== 'android';

const SvgTextNode = forwardRef<
  ComponentRef<typeof SvgText>,
  TextProps & { collapsable?: boolean }
>(function SvgTextNode({ collapsable, ...rest }, ref) {
  return <SvgText ref={ref} {...rest} />;
});

const AnimatedSvgText = Animated.createAnimatedComponent(SvgTextNode);

const TRACE_MS = 1500;
const STAGGER_MS = 110;
const REST_MS = 5200;
const DASH_EM = 5.4;
const BASELINE_EM = 0.76;
const BLEED_EM = 0.34;

type TracedTextProps = {
  text: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  color: string;
  stroke: string;
  fontStyle?: TextStyle['fontStyle'];
  strokeWidth?: number;
  active?: boolean;
  paused?: boolean;
  delay?: number;
  indexOffset?: number;
  shimmer?: Animated.Value;
  shimmerColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function TracedText({
  text,
  fontFamily,
  fontSize,
  lineHeight,
  color,
  stroke,
  fontStyle,
  strokeWidth,
  active = true,
  paused = false,
  delay = 0,
  indexOffset = 0,
  shimmer,
  shimmerColor,
  style,
}: TracedTextProps) {
  const words = useMemo(() => {
    const parts = text.split(/(\s+)/).filter((part) => part.length > 0);
    const lengths = parts.map((part) => (/^\s+$/.test(part) ? 0 : Array.from(part).length));

    return parts.map((part, index) => ({
      part,
      blank: lengths[index] === 0,
      first: indexOffset + lengths.slice(0, index).reduce((total, n) => total + n, 0),
    }));
  }, [text, indexOffset]);

  return (
    <View accessible accessibilityRole="text" accessibilityLabel={text} style={[styles.line, style]}>
      {words.map(({ part, blank, first }, partIndex) => {
        if (blank) {
          return (
            <Text
              key={`gap-${partIndex}`}
              style={{ fontFamily, fontSize, lineHeight, fontStyle }}>
              {part}
            </Text>
          );
        }

        return (
          <View key={`word-${partIndex}`} style={styles.word}>
            {Array.from(part).map((character, characterIndex) => (
              <TracedCharacter
                key={`${character}-${characterIndex}`}
                character={character}
                fontFamily={fontFamily}
                fontSize={fontSize}
                lineHeight={lineHeight}
                fontStyle={fontStyle}
                color={color}
                stroke={stroke}
                strokeWidth={strokeWidth ?? Math.max(0.9, fontSize * 0.018)}
                active={active}
                paused={paused}
                shimmer={shimmer}
                shimmerColor={shimmerColor}
                delay={delay + (first + characterIndex) * STAGGER_MS}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}

type Box = { width: number; height: number };

function TracedCharacter({
  character,
  fontFamily,
  fontSize,
  lineHeight,
  fontStyle,
  color,
  stroke,
  strokeWidth,
  active,
  paused,
  shimmer,
  shimmerColor,
  delay,
}: {
  character: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontStyle?: TextStyle['fontStyle'];
  color: string;
  stroke: string;
  strokeWidth: number;
  active: boolean;
  paused: boolean;
  shimmer?: Animated.Value;
  shimmerColor?: string;
  delay: number;
}) {
  const reducedMotion = useReducedMotion();
  const [box, setBox] = useState<Box | null>(null);

  /** 0 before the line has reached this glyph, 1 once it has been all the way
   *  round it. Loops; the ink below does not. */
  const trace = useRef(new Animated.Value(0)).current;
  const ink = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      return;
    }

    /* Both of these land on the same picture: the letter filled, the line that
       drew it lifted. Which is why pausing is safe to do at any moment of the
       sweep — there is no half-drawn state to be caught in. */
    if (reducedMotion || paused) {
      trace.setValue(1);
      ink.setValue(1);
      return;
    }

    /* ——— and nothing is drawn where there is no line ———
       `trace` exists to drive `strokeDashoffset` and `strokeOpacity` on the
       `<Svg>` below, and that block is not rendered at all where the font
       cannot be resolved — see `CAN_TRACE`. Left unguarded, every character in
       the headline still started an *endless* `useNativeDriver: false` loop
       there: a main-thread animated value ticking at 60fps for the life of the
       page, on the same thread the scroll is read on and the background clip
       scrubbed on, driving nothing anybody could see. Ten glyphs of "For
       Ellaine" is ten of them, and that is most of why the first screen
       dropped frames on a phone.

       The ink still runs — the letter really does fade up — and `trace` is put
       straight to its finished value, which is the state the sweep ends in
       anyway. */
    if (!CAN_TRACE) {
      trace.setValue(1);
    }

    const drawing = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.sequence([
          Animated.timing(trace, {
            toValue: 1,
            duration: TRACE_MS,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.delay(REST_MS),
          // Back to the start of the outline, with the line already lifted —
          // an instant reset the eye never catches, which is what makes the
          // repeat seamless.
          Animated.timing(trace, { toValue: 0, duration: 0, useNativeDriver: false }),
        ]),
      ),
    ]);

    const filling = Animated.sequence([
      // Set so the ink arrives with the line about two thirds of the way round,
      // rather than waiting for it to finish and landing as a flash.
      Animated.delay(delay + TRACE_MS * 0.42),
      Animated.timing(ink, {
        toValue: 1,
        duration: TRACE_MS * 0.85,
        easing: Easing.out(Easing.cubic),
        // Only an opacity now that the fill colour is static, so it can leave
        // the JS thread — the animated colour is what used to pin it there.
        useNativeDriver: true,
      }),
    ]);

    if (CAN_TRACE) {
      drawing.start();
    }
    filling.start();
    return () => {
      drawing.stop();
      filling.stop();
    };
    /* Deliberately not keyed to `box`. The glyph no longer waits on a
       measurement to be visible — only the line laid over it does — so
       re-running this when the measurement lands would restart the ink the
       reader is already watching arrive. */
  }, [active, delay, reducedMotion, paused, trace, ink]);

  const dash = fontSize * DASH_EM;
  const bleed = fontSize * BLEED_EM;

  /* The shimmer copy's opacity: the shimmer gated by the ink, so a letter that
     has not been written yet cannot glint. One multiply node per glyph, all of
     them hanging off the same shared value, and every part of it native. */
  const glint = useMemo(
    () => (shimmer ? Animated.multiply(ink, shimmer) : null),
    [ink, shimmer],
  );

  return (
    <View
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setBox((current) =>
          current && Math.abs(current.width - width) < 0.5 && Math.abs(current.height - height) < 0.5
            ? current
            : { width, height },
        );
      }}>
      {/* The letter, and the measuring stick — one glyph doing both jobs. It
          fades up on the value that used to be the SVG fill's opacity. */}
      <Animated.Text
        style={{ fontFamily, fontSize, lineHeight, fontStyle, color, opacity: ink }}>
        {character}
      </Animated.Text>

      {/* The same glyph again in the far colour, cross-faded over the first —
          which is the shimmer, without a JS-driven colour. See `shimmer`. */}
      {glint && shimmerColor ? (
        <Animated.Text
          style={[
            styles.shimmerCopy,
            { fontFamily, fontSize, lineHeight, fontStyle, color: shimmerColor, opacity: glint },
          ]}>
          {character}
        </Animated.Text>
      ) : null}

      {CAN_TRACE && box ? (
        <Svg
          pointerEvents="none"
          style={{ position: 'absolute', left: -bleed, top: -bleed }}
          width={box.width + bleed * 2}
          height={box.height + bleed * 2}>
          <AnimatedSvgText
            x={bleed}
            y={bleed + (box.height - fontSize) / 2 + fontSize * BASELINE_EM}
            fontFamily={fontFamily}
            fontSize={fontSize}
            fontStyle={fontStyle}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${dash} ${dash}`}
            strokeDashoffset={trace.interpolate({
              inputRange: [0, 1],
              outputRange: [dash, 0],
            })}
            strokeOpacity={trace.interpolate({
              // Up as the line starts, held while it travels, and gone by the
              // time it closes — so what is left behind is the letter, not an
              // outline drawn on top of it.
              inputRange: [0, 0.05, 0.72, 1],
              outputRange: [0, 0.95, 0.9, 0],
            })}>
            {character}
          </AnimatedSvgText>
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  /** A word is one unbreakable run, so wrapping happens between words. */
  word: {
    flexDirection: 'row',
  },
  /** Out of the flow, pinned over the base glyph it is a copy of. */
  shimmerCopy: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
