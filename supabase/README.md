# Supabase üretim referansı

`migrations/0001_initial.sql`, CemFit’in önerilen üretim şeması ve RLS sınırları için başlangıç dosyasıdır. Otomatik çalıştırılmamıştır; gerçek proje kimlikleri ve saklama politikaları belli olduktan sonra gözden geçirilmelidir.

Kurulum sırası:

1. Migration’ı uygula.
2. Cem Arslanoğlu Auth kullanıcısını **server/admin tarafından** `app_metadata.role = trainer` ile oluştur.
3. `app_settings.default_trainer_id` değerini Cem’in Auth UUID’sine ayarla.
4. `progress-photos` adında public olmayan Storage bucket oluştur.
5. Storage politikalarında yalnız `auth.uid() = studentId` veya bağlı PT erişimine izin ver.
6. Hesap silme için service-role kullanan, fotoğraf dosyalarını da temizleyen bir Edge Function oluştur.
7. Mobil uygulamaya yalnız public Supabase URL + anon key koy; service-role anahtarını asla uygulamaya ekleme.

Şema tek PT varsayımını korur ama `student_coaching` ilişkisi sayesinde ileride çoklu PT’ye veri migrasyonu yapılabilir.

