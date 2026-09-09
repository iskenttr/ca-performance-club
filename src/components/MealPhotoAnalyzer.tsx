import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import React, { useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { colors, radius, spacing, typography } from '../constants';
import { useApp } from '../context/AppContext';
import { MealAnalysis, MealType } from '../types/domain';
import { AppText, Button, Card, Chip, ModalSheet, TextField } from './ui';

const LOGMEAL_TARGET_BYTES = 1_200_000;
const LOGMEAL_MAX_DIMENSION = 1280;
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

interface FoodDraft {
  name: string;
  removed: boolean;
}

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'İşlem tamamlanamadı. Lütfen tekrar dene.';

export const MealPhotoAnalyzer = () => {
  const { analyzeMealPhoto, customizeMealAnalysis, recalculateMealAnalysis, saveAnalyzedMeal } = useApp();
  const [visible, setVisible] = useState(false);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [portion, setPortion] = useState('');
  const [foodDrafts, setFoodDrafts] = useState<FoodDraft[]>([]);
  const [loading, setLoading] = useState<'prepare' | 'analyze' | 'foods' | 'portion' | 'save' | null>(null);
  const [error, setError] = useState('');

  const close = () => {
    if (loading) return;
    setVisible(false);
    setPhoto(null);
    setAnalysis(null);
    setPortion('');
    setFoodDrafts([]);
    setError('');
  };

  const prepareForLogMeal = async (asset: ImagePicker.ImagePickerAsset) => {
    const longestSide = Math.max(asset.width, asset.height);
    const actions: Parameters<typeof manipulateAsync>[1] = [];
    if (longestSide > LOGMEAL_MAX_DIMENSION) {
      actions.push({
        resize: asset.width >= asset.height
          ? { width: LOGMEAL_MAX_DIMENSION }
          : { height: LOGMEAL_MAX_DIMENSION },
      });
    }
    let result = await manipulateAsync(asset.uri, actions, {
      base64: true,
      compress: 0.72,
      format: SaveFormat.JPEG,
    });
    if (result.base64 && Math.floor(result.base64.length * 0.75) > LOGMEAL_TARGET_BYTES) {
      result = await manipulateAsync(result.uri, [{
        resize: result.width >= result.height
          ? { width: 960 }
          : { height: 960 },
      }], {
        base64: true,
        compress: 0.58,
        format: SaveFormat.JPEG,
      });
    }
    return result;
  };

  const handlePickerResult = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.uri) {
      setError('Fotoğraf okunamadı. Lütfen farklı bir fotoğraf dene.');
      return;
    }
    setLoading('prepare');
    setFoodDrafts([]);
    setError('');
    try {
      const prepared = await prepareForLogMeal(asset);
      if (!prepared.base64) throw new Error('Fotoğraf dönüştürülemedi.');
      const estimatedBytes = Math.floor(prepared.base64.length * 0.75);
      if (estimatedBytes > LOGMEAL_TARGET_BYTES) {
        setError('Fotoğraf hazırlanamadı. Daha düşük çözünürlüklü bir fotoğraf seç.');
        return;
      }
      setPhoto({ uri: prepared.uri, imageBase64: prepared.base64, mimeType: 'image/jpeg', fileName: 'meal.jpg' });
      setAnalysis(null);
      setPortion('');
    } catch {
      setError('Fotoğraf analiz için hazırlanamadı. Lütfen tekrar çekmeyi dene.');
    } finally {
      setLoading(null);
    }
  };

  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.7,
    base64: false,
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
    await handlePickerResult(await ImagePicker.launchCameraAsync(pickerOptions));
  };

  const pickPhoto = async () => {
    setError('');
    await handlePickerResult(await ImagePicker.launchImageLibraryAsync(pickerOptions));
  };

  const analyze = async () => {
    if (!photo) return;
    setLoading('analyze');
    setError('');
    try {
      const result = await analyzeMealPhoto(photo);
      setAnalysis(result);
      setPortion(result.portionGrams ? `${result.portionGrams}` : '');
      setFoodDrafts(result.foods.map((food) => ({ name: food.name, removed: false })));
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoading(null);
    }
  };

  const foodDraftsDirty = Boolean(analysis) && foodDrafts.some((draft, index) =>
    draft.removed || draft.name.trim() !== analysis?.foods[index]?.name,
  );

  const applyFoodCorrections = async () => {
    if (!analysis) return;
    setLoading('foods');
    setError('');
    try {
      const result = await customizeMealAnalysis(analysis.analysisToken, foodDrafts);
      setAnalysis(result);
      setPortion(result.portionGrams ? `${result.portionGrams}` : '');
      setFoodDrafts(result.foods.map((food) => ({ name: food.name, removed: false })));
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
      setFoodDrafts(result.foods.map((food) => ({ name: food.name, removed: false })));
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoading(null);
    }
  };

  const save = async () => {
    if (!analysis || !photo) return;
    if (foodDraftsDirty) {
      setError('Öğünü kaydetmeden önce yiyecek düzeltmelerini uygula.');
      return;
    }
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
    setFoodDrafts([]);
  };

  return (
    <>
      <Button label="Fotoğraftan Öğün Ekle" icon="camera-plus-outline" variant="accent" onPress={() => setVisible(true)} />
      <ModalSheet visible={visible} onClose={close} title="Fotoğraftan Öğün Ekle" fullHeight={Boolean(photo)}>
        <AppText style={styles.muted}>Yemeğini net, aydınlık ve mümkünse doğrudan üstten çek. Sonuçlar yaklaşık değerlerdir.</AppText>
        <View style={styles.sourceRow}>
          <Button label="Kamera" icon="camera-outline" variant="secondary" loading={loading === 'prepare'} disabled={Boolean(loading)} onPress={() => void takePhoto()} style={styles.sourceButton} />
          <Button label="Galeri" icon="image-multiple-outline" variant="secondary" disabled={Boolean(loading)} onPress={() => void pickPhoto()} style={styles.sourceButton} />
        </View>

        {photo ? <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="cover" /> : (
          <View style={styles.placeholder}><MaterialCommunityIcons name="food-variant" size={42} color={colors.primary} /><AppText style={styles.muted}>Analiz için bir yemek fotoğrafı seç.</AppText></View>
        )}

        {photo && !analysis ? <Button label="Yemeği Analiz Et" icon="creation" onPress={() => void analyze()} loading={loading === 'analyze'} disabled={Boolean(loading)} /> : null}

        {analysis ? (
          <>
            <Card style={styles.resultCard}>
              <View style={styles.approximateBanner}><MaterialCommunityIcons name="information-outline" size={17} color={colors.warning} /><AppText style={styles.approximateText}>Fotoğrafa dayalı yaklaşık sonuçtur; kaydetmeden önce kontrol et.</AppText></View>
              <AppText style={styles.eyebrow}>LOGMEAL ANALİZİ</AppText>
              <AppText style={typography.h2}>{analysis.name}</AppText>
              <AppText style={styles.editHint}>Yanlış tanınan adı düzeltebilir veya tabağında olmayan yiyeceği kaldırabilirsin.</AppText>
              {foodDrafts.map((draft, index) => {
                const food = analysis.foods[index];
                return (
                  <View key={`${food?.name ?? 'food'}-${index}`} style={[styles.foodEditor, draft.removed && styles.foodEditorRemoved]}>
                    <TextField
                      containerStyle={styles.flex}
                      label={`Yiyecek ${index + 1}${food?.portionGrams ? ` · ${Math.round(food.portionGrams)} g` : ''}`}
                      value={draft.name}
                      editable={!draft.removed}
                      onChangeText={(name) => setFoodDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name } : item))}
                    />
                    <Button
                      label={draft.removed ? 'Geri al' : 'Kaldır'}
                      icon={draft.removed ? 'undo-variant' : 'close'}
                      compact
                      variant="ghost"
                      onPress={() => setFoodDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, removed: !item.removed } : item))}
                    />
                  </View>
                );
              })}
              {foodDraftsDirty ? <Button label="Düzeltmeleri Uygula" icon="check" compact variant="secondary" onPress={() => void applyFoodCorrections()} loading={loading === 'foods'} disabled={Boolean(loading)} /> : null}
              <View style={styles.macroGrid}>
                <Macro label="Kalori" value={`${Math.round(analysis.caloriesKcal)} kcal`} />
                <Macro label="Protein" value={`${analysis.proteinG.toFixed(1)} g`} />
                <Macro label="Karbonhidrat" value={`${analysis.carbsG.toFixed(1)} g`} />
                <Macro label="Yağ" value={`${analysis.fatG.toFixed(1)} g`} />
              </View>
            </Card>

            {analysis.portionGrams && analysis.portionEditable !== false ? (
              <Card style={styles.portionCard}>
                <TextField label="Toplam porsiyon (gram)" value={portion} onChangeText={(text) => setPortion(text.replace(/[^0-9,.]/g, ''))} keyboardType="decimal-pad" />
                <Button label="Porsiyona Göre Güncelle" icon="scale" compact variant="secondary" onPress={() => void updatePortion()} loading={loading === 'portion'} disabled={Boolean(loading)} />
              </Card>
            ) : <AppText style={styles.warning}>{analysis.portionEditable === false ? 'Bir yiyecek kaldırıldığı için toplamlar tespit edilen gramaja göre yaklaşık ölçeklendi; yeniden porsiyonlandırma kapatıldı.' : 'LogMeal bu fotoğraf için gramaj döndürmedi; porsiyon düzeltmesi kullanılamıyor.'}</AppText>}

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
  approximateBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.warningSoft },
  approximateText: { flex: 1, ...typography.caption, color: colors.warning },
  eyebrow: { ...typography.label, color: colors.accent, letterSpacing: 1.2 },
  editHint: { ...typography.caption, color: colors.inkSoft },
  foodEditor: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  foodEditorRemoved: { opacity: 0.5 },
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
