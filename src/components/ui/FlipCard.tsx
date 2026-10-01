import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useRevealed } from '@/components/ui/Reveal';
import { DefaultTheme } from '@/constants/defaultTheme';
import { GradientStyles, gradientStyle } from '@/constants/gradient';
import type { Reason } from '@/constants/content';

const CARD_HEIGHT = 230;

const HOVER_MS = 320;
const HOVER_LIFT = 10;
const FRONT_FLOOR = 0.24;
const BACK_FLOOR = 0.5;

const CAN_BLUR = Platform.OS !== 'android';
const FROST_INTENSITY = 30;

const HOUSE_ANGLE = '106deg';
const WASH_GLASS = gradientStyle(
  `linear-gradient(${HOUSE_ANGLE}, rgba(254,254,254,0.795) 0%, rgba(254,254,254,0.655) 100%)`,
);
const WASH_HIGHLIGHT = gradientStyle(
  `linear-gradient(${HOUSE_ANGLE}, rgba(254,171,201,0.769) 0%, rgba(243,133,164,0.649) 100%)`,
);

/**
 * Whether this platform has a pointer at all.
 *
 * Everything the hover buys — the lift, the thinning, the photograph coming up
 * through it — is driven by `onHoverIn`/`onHoverOut`, and a touch screen fires
 * neither. On a phone `hover` is a value that is pinned at 0 for the life of the
 * page, which makes the photograph an image that is mounted, fetched, decoded
 * and held at zero opacity so that it can be seen never. Eight of them, three
 * to twelve megapixels each, all decoding in the same breath the section
 * reveals. See the photo layer for what that was actually costing.
 */
const CAN_HOVER = Platform.OS === 'web';

type FlipCardProps = {
  reason: Reason;
  onFlip?: (x: number, y: number) => void;
  style?: StyleProp<ViewStyle>;
};

/** One of the "Reasons, and there are many" cards — glass on the front, rose on the back. */
export function FlipCard({ reason, onFlip, style }: FlipCardProps) {
  /* The photo waits for the section, and on a phone it does not come at all.
     It only ever shows through on hover, which a touch screen never fires, so
     there the image was a bitmap decoded and then held at zero opacity for the
     rest of the session — see `CAN_HOVER`. Reveal comes 95% of a viewport
     before the card can be seen, so in a browser the picture is long since
     decoded by the time a pointer reaches it. */
  const revealed = useRevealed();
  const [flipped, setFlipped] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const hover = useRef(new Animated.Value(0)).current;

  const handlePress = (event: GestureResponderEvent) => {
    const next = !flipped;
    setFlipped(next);

    Animated.timing(progress, {
      toValue: next ? 1 : 0,
      duration: 850,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();

    if (next) {
      onFlip?.(event.nativeEvent.pageX, event.nativeEvent.pageY);
    }
  };

  /** Decelerating into both ends — nothing about a hover should overshoot. */
  const settle = useCallback(
    (to: number) => {
      Animated.timing(hover, {
        toValue: to,
        duration: HOVER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [hover],
  );

  /* Built once per card, not once per render of the page above it. An
     `interpolate` is a node in the animated graph rather than a number, so
     written inline these stood up six fresh nodes per card — forty-eight across
     the grid — every time anything on the landing page changed state, for eight
     cards that were doing exactly what they were already doing. The same trade
     `Reveal` makes, for the same reason; nothing here depends on a render. */
  const motion = useMemo(
    () => ({
      /* ——— which way it turns ———
         Anticlockwise about the card's own vertical axis: the right-hand edge
         comes towards the reader and the left goes away, which is the direction
         the reference composition turns. Negative rotations rather than positive
         ones, and the back has to be wound the same way — the two faces are one
         sheet, so a back rotating the other way is a card that turns inside out
         halfway through and lands with its type mirrored. */
      frontRotation: progress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '-180deg'],
      }),
      backRotation: progress.interpolate({
        inputRange: [0, 1],
        outputRange: ['180deg', '0deg'],
      }),
      lift: hover.interpolate({ inputRange: [0, 1], outputRange: [0, -HOVER_LIFT] }),
      /* The photo arrives on the same curve the frost leaves on, so the two read
         as one move: the material thinning *is* the picture coming up through
         it. */
      photoFade: hover.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
      frontFade: hover.interpolate({ inputRange: [0, 1], outputRange: [1, FRONT_FLOOR] }),
      backFade: hover.interpolate({ inputRange: [0, 1], outputRange: [1, BACK_FLOOR] }),
    }),
    [progress, hover],
  );

  const frontTransform = useMemo(
    () => [{ perspective: 1200 }, { rotateY: motion.frontRotation }],
    [motion],
  );
  const backTransform = useMemo(
    () => [{ perspective: 1200 }, { rotateY: motion.backRotation }],
    [motion],
  );
  const liftTransform = useMemo(() => [{ translateY: motion.lift }], [motion]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${reason.title}. Tap to read why.`}
      onPress={handlePress}
      onHoverIn={() => settle(1)}
      onHoverOut={() => settle(0)}
      style={[styles.root, style]}>
      {/* The lift is carried here rather than on either face, so both halves of
          the card come up together and the flip keeps the transform list on the
          faces to itself. */}
      <Animated.View style={[styles.lift, { transform: liftTransform }]}>
        <Animated.View
          style={[
            styles.face,
            reason.highlight ? styles.faceHighlight : styles.faceGlass,
            { transform: frontTransform },
          ]}>
          {/* Under the material, not over it. The frost thins to FRONT_FLOOR on
              hover and the photo is what that thinning reveals; the veil is
              there so the ink on top stays ink and not a caption.

              Nothing thins without a pointer, so on a phone there is no reveal
              to be under and the picture is not mounted at all. See
              `CAN_HOVER`. */}
          {CAN_HOVER && reason.image && revealed ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.photo, { opacity: motion.photoFade }]}>
              <Image source={reason.image} style={styles.photoLayer} contentFit="cover" />
              <View style={[styles.photoLayer, styles.photoVeil]} />
            </Animated.View>
          ) : null}

          {/* Two shapes for the same material. Where there is a blur it has to
              be its own view with the tint over it, so the wash is a wrapper and
              two layers. Where there is not — Android — all three resolve to one
              ramp, and it is drawn as one view with the card's own radius on it,
              rather than three fills inside a rounded clip. See `WASH_GLASS`. */}
          {CAN_BLUR ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.frost, { opacity: motion.frontFade }]}>
              <BlurView intensity={FROST_INTENSITY} tint="light" style={styles.frostLayer} />
              <View
                style={[
                  styles.frostLayer,
                  reason.highlight ? styles.tintHighlight : styles.tintGlass,
                ]}
              />
            </Animated.View>
          ) : (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.frostLayer,
                reason.highlight ? styles.washHighlight : styles.washGlass,
                { opacity: motion.frontFade },
              ]}
            />
          )}

          <View style={[styles.content, styles.frontContent]}>
            <Text style={[styles.index, reason.highlight && styles.indexHighlight]}>
              {reason.index}
            </Text>
            <Text style={styles.title}>{reason.title}</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.face, styles.back, { transform: backTransform }]}>
          {/* Same idea as the frost: the rose ramp is a layer, not the face, so
              it can thin out underneath type that does not. */}
          <Animated.View
            pointerEvents="none"
            style={[styles.backFill, { opacity: motion.backFade }]}
          />

          <View style={[styles.content, styles.backContent]}>
            <Text style={styles.backText}>{reason.body}</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export const FlipCardHeight = CARD_HEIGHT;

const styles = StyleSheet.create({
  root: {
    height: CARD_HEIGHT,
  },
  lift: {
    flex: 1,
  },
  /**
   * ——— why the padding is not on here ———
   *
   * It used to be, and it is what drew the rectangle inside the card.
   *
   * An absolutely positioned child is inset from its parent's *padding* box on
   * a phone and from its border box on the web, so `padding: 24` here quietly
   * shrank every layer of the material by 24 on all four sides: the frost, the
   * white ramp and the rose fill all stopped short of the card, each one with a
   * rounded corner of its own, and the edge where they stopped is the inner
   * border the flip was throwing a shadow along. The card was two surfaces
   * pretending to be one, and a rotation is exactly what tells them apart.
   *
   * So the face carries nothing but the card's own shape, and the words sit in
   * a `content` box inside it. The material now reaches the border on every
   * platform, which leaves one edge on the card — its own — for the light to
   * find.
   */
  /**
   * ——— and nothing is drawn *around* it ———
   *
   * No border, no shadow, no elevation. All three were describing the same
   * rectangle, and on a phone all three drew it as one: a hairline ring plus a
   * cast shadow reads as an outline at rest, and `elevation` on Android is a
   * shadow struck from the view's *outline*, which a face carrying a 3D
   * transform hands over as a plain box — so the card sat inside a hard-edged
   * rectangle that stayed put while the card itself turned.
   *
   * What is left is the material: the wash, the tint and the ramp, each rounded
   * to the card's own radius. The card is now told entirely by its own surface
   * against the page, which is what "blends into the design" means here — there
   * is no longer any edge on it that is not the material's own.
   */
  face: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
    backfaceVisibility: 'hidden',
  },
  /** Where the padding went. Laid out in flow, so it insets the type without
   *  moving anything that fills the card. */
  content: {
    flex: 1,
    padding: 24,
  },
  frontContent: {
    justifyContent: 'space-between',
  },
  backContent: {
    justifyContent: 'center',
  },
  /**
   * The blur and the white ramp both live in here: the face itself stays
   * transparent so the frost reads through, and the clip keeps the blur inside
   * the corner radius without eating the face's shadow.
   */
  frost: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
    overflow: 'hidden',
  },
  /** Every layer of the material, each rounded in its own right so none of them
   *  depends on `frost`'s clip to keep off the card's corners. See `CAN_BLUR`. */
  frostLayer: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
  },
  /** Same shape and clip as the frost — the photo is another layer of the
   *  card's material, so it is rounded in its own right for the same reason. */
  photo: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
    overflow: 'hidden',
  },
  photoLayer: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
  },
  /** Enough white to keep the index and the title legible over any exposure,
   *  and not so much that the picture turns to fog. */
  photoVeil: {
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
  },
  /** The whole front material on a phone, in one fill. See `WASH_GLASS`. */
  washGlass: WASH_GLASS,
  washHighlight: WASH_HIGHLIGHT,
  tintGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    ...GradientStyles.glass,
  },
  tintHighlight: {
    backgroundColor: 'rgba(255, 163, 196, 0.4)',
    ...GradientStyles.glassAccent,
  },
  /* The two front variants no longer differ in anything but their tint — the
     rim each of them used to carry is gone with the rest of the outline. They
     are kept as names so the call site still reads as "glass or highlight". */
  faceGlass: {},
  faceHighlight: {},
  back: {},
  backFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
    ...GradientStyles.soft,
  },
  index: {
    fontFamily: DefaultTheme.fonts.displayRegular,
    fontSize: 15,
    color: DefaultTheme.colors.labelSoft,
  },
  indexHighlight: {
    color: DefaultTheme.colors.white,
  },
  title: {
    fontFamily: DefaultTheme.fonts.displayRegular,
    fontSize: 26,
    lineHeight: 30,
    color: DefaultTheme.colors.ink,
  },
  backText: {
    fontFamily: DefaultTheme.fonts.bodyLight,
    fontSize: 16,
    lineHeight: 26,
    color: DefaultTheme.colors.white,
  },
});
