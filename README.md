# ⭐ Murat Puan Sistemi

Çocuklar için görev takip ve ödül sistemi. PWA olarak çalışır — telefona eklenince app gibi görünür.

## 🚀 Kurulum (GitHub Pages)

### 1. GitHub'da repo oluştur
- GitHub.com'da yeni repo oluştur: `murat-puan`
- Public olarak ayarla

### 2. Kodu yükle
```bash
cd murat-pwa
git init
git add .
git commit -m "ilk sürüm"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADIN/murat-puan.git
git push -u origin main
```

### 3. GitHub Pages'i aktifleştir
- Repo → Settings → Pages
- Source: **GitHub Actions** seç
- Push yaptıktan sonra otomatik deploy olacak

### 4. Erişim
```
https://KULLANICI_ADIN.github.io/murat-puan/
```

## 📱 Telefona Ekleme (PWA)
1. Chrome'da URL'yi aç
2. Menü → "Ana ekrana ekle" / "Add to Home Screen"
3. App gibi açılır!

## ⚙️ Özellikler
- 43 hazır görev (6 kategori)
- TR/DE dil desteği
- Ödül çarkı (3 kademe: 100/250/500 puan)
- Streak bonusu (7/14/30 gün)
- Seviye sistemi (Bronz → Elmas → Efsane)
- Ebeveyn paneli (PIN korumalı, varsayılan: 1234)
- Görev ve ödül ekleme/düzenleme
- Offline çalışma (PWA)

## 🔧 Lokal Geliştirme
```bash
npm install
npm run dev
```
