import { Image } from 'expo-image';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { DefaultTheme } from '@/constants/defaultTheme';
import { GradientStyles } from '@/constants/gradient';
import type { Photo } from '@/constants/content';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useResponsive } from '@/hooks/useTheme';
import { useRevealed } from '@/components/ui/Reveal';

type PhotoMarqueeProps = {
  photos: Photo[];
};

/** The two counter-scrolling photo rows from "Us, in pictures". */
export function PhotoMarquee({ photos }: PhotoMarqueeProps) {
  const { clamp } = useResponsive();
  const cardWidth = clamp(200, 22, 300);
  const gap = clamp(14, 2, 22);

  const reversed = useMemo(() => [...photos].reverse(), [photos]);

  return (
    <View style={[styles.root, { gap: clamp(10, 1.8, 16) }]}>
      <MarqueeRow
        photos={photos}
        cardWidth={cardWidth}
        gap={gap}
        duration={48000}
        reverse={false}
      />
      <MarqueeRow
        photos={reversed}
        cardWidth={cardWidth}
        gap={gap}
        duration={40000}
        reverse
      />
    </View>
  );
}

function MarqueeRow({
  photos,
  cardWidth,
  gap,
  duration,
  reverse,
}: {
  photos: Photo[];
  cardWidth: number;
  gap: number;
  duration: number;
  reverse: boolean;
}) {
  const revealed = useRevealed();
  const reducedMotion = useReducedMotion();
  const scroll = useRef(new Animated.Value(0)).current;

  // One full set of cards; the row renders two so the loop is seamless.
  const setWidth = photos.length * (cardWidth + gap);
  const cards = useMemo(() => [...photos, ...photos], [photos]);

  // Cards fly in one at a time, then the belt starts turning.
  const entranceDelay = (photos.length - 1) * 90 + 700;

  useEffect(() => {
    if (!revealed || reducedMotion || setWidth <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      Animated.loop(
        Animated.timing(scroll, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          isInteraction: false,
          useNativeDriver: true,
        }),
      ).start();
    }, entranceDelay);

    return () => clearTimeout(timer);
  }, [revealed, reducedMotion, setWidth, duration, entranceDelay, scroll]);

  const translateX = scroll.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? [-setWidth, 0] : [0, -setWidth],
  });

  return (
    <View style={styles.rowClip}>
      <Animated.View style={[styles.track, { gap, transform: [{ translateX }] }]}>
        {cards.map((photo, index) => (
          <MarqueeCard
            key={`${photo.id}-${index}`}
            photo={photo}
            width={cardWidth}
            revealed={revealed}
            delay={(index % photos.length) * 90}
            from={reverse ? 46 : -46}
          />
        ))}
      </Animated.View>

      <View pointerEvents="none" style={[styles.edge, styles.edgeLeft]} />
      <View pointerEvents="none" style={[styles.edge, styles.edgeRight]} />
    </View>
  );
}

function MarqueeCard({
  photo,
  width,
  revealed,
  delay,
  from,
}: {
  photo: Photo;
  width: number;
  revealed: boolean;
  delay: number;
  from: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!revealed) {
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 650,
      delay,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [revealed, delay, progress]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          width,
          height: (width * 3) / 4,
          opacity: progress,
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [from, 0],
              }),
            },
          ],
        },
      ]}>
      <Image
        source={photo.source}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={280}
      />
      <View pointerEvents="none" style={styles.caption}>
        <Text style={styles.captionText} numberOfLines={2}>
          {photo.caption}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  rowClip: {
    width: '100%',
    overflow: 'hidden',
  },
  track: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: DefaultTheme.colors.surfaceTint,
    shadowColor: '#96193C',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 5,
  },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 26,
    paddingHorizontal: 14,
    paddingBottom: 10,
    ...GradientStyles.captionScrim,
  },
  captionText: {
    fontFamily: DefaultTheme.fonts.displayItalicRegular,
    fontStyle: 'italic',
    fontSize: 13,
    color: DefaultTheme.colors.white,
  },
  edge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 48,
  },
  edgeLeft: {
    left: 0,
    ...GradientStyles.edgeLeft,
  },
  edgeRight: {
    right: 0,
    ...GradientStyles.edgeRight,
  },
});
