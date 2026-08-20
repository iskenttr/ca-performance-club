import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { TopBar } from '../../components/AppFrame';
import { AppText, Button, Card, EmptyState, ModalSheet, Page, SectionHeader, SegmentedControl, TextField } from '../../components/ui';
import { colors, radius, spacing, typography } from '../../constants';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types/domain';
import { formatDate, formatShortDate } from '../../utils/date';

type ProgressView = 'measurements' | 'photos';

const parseNumber = (value: string) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const ProgressScreen = ({ onProfile }: { onProfile: () => void }) => {
  const { data, user, addMeasurement, addProgressPhoto, removeProgressPhoto } = useApp();
  const student = user as Student;
  const [view, setView] = useState<ProgressView>('measurements');
  const [measurementModal, setMeasurementModal] = useState(false);
  const [photoModal, setPhotoModal] = useState(false);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [hip, setHip] = useState('');
  const [arm, setArm] = useState('');
  const [formError, setFormError] = useState('');

  const measurements = useMemo(
    () => (data?.measurements.filter((item) => item.studentId === student.id) ?? []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [data?.measurements, student.id],
  );
  const photos = useMemo(
    () => (data?.progressPhotos.filter((item) => item.studentId === student.id) ?? []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [data?.progressPhotos, student.id],
  );
  const latest = measurements.at(-1);
  const first = measurements[0];
  const delta = latest && first ? latest.weightKg - first.weightKg : 0;
  const chartItems = measurements.slice(-6);
  const chartWeights = chartItems.map((item) => item.weightKg);
  const minWeight = chartWeights.length ? Math.min(...chartWeights) - 1 : 0;
  const maxWeight = chartWeights.length ? Math.max(...chartWeights) + 1 : 1;

  const saveMeasurement = () => {
    const weightKg = parseNumber(weight);
    if (!weightKg || weightKg < 30 || weightKg > 300) {
      setFormError('Geçerli bir kilo değeri gir.');
      return;
    }
    addMeasurement(student.id, {
      weightKg,
      bodyFatPercent: parseNumber(bodyFat),
      waistCm: parseNumber(waist),
      chestCm: parseNumber(chest),
      hipCm: parseNumber(hip),
      armCm: parseNumber(arm),
    });
    setWeight(''); setBodyFat(''); setWaist(''); setChest(''); setHip(''); setArm(''); setFormError('');
    setMeasurementModal(false);
  };

  const pickPhoto = async (source: 'camera' | 'library') => {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Kamera izni gerekli', 'Gelişim fotoğrafı çekmek için Ayarlar’dan kamera izni verebilirsin.');
          return;
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Fotoğraf izni gerekli', 'Galeriden fotoğraf seçmek için Ayarlar’dan fotoğraf izni verebilirsin.');
          return;
        }
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [3, 4], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [3, 4], quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        addProgressPhoto(student.id, result.assets[0].uri, 'Gelişim fotoğrafı');
        setPhotoModal(false);
      }
    } catch {
      Alert.alert('Fotoğraf eklenemedi', 'Lütfen tekrar dene.');
    }
  };

  const confirmRemove = (photoId: string) => {
    Alert.alert('Fotoğraf kaldırılsın mı?', 'Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Kaldır', style: 'destructive', onPress: () => removeProgressPhoto(photoId) },
    ]);
  };

  return (
    <View style={styles.root}>
      <TopBar eyebrow="İlerlemem" title="Gelişim" name={student.fullName} onProfile={onProfile} />
      <Page>
        <SegmentedControl<ProgressView> value={view} options={[{ value: 'measurements', label: 'Ölçümler' }, { value: 'photos', label: 'Fotoğraflar' }]} onChange={setView} />

        {view === 'measurements' ? (
          <>
            <Card style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View>
                  <AppText style={styles.summaryLabel}>Güncel kilo</AppText>
                  <AppText style={styles.summaryValue}>{latest ? latest.weightKg.toFixed(1) : '—'} <AppText style={styles.summaryUnit}>kg</AppText></AppText>
                </View>
                <View style={[styles.deltaPill, delta > 0 ? styles.deltaUp : styles.deltaDown]}>
                  <MaterialCommunityIcons name={delta > 0 ? 'trending-up' : 'trending-down'} size={18} color={delta > 0 ? colors.warning : colors.success} />
                  <AppText style={[styles.deltaText, { color: delta > 0 ? colors.warning : colors.success }]}>{delta > 0 ? '+' : ''}{delta.toFixed(1)} kg</AppText>
                </View>
              </View>
              {chartItems.length > 1 ? (
                <View style={styles.chart}>
                  {chartItems.map((item, index) => {
                    const height = 28 + ((item.weightKg - minWeight) / Math.max(maxWeight - minWeight, 1)) * 72;
                    const isLast = index === chartItems.length - 1;
                    return (
                      <View key={item.id} style={styles.chartColumn}>
                        <AppText style={[styles.chartValue, isLast && styles.chartValueActive]}>{item.weightKg.toFixed(1)}</AppText>
                        <View style={[styles.chartBar, { height }, isLast && styles.chartBarActive]} />
                        <AppText style={styles.chartDate}>{formatShortDate(item.date)}</AppText>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <AppText style={styles.muted}>Grafik için en az iki ölçüm ekle.</AppText>
              )}
            </Card>

            <View style={styles.metricsGrid}>
              <MetricCard icon="human-male-height" label="Boy" value={student.heightCm ? `${student.heightCm}` : '—'} unit="cm" color={colors.infoSoft} />
              <MetricCard icon="percent-outline" label="Yağ oranı" value={latest?.bodyFatPercent?.toFixed(1) ?? '—'} unit="%" color={colors.warningSoft} />
              <MetricCard icon="tape-measure" label="Bel" value={latest?.waistCm?.toFixed(0) ?? '—'} unit="cm" color={colors.successSoft} />
              <MetricCard icon="human-handsup" label="Göğüs" value={latest?.chestCm?.toFixed(0) ?? '—'} unit="cm" color="#30251F" />
            </View>

            <Button label="Yeni ölçüm ekle" icon="plus" variant="accent" onPress={() => setMeasurementModal(true)} />

            <View style={styles.historyBlock}>
              <SectionHeader title="Ölçüm geçmişi" />
              {[...measurements].reverse().map((measurement, index) => (
                <Card key={measurement.id} style={styles.historyCard}>
                  <View style={[styles.historyIcon, index === 0 && styles.historyIconLatest]}><MaterialCommunityIcons name="scale-bathroom" size={20} color={index === 0 ? colors.primary : colors.inkSoft} /></View>
                  <View style={styles.flex}>
                    <View style={styles.historyTop}><AppText style={typography.bodyMedium}>{measurement.weightKg.toFixed(1)} kg</AppText>{index === 0 ? <AppText style={styles.latestLabel}>GÜNCEL</AppText> : null}</View>
                    <AppText style={styles.muted}>{formatDate(measurement.date)}</AppText>
                  </View>
                  <View style={styles.historyRight}>
                    {measurement.waistCm ? <AppText style={styles.historyDetail}>Bel {measurement.waistCm} cm</AppText> : null}
                    {measurement.bodyFatPercent ? <AppText style={styles.historyDetail}>Yağ %{measurement.bodyFatPercent}</AppText> : null}
                  </View>
                </Card>
              ))}
            </View>
          </>
        ) : (
          <>
            <Card style={styles.photoInfo}>
              <View style={styles.photoInfoIcon}><MaterialCommunityIcons name="shield-lock-outline" size={24} color={colors.primary} /></View>
              <View style={styles.flex}><AppText style={typography.bodyMedium}>Fotoğrafların özel</AppText><AppText style={styles.muted}>Yalnızca sen ve Cem Hoca görüntüleyebilir.</AppText></View>
            </Card>
            <Button label="Gelişim fotoğrafı ekle" icon="camera-plus-outline" variant="accent" onPress={() => setPhotoModal(true)} />
            {photos.length ? (
              <View style={styles.photoGrid}>
                {photos.map((photo) => (
                  <Pressable key={photo.id} onLongPress={() => confirmRemove(photo.id)} style={styles.photoCard}>
                    <Image source={{ uri: photo.uri }} style={styles.photo} />
                    <View style={styles.photoOverlay}><AppText style={styles.photoDate}>{formatShortDate(photo.date)}</AppText></View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Card><EmptyState icon="image-multiple-outline" title="Henüz fotoğraf yok" description="Aynı açı ve ışıkta düzenli fotoğraf ekleyerek değişimi daha net takip edebilirsin." /></Card>
            )}
            {photos.length ? <AppText style={styles.longPressHint}>Bir fotoğrafı kaldırmak için basılı tut.</AppText> : null}
          </>
        )}
      </Page>

      <ModalSheet visible={measurementModal} onClose={() => setMeasurementModal(false)} title="Yeni ölçüm">
        <View style={styles.modalIntro}><MaterialCommunityIcons name="information-outline" size={20} color={colors.info} /><AppText style={styles.modalIntroText}>En iyi karşılaştırma için benzer saatlerde ve benzer koşullarda ölçüm yap.</AppText></View>
        <TextField label="Kilo (kg) *" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="Örn. 69,5" error={formError} />
        <View style={styles.fieldRow}>
          <TextField containerStyle={styles.fieldHalf} label="Yağ oranı (%)" value={bodyFat} onChangeText={setBodyFat} keyboardType="decimal-pad" placeholder="26,0" />
          <TextField containerStyle={styles.fieldHalf} label="Bel (cm)" value={waist} onChangeText={setWaist} keyboardType="decimal-pad" placeholder="78" />
        </View>
        <View style={styles.fieldRow}>
          <TextField containerStyle={styles.fieldHalf} label="Göğüs (cm)" value={chest} onChangeText={setChest} keyboardType="decimal-pad" placeholder="89" />
          <TextField containerStyle={styles.fieldHalf} label="Kalça (cm)" value={hip} onChangeText={setHip} keyboardType="decimal-pad" placeholder="100" />
        </View>
        <TextField label="Kol (cm)" value={arm} onChangeText={setArm} keyboardType="decimal-pad" placeholder="31" />
        <Button label="Ölçümü kaydet" icon="check" onPress={saveMeasurement} />
      </ModalSheet>

      <ModalSheet visible={photoModal} onClose={() => setPhotoModal(false)} title="Fotoğraf ekle">
        <AppText style={styles.muted}>Vücudundaki değişimi daha iyi görmek için önden, yandan veya arkadan bir kare ekleyebilirsin.</AppText>
        <View style={styles.photoActionRow}>
          <Pressable onPress={() => pickPhoto('camera')} style={styles.photoAction}>
            <View style={styles.photoActionIcon}><MaterialCommunityIcons name="camera-outline" size={27} color={colors.primary} /></View>
            <AppText style={typography.bodyMedium}>Fotoğraf çek</AppText>
          </Pressable>
          <Pressable onPress={() => pickPhoto('library')} style={styles.photoAction}>
            <View style={styles.photoActionIcon}><MaterialCommunityIcons name="image-outline" size={27} color={colors.primary} /></View>
            <AppText style={typography.bodyMedium}>Galeriden seç</AppText>
          </Pressable>
        </View>
      </ModalSheet>
    </View>
  );
};

const MetricCard = ({ icon, label, value, unit, color }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string; unit: string; color: string }) => (
  <Card style={styles.metricCard}>
    <View style={[styles.metricIcon, { backgroundColor: color }]}><MaterialCommunityIcons name={icon} size={20} color={colors.primary} /></View>
    <AppText style={styles.metricLabel}>{label}</AppText>
    <AppText style={styles.metricValue}>{value} <AppText style={styles.metricUnit}>{unit}</AppText></AppText>
  </Card>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  summaryCard: { gap: spacing.lg },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { ...typography.caption, color: colors.inkSoft },
  summaryValue: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.8 },
  summaryUnit: { fontSize: 15, color: colors.inkSoft, fontWeight: '600' },
  deltaPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  deltaDown: { backgroundColor: colors.successSoft },
  deltaUp: { backgroundColor: colors.warningSoft },
  deltaText: { ...typography.bodyMedium },
  chart: { height: 150, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm, paddingTop: spacing.md },
  chartColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 5, height: '100%' },
  chartValue: { fontSize: 9, lineHeight: 11, color: colors.inkSoft },
  chartValueActive: { color: colors.primary, fontWeight: '800' },
  chartBar: { width: '65%', maxWidth: 34, minHeight: 24, borderTopLeftRadius: 9, borderTopRightRadius: 9, backgroundColor: colors.primaryLight },
  chartBarActive: { backgroundColor: colors.accent },
  chartDate: { fontSize: 9, lineHeight: 11, color: colors.inkSoft },
  muted: { ...typography.caption, color: colors.inkSoft },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metricCard: { width: '47%', flexGrow: 1, gap: spacing.sm, padding: spacing.md },
  metricIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  metricLabel: { ...typography.caption, color: colors.inkSoft },
  metricValue: { fontSize: 22, lineHeight: 26, fontWeight: '800' },
  metricUnit: { fontSize: 12, color: colors.inkSoft, fontWeight: '500' },
  historyBlock: { gap: spacing.md },
  historyCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  historyIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  historyIconLatest: { backgroundColor: colors.accent },
  historyTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  latestLabel: { fontSize: 9, lineHeight: 12, fontWeight: '800', color: colors.success, backgroundColor: colors.successSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.pill },
  historyRight: { alignItems: 'flex-end' },
  historyDetail: { ...typography.caption, color: colors.inkSoft },
  photoInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primaryLight },
  photoInfoIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  photoCard: { width: '47%', flexGrow: 1, aspectRatio: 0.75, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  photo: { width: '100%', height: '100%' },
  photoOverlay: { position: 'absolute', left: spacing.sm, bottom: spacing.sm, backgroundColor: 'rgba(16,38,34,0.7)', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  photoDate: { ...typography.caption, color: colors.white },
  longPressHint: { ...typography.caption, color: colors.inkSoft, textAlign: 'center' },
  modalIntro: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.infoSoft, padding: spacing.md, borderRadius: radius.md },
  modalIntroText: { flex: 1, ...typography.caption, color: colors.info },
  fieldRow: { flexDirection: 'row', gap: spacing.md },
  fieldHalf: { flex: 1 },
  photoActionRow: { flexDirection: 'row', gap: spacing.md },
  photoAction: { flex: 1, minHeight: 135, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  photoActionIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
});
