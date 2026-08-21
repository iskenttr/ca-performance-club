import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { colors, radius, spacing, typography } from '../constants';
import { useApp } from '../context/AppContext';
import { MealAnalysis, MealType } from '../types/domain';
import { AppText, Button, Card, Chip, ModalSheet, TextField } from './ui';

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const mealTypes: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Kahvaltı' },
  { value: 'lunch', label: 'Öğle' },
  { value: 'dinner', label: 'Akşam' },
  { value: 'snack', label: 'Ara öğün' },
];

interface PickedPhoto {
  uri: string;
  imageBase64: string;
  mimeType?: string;
  fileName?: string;
}

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'İşlem tamamlanamadı. Lütfen tekrar dene.';

export const MealPhotoAnalyzer = () => {
  const { analyzeMealPhoto, recalculateMealAnalysis, saveAnalyzedMeal } = useApp();
  const [visible, setVisible] = useState(false);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [portion, setPortion] = useState('');
  const [loading, setLoading] = useState<'analyze' | 'portion' | 'save' | null>(null);
  const [error, setError] = useState('');

  const close = () => {
    if (loading) return;
    setVisible(false);
    setPhoto(null);
    setAnalysis(null);
    setPortion('');
    setError('');
  };

  const handlePickerResult = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.base64) {
      setError('Fotoğraf okunamadı. Lütfen farklı bir fotoğraf dene.');
      return;
    }
    const estimatedBytes = Math.floor(asset.base64.length * 0.75);
    if (estimatedBytes > MAX_IMAGE_BYTES) {
      setError('Fotoğraf en fazla 6 MB olabilir. Daha düşük çözünürlüklü bir fotoğraf seç.');
      return;
    }
    setPhoto({ uri: asset.uri, imageBase64: asset.base64, mimeType: asset.mimeType, fileName: asset.fileName ?? undefined });
    setAnalysis(null);
    setPortion('');
    setError('');
  };

  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.7,
    base64: true,
  };

  const takePhoto = async () => {
    setError('');
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Fotoğraf çekmek için kamera izni vermelisin.');
        return;
      }
    }
    handlePickerResult(await ImagePicker.launchCameraAsync(pickerOptions));
  };

  const pickPhoto = async () => {
    setError('');
    handlePickerResult(await ImagePicker.launchImageLibraryAsync(pickerOptions));
  };

  const analyze = async () => {
    if (!photo) return;
    setLoading('analyze');
    setError('');
    try {
      const result = await analyzeMealPhoto(photo);
      setAnalysis(result);
      setPortion(result.portionGrams ? `${result.portionGrams}` : '');
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoading(null);
    }
  };

  const updatePortion = async () => {
    if (!analysis) return;
    const grams = Number(portion.replace(',', '.'));
    if (!Number.isFinite(grams) || grams < 1 || grams > 5000) {
      setError('Porsiyon 1–5000 gram arasında olmalı.');
      return;
    }
    setLoading('portion');
    setError('');
    try {
      const result = await recalculateMealAnalysis(analysis.analysisToken, grams);
      setAnalysis(result);
      setPortion(result.portionGrams ? `${result.portionGrams}` : `${grams}`);
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoading(null);
    }
  };

  const save = async () => {
    if (!analysis || !photo) return;
    setLoading('save');
    setError('');
    try {
      await saveAnalyzedMeal({ ...photo, analysisToken: analysis.analysisToken, mealType, eatenAt: new Date().toISOString() });
      closeAfterSave();
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoading(null);
    }
  };

  const closeAfterSave = () => {
    setVisible(false);
    setPhoto(null);
    setAnalysis(null);
    setPortion('');
  };

  return (
    <>
      <Button label="📷 Fotoğraftan Öğün Ekle" icon="camera-plus-outline" variant="accent" onPress={() => setVisible(true)} />
      <ModalSheet visible={visible} onClose={close} title="Fotoğraftan Öğün Ekle" fullHeight>
        <AppText style={styles.muted}>Yemeğini net, aydınlık ve mümkünse doğrudan üstten çek. Sonuçlar yaklaşık değerlerdir.</AppText>
        <View style={styles.sourceRow}>
          <Button label="Kamera" icon="camera-outline" variant="secondary" onPress={() => void takePhoto()} style={styles.sourceButton} />
          <Button label="Galeri" icon="image-multiple-outline" variant="secondary" onPress={() => void pickPhoto()} style={styles.sourceButton} />
        </View>

        {photo ? <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="cover" /> : (
          <View style={styles.placeholder}><MaterialCommunityIcons name="food-variant" size={42} color={colors.primary} /><AppText style={styles.muted}>Analiz için bir yemek fotoğrafı seç.</AppText></View>
        )}

        {photo && !analysis ? <Button label="Yemeği Analiz Et" icon="creation" onPress={() => void analyze()} loading={loading === 'analyze'} disabled={Boolean(loading)} /> : null}

        {analysis ? (
          <>
            <Card style={styles.resultCard}>
              <AppText style={styles.eyebrow}>LOGMEAL ANALİZİ</AppText>
              <AppText style={typography.h2}>{analysis.name}</AppText>
              {analysis.foods.map((food, index) => (
                <View key={`${food.name}-${index}`} style={styles.foodItem}>
                  <View style={styles.foodBullet} />
                  <View style={styles.flex}>
                    <AppText style={typography.bodyMedium}>{food.name}{food.portionGrams ? ` · ${Math.round(food.portionGrams)} g` : ''}</AppText>
                    {food.ingredients.length ? <AppText style={styles.muted}>{food.ingredients.map((item) => item.name).join(' · ')}</AppText> : null}
                  </View>
                </View>
              ))}
              <View style={styles.macroGrid}>
                <Macro label="Kalori" value={`${Math.round(analysis.caloriesKcal)} kcal`} />
                <Macro label="Protein" value={`${analysis.proteinG.toFixed(1)} g`} />
                <Macro label="Karbonhidrat" value={`${analysis.carbsG.toFixed(1)} g`} />
                <Macro label="Yağ" value={`${analysis.fatG.toFixed(1)} g`} />
              </View>
            </Card>

            {analysis.portionGrams ? (
              <Card style={styles.portionCard}>
                <TextField label="Toplam porsiyon (gram)" value={portion} onChangeText={(text) => setPortion(text.replace(/[^0-9,.]/g, ''))} keyboardType="decimal-pad" />
                <Button label="Porsiyona Göre Güncelle" icon="scale" compact variant="secondary" onPress={() => void updatePortion()} loading={loading === 'portion'} disabled={Boolean(loading)} />
              </Card>
            ) : <AppText style={styles.warning}>LogMeal bu fotoğraf için gramaj döndürmedi; porsiyon düzeltmesi kullanılamıyor.</AppText>}

            <View style={styles.typeBlock}>
              <AppText style={styles.fieldLabel}>Öğün tipi</AppText>
              <View style={styles.chips}>{mealTypes.map((item) => <Chip key={item.value} label={item.label} selected={mealType === item.value} onPress={() => setMealType(item.value)} />)}</View>
            </View>
            <Button label="Öğünü Kaydet" icon="content-save-check-outline" variant="accent" onPress={() => void save()} loading={loading === 'save'} disabled={Boolean(loading)} />
          </>
        ) : null}
        {error ? <View style={styles.error}><MaterialCommunityIcons name="alert-circle-outline" size={19} color={colors.danger} /><AppText style={styles.errorText}>{error}</AppText></View> : null}
      </ModalSheet>
    </>
  );
};

const Macro = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.macro}><AppText style={styles.macroLabel}>{label}</AppText><AppText style={styles.macroValue}>{value}</AppText></View>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  muted: { ...typography.caption, color: colors.inkSoft },
  sourceRow: { flexDirection: 'row', gap: spacing.sm },
  sourceButton: { flex: 1 },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted },
  placeholder: { minHeight: 180, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  resultCard: { gap: spacing.md, backgroundColor: '#0D1511', borderColor: '#304035' },
  eyebrow: { ...typography.label, color: colors.accent, letterSpacing: 1.2 },
  foodItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  foodBullet: { width: 7, height: 7, borderRadius: 4, marginTop: 8, backgroundColor: colors.primary },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  macro: { width: '47%', flexGrow: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  macroLabel: { ...typography.caption, color: colors.inkSoft },
  macroValue: { ...typography.h3, color: colors.white },
  portionCard: { gap: spacing.md },
  warning: { ...typography.caption, color: colors.warning },
  typeBlock: { gap: spacing.sm },
  fieldLabel: { ...typography.caption, color: colors.inkSoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.dangerSoft },
  errorText: { flex: 1, ...typography.caption, color: colors.danger },
});
