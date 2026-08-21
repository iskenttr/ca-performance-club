# App Store yayın kontrol listesi

Bu liste 20 Ağustos 2026 tarihindeki Apple ve Expo gereksinimleri dikkate alınarak hazırlanmıştır.

## Projede hazır olanlar

- [x] Expo SDK 57 / React Native / TypeScript mobil mimarisi
- [x] iOS bundle kimliği ve build numarası alanları
- [x] EAS geliştirme, önizleme ve üretim profilleri
- [x] 1024×1024 marka ikonu, adaptif ikon ve splash ekranı
- [x] Kamera ve fotoğraf erişimi için Türkçe amaç açıklamaları
- [x] Mikrofon izninin gereksiz yere eklenmesini engelleme
- [x] Şifreleme beyanı (`ITSAppUsesNonExemptEncryption: false`)
- [x] Uygulama içinde erişilebilir gizlilik ve kullanım koşulları taslağı
- [x] Öğrenci hesabını ve ilişkili yerel verileri silme akışı
- [x] Fitness/beslenme içeriğinin tıbbi tedavi olmadığına dair uyarı
- [x] Reklam SDK’sı ve kullanıcı takibi yok; öğün analizi için LogMeal kullanımı belgeli
- [x] TypeScript, Expo Doctor ve iOS bundle doğrulaması

## Yayından önce zorunlu

- [ ] Yerel demo veri katmanını üretim backend’iyle değiştir.
- [ ] Sunucu tarafı gerçek hesap silme ve özel dosya temizlemeyi bağla.
- [ ] Fotoğrafları private bucket + imzalı URL ile sakla.
- [ ] RLS/yetki testlerini öğrenci, Cem Hoca ve yetkisiz kullanıcı için çalıştır.
- [ ] Uygunsuz mesaj bildirme/iletişimi durdurma ve destek akışını ekle.
- [ ] App Store incelemesi için çalışan öğrenci ve PT demo hesapları hazırla.
- [ ] Kamuya açık gizlilik politikası ve destek URL’si yayınla.
- [ ] Gizlilik metnini KVKK/GDPR kapsamı ve gerçek veri sağlayıcıları için hukuk kontrolünden geçir.
- [ ] App Store Connect’te yeni yaş derecelendirme sorularını yanıtla.
- [ ] Fiziksel iPhone’da kamera, sınırlı fotoğraf erişimi, çevrimdışı durum ve silme akışını test et.
- [ ] TestFlight iç/dış testlerini tamamla.
- [ ] Son App Store ekran görüntülerini gerçek release build’den üret.
- [ ] Apple Developer hesabında `com.cemarslanoglu.caperformanceclub` App ID’sini oluştur veya bundle kimliğini sahip olduğun kimlikle değiştir.
- [ ] EAS projesini gerçek Expo organizasyonuna bağla; kimlik bilgilerini repoya yazma.

## Güncel teknik gereksinim

Apple, 28 Nisan 2026’dan beri App Store Connect’e yüklenen uygulamaların Xcode 26 veya yenisi ve iOS 26 SDK ile derlenmesini istiyor. Expo SDK 57 bu nesil Xcode/iOS desteğini hedefler; son build’den önce [Apple Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/) ve [Expo SDK 57 referansını](https://docs.expo.dev/versions/v57.0.0/) tekrar kontrol et.

`npm audit`, mevcut Expo/Metro geliştirme araçları zincirindeki transitif `image-size`, `xcode` ve `uuid` paketleri için yayımlanmış bildirimler gösterebilir. Expo Doctor uyumlu bağımlılık ağını hatasız doğrulamaktadır ve önerilen otomatik “fix” Expo’yu uyumsuz eski bir majör sürüme düşürdüğü için uygulanmamalıdır. Yeni Expo SDK 57 yama sürümleri çıktıkça bağımlılıkları güncelle ve audit’i tekrar çalıştır; EAS üretim build’inde yalnız imzalı release çıktısını dağıt.

## Gizlilik etiketi için beklenen veri tipleri

Üretim backend’i açıldığında aşağıdaki veriler sunucuya iletilip kullanıcıyla ilişkileneceği için App Store Connect’te “App Functionality” amacıyla beyan edilmesi beklenir:

- Ad, e-posta adresi, telefon numarası
- Kullanıcı kimliği
- Fitness verileri: program, hareket tamamlama, kilo ve vücut ölçümleri
- Fotoğraflar
- Öğün fotoğrafları ve bunlardan çıkarılan yaklaşık besin değerleri (LogMeal işleyicisine aktarılır)
- Özel metin mesajları
- Randevu ve serbest metin notları için “Other User Content” değerlendirmesi

Reklam veya izleme yapılmadığı sürece bu alanlarda “Tracking” seçilmemelidir. Apple, yalnız cihazda kalan ve sunucuya iletilmeyen veriyi “collected” saymaz; üretim backend’i devreye girdiğinde durum değişir. Beyanlar gerçek sürümün davranışıyla birebir aynı olmalıdır. Kaynak: [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/).

## Hesap silme

Hesap oluşturan uygulamalar kullanıcıya uygulama içinden tüm hesabı ve ilişkili kişisel verileri silmeyi başlatma imkânı vermelidir. Yalnızca hesabı pasife almak yeterli değildir. MVP’de buton mevcut; üretimde sunucu, Auth ve fotoğraf deposu da aynı akışta temizlenmelidir. Kaynak: [Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app).

## Sağlık ve fitness

- Sağlık/fitness verisini reklam, pazarlama veya veri madenciliği için kullanma.
- Yalnız temel özellik için gereken izin ve veriyi iste.
- Beslenme metnini tıbbi teşhis/tedavi gibi sunma.
- HealthKit daha sonra eklenirse amaç açıklamaları, izin ve veri beyanlarını ayrıca güncelle.

Kaynaklar: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Health and fitness apps](https://developer.apple.com/health-fitness/).

## İnceleme notu taslağı

```text
CA Performance Club, tek personal trainer Cem Arslanoğlu ile kayıtlı öğrencileri arasında kullanılan özel fitness takip uygulamasıdır. Yeni öğrenci otomatik olarak Cem Arslanoğlu hesabına bağlanır; herkese açık sosyal akış veya kullanıcı keşfi yoktur. Uygulama antrenman/beslenme planı, ölçüm ve gelişim fotoğrafı takibi, ders planlama ve birebir mesajlaşma sunar. Öğrenci açıkça seçtiğinde öğün fotoğrafı yaklaşık besin analizi için backend üzerinden LogMeal'e gönderilir. Reklam ve kullanıcı takibi kullanılmaz. Öğrenci hesabı Profil > Hesabımı ve verilerimi sil yolundan kalıcı olarak silinebilir.
```
