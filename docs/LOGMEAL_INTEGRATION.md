# Fotoğraftan Öğün Analizi / LogMeal

## Akış

1. Öğrenci mevcut Expo ImagePicker ile kameradan veya galeriden fotoğraf seçer.
2. İstemci fotoğrafı oturum token'ıyla `/api/meals/analyze` endpoint'ine gönderir.
3. Backend JPEG/PNG/WebP türünü, dosya imzasını ve 6 MB sınırını doğrular.
4. Backend, `LOGMEAL_API_TOKEN` ile sırasıyla LogMeal Complete Segmentation, Ingredients ve Nutritional Info endpoint'lerini çağırır.
5. Sonuç 30 dakika geçerli, öğrenciye ve fotoğraf özetine bağlı imzalı bir analiz referansıyla istemciye döner.
6. Gramaj değişirse backend LogMeal `nutrition/confirm/quantity` endpoint'ini çağırıp ingredients ve nutrition değerlerini yeniden alır.
7. Kaydetme endpoint'i analiz referansını ve fotoğrafı doğrular, öğünü mevcut öğrenci hesabına ekler.

LogMeal'in resmî alanları kullanılır: `imageId`, `foodName`, `recipe_per_item`, `serving_size`, `nutritional_info.calories` ve `totalNutrients` içindeki `PROCNT`, `CHOCDF`, `FAT`. Eksik değerler sıfır veya sahte sonuçla tamamlanmaz.

Resmî kaynaklar:

- https://docs.logmeal.com/docs/guides-getting-started-quickstart
- https://docs.logmeal.com/reference/post_v2-image-segmentation-complete-model-version
- https://docs.logmeal.com/reference/post_v2-nutrition-recipe-nutritionalinfo-model-version
- https://docs.logmeal.com/recipes/confirm-food-quantity

## VPS environment

Sunucu prosesi başlamadan önce aşağıdaki değişken tanımlanmalıdır:

```bash
export LOGMEAL_API_TOKEN='LogMeal APIUser token değeri'
```

Mevcut cron kurulumu kullanılıyorsa token'ı repository dosyasına değil VPS crontab ortamına ekle:

```cron
LOGMEAL_API_TOKEN=gercek-token-degeri
@reboot CA_APP_ROOT=/home/canadmin/apps/ca-performance-club nohup python3 /home/canadmin/apps/ca-performance-club/server/ca_server.py >/home/canadmin/apps/ca-performance-club/server.log 2>&1 &
```

Token'ı loglama, frontend için `EXPO_PUBLIC_` önekiyle tanımlama veya `app.json`/`eas.json` içine koyma.

## Kurulum ve doğrulama

```bash
npm ci
npm run test
npm run typecheck
npm run doctor
npm run build:web
```

JSON dosyalı mevcut VPS backend'i migration çalıştırmadan `mealEntries` koleksiyonunu otomatik oluşturur. Supabase'e geçildiğinde `0002_meal_analysis.sql` migration'ı `0001_initial.sql` sonrasında uygulanmalıdır. Öğün fotoğrafları Supabase sürümünde private bucket'a yüklenip `photo_path` alanında saklanmalıdır.

## Manuel test senaryoları

1. Öğrenci olarak giriş yap, Beslenme > Fotoğraftan Öğün Ekle yolundan kamerayı aç ve izin akışını doğrula.
2. Galeriden JPEG, PNG ve WebP seç; önizleme ile analiz sonucunda yemek, içerikler, gramaj, kalori ve makroları kontrol et.
3. Gramajı değiştir; yeni değerlerin LogMeal quantity confirmation sonrası güncellendiğini doğrula.
4. Kahvaltı/öğle/akşam/ara öğün seçip kaydet; bugün özeti ve geçmişte fotoğrafla göründüğünü doğrula.
5. Cem Hoca hesabında aynı öğrenciyi aç; günlük toplam, fotoğraf ve tarih bazlı geçmişi doğrula.
6. Başka öğrenci hesabıyla ilk öğrencinin öğünlerinin dönmediğini ve analiz referansının kullanılamadığını doğrula.
7. Yemek olmayan görsel, bozuk base64, 6 MB üstü dosya ve desteklenmeyen dosya türünde Türkçe hatayı doğrula.
8. `LOGMEAL_API_TOKEN` kaldırıldığında yapılandırma hatasını; geçersiz token'da servis hatasını; kota dolduğunda kota mesajını doğrula.
9. Ağ bağlantısını keserek frontend ve backend bağlantı hatalarını doğrula.
10. Eski öğrenci/PT akışlarında program, ölçüm, takvim ve mesaj işlemlerini tekrar kontrol et.
