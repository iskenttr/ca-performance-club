import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing, typography } from '../constants';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export const AppText = ({
  children,
  style,
  numberOfLines,
}: PropsWithChildren<{ style?: StyleProp<TextStyle>; numberOfLines?: number }>) => (
  <Text style={[styles.text, style]} numberOfLines={numberOfLines}>
    {children}
  </Text>
);

export const Page = ({
  children,
  scroll = true,
  contentStyle,
  keyboardShouldPersistTaps,
}: PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
}>) => {
  if (!scroll) return <View style={[styles.page, contentStyle]}>{children}</View>;
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.pageContent, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
    >
      {children}
    </ScrollView>
  );
};

export const Card = ({
  children,
  style,
  onPress,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; onPress?: () => void }>) => {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
};

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';

export const Button = ({
  label,
  onPress,
  icon,
  variant = 'primary',
  loading = false,
  disabled = false,
  compact = false,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) => {
  const foreground = variant === 'accent' ? colors.graphite : variant === 'primary' || variant === 'danger' ? colors.white : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        compact && styles.buttonCompact,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} size="small" />
      ) : (
        <>
          {icon ? <MaterialCommunityIcons name={icon} size={compact ? 17 : 19} color={foreground} /> : null}
          <AppText style={[styles.buttonLabel, { color: foreground }]}>{label}</AppText>
        </>
      )}
    </Pressable>
  );
};

export const IconButton = ({
  icon,
  onPress,
  label,
  dark = false,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  dark?: boolean;
}) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [styles.iconButton, dark && styles.iconButtonDark, pressed && styles.pressed]}
  >
    <MaterialCommunityIcons name={icon} size={22} color={dark ? colors.white : colors.ink} />
  </Pressable>
);

export const TextField = ({
  label,
  error,
  icon,
  containerStyle,
  ...props
}: TextInputProps & {
  label?: string;
  error?: string;
  icon?: IconName;
  containerStyle?: StyleProp<ViewStyle>;
}) => (
  <View style={[styles.fieldWrap, containerStyle]}>
    {label ? <AppText style={styles.fieldLabel}>{label}</AppText> : null}
    <View style={[styles.field, props.multiline && styles.fieldMultiline, error && styles.fieldError]}>
      {icon ? <MaterialCommunityIcons name={icon} size={20} color={colors.inkSoft} /> : null}
      <TextInput
        placeholderTextColor="#899590"
        selectionColor={colors.primary}
        {...props}
        style={[styles.input, props.multiline && styles.inputMultiline, props.style]}
      />
    </View>
    {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
  </View>
);

export const Avatar = ({ name, uri, size = 48, accent = false }: { name: string; uri?: string; size?: number; accent?: boolean }) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('tr-TR');
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        accent && styles.avatarAccent,
      ]}
    >
      <AppText style={[styles.avatarText, { fontSize: size * 0.34 }]}>{initials}</AppText>
    </View>
  );
};

export const Chip = ({
  label,
  selected = false,
  onPress,
  tone = 'default',
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) => {
  const content = (
    <AppText style={[styles.chipText, selected && styles.chipTextSelected, styles[`chipText_${tone}`]]}>{label}</AppText>
  );
  if (!onPress) return <View style={[styles.chip, selected && styles.chipSelected, styles[`chip_${tone}`]]}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
};

export const SectionHeader = ({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) => (
  <View style={styles.sectionHeader}>
    <AppText style={typography.h2}>{title}</AppText>
    {action && onAction ? (
      <Pressable onPress={onAction} hitSlop={8}>
        <AppText style={styles.sectionAction}>{action}</AppText>
      </Pressable>
    ) : null}
  </View>
);

export const SegmentedControl = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) => (
  <View style={styles.segmented}>
    {options.map((option) => (
      <Pressable
        key={option.value}
        onPress={() => onChange(option.value)}
        style={({ pressed }) => [
          styles.segment,
          value === option.value && styles.segmentSelected,
          pressed && styles.pressed,
        ]}
      >
        <AppText style={[styles.segmentText, value === option.value && styles.segmentTextSelected]}>{option.label}</AppText>
      </Pressable>
    ))}
  </View>
);

export const EmptyState = ({ icon, title, description }: { icon: IconName; title: string; description: string }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIcon}>
      <MaterialCommunityIcons name={icon} size={30} color={colors.primary} />
    </View>
    <AppText style={typography.h3}>{title}</AppText>
    <AppText style={styles.emptyDescription}>{description}</AppText>
  </View>
);

export const ModalSheet = ({
  visible,
  onClose,
  title,
  children,
  fullHeight = false,
}: PropsWithChildren<{ visible: boolean; onClose: () => void; title: string; fullHeight?: boolean }>) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView
      style={styles.modalBackdrop}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pressable style={styles.modalDismissArea} onPress={onClose} />
      <SafeAreaView edges={['bottom']} style={[styles.modalSheet, fullHeight && styles.modalSheetFull]}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <AppText style={typography.h2}>{title}</AppText>
          <IconButton icon="close" onPress={onClose} label="Kapat" />
        </View>
        <ScrollView
          contentContainerStyle={styles.modalContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  </Modal>
);

export const StatusDot = ({ color = colors.success }: { color?: string }) => (
  <View style={[styles.statusDot, { backgroundColor: color }]} />
);

export const Divider = () => <View style={styles.divider} />;

export const LoadingScreen = () => (
  <View style={styles.loadingScreen}>
    <View style={styles.brandMark}>
      <AppText style={styles.brandMarkText}>CA</AppText>
    </View>
    <ActivityIndicator size="small" color={colors.primary} />
  </View>
);

const styles = StyleSheet.create({
  text: { color: colors.ink, ...typography.body },
  page: { flex: 1, backgroundColor: colors.cream },
  pageContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120, gap: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadow },
  pressed: { opacity: 0.78, transform: [{ scale: 0.992 }] },
  button: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  button_primary: { backgroundColor: colors.primary, borderWidth: 1, borderColor: '#69E2B8' },
  button_accent: { backgroundColor: colors.accent, borderWidth: 1, borderColor: '#E3FF80' },
  button_secondary: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  button_ghost: { backgroundColor: 'transparent' },
  button_danger: { backgroundColor: colors.danger },
  buttonCompact: { minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  buttonDisabled: { opacity: 0.45 },
  buttonLabel: { ...typography.bodyMedium },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDark: { backgroundColor: 'rgba(255,255,255,0.12)' },
  fieldWrap: { gap: 6 },
  fieldLabel: { ...typography.caption, color: colors.inkSoft, marginLeft: 2 },
  field: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  fieldMultiline: { alignItems: 'flex-start', paddingTop: spacing.md },
  fieldError: { borderColor: colors.danger },
  input: { flex: 1, color: colors.ink, fontSize: 15, paddingVertical: 0 },
  inputMultiline: { minHeight: 84, textAlignVertical: 'top' },
  errorText: { ...typography.caption, color: colors.danger, marginLeft: 2 },
  avatar: { backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarAccent: { backgroundColor: colors.accent },
  avatarText: { color: colors.primary, fontWeight: '800' },
  chip: {
    minHeight: 32,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    alignSelf: 'flex-start',
  },
  chipSelected: { backgroundColor: colors.primary },
  chip_default: {},
  chip_success: { backgroundColor: colors.successSoft },
  chip_warning: { backgroundColor: colors.warningSoft },
  chip_danger: { backgroundColor: colors.dangerSoft },
  chip_info: { backgroundColor: colors.infoSoft },
  chipText: { ...typography.caption, color: colors.inkSoft },
  chipTextSelected: { color: colors.white },
  chipText_default: {},
  chipText_success: { color: colors.success },
  chipText_warning: { color: colors.warning },
  chipText_danger: { color: colors.danger },
  chipText_info: { color: colors.info },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  sectionAction: { ...typography.bodyMedium, color: colors.primary },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  segment: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  segmentSelected: { backgroundColor: colors.surface, ...shadow },
  segmentText: { ...typography.caption, color: colors.inkSoft },
  segmentTextSelected: { color: colors.ink, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl, gap: spacing.sm },
  emptyIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  emptyDescription: { color: colors.inkSoft, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalDismissArea: { flex: 1 },
  modalSheet: { backgroundColor: colors.cream, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '88%' },
  modalSheetFull: { maxHeight: '96%', minHeight: '88%' },
  modalHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginTop: spacing.sm },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.sm },
  modalContent: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxxl, gap: spacing.lg },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  loadingScreen: { flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  brandMark: { width: 70, height: 70, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { ...typography.h1, color: colors.accent },
});
