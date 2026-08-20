import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_NAME, APP_TAGLINE, colors, radius, spacing, typography } from '../constants';
import { useApp } from '../context/AppContext';
import { demoAccounts } from '../data/seed';
import { Student } from '../types/domain';
import { AppText, Button, Chip, TextField } from '../components/ui';

type Mode = 'login' | 'register';

const goals = ['Yağ kaybı & sıkılaşma', 'Kas kazanımı', 'Kuvvet kazanımı', 'Genel sağlık'];
const levels: Student['level'][] = ['Başlangıç', 'Orta', 'İleri'];

export const AuthScreen = () => {
  const { signIn, register, demoSignIn } = useApp();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [goal, setGoal] = useState(goals[0]);
  const [level, setLevel] = useState<Student['level']>('Başlangıç');
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('E-posta ve şifre gerekli.');
      return;
    }
    if (mode === 'register' && (!fullName.trim() || !phone.trim())) {
      setError('Ad soyad ve telefon gerekli.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') await signIn(email, password);
      else await register({ fullName, email, phone, password, goal, level, weeklyGoal });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const useDemo = async (role: 'student' | 'trainer') => {
    setError('');
    setLoading(true);
    try {
      await demoSignIn(role);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Demo açılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setEmail('');
    setPassword('');
  };

  return (
    <ImageBackground source={require('../../assets/premium/athlete-hero.png')} style={styles.root} imageStyle={styles.backgroundImage} resizeMode="cover">
      <LinearGradient colors={['rgba(4,7,5,0.10)', 'rgba(4,7,5,0.96)']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.hero}>
              <View style={styles.logoRow}>
                <View style={styles.logoMark}><AppText style={styles.logoMarkText}>CA</AppText></View>
                <AppText style={styles.logoName}>{APP_NAME}</AppText>
              </View>
              <AppText style={styles.heroTitle}>Hedefin belli.{'\n'}Planın hazır.</AppText>
              <AppText style={styles.heroSubtitle}>{APP_TAGLINE} Cem Arslanoğlu ile birebir takip.</AppText>
            </View>

            <View style={styles.formSheet}>
              <View style={styles.modeSwitch}>
                <Pressable onPress={() => switchMode('login')} style={[styles.modeButton, mode === 'login' && styles.modeButtonActive]}>
                  <AppText style={[styles.modeText, mode === 'login' && styles.modeTextActive]}>Giriş yap</AppText>
                </Pressable>
                <Pressable onPress={() => switchMode('register')} style={[styles.modeButton, mode === 'register' && styles.modeButtonActive]}>
                  <AppText style={[styles.modeText, mode === 'register' && styles.modeTextActive]}>Kayıt ol</AppText>
                </Pressable>
              </View>

              <View style={styles.headingWrap}>
                <AppText style={typography.h1}>{mode === 'login' ? 'Tekrar hoş geldin' : 'Hemen başlayalım'}</AppText>
                <AppText style={styles.formSubtitle}>
                  {mode === 'login'
                    ? 'Programına, randevularına ve mesajlarına ulaş.'
                    : 'Kaydın otomatik olarak Cem Arslanoğlu’na bağlanacak.'}
                </AppText>
              </View>

              {mode === 'register' ? (
                <>
                  <View style={styles.coachMatch}>
                    <View style={styles.coachAvatar}><AppText style={styles.coachInitials}>CA</AppText></View>
                    <View style={styles.flex}>
                      <AppText style={typography.bodyMedium}>PT’in hazır: Cem Arslanoğlu</AppText>
                      <AppText style={styles.coachMatchText}>Seçim veya davet kodu gerekmiyor.</AppText>
                    </View>
                    <MaterialCommunityIcons name="check-decagram" size={23} color={colors.success} />
                  </View>
                  <TextField label="Ad soyad" value={fullName} onChangeText={setFullName} autoCapitalize="words" icon="account-outline" placeholder="Adın ve soyadın" />
                  <TextField label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" icon="phone-outline" placeholder="05xx xxx xx xx" />
                </>
              ) : null}

              <TextField label="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} icon="email-outline" placeholder="ornek@email.com" />
              <TextField
                label="Şifre"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                icon="lock-outline"
                placeholder={mode === 'register' ? 'En az 8 karakter' : 'Şifren'}
              />
              <Pressable onPress={() => setShowPassword((value) => !value)} style={styles.showPassword}>
                <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={17} color={colors.inkSoft} />
                <AppText style={styles.showPasswordText}>{showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}</AppText>
              </Pressable>

              {mode === 'register' ? (
                <>
                  <View style={styles.choiceBlock}>
                    <AppText style={styles.choiceLabel}>Ana hedefin</AppText>
                    <View style={styles.chipRow}>{goals.map((item) => <Chip key={item} label={item} selected={goal === item} onPress={() => setGoal(item)} />)}</View>
                  </View>
                  <View style={styles.choiceBlock}>
                    <AppText style={styles.choiceLabel}>Antrenman seviyen</AppText>
                    <View style={styles.chipRow}>{levels.map((item) => <Chip key={item} label={item} selected={level === item} onPress={() => setLevel(item)} />)}</View>
                  </View>
                  <View style={styles.choiceBlock}>
                    <AppText style={styles.choiceLabel}>Haftalık hedef</AppText>
                    <View style={styles.weeklyRow}>
                      {[2, 3, 4, 5].map((item) => (
                        <Pressable key={item} onPress={() => setWeeklyGoal(item)} style={[styles.dayChoice, weeklyGoal === item && styles.dayChoiceActive]}>
                          <AppText style={[styles.dayChoiceNumber, weeklyGoal === item && styles.dayChoiceTextActive]}>{item}</AppText>
                          <AppText style={[styles.dayChoiceLabel, weeklyGoal === item && styles.dayChoiceTextActive]}>gün</AppText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </>
              ) : null}

              {error ? (
                <View style={styles.errorBox}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.danger} />
                  <AppText style={styles.errorMessage}>{error}</AppText>
                </View>
              ) : null}

              <Button label={mode === 'login' ? 'Giriş yap' : 'Hesabımı oluştur'} onPress={submit} loading={loading} icon={mode === 'login' ? 'arrow-right' : 'account-plus-outline'} />

              {mode === 'login' ? (
                <View style={styles.demoArea}>
                  <View style={styles.orRow}><View style={styles.orLine} /><AppText style={styles.orText}>Hızlı demo</AppText><View style={styles.orLine} /></View>
                  <View style={styles.demoButtons}>
                    <Pressable disabled={loading} onPress={() => useDemo('student')} style={({ pressed }) => [styles.demoCard, pressed && styles.pressed]}>
                      <View style={styles.demoIcon}><MaterialCommunityIcons name="weight-lifter" size={22} color={colors.primary} /></View>
                      <View style={styles.flex}>
                        <AppText style={typography.bodyMedium}>Öğrenci olarak</AppText>
                        <AppText style={styles.demoEmail}>{demoAccounts.student.email}</AppText>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.inkSoft} />
                    </Pressable>
                    <Pressable disabled={loading} onPress={() => useDemo('trainer')} style={({ pressed }) => [styles.demoCard, pressed && styles.pressed]}>
                      <View style={[styles.demoIcon, styles.demoIconTrainer]}><MaterialCommunityIcons name="whistle-outline" size={22} color={colors.primary} /></View>
                      <View style={styles.flex}>
                        <AppText style={typography.bodyMedium}>Cem Hoca olarak</AppText>
                        <AppText style={styles.demoEmail}>{demoAccounts.trainer.email}</AppText>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.inkSoft} />
                    </Pressable>
                  </View>
                </View>
              ) : null}

              <AppText style={styles.legal}>Devam ederek Kullanım Koşulları’nı ve Gizlilik Politikası’nı kabul etmiş olursun.</AppText>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.graphite },
  backgroundImage: {},
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingTop: spacing.xl },
  hero: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg, minHeight: 330, justifyContent: 'flex-end' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logoMark: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  logoMarkText: { color: colors.primary, fontSize: 17, fontWeight: '900' },
  logoName: { color: colors.white, fontSize: 18, fontWeight: '900', letterSpacing: 0.2 },
  heroTitle: { color: colors.white, fontSize: 45, lineHeight: 47, fontWeight: '900', letterSpacing: -1.8, marginTop: spacing.md },
  heroSubtitle: { color: '#C5D5D0', fontSize: 16, lineHeight: 23, maxWidth: 360 },
  formSheet: { flex: 1, backgroundColor: 'rgba(8,11,10,0.98)', borderTopLeftRadius: 32, borderTopRightRadius: 32, borderTopWidth: 1, borderColor: colors.border, padding: spacing.xl, paddingBottom: 42, gap: spacing.lg },
  modeSwitch: { flexDirection: 'row', padding: 4, backgroundColor: colors.surfaceMuted, borderRadius: radius.md },
  modeButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 42, borderRadius: radius.sm },
  modeButtonActive: { backgroundColor: colors.surface },
  modeText: { ...typography.bodyMedium, color: colors.inkSoft },
  modeTextActive: { color: colors.primary },
  headingWrap: { gap: spacing.xs, marginTop: spacing.xs },
  formSubtitle: { color: colors.inkSoft },
  coachMatch: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.successSoft },
  coachAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  coachInitials: { color: colors.accent, fontWeight: '800' },
  coachMatchText: { ...typography.caption, color: colors.inkSoft },
  showPassword: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-end', marginTop: -12, padding: 4 },
  showPasswordText: { ...typography.caption, color: colors.inkSoft },
  choiceBlock: { gap: spacing.sm },
  choiceLabel: { ...typography.bodyMedium },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  weeklyRow: { flexDirection: 'row', gap: spacing.sm },
  dayChoice: { flex: 1, height: 58, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dayChoiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChoiceNumber: { fontSize: 19, lineHeight: 22, fontWeight: '800' },
  dayChoiceLabel: { ...typography.caption, color: colors.inkSoft },
  dayChoiceTextActive: { color: colors.white },
  errorBox: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.dangerSoft, alignItems: 'center' },
  errorMessage: { flex: 1, color: colors.danger, ...typography.caption },
  demoArea: { gap: spacing.md },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { ...typography.caption, color: colors.inkSoft },
  demoButtons: { gap: spacing.sm },
  demoCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  demoIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight },
  demoIconTrainer: { backgroundColor: '#29331C' },
  demoEmail: { ...typography.caption, color: colors.inkSoft },
  legal: { ...typography.caption, color: colors.inkSoft, textAlign: 'center', paddingHorizontal: spacing.md },
  pressed: { opacity: 0.75 },
});
