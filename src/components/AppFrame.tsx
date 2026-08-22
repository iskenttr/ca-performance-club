import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing, typography } from '../constants';
import { AppText, Avatar, IconButton, IconName, ThemeToggle } from './ui';

export interface TabItem<T extends string> {
  key: T;
  label: string;
  icon: IconName;
  activeIcon?: IconName;
  badge?: number;
}

export const AppFrame = <T extends string>({
  activeTab,
  tabs,
  onTabPress,
  children,
}: {
  activeTab: T;
  tabs: TabItem<T>[];
  onTabPress: (key: T) => void;
  children: ReactNode;
}) => (
  <SafeAreaView style={styles.safeArea} edges={['top']}>
    <View style={styles.content}>{children}</View>
    <SafeAreaView edges={['bottom']} style={styles.tabSafeArea}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => onTabPress(tab.key)}
              style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            >
              <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
                <MaterialCommunityIcons
                  name={active ? tab.activeIcon ?? tab.icon : tab.icon}
                  size={22}
                  color={active ? colors.primary : colors.inkSoft}
                />
                {tab.badge ? (
                  <View style={styles.badge}>
                    <AppText style={styles.badgeText}>{tab.badge > 9 ? '9+' : tab.badge}</AppText>
                  </View>
                ) : null}
              </View>
              <AppText style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</AppText>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  </SafeAreaView>
);

export const TopBar = ({
  eyebrow,
  title,
  name,
  onProfile,
  onBack,
  right,
}: {
  eyebrow?: string;
  title: string;
  name?: string;
  onProfile?: () => void;
  onBack?: () => void;
  right?: ReactNode;
}) => (
  <View style={styles.topBar}>
    {onBack ? <IconButton icon="arrow-left" onPress={onBack} label="Geri" /> : null}
    <View style={styles.topBarText}>
      {eyebrow ? <AppText style={styles.eyebrow}>{eyebrow}</AppText> : null}
      <AppText style={typography.h1} numberOfLines={1}>{title}</AppText>
    </View>
    <ThemeToggle />
    {right ?? (name && onProfile ? <Pressable onPress={onProfile}><Avatar name={name} size={44} accent /></Pressable> : null)}
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  content: { flex: 1 },
  tabSafeArea: {
    backgroundColor: colors.cream,
    paddingHorizontal: spacing.md,
    ...(Platform.OS === 'web' ? { alignItems: 'center' as const } : {}),
  },
  tabBar: {
    flexDirection: 'row',
    height: 72,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 720,
    width: '100%',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabPressed: { opacity: 0.65 },
  tabIconWrap: { width: 42, height: 30, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  tabIconWrapActive: { backgroundColor: colors.accent },
  tabLabel: { fontSize: 10, lineHeight: 13, fontWeight: '600', color: colors.inkSoft },
  tabLabelActive: { color: colors.accent, fontWeight: '800' },
  badge: { position: 'absolute', top: -4, right: 0, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface },
  badgeText: { color: colors.white, fontSize: 9, lineHeight: 11, fontWeight: '800' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, backgroundColor: colors.cream },
  topBarText: { flex: 1 },
  eyebrow: { ...typography.label, color: colors.accent, textTransform: 'uppercase', marginBottom: 2, letterSpacing: 1.4 },
});
