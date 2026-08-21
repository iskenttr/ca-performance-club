import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors, radius, spacing, typography } from '../constants';
import { AppText } from './ui';

type Pose = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  rotate: string;
  translateY: number;
  scaleX?: number;
};

const poses: Record<string, [Pose, Pose]> = {
  squat: [{ icon: 'weight-lifter', rotate: '0deg', translateY: -7 }, { icon: 'weight-lifter', rotate: '0deg', translateY: 13, scaleX: 1.08 }],
  hinge: [{ icon: 'human-handsdown', rotate: '0deg', translateY: -5 }, { icon: 'human-handsdown', rotate: '24deg', translateY: 8 }],
  lunge: [{ icon: 'walk', rotate: '0deg', translateY: -6 }, { icon: 'walk', rotate: '-8deg', translateY: 12, scaleX: 1.12 }],
  'step-up': [{ icon: 'stairs-up', rotate: '0deg', translateY: 10 }, { icon: 'stairs-up', rotate: '0deg', translateY: -12 }],
  hip: [{ icon: 'yoga', rotate: '0deg', translateY: 10 }, { icon: 'yoga', rotate: '-10deg', translateY: -8, scaleX: 1.08 }],
  'leg-curl': [{ icon: 'seat-recline-normal', rotate: '0deg', translateY: -5 }, { icon: 'seat-recline-extra', rotate: '0deg', translateY: 8 }],
  calf: [{ icon: 'human-handsup', rotate: '0deg', translateY: 9 }, { icon: 'human-handsup', rotate: '0deg', translateY: -10, scaleX: 0.96 }],
  press: [{ icon: 'weight-lifter', rotate: '90deg', translateY: 7 }, { icon: 'weight-lifter', rotate: '90deg', translateY: -8, scaleX: 1.08 }],
  'shoulder-press': [{ icon: 'weight-lifter', rotate: '0deg', translateY: 8 }, { icon: 'human-handsup', rotate: '0deg', translateY: -8 }],
  row: [{ icon: 'rowing', rotate: '0deg', translateY: -4 }, { icon: 'rowing', rotate: '-12deg', translateY: 8, scaleX: 1.08 }],
  pulldown: [{ icon: 'human-handsup', rotate: '0deg', translateY: -9 }, { icon: 'weight-lifter', rotate: '0deg', translateY: 9 }],
  'face-pull': [{ icon: 'human-handsup', rotate: '0deg', translateY: -4 }, { icon: 'arm-flex', rotate: '0deg', translateY: 4 }],
  arms: [{ icon: 'arm-flex-outline', rotate: '12deg', translateY: 5 }, { icon: 'arm-flex', rotate: '-8deg', translateY: -5, scaleX: 1.08 }],
  core: [{ icon: 'yoga', rotate: '90deg', translateY: 8 }, { icon: 'yoga', rotate: '90deg', translateY: -6, scaleX: 1.05 }],
  carry: [{ icon: 'walk', rotate: '0deg', translateY: 4 }, { icon: 'walk', rotate: '0deg', translateY: -5, scaleX: -1 }],
  conditioning: [{ icon: 'run-fast', rotate: '-7deg', translateY: 6 }, { icon: 'run-fast', rotate: '7deg', translateY: -7, scaleX: -1 }],
  mobility: [{ icon: 'meditation', rotate: '-7deg', translateY: 6 }, { icon: 'yoga', rotate: '7deg', translateY: -6 }],
};

const fallback: [Pose, Pose] = [
  { icon: 'weight-lifter', rotate: '0deg', translateY: 5 },
  { icon: 'weight-lifter', rotate: '0deg', translateY: -7, scaleX: 1.08 },
];

const PoseImage = ({ pose, label }: { pose: Pose; label?: string }) => (
  <View style={styles.poseCanvas}>
    <View style={styles.glow} />
    <View style={styles.floor} />
    <MaterialCommunityIcons
      name={pose.icon}
      size={88}
      color={colors.accent}
      style={{ transform: [{ translateY: pose.translateY }, { rotate: pose.rotate }, { scaleX: pose.scaleX ?? 1 }] }}
    />
    {label ? <View style={styles.poseLabel}><AppText style={styles.poseLabelText}>{label}</AppText></View> : null}
  </View>
);

export const ExerciseMotionMedia = ({ guideId }: { guideId: string }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const [startPose, endPose] = useMemo(() => poses[guideId] ?? fallback, [guideId]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 400, useNativeDriver: true, isInteraction: false }),
        Animated.timing(progress, { toValue: 0, duration: 400, useNativeDriver: true, isInteraction: false }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [progress]);

  return (
    <View style={styles.root}>
      <View style={styles.headingRow}>
        <View>
          <AppText style={typography.h3}>Hareket gösterimi</AppText>
          <AppText style={styles.muted}>İki pozisyon ve otomatik hareket önizlemesi</AppText>
        </View>
        <View style={styles.durationBadge}>
          <MaterialCommunityIcons name="play-circle-outline" size={16} color={colors.accent} />
          <AppText style={styles.durationText}>0,8 SN</AppText>
        </View>
      </View>

      <View style={styles.framesRow}>
        <View style={styles.frame}><PoseImage pose={startPose} label="1 · BAŞLANGIÇ" /></View>
        <View style={styles.frame}><PoseImage pose={endPose} label="2 · BİTİŞ" /></View>
      </View>

      <View style={styles.video}>
        <View style={styles.videoTop}>
          <View style={styles.liveDot} />
          <AppText style={styles.videoLabel}>0,8 SANİYE DÖNGÜ</AppText>
        </View>
        <Animated.View style={[styles.animatedPose, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
          <PoseImage pose={startPose} />
        </Animated.View>
        <Animated.View style={[styles.animatedPose, { opacity: progress }]}>
          <PoseImage pose={endPose} />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  muted: { ...typography.caption, color: colors.inkSoft, marginTop: 2 },
  durationBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: '#182317' },
  durationText: { ...typography.label, color: colors.accent },
  framesRow: { flexDirection: 'row', gap: spacing.sm },
  frame: { flex: 1, minWidth: 0 },
  poseCanvas: { height: 150, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: '#070B09', borderWidth: 1, borderColor: '#29352D' },
  glow: { position: 'absolute', width: 92, height: 92, borderRadius: 46, backgroundColor: '#B8FF2C18' },
  floor: { position: 'absolute', bottom: 28, width: 95, height: 2, borderRadius: 2, backgroundColor: '#435246' },
  poseLabel: { position: 'absolute', left: 8, right: 8, bottom: 7, alignItems: 'center', paddingVertical: 4, borderRadius: radius.pill, backgroundColor: '#101713E8' },
  poseLabelText: { ...typography.label, color: colors.inkSoft, fontSize: 9 },
  video: { height: 210, overflow: 'hidden', borderRadius: radius.lg, backgroundColor: '#050806', borderWidth: 1, borderColor: '#3B502F' },
  videoTop: { zIndex: 2, position: 'absolute', top: 10, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  videoLabel: { ...typography.label, color: colors.accent, fontSize: 10 },
  animatedPose: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
