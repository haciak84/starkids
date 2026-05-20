# StarKids ⭐ - Proje Özeti

## Proje Nedir?
Çocuklar için görev takip ve ödül sistemi PWA uygulaması. Ebeveyn görev tanımlar, çocuk görevleri yapar, puan kazanır, ödül çarkı çevirir.

## Teknik Yapı
- **Frontend:** React (Vite + JSX, tek dosya bileşen yapısı)
- **Backend:** Firebase (Auth + Firestore)
- **Hosting:** GitHub Pages (GitHub Actions ile otomatik deploy)
- **PWA:** vite-plugin-pwa ile service worker + manifest

## Dosya Yapısı
```
starkids-deploy/
├── .github/workflows/deploy.yml   # GitHub Actions deploy
├── public/
│   ├── favicon.svg
│   ├── icon-192.png
│   └── icon-512.png
├── src/
│   ├── App.jsx                     # Ana uygulama (~800+ satır)
│   ├── main.jsx                    # React entry point
│   └── lib/
│       ├── firebase.js             # Firebase config & init
│       └── store.js                # Firestore CRUD fonksiyonları
├── index.html
├── vite.config.js                  # base: '/starkids/'
└── package.json
```

## Firebase Bilgileri
- **Proje:** starkids-points
- **Auth:** Google Sign-In + Anonymous Auth (her ikisi aktif)
- **Firestore yapısı:**
```
familyCodes/{code}     → { familyId }   (aile kodu → aile ID lookup)
families/{familyId}/
  ├── familyCode, parentPin, lang, ownerName
  ├── config/tasks        → { list: [...görevler] }
  ├── config/rewards      → { data: {mini:[], orta:[], buyuk:[]} }
  └── children/{childId}/
      ├── balance, totalEarned, streakCount, avatar, name
      ├── lastSpinDate, lastDecayDate
      ├── logs/{YYYY-MM-DD}  → { log: {taskId: "done"|"penalty"|"skip"} }
      ├── wheelHistory/      → spin kayıtları
      └── session/active     → çoklu cihaz kontrolü
users/{userId}/
  └── uid, email, displayName, role, familyId
```

## Firestore Güvenlik Kuralları (güncel)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /familyCodes/{code} {
      allow read, write: if true;
    }
    match /families/{familyId} {
      allow read, write: if true;
      match /{document=**} {
        allow read, write: if true;
      }
    }
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Giriş Sistemi
- **Çocuk:** "Ad + Kod ile Giriş" → adını yaz + aile kodunu yaz → başla
  - Arka planda anonim Firebase auth otomatik açılır
  - childSession localStorage'da saklanır: `sk_child = {familyId, childId}`
  - Çocuk yoksa otomatik oluşturulur
- **Ebeveyn (Google):** Google ile giriş → userDoc yüklenir
- **Ebeveyn (anonim):** "Yeni Aile Kur" → ad + PIN → aile kodu alır
- **Ebeveyn paneli:** PIN ile erişilir (her giriş tipinde)

## Login Ekranı Koşulu
```js
const showLogin = !userDoc && !childSession;
```
Anonim Firebase user olsa bile userDoc veya childSession yoksa login ekranı gösterilir.

## Puan Sistemi
- **Ödül çarkı eşikleri:** Mini 200, Orta 500, Büyük 1000 puan
- **Puan erimesi:** 5 gün çark çevrilmezse bakiyenin %15'i erir, uyarı çıkar
- **Onaylama:** Ebeveyn "Onayla" butonuna basınca boş bırakılan cezalı görevler otomatik uygulanır
- **Optimistic update:** markTask hızlı tıklamada stale state olmaz

## Görev Yapısı (54 görev)
- 6 kategori: bakım, ev, eğitim, manevi, disiplin, hobi
- Ödev: 2 puan (az), Ekstra ders çalışma: 15 puan (yüksek)
- Anton App 30dk: 8pt, 1saat: 24pt (3 katı)
- Ekran süresi aşımı: az -15pt, çok -30pt
- Yüzme/spor hazırlık görevleri (haftalık)
- Varsayılan görevler uygulama açılışında otomatik güncellenir

## Aile Kodu
- Format: 1 harf + 4 rakam (örn. A1234)
- Ebeveyn panelinde görünür
- "Yeni Kod Oluştur" butonu ile yenilenebilir
- familyCodes/{code} koleksiyonunda reverse lookup

## Mevcut Özellikler
- Google ile giriş + anonim (kodsuz) giriş
- Ad + aile kodu ile çocuk girişi (Google gerekmez)
- Ebeveyn PIN korumalı panel (4 haneli)
- Çoklu çocuk desteği (avatar + isim)
- 54 hazır görev (6 kategori)
- Dinamik görev ekleme/düzenleme/silme/aktif-pasif
- Günlük görev işaretleme (✓ yapıldı, ✗ ceza)
- Puan sistemi (bakiye + toplam kazanılan ayrı)
- Puan erimesi (5 gün çark çevrilmezse %15 erir)
- Ödül çarkı (3 kademe: 200/500/1000 puan, animasyonlu)
- Seviye sistemi (Bronz→Gümüş→Altın→Elmas→Efsane)
- Streak bonusu (7/14/30 gün = 30/75/200 puan)
- Haftalık grafik (son 7 gün bar chart)
- Takvim görünümü
- TR/DE dil desteği
- Ebeveyn onaylama + otomatik ceza uygulama
- Manuel puan düzeltme
- PWA (telefona eklenebilir)
- Child mode: ebeveyn sekmesi gizli

## Planlanan / Bekleyen
- Çocuk girişi takılma sorunu (anonim auth timing) — test ediliyor
- Çocuk silme özelliği
- PIN değiştirme
- Bildirimler

## Repo & URL
- **GitHub:** https://github.com/haciak84/starkids
- **Canlı:** https://haciak84.github.io/starkids/
- **Base path:** /starkids/

## Geliştirme Komutları
```bash
cd C:\Users\trave\Desktop\starkids-deploy
npm install --legacy-peer-deps
npm run dev --host          # lokal: http://localhost:5173/starkids/

# Deploy (push = otomatik deploy)
git add .
git commit -m "açıklama"
git push
```

## Önemli Notlar
- `npm install` her zaman `--legacy-peer-deps` ile çalıştırılmalı
- Node.js 22+ gerekli
- Tüm UI tek dosyada: `src/App.jsx`
- Firebase API anahtarı public'tir (tasarım gereği), güvenlik Firestore rules ile sağlanır
- GitHub Pages deploy: push → GitHub Actions → build → deploy (2-3 dk)
- Anonymous Auth Firebase Console'da aktif olmalı
