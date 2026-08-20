# Apple HealthKit entegrasyonu

CA Performance Club, Apple Fitness verilerini doğrudan Fitness uygulamasından değil, Apple'ın merkezi sağlık ve fitness deposu olan HealthKit üzerinden okur.

## Okunan veriler

- Günlük adım sayısı
- Günlük aktif enerji (kcal)
- Günlük egzersiz süresi
- Günlük antrenman sayısı ve antrenman özetleri

İzin yalnızca öğrenci ana ekranındaki **Apple Health'e bağlan** düğmesine dokunulduğunda istenir. Sağlık verileri CA Performance Club'ın yerel demo deposuna kaydedilmez; kart açıldığında cihazdaki HealthKit deposundan okunur. Reklam, pazarlama veya AI amacıyla kullanılmaz.

## Derleme

HealthKit native bir iOS özelliğidir ve Expo Go içinde çalışmaz. Gerçek cihaz testi için özel development build gerekir:

```bash
npx expo prebuild --platform ios
eas build --profile development --platform ios
```

App Store derlemesinde Apple Developer hesabındaki uygulama kimliği için HealthKit capability açık olmalıdır. Config plugin gerekli entitlement ve kullanım açıklamalarını native projeye ekler.

## App Store kontrol listesi

- Gizlilik politikası HealthKit'ten okunan veri türlerini açıkça belirtmeli.
- App Store Connect gizlilik beyanında Health & Fitness veri kullanımı doğru işaretlenmeli.
- Sağlık verileri reklam, hedefleme veya veri madenciliğinde kullanılmamalı.
- İzin ekranı yalnızca kullanıcı bağlantıyı başlattığında gösterilmeli.
- Gerçek iPhone üzerinde izin verme, reddetme ve daha sonra Ayarlar'dan iptal etme akışları test edilmeli.
