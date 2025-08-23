import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface Props {
  size: number; // diameter
  strokeWidth?: number;
  percent: number; // 0-100
  color: string;
  trackColor?: string;
  neon?: boolean;
}

export default function ProgressRing({ size, strokeWidth = 6, percent, color, trackColor = '#2a3b39', neon = false }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const dashoffset = circumference * (1 - clamped / 100);

  return (
    <View style={[styles.wrap, { width: size, height: size }, neon && styles.neonWrap]}> 
      <Svg width={size} height={size}>
        {/* Neon outer ring */}
        {neon && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeOpacity={0.6}
            strokeWidth={strokeWidth + 6}
            fill="none"
          />
        )}
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          fill="none"
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  neonWrap: Platform.select({
    ios: {
      shadowColor: '#39ffd4',
      shadowOpacity: 0.9,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 8,
    },
    android: {
      // Android shadow fallback (not as strong as iOS). The outer SVG ring provides most of the effect.
      elevation: 6,
    },
    default: {},
  }),
});