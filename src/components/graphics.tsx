import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors } from '../constants';
import { AppText } from './ui';

export const ProgressRing = ({ value, size = 96, label }: { value: number; size?: number; label?: string }) => {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = radius * Math.PI * 2;
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.rotate}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.accent} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference - (safeValue / 100) * circumference} />
      </Svg>
      <View style={styles.ringCenter}>
        <AppText style={[styles.ringValue, { fontSize: size * 0.22 }]}>%{safeValue}</AppText>
        {label ? <AppText style={styles.ringLabel}>{label}</AppText> : null}
      </View>
    </View>
  );
};

export const TrendChart = ({ values, height = 92 }: { values: number[]; height?: number }) => {
  const width = 300;
  const safe = values.length > 1 ? values : [0, 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = Math.max(max - min, 1);
  const points = safe.map((value, index) => ({ x: (index / (safe.length - 1)) * width, y: height - 12 - ((value - min) / range) * (height - 28) }));
  const line = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <Defs><LinearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={colors.accent} stopOpacity="0.34" /><Stop offset="1" stopColor={colors.accent} stopOpacity="0" /></LinearGradient></Defs>
      <Path d={area} fill="url(#chartFill)" />
      <Path d={line} fill="none" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

export const ActivityRings = ({ move, exercise, steps, size = 96 }: { move: number; exercise: number; steps: number; size?: number }) => {
  const rings = [
    { value: move, radius: size * 0.42, color: '#FF375F' },
    { value: exercise, radius: size * 0.31, color: '#D7FF45' },
    { value: steps, radius: size * 0.20, color: '#45D5A2' },
  ];
  return (
    <Svg width={size} height={size} style={styles.rotate}>
      {rings.map((ring, index) => {
        const circumference = ring.radius * Math.PI * 2;
        return (
          <React.Fragment key={ring.color}>
            <Circle cx={size / 2} cy={size / 2} r={ring.radius} stroke={colors.surfaceElevated} strokeWidth={7} fill="none" />
            <Circle cx={size / 2} cy={size / 2} r={ring.radius} stroke={ring.color} strokeWidth={7} fill="none" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference - (Math.max(0, Math.min(100, ring.value)) / 100) * circumference} />
          </React.Fragment>
        );
      })}
    </Svg>
  );
};

const styles = StyleSheet.create({
  rotate: { transform: [{ rotate: '-90deg' }] },
  ringCenter: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  ringValue: { color: colors.ink, fontWeight: '900', letterSpacing: -0.8 },
  ringLabel: { color: colors.inkSoft, fontSize: 9, lineHeight: 11, fontWeight: '700', textTransform: 'uppercase' },
});
