import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { GradientButton } from '@/components/ui/buttons/GradientButton';
import { ANSWER, QUESTION } from '@/constants/content';
import { DefaultTheme } from '@/constants/defaultTheme';
import { GradientStyles } from '@/constants/gradient';
import { useResponsive } from '@/hooks/useTheme';

type ProposalModalProps = {
  visible: boolean;
  said: boolean;
  onClose: () => void;
  onYes: (x: number, y: number) => void;
  onAgain: (x: number, y: number) => void;
};

export function ProposalModal({ visible, said, onClose, onYes, onAgain }: ProposalModalProps) {
  const { clamp } = useResponsive();
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      enter.setValue(0);
      return;
    }
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: 600,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [visible, enter]);

  if (!visible) {
    return null;
  }

  const today = new Date().toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: enter }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.center}
        showsVerticalScrollIndicator={false}
        style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            styles.card,
            {
              padding: clamp(30, 6, 64),
              opacity: enter,
              transform: [
                { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
              ],
            },
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            style={styles.close}>
            <Text style={styles.closeGlyph}>✕</Text>
          </Pressable>

          {said ? (
            <View style={styles.body}>
              <Text style={styles.emoji}>💖</Text>
              <Text style={[styles.answerTitle, { fontSize: clamp(36, 8, 88) }]}>
                {ANSWER.title}
              </Text>
              <Text style={[styles.answerBody, { fontSize: clamp(19, 2.6, 27) }]}>
                {ANSWER.body}
              </Text>

              <View style={styles.stamp}>
                <Text style={styles.stampText}>
                  {ANSWER.stampPrefix} <Text style={styles.stampDate}>{today}</Text>
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={(event: GestureResponderEvent) =>
                  onAgain(event.nativeEvent.pageX, event.nativeEvent.pageY)
                }
                style={({ pressed }) => [styles.ghostButton, pressed && styles.pressed]}>
                <Text style={styles.ghostLabel}>{ANSWER.again}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.body}>
              <Text style={styles.eyebrow}>{QUESTION.eyebrow}</Text>
              <Text style={[styles.questionTitle, { fontSize: clamp(34, 7, 76) }]}>
                {QUESTION.title} 💖
              </Text>
              <Text style={[styles.questionSubtitle, { fontSize: clamp(18, 2.4, 24) }]}>
                {QUESTION.subtitle}
              </Text>

              <View style={styles.actions}>
                <GradientButton
                  tone="light"
                  accessibilityLabel={QUESTION.yes}
                  onPress={(event: GestureResponderEvent) =>
                    onYes(event.nativeEvent.pageX, event.nativeEvent.pageY)
                  }
                  style={styles.yesButton}>
                  <Text style={styles.yesLabel}>{QUESTION.yes}</Text>
                </GradientButton>

                <Pressable
                  accessibilityRole="button"
                  onPress={(event: GestureResponderEvent) =>
                    onYes(event.nativeEvent.pageX, event.nativeEvent.pageY)
                  }
                  style={({ pressed }) => [styles.alsoYesButton, pressed && styles.pressed]}>
                  <Text style={styles.alsoYesLabel}>{QUESTION.alsoYes}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 115,
  },
  scrim: {
    backgroundColor: 'rgba(50, 8, 26, 0.6)',
  },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 680,
    borderRadius: 32,
    overflow: 'hidden',
    ...GradientStyles.question,
    backgroundColor: DefaultTheme.colors.primarySoft,
    shadowColor: '#780A28',
    shadowOpacity: 0.9,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 40 },
    elevation: 20,
  },
  close: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 5,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    color: DefaultTheme.colors.white,
    fontSize: 15,
    lineHeight: 18,
  },
  body: {
    alignItems: 'center',
  },
  eyebrow: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11.5,
    letterSpacing: 3.4,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.82)',
    textAlign: 'center',
  },
  questionTitle: {
    marginTop: 24,
    fontFamily: DefaultTheme.fonts.display,
    color: DefaultTheme.colors.white,
    textAlign: 'center',
  },
  questionSubtitle: {
    marginTop: 24,
    maxWidth: 520,
    fontFamily: DefaultTheme.fonts.displayItalic,
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 38,
  },
  yesButton: {
    minHeight: 60,
    paddingHorizontal: 46,
  },
  yesLabel: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 15,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: DefaultTheme.colors.primaryDeep,
  },
  alsoYesButton: {
    paddingVertical: 20,
    paddingHorizontal: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  alsoYesLabel: {
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 15,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: DefaultTheme.colors.white,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.97 }],
  },
  emoji: {
    fontSize: 44,
    lineHeight: 52,
  },
  answerTitle: {
    marginTop: 20,
    fontFamily: DefaultTheme.fonts.display,
    color: DefaultTheme.colors.white,
    textAlign: 'center',
  },
  answerBody: {
    marginTop: 24,
    maxWidth: 560,
    fontFamily: DefaultTheme.fonts.displayItalic,
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.94)',
    textAlign: 'center',
  },
  stamp: {
    marginTop: 30,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  stampText: {
    fontFamily: DefaultTheme.fonts.body,
    fontSize: 12,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: DefaultTheme.colors.white,
  },
  stampDate: {
    fontFamily: DefaultTheme.fonts.bodySemiBold,
  },
  ghostButton: {
    marginTop: 30,
    paddingVertical: 13,
    paddingHorizontal: 26,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  ghostLabel: {
    fontFamily: DefaultTheme.fonts.body,
    fontSize: 12,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: DefaultTheme.colors.white,
  },
});
