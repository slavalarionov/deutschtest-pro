# Gizlilik Politikası

**Yürürlük tarihi:** 28 Nisan 2026

Bu Gizlilik Politikası, **DeutschTest.pro**'nun hangi kişisel verileri topladığını, bunları nasıl kullandığını, kimlerle paylaştığını ve nasıl koruduğunu açıklar. Hizmeti kullanarak bu Politikayı kabul etmiş olursunuz.

Bu Politika, AB **Genel Veri Koruma Yönetmeliği (GDPR)** ile ve geçerli yerel veri koruma yasaları ile uyumlu olacak şekilde hazırlanmıştır.

---

## 1. Veri sorumlusu

Veri sorumlusu:

**Wjatscheslaw Larionow** (Rusya yasalarına göre Bireysel Girişimci)

Vergi Numarası (INN): 550517616144

Adres: Sibirsky Prospekt 20, Daire 61, 644109 Omsk, Rusya Federasyonu

Veri koruma soruları için e-posta: **hallo@deutschtest.pro**

---

## 2. Topladığımız veriler

### 2.1. Doğrudan sağladığınız veriler

**Kayıt sırasında:**
- e-posta adresi;
- ad (isteğe bağlı);
- şifre (yalnızca tuzlanmış hash olarak saklanır; düz metin şifrenizi asla görmüyoruz);
- tercih edilen arayüz dili.

**Kullanım sırasında:**
- görevlere verdiğiniz yanıtlar (Schreiben'da metin, Sprechen'de ses kayıtları ve transkriptleri);
- tamamlanan Modüllerin sonuçları ve geçmişi;
- isteğe bağlı anketlere verilen yanıtlar (örn. "Bizi nereden duydunuz?");
- Modül tamamlandıktan sonraki geri bildirim (isteğe bağlı).

**Ödeme sırasında:**
- Ödeme kartı verilerinizi **almıyoruz ve saklamıyoruz**. Bu, doğrudan ödeme sağlayıcısı Prodamus tarafından işlenir.
- Ödeme sağlayıcısından bir ödeme onayı, işlem kimliği ve tutarını alıyoruz.

### 2.2. Otomatik olarak toplanan veriler

- **Teknik veriler:** IP adresi, tarayıcı türü ve sürümü, işletim sistemi, dil, saat dilimi — hizmetin işletilmesi ve kötüye kullanımın önlenmesi için kullanılır.
- **Oturum çerezleri:** giriş durumunuzu korumak için teknik olarak gerekli çerezler. Bunlar olmadan hizmet çalışamaz.
- **Anonim istatistikler:** çerez kullanmayan ve bireysel kullanıcıları tanımlayan **Umami** analiz aracı aracılığıyla.

### 2.3. Toplamadığımız veriler

- Reklam çerezleri veya izleme pikselleri kullanmıyoruz.
- Google Analytics, Facebook Pixel veya benzeri izleme sistemleri yerleştirmiyoruz (bu sürüm itibarıyla).
- Açık izniniz olmadan mikrofonunuza erişmiyoruz (yalnızca aktif Sprechen modülleri sırasında izninizle).

---

## 3. Verilerinizi neden işliyoruz

| Amaç | Veri | Hukuki dayanak |
|---|---|---|
| Kayıt ve kimlik doğrulama | e-posta, şifre, ad | Sözleşmenin ifası (Mad. 6(1)(b) GDPR) |
| Hizmetin sunumu (Modül erişimi, AI puanlama) | yanıtlar, geçmiş | Mad. 6(1)(b) GDPR |
| Ödeme işleme ve iadeler | e-posta, ödeme onayı | Mad. 6(1)(b) ve (c) GDPR |
| İşlem e-postaları (doğrulama, makbuzlar) | e-posta adresi | Mad. 6(1)(b) GDPR |
| Sahtekarlığa karşı koruma | IP adresi, teknik veriler | Meşru menfaat (Mad. 6(1)(f) GDPR) |
| Hizmetin iyileştirilmesi (anonim istatistikler) | Umami verileri | Meşru menfaat |
| Sorularınıza yanıt verme | sorgunuzdaki veriler | Mad. 6(1)(b) ve (f) GDPR |

Verilerinizi şu amaçlarla **kullanmıyoruz:**
- yasal etki yaratan otomatik karar verme;
- reklam amaçlı profilleme;
- üçüncü taraf yapay zeka modellerinin eğitimi.

---

## 4. Verilerinizin alıcıları

Hizmetlerimizi sunmak için aşağıdaki veri işleyicilerini kullanıyoruz:

| Sağlayıcı | Veri | Konum | Amaç |
|---|---|---|---|
| **Supabase** | e-posta, ad, geçmiş, yanıtlar | Frankfurt, Almanya (AB) | Veritabanı ve kimlik doğrulama |
| **Timeweb Cloud** | tüm uygulama verileri | Frankfurt, Almanya (AB) | Uygulama hosting |
| **Resend** | e-posta adresi, mesaj metni | ABD | İşlem e-postaları gönderimi |
| **Anthropic** (Claude) | yanıt metniniz + görev bağlamı | ABD | AI tabanlı yanıt değerlendirme |
| **OpenAI** (Whisper) | Sprechen'den ses kaydı | ABD | Ses-metin transkripsiyonu |
| **ElevenLabs** | diyalog metinleri | ABD | Hören için ses sentezi |
| **Prodamus** | ödeme verileri (güvenli form aracılığıyla) | Rusya | Ödeme işleme |
| **Umami** | anonim ziyaret istatistikleri | Kendinden hosted | Çerezsiz analitik |

### 4.1. ABD'ye veri aktarımı

Resend, Anthropic, OpenAI ve ElevenLabs verileri ABD'de işler. ABD AB Komisyonu tarafından yeterli veri koruma seviyesi sağlayan bir ülke olarak tutarlı şekilde tanınmadığı için aktarım şu mekanizmalara dayanır:

- Mad. 46 GDPR uyarınca **AB Standart Sözleşme Şartları (SCC)**;
- uygulanabilir olduğunda **AB-ABD Veri Gizliliği Çerçevesi** sertifikasyonu;
- **veri minimizasyonu ilkesi** — yalnızca gerekli olanı aktarıyoruz ve teknik olarak mümkün olduğunda yanıt içeriği yanında tanımlayıcı bilgileri (e-posta adresiniz gibi) göndermekten kaçınıyoruz.

### 4.2. Rusya'ya veri aktarımı

Veri sorumlusu Rusya'da kayıtlıdır. Ödeme sağlayıcısı Prodamus da Rusya'da faaliyet göstermektedir ve ödeme verilerinizi güvenli formu aracılığıyla doğrudan alır. Bu aktarım, "Öde" düğmesine tıkladığınızda verdiğiniz **açık rızanıza** (Mad. 49(1)(a) GDPR) dayanır ve sözleşmenin ifası için gereklidir (Mad. 49(1)(b) GDPR).

Verilerinizi satmıyoruz ve reklam amaçlarıyla paylaşmıyoruz.

---

## 5. Verilerin saklandığı yer

Ana veritabanı ve uygulama hosting fiziksel olarak **Frankfurt, Almanya** sunucularında bulunur — Avrupa Birliği içinde, GDPR'nin gerektirdiği yüksek koruma seviyesini sağlar.

---

## 6. Saklama süreleri

| Veri türü | Saklama süresi |
|---|---|
| Kayıt verileri (e-posta, ad) | Hesabın silinmesine kadar |
| Modül geçmişi ve yanıtlar | Hesabın silinmesine kadar |
| Ödeme kayıtları (onay, işlem kimliği) | 3 yıl (yasal vergi kayıtları) |
| Teknik kayıtlar (IP'ler, hatalar) | 90 gün |
| Veritabanı yedekleri | 30 gün, otomatik silme |
| Hesap silindikten sonraki veriler | 30 gün içinde silinir, yasal saklama yükümlülüğü olmadığı sürece |

---

## 7. GDPR kapsamındaki haklarınız

Aşağıdaki haklara sahipsiniz:

- **Erişim hakkı** (Mad. 15) — hakkınızda hangi verileri tuttuğumuzu öğrenin;
- **Düzeltme hakkı** (Mad. 16) — yanlış verileri düzeltin;
- **Silme hakkı** (Mad. 17) — silme talep edin ("unutulma hakkı"). Çoğu veriyi hesap ayarlarınızdan kendiniz silebilirsiniz;
- **İşleme kısıtlama hakkı** (Mad. 18);
- **Veri taşınabilirliği hakkı** (Mad. 20) — verilerinizi makine tarafından okunabilir bir formatta alın;
- **İtiraz hakkı** (Mad. 21);
- **Rızayı geri çekme hakkı** — istediğiniz zaman, gelecek için etkili olarak;
- **Denetim makamına şikayet hakkı** (Mad. 77).

**Bu haklardan herhangi birini kullanmak için**, "Veri Koruma Talebi" konusu ile **hallo@deutschtest.pro**'ya e-posta gönderin. 30 gün içinde yanıt veriyoruz.

---

## 8. Veri güvenliği

Makul teknik ve organizasyonel önlemler uyguluyoruz:

- aktarım sırasında veriler için HTTPS/TLS şifreleme;
- şifreler yalnızca tuzlanmış hash olarak saklanır;
- altyapı düzeyinde kısıtlı veritabanı erişimi;
- eski kopyaların otomatik silinmesiyle düzenli yedeklemeler;
- rol tabanlı erişim kontrolleri.

Bir veri ihlali durumunda, GDPR'nin 72 saatlik son tarihi içinde sizi ve denetim makamını bilgilendireceğiz (Mad. 33 GDPR).

---

## 9. Çerezler

Yalnızca teknik olarak gerekli çerezleri kullanıyoruz:

- giriş durumu ve dil tercihi için **oturum çerezleri**;
- çerez bannerındaki tercihinizi hatırlamak için **çerez izni çerezi**.

Bunlar AB hukuku uyarınca açık rıza gerektirmez.

Analitik sağlayıcımız **Umami** çerezsizdir ve bireysel kullanıcıları tanımlamaz — rıza gerekmez.

Gelecekte ek analitik veya pazarlama araçları ekleyecek olursak (örn. Google Analytics), bunlar **yalnızca açık rızanızla** çerez bannerı aracılığıyla etkinleştirilecektir. Bu Politika buna göre güncellenecektir.

---

## 10. Reşit olmayanlar

Hizmet belirli bir yaş grubuna yönelik değildir, ancak Goethe sınavlarına hazırlanan herkese — 18 yaşın altındakiler dahil — açıktır. 16 yaşın altındaysanız, lütfen hizmeti yalnızca ebeveynlerinizin veya yasal temsilcilerinizin rızasıyla kullanın. Çocuğunuzun bilginiz olmadan kayıt olduğunu fark eden bir ebeveynseniz, bizimle iletişime geçin, hesabı sileceğiz.

---

## 11. Bu Politikadaki değişiklikler

Bu Politikayı zaman zaman güncelleyebiliriz. Önemli değişiklikler için sizi e-posta ile bilgilendireceğiz. Güncel sürüm her zaman **deutschtest.pro/privacy** adresinde mevcuttur.

---

## 12. İletişim

Veri koruma soruları için:

**hallo@deutschtest.pro**

Wjatscheslaw Larionow
Sibirsky Prospekt 20, Daire 61
644109 Omsk, Rusya Federasyonu

---

*Son güncelleme: 28 Nisan 2026.*
