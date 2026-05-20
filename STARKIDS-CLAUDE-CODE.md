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
├── .github/workflows/deploy.yml
├── public/
│   ├── favicon.svg
│   ├── icon-192.png
│   └── icon-512.png
├── src/
│   ├── App.jsx                     # Ana uygulama (~800+ satır)
│   ├── main.jsx
│   └── lib/
│       ├── firebase.js             # Firebase config, Google + Anonymous auth
│       └── store.js                # Firestore CRUD + ensureFamilyCode + getFamilyByCode
├── index.html
├── vite.config.js                  # base: '/starkids/'
└── package.json
```

## Firebase Bilgileri
- **Proje:** starkids-points
- **Auth:** Google Sign-In + Anonymous Auth (her ikisi aktif olmalı)
- **Firestore yapısı:**
```
familyCodes/{code}     → { familyId }
families/{familyId}/
  ├── familyCode, parentPin, lang, ownerName
  ├── config/tasks        → { list: [...görevler] }
  ├── config/rewards      → { data: {mini:[], orta:[], buyuk:[]} }
  └── children/{childId}/
      ├── balance, totalEarned, streakCount, avatar, name
      ├── lastSpinDate, lastDecayDate
      ├── logs/{YYYY-MM-DD}  → { log: {taskId: "done"|"penalty"|"skip"} }
      └── wheelHistory/
users/{userId}/
  └── uid, email, displayName, role, familyId
```

## Firestore Güvenlik Kuralları
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

## Giriş Sistemi (✅ Çalışıyor)
- **Login ekranı koşulu:** `const showLogin = !userDoc && !childSession`
  - Anonim Firebase user olsa bile userDoc/childSession yoksa login gösterilir
- **Çocuk girişi:** Ad + Aile kodu → otomatik çocuk oluşturma → childSession localStorage'a kaydedilir
- **Google girişi:** userDoc yüklenir → ebeveyn paneli erişilebilir
- **Yeni Aile Kur:** Anonim auth + ad + PIN → aile kodu üretilir
- **Çıkış:** State (userDoc, family, children, selectedChild) anında temizlenir + signOut
- **Anonim auth:** `onAuthStateChanged`'de user yoksa otomatik `signInAnonymously` → Firestore erişimi sağlar

## Puan Sistemi
- **Ödül çarkı eşikleri:** Mini 200, Orta 500, Büyük 1000 puan
- **Puan erimesi:** 5 gün çark çevrilmezse %15 erir, toast uyarısı
- **Onaylama:** Boş bırakılan cezalı görevler otomatik penalty olarak işaretlenir
- **Optimistic update:** markTask state'i anında günceller, sonra Firestore'a yazar

## Görev Yapısı (54 görev, t1-t54)
- 6 kategori: bakım, ev, eğitim, manevi, disiplin, hobi
- Ödev: 2pt | Ekstra ders çalışma: 15pt | Anton 30dk: 8pt | Anton 1saat: 24pt
- Ekran süresi uyma: +5/-10 | Az aşım: -15 | Çok aşım: -30
- Yüzme/spor hazırlık görevleri (haftalık, 3pt)
- **Otomatik güncelleme:** Uygulama açılınca DEFAULT_TASKS Firestore'a merge edilir

## Aile Kodu
- Format: 1 harf + 4 rakam (örn. A1234)
- `familyCodes/{code}` koleksiyonunda reverse lookup
- Ebeveyn panelinde gösterilir, "Yeni Kod Oluştur" butonu var
- `ensureFamilyCode(familyId, force?)` — yoksa üretir, force=true ile yeniler
- Family snapshot dinleyicisi var → kod güncellenince UI anında yenilenir

## Child Mode
- `childSession` varsa ebeveyn sekmesi gizlenir
- `!childSession && userDoc` koşuluyla nav gösterilir
- Çocuk çıkışı: localStorage temizlenir + state sıfırlanır

## Repo & URL
- **GitHub:** https://github.com/haciak84/starkids
- **Canlı:** https://haciak84.github.io/starkids/
- **Base path:** /starkids/

## Geliştirme Komutları
```bash
cd C:\Users\trave\Desktop\starkids-deploy
npm install --legacy-peer-deps
npm run dev --host

git add .
git commit -m "açıklama"
git push
```

## Önemli Notlar
- `npm install` her zaman `--legacy-peer-deps` ile çalıştır
- Firebase Console'da Anonymous Auth aktif olmalı
- GitHub Pages deploy: push → Actions → build → deploy (~2-3 dk)
- Tüm UI tek dosyada: `src/App.jsx`
