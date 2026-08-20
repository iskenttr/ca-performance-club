import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { TopBar } from '../../components/AppFrame';
import { AppText, Avatar, Button, Card, Chip, Divider, ModalSheet, Page, TextField } from '../../components/ui';
import { APP_NAME, colors, radius, spacing, typography } from '../../constants';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types/domain';
import { formatDate } from '../../utils/date';

type Policy = 'privacy' | 'terms' | null;

export const StudentProfileScreen = ({ onBack }: { onBack: () => void }) => {
  const { user, signOut, updateUser, deleteCurrentAccount } = useApp();
  const student = user as Student;
  const [editOpen, setEditOpen] = useState(false);
  const [policy, setPolicy] = useState<Policy>(null);
  const [fullName, setFullName] = useState(student.fullName);
  const [phone, setPhone] = useState(student.phone);
  const [height, setHeight] = useState(student.heightCm ? `${student.heightCm}` : '');
  const [goal, setGoal] = useState(student.goal);
  const [weeklyGoal, setWeeklyGoal] = useState(student.weeklyGoal);

  const saveProfile = () => {
    const heightCm = Number(height.replace(',', '.'));
    updateUser(student.id, {
      fullName: fullName.trim() || student.fullName,
      phone: phone.trim(),
      goal: goal.trim() || student.goal,
      weeklyGoal,
      heightCm: Number.isFinite(heightCm) && heightCm > 100 && heightCm < 240 ? heightCm : undefined,
    } as Partial<Student>);
    setEditOpen(false);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Hesabın kalıcı olarak silinsin mi?',
      'Profilin, programların, ölçümlerin, fotoğrafların, derslerin ve mesajların bu cihazdan kalıcı olarak kaldırılacak.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Hesabımı sil',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Son onay', 'Bu işlem geri alınamaz.', [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'Kalıcı olarak sil', style: 'destructive', onPress: () => void deleteCurrentAccount() },
            ]);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <TopBar eyebrow="Hesabım" title="Profil" onBack={onBack} />
      <Page>
        <Card style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Avatar name={student.fullName} size={82} accent />
            <View style={styles.activeBadge}><MaterialCommunityIcons name="check" size={14} color={colors.white} /></View>
          </View>
          <AppText style={typography.h1}>{student.fullName}</AppText>
          <AppText style={styles.email}>{student.email}</AppText>
          <Chip label={student.status === 'new' ? 'Yeni öğrenci' : student.status === 'active' ? 'Aktif öğrenci' : 'Ara verdi'} tone={student.status === 'active' ? 'success' : 'warning'} />
          <Button label="Profili düzenle" icon="pencil-outline" variant="secondary" compact onPress={() => setEditOpen(true)} />
        </Card>

        <Card style={styles.coachCard}>
          <View style={styles.coachIcon}><MaterialCommunityIcons name="whistle-outline" size={25} color={colors.primary} /></View>
          <View style={styles.flex}>
            <AppText style={styles.cardEyebrow}>PERSONAL TRAINER’IN</AppText>
            <AppText style={typography.h3}>Cem Arslanoğlu</AppText>
            <AppText style={styles.muted}>Kayıt anında otomatik eşleştirildi</AppText>
          </View>
          <MaterialCommunityIcons name="check-decagram" size={25} color={colors.success} />
        </Card>

        <View style={styles.infoGrid}>
          <InfoCard icon="target" label="Hedef" value={student.goal} />
          <InfoCard icon="signal-cellular-2" label="Seviye" value={student.level} />
          <InfoCard icon="calendar-week" label="Haftalık" value={`${student.weeklyGoal} gün`} />
          <InfoCard icon="human-male-height" label="Boy" value={student.heightCm ? `${student.heightCm} cm` : 'Eklenmedi'} />
        </View>

        <Card style={styles.settingsCard}>
          <SettingRow icon="email-outline" label="E-posta" value={student.email} />
          <Divider />
          <SettingRow icon="phone-outline" label="Telefon" value={student.phone || 'Eklenmedi'} />
          <Divider />
          <SettingRow icon="calendar-account-outline" label="Kayıt tarihi" value={formatDate(student.createdAt)} />
        </Card>

        <Card style={styles.settingsCard}>
          <SettingRow icon="shield-lock-outline" label="Gizlilik politikası" onPress={() => setPolicy('privacy')} />
          <Divider />
          <SettingRow icon="file-document-outline" label="Kullanım koşulları" onPress={() => setPolicy('terms')} />
          <Divider />
          <SettingRow icon="information-outline" label="Uygulama sürümü" value="1.0.0 MVP" />
        </Card>

        <Button label="Çıkış yap" icon="logout" variant="secondary" onPress={() => void signOut()} />
        <Pressable onPress={confirmDelete} style={styles.deleteButton}>
          <MaterialCommunityIcons name="delete-outline" size={19} color={colors.danger} />
          <AppText style={styles.deleteText}>Hesabımı ve verilerimi sil</AppText>
        </Pressable>
      </Page>

      <ModalSheet visible={editOpen} onClose={() => setEditOpen(false)} title="Profili düzenle">
        <TextField label="Ad soyad" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
        <TextField label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextField label="Boy (cm)" value={height} onChangeText={setHeight} keyboardType="number-pad" />
        <TextField label="Hedef" value={goal} onChangeText={setGoal} multiline />
        <View style={styles.weeklyBlock}>
          <AppText style={styles.fieldLabel}>Haftalık antrenman hedefi</AppText>
          <View style={styles.chipRow}>{[2, 3, 4, 5].map((item) => <Chip key={item} label={`${item} gün`} selected={weeklyGoal === item} onPress={() => setWeeklyGoal(item)} />)}</View>
        </View>
        <Button label="Değişiklikleri kaydet" icon="check" onPress={saveProfile} />
      </ModalSheet>

      <ModalSheet visible={policy !== null} onClose={() => setPolicy(null)} title={policy === 'privacy' ? 'Gizlilik politikası' : 'Kullanım koşulları'} fullHeight>
        {policy === 'privacy' ? <PrivacyCopy /> : <TermsCopy />}
      </ModalSheet>
    </View>
  );
};

const InfoCard = ({ icon, label, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string }) => (
  <Card style={styles.infoCard}>
    <View style={styles.infoIcon}><MaterialCommunityIcons name={icon} size={20} color={colors.primary} /></View>
    <AppText style={styles.infoLabel}>{label}</AppText>
    <AppText style={styles.infoValue} numberOfLines={2}>{value}</AppText>
  </Card>
);

const SettingRow = ({ icon, label, value, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value?: string; onPress?: () => void }) => (
  <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
    <View style={styles.settingIcon}><MaterialCommunityIcons name={icon} size={20} color={colors.primary} /></View>
    <AppText style={styles.settingLabel}>{label}</AppText>
    {value ? <AppText style={styles.settingValue} numberOfLines={1}>{value}</AppText> : null}
    {onPress ? <MaterialCommunityIcons name="chevron-right" size={22} color={colors.inkSoft} /> : null}
  </Pressable>
);

const PrivacyCopy = () => (
  <View style={styles.policyCopy}>
    <AppText style={typography.h3}>Veri sorumluluğu</AppText>
    <AppText style={styles.policyText}>{APP_NAME}, profil, antrenman, ölçüm, gelişim fotoğrafı, randevu ve mesaj verilerini yalnızca kişisel antrenörlük hizmetini sunmak için işler.</AppText>
    <AppText style={typography.h3}>Erişim ve paylaşım</AppText>
    <AppText style={styles.policyText}>Öğrenci verileri öğrenci ile Cem Arslanoğlu arasında özeldir. Üretim sürümünde veriler şifreli aktarım, yetki kuralları ve güvenli saklama ile korunmalıdır; reklam amacıyla satılmaz.</AppText>
    <AppText style={typography.h3}>Fotoğraf ve sağlık verileri</AppText>
    <AppText style={styles.policyText}>Gelişim fotoğrafları ve vücut ölçüleri hassas kabul edilir. Kullanıcı açıkça eklemeden toplanmaz ve hesap silindiğinde diğer hesap verileriyle birlikte kaldırılır.</AppText>
    <AppText style={typography.h3}>Hakların</AppText>
    <AppText style={styles.policyText}>Bilgilerini uygulama içinden görebilir ve düzeltebilir; “Hesabımı ve verilerimi sil” seçeneğiyle silebilirsin.</AppText>
    <AppText style={styles.policyDate}>Taslak sürüm · 20 Ağustos 2026</AppText>
  </View>
);

const TermsCopy = () => (
  <View style={styles.policyCopy}>
    <AppText style={typography.h3}>Hizmetin kapsamı</AppText>
    <AppText style={styles.policyText}>{APP_NAME}; antrenman planı, genel beslenme rehberliği, ilerleme takibi, randevu ve iletişim için kullanılan bir kişisel antrenörlük aracıdır.</AppText>
    <AppText style={typography.h3}>Sağlık sorumluluğu</AppText>
    <AppText style={styles.policyText}>Uygulamadaki içerikler tıbbi tanı veya tedavi değildir. Egzersize başlamadan önce sağlık durumuna uygun profesyonel görüş almak kullanıcının sorumluluğundadır. Ağrı veya olağan dışı belirti halinde egzersiz bırakılmalıdır.</AppText>
    <AppText style={typography.h3}>Hesap kullanımı</AppText>
    <AppText style={styles.policyText}>Kullanıcı doğru bilgi vermeli, hesabını güvenli tutmalı ve mesajlaşma alanını yalnızca hizmetle ilgili, saygılı iletişim için kullanmalıdır.</AppText>
    <AppText style={styles.policyDate}>Taslak sürüm · 20 Ağustos 2026</AppText>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  profileCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  avatarWrap: { position: 'relative', marginBottom: spacing.sm },
  activeBadge: { position: 'absolute', right: -1, bottom: 2, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.success, borderWidth: 3, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  email: { color: colors.inkSoft },
  coachCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primaryLight },
  coachIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  cardEyebrow: { ...typography.label, color: colors.success },
  muted: { ...typography.caption, color: colors.inkSoft },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  infoCard: { width: '47%', flexGrow: 1, gap: spacing.sm, padding: spacing.md, minHeight: 130 },
  infoIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { ...typography.caption, color: colors.inkSoft },
  infoValue: { ...typography.bodyMedium },
  settingsCard: { padding: 0, overflow: 'hidden' },
  settingRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md },
  settingIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { flex: 1, ...typography.bodyMedium },
  settingValue: { maxWidth: '45%', ...typography.caption, color: colors.inkSoft, textAlign: 'right' },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md },
  deleteText: { ...typography.bodyMedium, color: colors.danger },
  weeklyBlock: { gap: spacing.sm },
  fieldLabel: { ...typography.caption, color: colors.inkSoft },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  policyCopy: { gap: spacing.md },
  policyText: { color: colors.inkSoft },
  policyDate: { ...typography.caption, color: colors.inkSoft, marginTop: spacing.lg },
  pressed: { opacity: 0.65 },
});

