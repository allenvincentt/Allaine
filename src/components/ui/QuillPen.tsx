import { StyleSheet, View } from 'react-native';

import { gradientStyle } from '@/constants/gradient';

const VANE = gradientStyle(
  'linear-gradient(196deg, rgba(255,253,250,0.97) 0%, rgba(255,244,248,0.86) 34%, rgba(255,228,238,0.56) 66%, rgba(255,228,238,0) 100%)',
);
const VANE_SHADE = gradientStyle(
  'linear-gradient(164deg, rgba(176,120,148,0.32) 0%, rgba(176,120,148,0.12) 44%, rgba(176,120,148,0) 100%)',
);

const BARBS = [0.2, 0.34, 0.48, 0.62, 0.76] as const;

type QuillPenProps = {
  length: number;
  ink: string;
};

export function QuillPen({ length, ink }: QuillPenProps) {
  const width = length * 0.56;
  const vaneWidth = width * 0.54;
  const vaneHeight = length * 0.66;
  const rachis = Math.max(1.2, length * 0.034);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.root,
        {
          width,
          height: length,
          left: -width / 2,
          bottom: 0,
        },
      ]}>
      <View
        style={[
          styles.vane,
          VANE,
          {
            width: vaneWidth,
            height: vaneHeight,
            left: width / 2 - vaneWidth,
            top: length * 0.05,
            borderTopLeftRadius: vaneWidth * 0.9,
            borderTopRightRadius: vaneWidth * 0.2,
            borderBottomLeftRadius: vaneWidth * 0.7,
            borderBottomRightRadius: rachis,
            transform: [{ rotate: '-5deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.vane,
          VANE,
          {
            width: vaneWidth,
            height: vaneHeight * 0.94,
            left: width / 2,
            top: length * 0.07,
            borderTopLeftRadius: vaneWidth * 0.2,
            borderTopRightRadius: vaneWidth * 0.9,
            borderBottomLeftRadius: rachis,
            borderBottomRightRadius: vaneWidth * 0.7,
            transform: [{ rotate: '5deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.vane,
          VANE_SHADE,
          {
            width: vaneWidth * 0.9,
            height: vaneHeight * 0.9,
            left: width / 2,
            top: length * 0.09,
            borderTopRightRadius: vaneWidth * 0.8,
            borderBottomRightRadius: vaneWidth * 0.6,
            transform: [{ rotate: '5deg' }],
          },
        ]}
      />

      <View
        style={[
          styles.rachis,
          {
            width: rachis,
            left: (width - rachis) / 2,
            top: length * 0.06,
            height: length * 0.82,
            borderRadius: rachis,
          },
        ]}
      />

      {BARBS.map((at, index) => (
        <View key={at} style={styles.barbRow}>
          <View
            style={[
              styles.barb,
              {
                width: vaneWidth * (0.86 - index * 0.1),
                left: width / 2 - vaneWidth * (0.86 - index * 0.1),
                top: length * (0.92 - at * 0.78),
                transform: [{ rotate: '18deg' }],
              },
            ]}
          />
          <View
            style={[
              styles.barb,
              {
                width: vaneWidth * (0.8 - index * 0.1),
                left: width / 2,
                top: length * (0.94 - at * 0.78),
                transform: [{ rotate: '-18deg' }],
              },
            ]}
          />
        </View>
      ))}

      <View
        style={[
          styles.barrel,
          {
            width: rachis * 2.1,
            height: length * 0.16,
            left: (width - rachis * 2.1) / 2,
            top: length * 0.78,
            borderRadius: rachis,
          },
        ]}
      />
      <View
        style={[
          styles.nib,
          {
            width: rachis * 1.6,
            height: length * 0.12,
            left: (width - rachis * 1.6) / 2,
            bottom: 0,
            borderTopLeftRadius: rachis,
            borderTopRightRadius: rachis,
            borderBottomLeftRadius: rachis * 0.6,
            borderBottomRightRadius: rachis * 0.6,
            backgroundColor: ink,
          },
        ]}
      />
      <View
        style={[
          styles.slit,
          {
            width: Math.max(0.5, rachis * 0.28),
            height: length * 0.07,
            left: (width - Math.max(0.5, rachis * 0.28)) / 2,
            bottom: length * 0.02,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    overflow: 'visible',
  },
  vane: {
    position: 'absolute',
  },
  rachis: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 251, 247, 0.95)',
  },
  barbRow: {
    ...StyleSheet.absoluteFill,
  },
  barb: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  barrel: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 244, 236, 0.9)',
  },
  nib: {
    position: 'absolute',
  },
  slit: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 250, 246, 0.7)',
  },
});
