import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { TopBar } from '../../components/AppFrame';
import { AppText, Avatar, Button, Card, Chip, Divider, Page } from '../../components/ui';
import { colors, radius, spacing, typography } from '../../constants';
import { useApp } from '../../context/AppContext';
import { Trainer } from '../../types/domain';

export const TrainerProfileScreen = ({ onBack }: { onBack: () => void }) => {
  const { user, students, data, signOut, resetDemo } = useApp();
  const trainer = user as Trainer;
  const completedLessons = data?.appointments.filter((item) => item.status === 'completed').length ?? 0;

  const confirmReset = () => Alert.alert('Demo verileri sıfırlansın mı?', 'Eklediğin yerel kayıtlar silinir ve başlangıç verileri geri yüklenir.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sıfırla', style: 'destructive', onPress: () => void resetDemo() },
  ]);

  return (
    <View style={styles.root}>
      <TopBar eyebrow="PT hesabı" title="Profil" onBack={onBack} />
      <Page>
        <Card style={styles.profileCard}>
          <View style={styles.avatarWrap}><Avatar name={trainer.fullName} size={88} accent /><View style={styles.verified}><MaterialCommunityIcons name="check-decagram" size={24} color={colors.success} /></View></View>
          <AppText style={typography.h1}>{trainer.fullName}</AppText>
          <AppText style={styles.title}>{trainer.title}</AppText>
          <Chip label="Tek yetkili PT" tone="success" />
          <AppText style={styles.bio}>{trainer.bio}</AppText>
        </Card>

        <View style={styles.statsRow}>
          <Card style={styles.stat}><AppText style={styles.statValue}>{students.length}</AppText><AppText style={styles.statLabel}>Öğrenci</AppText></Card>
          <Card style={styles.stat}><AppText style={styles.statValue}>{students.filter((item) => item.status === 'active').length}</AppText><AppText style={styles.statLabel}>Aktif</AppText></Card>
          <Card style={styles.stat}><AppText style={styles.statValue}>{completedLessons}</AppText><AppText style={styles.statLabel}>Ders</AppText></Card>
        </View>

        <Card style={styles.infoCard}>
          <InfoRow icon="email-outline" label="E-posta" value={trainer.email} />
          <Divider />
          <InfoRow icon="phone-outline" label="Telefon" value={trainer.phone} />
          <Divider />
          <InfoRow icon="account-cog-outline" label="Rol" value="Yönetici · Personal Trainer" />
          <Divider />
          <InfoRow icon="robot-off-outline" label="AI" value="Kullanılmıyor" />
        </Card>

        <Card style={styles.assignmentCard}>
          <View style={styles.assignmentIcon}><MaterialCommunityIcons name="account-arrow-left-outline" size={25} color={colors.primary} /></View>
          <View style={styles.flex}><AppText style={typography.bodyMedium}>Otomatik öğrenci atama</AppText><AppText style={styles.muted}>Yeni kayıt olan her öğrenci doğrudan senin hesabına bağlanır.</AppText></View>
          <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
        </Card>

        <Button label="Çıkış yap" icon="logout" variant="secondary" onPress={() => void signOut()} />
        <Pressable onPress={confirmReset} style={styles.resetButton}><MaterialCommunityIcons name="restore" size={19} color={colors.danger} /><AppText style={styles.resetText}>Demo verilerini sıfırla</AppText></Pressable>
        <AppText style={styles.version}>CA Performance Club 1.0.0 MVP · Yerel demo veri katmanı</AppText>
      </Page>
    </View>
  );
};

const InfoRow = ({ icon, label, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string }) => (
  <View style={styles.infoRow}><View style={styles.infoIcon}><MaterialCommunityIcons name={icon} size={20} color={colors.primary} /></View><AppText style={styles.infoLabel}>{label}</AppText><AppText style={styles.infoValue} numberOfLines={1}>{value}</AppText></View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  profileCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  avatarWrap: { position: 'relative', marginBottom: spacing.sm },
  verified: { position: 'absolute', right: -5, bottom: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.inkSoft },
  bio: { color: colors.inkSoft, textAlign: 'center', maxWidth: 360, marginTop: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, alignItems: 'center', gap: 4, padding: spacing.md },
  statValue: { fontSize: 24, lineHeight: 28, fontWeight: '800' },
  statLabel: { ...typography.caption, color: colors.inkSoft },
  infoCard: { padding: 0, overflow: 'hidden' },
  infoRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md },
  infoIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { flex: 1, ...typography.bodyMedium },
  infoValue: { maxWidth: '50%', ...typography.caption, color: colors.inkSoft, textAlign: 'right' },
  assignmentCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.successSoft },
  assignmentIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  muted: { ...typography.caption, color: colors.inkSoft },
  resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md },
  resetText: { ...typography.bodyMedium, color: colors.danger },
  version: { ...typography.caption, color: colors.inkSoft, textAlign: 'center' },
});
