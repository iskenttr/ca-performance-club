# CA Performance Club

Cem Arslanoğlu için geliştirilmiş tek PT’li, mobil-first fitness takip uygulaması. Expo SDK 57, React Native ve TypeScript kullanır. Uygulamada yapay zekâ özelliği veya AI servisi bulunmaz.

## Çalışan MVP kapsamı

### Öğrenci

- E-posta/şifre ile kayıt ve giriş
- Kayıt anında otomatik `Cem Arslanoğlu` eşleştirmesi
- Profil ve hedef bilgileri
- Antrenman programı, gün/hareket listesi ve tamamlama takibi
- Beslenme planı ve su hedefi
- Kilo/vücut ölçüleri, geçmiş ve basit gelişim grafiği
- Kamera veya galeriden gelişim fotoğrafı
- Ders takvimi ve yeni ders talebi
- Cem Hoca ile birebir mesajlaşma
- Uygulama içinden hesabı ve ilişkili verileri silme

### Cem Hoca

- Kontrol merkezi ve özet metrikler
- Yeni/aktif/ara veren öğrenci listesi ve arama
- Öğrenci profili, özel PT notları ve durum yönetimi
- Hazır şablondan antrenman programı atama/değiştirme
- Hazır şablondan beslenme planı atama/değiştirme
- Öğrencinin ölçüm ve gelişim fotoğraflarını görüntüleme
- Ders ekleme, talep onaylama, tamamlama ve iptal
- Öğrenci bazlı mesaj kutusu

## Başlangıç hesapları

| Rol | E-posta | Şifre |
|---|---|---|
| Öğrenci | `ogrenci@cemfit.app` | `Ogrenci123!` |
| Cem Hoca | `cem@cemfit.app` | `Cem123!` |

## Çalıştırma

Gereksinim: Node.js `22.13+`.

```bash
npm install
npm start
```

Ardından Expo Go ile QR kodunu okutabilir veya aşağıdaki komutları kullanabilirsin:

```bash
npm run ios
npm run android
npm run web
```

iOS’un yerel simülatörü yalnızca macOS’ta çalışır. Windows’tan gerçek iOS paketi EAS Build ile üretilebilir.

## Kontroller

```bash
npm run typecheck
npm run doctor
npx expo export --platform ios
```

Bu teslimde TypeScript kontrolü, Expo Doctor (`21/21`) ve iOS Hermes bundle üretimi başarıyla tamamlandı. Öğrenci ve PT akışları iPhone boyutunda web önizlemesiyle etkileşimli olarak kontrol edildi.

## Veri modu

Web sürümü VPS üzerindeki ortak sunucu adaptörüyle çalışır:

- Hesaplar ve uygulama verileri tüm cihazlarda ortak görünür.
- Aynı e-posta adresiyle ikinci kez kayıt oluşturulamaz.
- Parolalar sunucuda tuzlanmış özet olarak saklanır; istemciye gönderilmez.
- Oturum belirteci cihazda güvenli biçimde saklanır ve kullanıcı açıkça çıkış yapana kadar geçerlidir.
- Cem Hoca paneli açıkken yeni veriler düzenli olarak yenilenir.
- Önceki yerel sürümde oluşturulan hesaplar ilk başarılı girişte ortak sunucuya aktarılır.

Gelişim fotoğrafları için sonraki üretim adımı özel nesne depolama alanına geçiştir. Hedef App Store yapısı [Mimari ve üretime geçiş](./docs/ARCHITECTURE.md) belgesinde tanımlıdır.

## iOS dağıtımı

`app.json` içinde bundle kimliği, kamera/fotoğraf izin açıklamaları, şifreleme beyanı, marka ikonu ve splash ekranı bulunur. `eas.json` geliştirme, önizleme ve üretim profillerini içerir.

```bash
npx eas-cli login
npx eas-cli build:configure
npm run build:ios
npm run submit:ios
```

EAS yapılandırması sırasında projeyi kendi Expo hesabına bağla ve `com.cemarslanoglu.caperformanceclub` kimliğinin Apple Developer hesabında sana ait olduğundan emin ol. Yayın öncesi zorunlu işler için [App Store kontrol listesine](./docs/APP_STORE_CHECKLIST.md) bak.

## Proje yapısı

```text
src/
  components/       Ortak arayüz ve sohbet bileşenleri
  context/          Uygulama durumu ve iş kuralları
  data/             Demo verisi ve PT plan şablonları
  screens/student/  Öğrenci uygulaması
  screens/trainer/  Cem Hoca paneli
  services/         Kimlik ve yerel depolama adaptörü
  types/            Alan veri modeli
  utils/            Tarih yardımcıları
docs/                Mimari, App Store ve gizlilik belgeleri
```

## Tasarım kararları

- Tek PT sabiti: `TRAINER_ID = trainer-cem-arslanoglu`
- Öğrenci kayıt ekranında PT seçimi veya davet kodu yok
- Program ve beslenme şablonları deterministik; AI üretimi yok
- E-posta/şifre kimliği kullanıldığı için üçüncü taraf sosyal giriş zorunluluğu doğmuyor
- Sağlık iddiası yerine fitness takibi; beslenme ekranında tıbbi olmayan içerik uyarısı var
