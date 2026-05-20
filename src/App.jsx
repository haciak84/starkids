import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { auth, googleProvider, signInAnonymously } from "./lib/firebase";
import { signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";
import * as store from "./lib/store";

// ============ CONSTANTS ============
const LEVELS = [
  { name: { tr: "Bronz", de: "Bronze" }, emoji: "🥉", min: 0, color: "#CD7F32" },
  { name: { tr: "Gümüş", de: "Silber" }, emoji: "🥈", min: 500, color: "#C0C0C0" },
  { name: { tr: "Altın", de: "Gold" }, emoji: "🥇", min: 1500, color: "#FFD700" },
  { name: { tr: "Elmas", de: "Diamant" }, emoji: "💎", min: 3500, color: "#B9F2FF" },
  { name: { tr: "Efsane", de: "Legende" }, emoji: "👑", min: 7000, color: "#FF6BFF" },
];

const WHEEL_TIERS = [
  { key: "mini", threshold: 200, label: { tr: "Mini Çark", de: "Mini Rad" }, color: "#4ECDC4" },
  { key: "orta", threshold: 500, label: { tr: "Orta Çark", de: "Mittleres Rad" }, color: "#45B7D1" },
  { key: "buyuk", threshold: 1000, label: { tr: "Büyük Çark", de: "Großes Rad" }, color: "#FFD700" },
];

const CATEGORIES = {
  bakim: { tr: "Kişisel Bakım", de: "Körperpflege", icon: "🧹" },
  ev: { tr: "Ev Görevleri", de: "Hausaufgaben", icon: "🏠" },
  egitim: { tr: "Eğitim & Gelişim", de: "Bildung & Entwicklung", icon: "📚" },
  manevi: { tr: "Manevi Görevler", de: "Spirituelle Aufgaben", icon: "🕌" },
  disiplin: { tr: "Disiplin & Davranış", de: "Disziplin & Verhalten", icon: "⏰" },
  hobi: { tr: "Hobi & Sosyal", de: "Hobbys & Soziales", icon: "🎨" },
};

const FREQ = { daily: { tr: "Günlük", de: "Täglich" }, weekly: { tr: "Haftalık", de: "Wöchentlich" }, once: { tr: "Tek seferlik", de: "Einmalig" } };

const AVATARS = ["🦁", "🐯", "🦊", "🐼", "🐨", "🦄", "🐲", "🦅", "🐬", "🦋", "🐢", "🐙"];

const STREAK_BONUSES = [
  { days: 7, bonus: 30, label: { tr: "7 Gün Serisi! 🔥", de: "7-Tage-Serie! 🔥" } },
  { days: 14, bonus: 75, label: { tr: "14 Gün Serisi! 🔥🔥", de: "14-Tage-Serie! 🔥🔥" } },
  { days: 30, bonus: 200, label: { tr: "30 Gün Serisi! 🔥🔥🔥", de: "30-Tage-Serie! 🔥🔥🔥" } },
];

const DEFAULT_TASKS = [
  { id: "t1", cat: "bakim", name: { tr: "Diş fırçalama (sabah)", de: "Zähneputzen (morgens)" }, pts: 3, penalty: 0, freq: "daily", active: true },
  { id: "t2", cat: "bakim", name: { tr: "Diş fırçalama (akşam)", de: "Zähneputzen (abends)" }, pts: 3, penalty: -5, freq: "daily", active: true },
  { id: "t3", cat: "bakim", name: { tr: "Gecelik giyerek yatma", de: "Im Schlafanzug schlafen" }, pts: 3, penalty: -5, freq: "daily", active: true },
  { id: "t4", cat: "bakim", name: { tr: "Tırnak kesme", de: "Nägel schneiden" }, pts: 3, penalty: 0, freq: "weekly", active: true },
  { id: "t5", cat: "bakim", name: { tr: "Duş alma", de: "Duschen" }, pts: 3, penalty: 0, freq: "daily", active: true },
  { id: "t6", cat: "bakim", name: { tr: "Saçını tarama", de: "Haare kämmen" }, pts: 2, penalty: 0, freq: "daily", active: true },
  { id: "t7", cat: "bakim", name: { tr: "Kirli çamaşırları sepete atma", de: "Schmutzige Wäsche in den Korb" }, pts: 2, penalty: -3, freq: "daily", active: true },
  { id: "t8", cat: "ev", name: { tr: "Yatak yapma", de: "Bett machen" }, pts: 5, penalty: 0, freq: "daily", active: true },
  { id: "t9", cat: "ev", name: { tr: "Kahvaltı masası toplama", de: "Frühstückstisch abräumen" }, pts: 3, penalty: -5, freq: "daily", active: true },
  { id: "t10", cat: "ev", name: { tr: "Akşam yemek masası kurma/toplama", de: "Abendtisch decken/abräumen" }, pts: 3, penalty: 0, freq: "daily", active: true },
  { id: "t11", cat: "ev", name: { tr: "Restmüll çıkarma", de: "Restmüll rausbringen" }, pts: 3, penalty: 0, freq: "daily", active: true },
  { id: "t12", cat: "ev", name: { tr: "Gelbe Sack / Altpapier ayırma", de: "Gelber Sack / Altpapier trennen" }, pts: 3, penalty: 0, freq: "weekly", active: true },
  { id: "t13", cat: "ev", name: { tr: "Kurutma makinasından çamaşır alma", de: "Wäsche aus dem Trockner" }, pts: 3, penalty: 0, freq: "daily", active: true },
  { id: "t14", cat: "ev", name: { tr: "Odasını toplama/düzenleme", de: "Zimmer aufräumen" }, pts: 5, penalty: 0, freq: "daily", active: true },
  { id: "t15", cat: "ev", name: { tr: "Bulaşık makinesini boşaltma", de: "Spülmaschine ausräumen" }, pts: 3, penalty: 0, freq: "daily", active: true },
  { id: "t16", cat: "ev", name: { tr: "Ayakkabıları düzgün dizme", de: "Schuhe ordentlich hinstellen" }, pts: 2, penalty: 0, freq: "daily", active: true },
  { id: "t17", cat: "ev", name: { tr: "Balık besleme", de: "Fische füttern" }, pts: 3, penalty: -5, freq: "daily", active: true },
  { id: "t18", cat: "ev", name: { tr: "Kediyle ilgilenme (mama/su)", de: "Katze versorgen (Futter/Wasser)" }, pts: 3, penalty: 0, freq: "daily", active: true },
  { id: "t19", cat: "ev", name: { tr: "Süpürme / Staubsaugen", de: "Staubsaugen" }, pts: 5, penalty: 0, freq: "weekly", active: true },
  { id: "t20", cat: "egitim", name: { tr: "Ödevi kendi başına yapma", de: "Hausaufgaben selbstständig" }, pts: 2, penalty: 0, freq: "daily", active: true },
  { id: "t21", cat: "egitim", name: { tr: "Kitap okuma (30dk)", de: "Lesen (30 Min.)" }, pts: 10, penalty: 0, freq: "daily", active: true },
  { id: "t22", cat: "egitim", name: { tr: "Kitap okuma (1 saat)", de: "Lesen (1 Stunde)" }, pts: 25, penalty: 0, freq: "daily", active: true },
  { id: "t23", cat: "egitim", name: { tr: "Derslere aktif katılım", de: "Aktive Teilnahme am Unterricht" }, pts: 5, penalty: 0, freq: "daily", active: true },
  { id: "t24", cat: "egitim", name: { tr: "Sınav notu 1-2", de: "Prüfungsnote 1-2" }, pts: 30, penalty: 0, freq: "once", active: true },
  { id: "t25", cat: "egitim", name: { tr: "Sınav notu 3", de: "Prüfungsnote 3" }, pts: 10, penalty: 0, freq: "once", active: true },
  { id: "t26", cat: "egitim", name: { tr: "Schülerhilfe'ye katılım", de: "Schülerhilfe-Teilnahme" }, pts: 5, penalty: 0, freq: "weekly", active: true },
  { id: "t27", cat: "egitim", name: { tr: "Yeni kelime öğrenme (TR/DE)", de: "Neues Wort lernen (TR/DE)" }, pts: 2, penalty: 0, freq: "daily", active: true },
  { id: "t28", cat: "egitim", name: { tr: "Satranç oynama/çalışma", de: "Schach spielen/üben" }, pts: 5, penalty: 0, freq: "daily", active: true },
  { id: "t29", cat: "manevi", name: { tr: "Namaz kılma (her vakit)", de: "Gebet (jedes Mal)" }, pts: 5, penalty: 0, freq: "daily", active: true },
  { id: "t30", cat: "manevi", name: { tr: "Oruç tutma", de: "Fasten" }, pts: 30, penalty: 0, freq: "daily", active: false },
  { id: "t31", cat: "manevi", name: { tr: "Dua/zikir yapma", de: "Bittgebet/Dhikr" }, pts: 3, penalty: 0, freq: "daily", active: true },
  { id: "t32", cat: "manevi", name: { tr: "Kur'an okuma (15dk)", de: "Koran lesen (15 Min.)" }, pts: 8, penalty: 0, freq: "daily", active: true },
  { id: "t33", cat: "disiplin", name: { tr: "Ekran süresine uyma", de: "Bildschirmzeit einhalten" }, pts: 5, penalty: -10, freq: "daily", active: true },
  { id: "t53", cat: "disiplin", name: { tr: "Ekran süresini aştı (az)", de: "Bildschirmzeit leicht überschritten" }, pts: 0, penalty: -15, freq: "daily", active: true },
  { id: "t54", cat: "disiplin", name: { tr: "Ekran süresini aştı (çok)", de: "Bildschirmzeit stark überschritten" }, pts: 0, penalty: -30, freq: "daily", active: true },
  { id: "t34", cat: "disiplin", name: { tr: "Uyku saatine uyma", de: "Schlafenszeit einhalten" }, pts: 5, penalty: -5, freq: "daily", active: true },
  { id: "t35", cat: "disiplin", name: { tr: "Söyleneni ilk seferde yapma", de: "Beim ersten Mal hören" }, pts: 3, penalty: 0, freq: "daily", active: true },
  { id: "t36", cat: "disiplin", name: { tr: "Arkadaşlarla iyi geçinme", de: "Gut mit Freunden auskommen" }, pts: 3, penalty: 0, freq: "daily", active: true },
  { id: "t37", cat: "disiplin", name: { tr: "Yalan söylememe", de: "Nicht lügen" }, pts: 5, penalty: -20, freq: "daily", active: true },
  { id: "t38", cat: "disiplin", name: { tr: "Saygılı konuşma", de: "Respektvoll sprechen" }, pts: 3, penalty: -10, freq: "daily", active: true },
  { id: "t39", cat: "hobi", name: { tr: "Haftasonu hobi uğraşma", de: "Wochenend-Hobby" }, pts: 10, penalty: 0, freq: "weekly", active: true },
  { id: "t40", cat: "hobi", name: { tr: "Spor/fiziksel aktivite (30dk)", de: "Sport/Bewegung (30 Min.)" }, pts: 8, penalty: 0, freq: "daily", active: true },
  { id: "t41", cat: "hobi", name: { tr: "3D printer projesi", de: "3D-Drucker Projekt" }, pts: 10, penalty: 0, freq: "weekly", active: true },
  { id: "t42", cat: "hobi", name: { tr: "Kodlama/programlama çalışması", de: "Programmieren üben" }, pts: 10, penalty: 0, freq: "weekly", active: true },
  { id: "t43", cat: "hobi", name: { tr: "Arkadaşla sosyal aktivite", de: "Soziale Aktivität mit Freunden" }, pts: 5, penalty: 0, freq: "weekly", active: true },
  { id: "t44", cat: "egitim", name: { tr: "Anton App (30dk)", de: "Anton App (30 Min.)" }, pts: 8, penalty: 0, freq: "daily", active: true },
  { id: "t45", cat: "egitim", name: { tr: "Anton App (1 saat)", de: "Anton App (1 Std.)" }, pts: 24, penalty: 0, freq: "daily", active: true },
  { id: "t46", cat: "egitim", name: { tr: "El yazısı Almanca cümle (15dk)", de: "Handschrift Deutsche Sätze (15 Min.)" }, pts: 5, penalty: 0, freq: "daily", active: true },
  { id: "t47", cat: "bakim", name: { tr: "Yüzme kıyafetlerini önceden hazırlamak", de: "Schwimmsachen vorbereiten" }, pts: 3, penalty: 0, freq: "weekly", active: true },
  { id: "t48", cat: "bakim", name: { tr: "Yüzmeden dönünce ıslaklıkları çıkarıp asmak", de: "Nasse Sachen nach dem Schwimmen aufhängen" }, pts: 3, penalty: 0, freq: "weekly", active: true },
  { id: "t49", cat: "bakim", name: { tr: "Spor günü kıyafetlerini önceden hazırlamak", de: "Sportkleidung vorher bereitlegen" }, pts: 3, penalty: 0, freq: "weekly", active: true },
  { id: "t50", cat: "bakim", name: { tr: "Spor dönüşü terli/nemli kıyafetleri ayırmak", de: "Feuchte Sportkleider nach dem Sport trennen" }, pts: 3, penalty: 0, freq: "weekly", active: true },
  { id: "t51", cat: "egitim", name: { tr: "Ders programını günlük hazırlamak", de: "Stundenplan täglich vorbereiten" }, pts: 3, penalty: 0, freq: "daily", active: true },
  { id: "t52", cat: "egitim", name: { tr: "Ekstra ders çalışması", de: "Zusätzliches Lernen" }, pts: 15, penalty: 0, freq: "daily", active: true },
];

const DEFAULT_REWARDS = {
  mini: [
    { id: "r1", name: { tr: "⭐ Yıldız Rozeti", de: "⭐ Sternabzeichen" }, weight: 25 },
    { id: "r2", name: { tr: "🍫 Sevdiği tatlı", de: "🍫 Lieblingssüßigkeit" }, weight: 25 },
    { id: "r3", name: { tr: "📱 +15dk ekran süresi", de: "📱 +15 Min. Bildschirmzeit" }, weight: 20 },
    { id: "r4", name: { tr: "🎮 +30dk oyun süresi", de: "🎮 +30 Min. Spielzeit" }, weight: 15 },
    { id: "r5", name: { tr: "🌙 15dk geç yatma hakkı", de: "🌙 15 Min. später schlafen" }, weight: 15 },
  ],
  orta: [
    { id: "r6", name: { tr: "🎬 Sinema", de: "🎬 Kino" }, weight: 25 },
    { id: "r7", name: { tr: "🎳 Bowling", de: "🎳 Bowling" }, weight: 20 },
    { id: "r8", name: { tr: "👫 Arkadaşla buluşma planı", de: "👫 Verabredung mit Freund" }, weight: 20 },
    { id: "r9", name: { tr: "🍕 Dışarıda yemek", de: "🍕 Essen gehen" }, weight: 20 },
    { id: "r10", name: { tr: "🎁 Küçük sürpriz hediye", de: "🎁 Kleine Überraschung" }, weight: 15 },
  ],
  buyuk: [
    { id: "r11", name: { tr: "🗺️ Özel gezi", de: "🗺️ Besonderer Ausflug" }, weight: 25 },
    { id: "r12", name: { tr: "🎢 Büyük etkinlik", de: "🎢 Großes Event" }, weight: 25 },
    { id: "r13", name: { tr: "📖 İstediği kitap/oyun", de: "📖 Wunschbuch/-spiel" }, weight: 20 },
    { id: "r14", name: { tr: "🏊 Havuz/Aquapark", de: "🏊 Schwimmbad/Aquapark" }, weight: 15 },
    { id: "r15", name: { tr: "💰 10€ harçlık", de: "💰 10€ Taschengeld" }, weight: 15 },
  ],
};

// ============ UTILS ============
const todayStr = () => new Date().toISOString().split("T")[0];
const genId = () => "id_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
const getLevel = (t) => { let l = LEVELS[0]; for (const x of LEVELS) if (t >= x.min) l = x; return l; };
const getNextLevel = (t) => { for (const x of LEVELS) if (t < x.min) return x; return null; };
const weightedRandom = (items) => { const total = items.reduce((s, i) => s + i.weight, 0); let r = Math.random() * total; for (const i of items) { r -= i.weight; if (r <= 0) return i; } return items[items.length - 1]; };

// ============ STYLES ============
const inputStyle = { padding: "12px 14px", borderRadius: 12, border: "2px solid #333", background: "#0d0d1a", color: "#e0e0e0", fontSize: 15, fontFamily: "'Nunito', sans-serif", outline: "none", width: "100%", boxSizing: "border-box" };
const btnStyle = { padding: "12px 20px", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" };
const labelStyle = { color: "#888", fontSize: 12, marginBottom: 4, display: "block", fontFamily: "'Nunito', sans-serif" };
const cardStyle = { padding: 16, background: "#111", borderRadius: 16, marginBottom: 16, border: "1px solid #222" };

// ============ SMALL COMPONENTS ============
function RewardWheel({ tier, rewards, lang, onResult, onClose }) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState(0);
  const items = rewards[tier] || [];
  const segAngle = 360 / items.length;
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"];
  const spin = () => {
    if (spinning || result) return;
    setSpinning(true);
    const winner = weightedRandom(items);
    const winIdx = items.indexOf(winner);
    const targetAngle = 360 * 5 + (360 - winIdx * segAngle - segAngle / 2);
    setRotation(prev => prev + targetAngle);
    setTimeout(() => { setSpinning(false); setResult(winner); }, 4000);
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, flexDirection: "column", gap: 20 }}>
      <div style={{ position: "relative", width: 300, height: 300 }}>
        <div style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "15px solid transparent", borderRight: "15px solid transparent", borderTop: "25px solid #FFD700", zIndex: 10 }} />
        <svg width="300" height="300" viewBox="0 0 300 300" style={{ transition: spinning ? "transform 4s cubic-bezier(0.17,0.67,0.12,0.99)" : "none", transform: `rotate(${rotation}deg)` }}>
          {items.map((item, i) => {
            const sA = i * segAngle - 90, eA = sA + segAngle;
            const sR = (sA * Math.PI) / 180, eR = (eA * Math.PI) / 180;
            const x1 = 150 + 140 * Math.cos(sR), y1 = 150 + 140 * Math.sin(sR);
            const x2 = 150 + 140 * Math.cos(eR), y2 = 150 + 140 * Math.sin(eR);
            const mR = ((sA + segAngle / 2) * Math.PI) / 180;
            const tx = 150 + 85 * Math.cos(mR), ty = 150 + 85 * Math.sin(mR);
            return (<g key={i}><path d={`M150,150 L${x1},${y1} A140,140 0 ${segAngle > 180 ? 1 : 0},1 ${x2},${y2} Z`} fill={colors[i % colors.length]} stroke="#fff" strokeWidth="2" /><text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="bold" fill="#333" transform={`rotate(${sA + segAngle / 2 + 90},${tx},${ty})`}>{item.name[lang]?.length > 16 ? item.name[lang].slice(0, 14) + "…" : item.name[lang]}</text></g>);
          })}
          <circle cx="150" cy="150" r="20" fill="#333" stroke="#FFD700" strokeWidth="3" />
        </svg>
      </div>
      {!result ? <button onClick={spin} disabled={spinning} style={{ ...btnStyle, padding: "16px 48px", fontSize: 20, fontWeight: 800, background: spinning ? "#666" : "linear-gradient(135deg, #FFD700, #FFA500)", color: "#333", borderRadius: 50 }}>{spinning ? "🎰 ..." : (lang === "tr" ? "🎰 ÇEVİR!" : "🎰 DREHEN!")}</button>
        : <div style={{ textAlign: "center" }}><div style={{ fontSize: 28, fontWeight: 800, color: "#FFD700", textShadow: "0 0 20px rgba(255,215,0,0.5)", marginBottom: 10 }}>🎉 {result.name[lang]}</div><button onClick={() => { onResult(result); onClose(); }} style={{ ...btnStyle, padding: "12px 36px", background: "#4ECDC4", borderRadius: 30 }}>{lang === "tr" ? "Harika! ✨" : "Super! ✨"}</button></div>}
      <button onClick={onClose} style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", color: "#fff", fontSize: 28, cursor: "pointer" }}>✕</button>
    </div>
  );
}

function PinDialog({ lang, correctPin, onSuccess, onCancel }) {
  const [pin, setPin] = useState(""); const [error, setError] = useState(false);
  const check = (val) => { setPin(val); if (val.length === 4) { if (val === correctPin) onSuccess(); else { setError(true); setTimeout(() => { setError(false); setPin(""); }, 800); } } };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, flexDirection: "column" }}>
      <div style={{ color: "#fff", fontSize: 20, marginBottom: 20, fontWeight: 700 }}>{lang === "tr" ? "🔒 Ebeveyn PIN" : "🔒 Eltern-PIN"}</div>
      <div style={{ display: "flex", gap: 12, marginBottom: 30 }}>{[0, 1, 2, 3].map(i => <div key={i} style={{ width: 20, height: 20, borderRadius: "50%", background: pin.length > i ? (error ? "#FF6B6B" : "#4ECDC4") : "#444", border: "2px solid #666", transition: "all 0.2s" }} />)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 70px)", gap: 10 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "⌫"].map((n, i) => n === null ? <div key={i} /> : <button key={i} onClick={() => { if (n === "⌫") setPin(p => p.slice(0, -1)); else if (pin.length < 4) check(pin + n); }} style={{ width: 70, height: 70, borderRadius: "50%", border: "2px solid #555", background: "#222", color: "#fff", fontSize: 24, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</button>)}
      </div>
      <button onClick={onCancel} style={{ marginTop: 20, background: "none", border: "none", color: "#888", fontSize: 14, cursor: "pointer" }}>{lang === "tr" ? "İptal" : "Abbrechen"}</button>
    </div>
  );
}

function TaskEditor({ lang, task, onSave, onCancel }) {
  const [form, setForm] = useState(task || { id: genId(), cat: "ev", name: { tr: "", de: "" }, pts: 5, penalty: 0, freq: "daily", active: true });
  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div style={{ padding: 16, background: "#1a1a2e", borderRadius: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input placeholder="Görev adı (TR)" value={form.name.tr} onChange={e => setForm(f => ({ ...f, name: { ...f.name, tr: e.target.value } }))} style={inputStyle} />
        <input placeholder="Aufgabenname (DE)" value={form.name.de} onChange={e => setForm(f => ({ ...f, name: { ...f.name, de: e.target.value } }))} style={inputStyle} />
        <div style={{ display: "flex", gap: 8 }}>
          <select value={form.cat} onChange={e => u("cat", e.target.value)} style={{ ...inputStyle, flex: 1 }}>{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v[lang]}</option>)}</select>
          <select value={form.freq} onChange={e => u("freq", e.target.value)} style={{ ...inputStyle, flex: 1 }}>{Object.entries(FREQ).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}</select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><label style={labelStyle}>+ Puan</label><input type="number" value={form.pts} onChange={e => u("pts", +e.target.value)} style={inputStyle} /></div>
          <div style={{ flex: 1 }}><label style={labelStyle}>- Ceza</label><input type="number" value={form.penalty} onChange={e => u("penalty", +e.target.value)} style={inputStyle} /></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onSave(form)} style={{ ...btnStyle, background: "#4ECDC4", flex: 1 }}>💾</button>
          <button onClick={onCancel} style={{ ...btnStyle, background: "#666", flex: 1 }}>✕</button>
        </div>
      </div>
    </div>
  );
}

function Calendar({ lang, familyId, childId, tasks, onClose }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [logs, setLogs] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  useEffect(() => {
    const s = `${month.y}-${String(month.m + 1).padStart(2, "0")}-01`;
    const e = `${month.y}-${String(month.m + 1).padStart(2, "0")}-31`;
    store.getLogsRange(familyId, childId, s, e).then(setLogs);
  }, [month, familyId, childId]);
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const firstDay = new Date(month.y, month.m, 1).getDay();
  const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1;
  const mNames = lang === "tr" ? ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"] : ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const dNames = lang === "tr" ? ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"] : ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const getDayScore = (ds) => { const l = logs[ds]; if (!l) return null; let s = 0, t = 0; for (const [, st] of Object.entries(l)) { t++; if (st === "done") s++; } return t > 0 ? s / t : null; };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 1500, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#111", borderRadius: 20, padding: 20, width: "90%", maxWidth: 400, maxHeight: "80vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button onClick={() => setMonth(m => ({ y: m.m === 0 ? m.y - 1 : m.y, m: m.m === 0 ? 11 : m.m - 1 }))} style={{ ...btnStyle, background: "#333", padding: "8px 16px" }}>◀</button>
          <span style={{ fontSize: 16, fontWeight: 800 }}>{mNames[month.m]} {month.y}</span>
          <button onClick={() => setMonth(m => ({ y: m.m === 11 ? m.y + 1 : m.y, m: m.m === 11 ? 0 : m.m + 1 }))} style={{ ...btnStyle, background: "#333", padding: "8px 16px" }}>▶</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>{dNames.map(d => <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#888", fontWeight: 700 }}>{d}</div>)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {Array(adjustedFirst).fill(null).map((_, i) => <div key={"e" + i} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const ds = `${month.y}-${String(month.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const sc = getDayScore(ds);
            const isToday = ds === todayStr();
            const bg = sc === null ? "#1a1a2e" : sc >= 0.8 ? "#0a3a1a" : sc >= 0.5 ? "#2a2a0a" : "#3a1a1a";
            return <button key={day} onClick={() => setSelectedDate(ds === selectedDate ? null : ds)} style={{ aspectRatio: "1", borderRadius: 8, border: isToday ? "2px solid #4ECDC4" : selectedDate === ds ? "2px solid #FFD700" : "1px solid #333", background: bg, color: "#e0e0e0", fontSize: 13, fontWeight: isToday ? 800 : 400, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{day}</button>;
          })}
        </div>
        {selectedDate && logs[selectedDate] && (
          <div style={{ marginTop: 16, padding: 12, background: "#1a1a2e", borderRadius: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#4ECDC4" }}>{selectedDate}</div>
            {Object.entries(logs[selectedDate]).map(([tid, status]) => { const task = tasks.find(t => t.id === tid); return task ? <div key={tid} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12, borderBottom: "1px solid #222" }}><span>{task.name[lang]}</span><span style={{ color: status === "done" ? "#4ECDC4" : status === "penalty" ? "#FF6B6B" : "#888" }}>{status === "done" ? `✓ +${task.pts}` : status === "penalty" ? `✗ ${task.penalty}` : "—"}</span></div> : null; })}
          </div>
        )}
        <button onClick={onClose} style={{ ...btnStyle, background: "#333", width: "100%", marginTop: 16 }}>{lang === "tr" ? "Kapat" : "Schließen"}</button>
      </div>
    </div>
  );
}

function WeeklyChart({ familyId, childId, tasks, lang }) {
  const [weekData, setWeekData] = useState([]);
  useEffect(() => {
    const load = async () => {
      const data = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        const log = await store.getDayLog(familyId, childId, key);
        let earned = 0, lost = 0, done = 0, total = 0;
        for (const [tid, status] of Object.entries(log)) { const task = tasks.find(t => t.id === tid); if (!task) continue; total++; if (status === "done") { earned += task.pts; done++; } else if (status === "penalty") { lost += Math.abs(task.penalty || 0); } }
        const dn = lang === "tr" ? ["Pz", "Pt", "Sa", "Ça", "Pe", "Cu", "Ct"] : ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
        data.push({ day: dn[d.getDay()], earned, lost, done, total, date: key });
      }
      setWeekData(data);
    };
    if (familyId && childId) load();
  }, [familyId, childId, tasks, lang]);
  const maxVal = Math.max(...weekData.map(d => d.earned), 1);
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 {lang === "tr" ? "Haftalık Grafik" : "Wochengrafik"}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
        {weekData.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: "#4ECDC4", fontWeight: 700 }}>{d.earned > 0 ? d.earned : ""}</span>
            <div style={{ width: "100%", borderRadius: 4, background: "linear-gradient(to top, #4ECDC4, #45B7D1)", height: `${(d.earned / maxVal) * 80}px`, minHeight: d.earned > 0 ? 4 : 0, transition: "height 0.5s ease" }} />
            {d.lost > 0 && <div style={{ width: "100%", borderRadius: 4, background: "#FF6B6B", height: `${(d.lost / maxVal) * 80}px`, minHeight: 4 }} />}
            <span style={{ fontSize: 10, color: d.date === todayStr() ? "#4ECDC4" : "#888", fontWeight: d.date === todayStr() ? 800 : 400 }}>{d.day}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 10, justifyContent: "center", fontSize: 11, color: "#888" }}>
        <span>🟢 {lang === "tr" ? "Kazanılan" : "Verdient"}</span>
        <span>🔴 {lang === "tr" ? "Kaybedilen" : "Verloren"}</span>
      </div>
    </div>
  );
}

// ============ MAIN APP ============
export default function App() {
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [family, setFamily] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [rewards, setRewards] = useState(DEFAULT_REWARDS);
  const [todayLog, setTodayLog] = useState({});
  const [view, setView] = useState("home");
  const [showPin, setShowPin] = useState(false);
  const [wheelTier, setWheelTier] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [addingTask, setAddingTask] = useState(false);
  const [toast, setToast] = useState(null);
  const [streakAnim, setStreakAnim] = useState(null);
  const [lang, setLang] = useState("tr");
  const [setupStep, setSetupStep] = useState(null);
  const [setupPin, setSetupPin] = useState("");
  const [newChildName, setNewChildName] = useState("");
  const [newChildAvatar, setNewChildAvatar] = useState("🦁");
  const [childSession, setChildSession] = useState(() => { try { return JSON.parse(localStorage.getItem("sk_child")) || null; } catch { return null; } });
  const [loginScreen, setLoginScreen] = useState("main"); // main | join | newFamily
  const [childName, setChildName] = useState("");
  const [familyCode, setFamilyCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState("");

  const t = (tr, de) => lang === "tr" ? tr : de;
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  useEffect(() => { getRedirectResult(auth).catch(() => {}); }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u);
        if (u) {
          const ud = await store.getUser(u.uid);
          setUserDoc(ud);
          if (!ud) setSetupStep("role");
          else await loadFamilyData(ud.familyId);
        } else {
          const session = JSON.parse(localStorage.getItem("sk_child") || "null");
          if (session?.familyId) {
            setChildSession(session);
            await loadFamilyData(session.familyId, session.childId);
          }
        }
      } catch (e) {
        console.error("Auth yükleme hatası:", e);
      } finally {
        setAuthLoading(false);
      }
    });
  }, []);

  const loadFamilyData = async (familyId, childIdToSelect) => {
    if (!familyId) return;
    let fam = await store.getFamily(familyId);
    if (fam && !fam.familyCode) {
      try {
        const code = await store.ensureFamilyCode(familyId);
        fam = { ...fam, familyCode: code };
      } catch (e) { console.warn("familyCode üretilemedi:", e); }
    }
    setFamily(fam);
    if (fam) {
      setLang(fam.lang || "tr");
      store.onChildrenSnapshot(familyId, (kids) => {
        setChildren(kids);
        if (childIdToSelect) {
          const child = kids.find(k => k.id === childIdToSelect);
          setSelectedChild(child || kids[0] || null);
        } else if (kids.length > 0 && !selectedChild) {
          setSelectedChild(kids[0]);
        }
      });
      store.onFamilySnapshot(familyId, (f) => { if (f) setFamily(f); });
      store.onTasksSnapshot(familyId, async (t) => {
        if (t?.length > 0) {
          // Varsayılan görevlerdeki değişiklikleri otomatik uygula
          const custom = t.filter(x => !DEFAULT_TASKS.find(d => d.id === x.id));
          const merged = [...DEFAULT_TASKS, ...custom];
          const changed = JSON.stringify(merged) !== JSON.stringify(t);
          if (changed) await store.setTasks(familyId, merged);
          setTasks(merged);
        } else {
          setTasks(DEFAULT_TASKS);
        }
      });
      store.onRewardsSnapshot(familyId, (r) => { if (r && Object.keys(r).length > 0) setRewards(r); });
    }
  };

  useEffect(() => {
    if (!family || !selectedChild) return;
    return store.onDayLogSnapshot(family.id, selectedChild.id, todayStr(), setTodayLog);
  }, [family, selectedChild]);

  // Puan erimesi: son çark çevirme 5 günden eskiyse %15 erit
  useEffect(() => {
    if (!family || !selectedChild) return;
    const balance = selectedChild.balance || 0;
    if (balance < 10) return; // Çok az puan varsa uğraşma
    const lastSpin = selectedChild.lastSpinDate;
    if (!lastSpin) return;
    const daysSince = Math.floor((new Date(todayStr()) - new Date(lastSpin)) / 86400000);
    const lastDecay = selectedChild.lastDecayDate;
    if (daysSince >= 5 && lastDecay !== todayStr()) {
      const loss = Math.floor(balance * 0.15);
      if (loss < 1) return;
      const nb = balance - loss;
      store.updateChild(family.id, selectedChild.id, { balance: nb, lastDecayDate: todayStr() });
      setSelectedChild(prev => ({ ...prev, balance: nb, lastDecayDate: todayStr() }));
      setTimeout(() => showToast(`⚠️ ${loss} ${lang === "tr" ? "puan eridi! Çarkı çevir!" : "Punkte verfallen! Rad drehen!"}`), 1000);
    }
  }, [selectedChild?.id, family?.id]);

  const signInWithGoogle = async () => { try { await signInWithPopup(auth, googleProvider); } catch (e) { if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') { try { await signInWithRedirect(auth, googleProvider); } catch (e2) { showToast("Hata: " + e2.message); } } else { showToast("Hata: " + e.message); } } };

  const loginWithCode = async () => {
    if (!childName.trim()) { setCodeError(t("Adını gir", "Name eingeben")); return; }
    if (familyCode.trim().length < 4) { setCodeError(t("Geçersiz kod", "Ungültiger Code")); return; }
    setCodeLoading(true); setCodeError("");
    try {
      const fam = await store.getFamilyByCode(familyCode.trim().toUpperCase());
      if (!fam) { setCodeError(t("Kod bulunamadı", "Code nicht gefunden")); setCodeLoading(false); return; }
      const kids = await store.getChildren(fam.id);
      let child = kids.find(k => k.name.trim().toLowerCase() === childName.trim().toLowerCase());
      if (!child) {
        const av = AVATARS[Math.floor(Math.random() * AVATARS.length)];
        const cId = await store.addChild(fam.id, { name: childName.trim(), avatar: av });
        child = { id: cId, name: childName.trim(), avatar: av };
      }
      const session = { familyId: fam.id, childId: child.id };
      localStorage.setItem("sk_child", JSON.stringify(session));
      setChildSession(session);
      await loadFamilyData(fam.id, child.id);
      setLoginScreen("main");
    } catch (e) {
      setCodeError("Hata: " + (e.code || e.message));
    }
    setCodeLoading(false);
  };

  const createNewFamily = async () => {
    if (!childName.trim()) { setCodeError(t("Adını gir", "Name eingeben")); return; }
    if (setupPin.length !== 4) { setCodeError(t("4 haneli PIN gir", "4-stellige PIN eingeben")); return; }
    setCodeLoading(true); setCodeError("");
    try {
      const { user: anonUser } = await signInAnonymously(auth);
      const fId = await store.createFamily(anonUser.uid, childName.trim(), "", setupPin);
      await store.setTasks(fId, DEFAULT_TASKS);
      await store.setRewards(fId, DEFAULT_REWARDS);
      setUser(anonUser);
      const ud = await store.getUser(anonUser.uid);
      setUserDoc(ud);
      await loadFamilyData(fId);
      setSetupStep("child");
      setLoginScreen("main");
    } catch (e) {
      setCodeError("Hata: " + (e.code || e.message));
    }
    setCodeLoading(false);
  };

  const childLogout = () => {
    localStorage.removeItem("sk_child");
    setChildSession(null);
    setFamily(null);
    setChildren([]);
    setSelectedChild(null);
    setView("home");
  };

  const completeParentSetup = async () => {
    if (setupPin.length !== 4) return;
    const fId = await store.createFamily(user.uid, user.displayName, user.email, setupPin);
    await store.setTasks(fId, DEFAULT_TASKS);
    await store.setRewards(fId, DEFAULT_REWARDS);
    setSetupStep("child");
    const ud = await store.getUser(user.uid);
    setUserDoc(ud);
    await loadFamilyData(fId);
  };

  const addChildFromSetup = async () => {
    if (!newChildName.trim()) return;
    const fId = userDoc?.familyId || user.uid;
    const cId = await store.addChild(fId, { name: newChildName.trim(), avatar: newChildAvatar });
    setNewChildName("");
    showToast(`✅ ${newChildName} eklendi!`);
    const kids = await store.getChildren(fId);
    setChildren(kids);
    setSelectedChild(kids.find(k => k.id === cId) || kids[0]);
  };

  const markTask = async (taskId, status) => {
    if (!family || !selectedChild) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const old = todayLog[taskId];
    let delta = 0;
    if (old === "done") delta -= task.pts; else if (old === "penalty") delta -= (task.penalty || 0);
    if (status === "done") delta += task.pts; else if (status === "penalty") delta += (task.penalty || 0);
    const newLog = { ...todayLog, [taskId]: status };
    setTodayLog(newLog); // Optimistic — hızlı tıklamada stale state'i önler
    const nb = (selectedChild.balance || 0) + delta;
    const nt = (selectedChild.totalEarned || 0) + (delta > 0 ? delta : 0);
    setSelectedChild(prev => ({ ...prev, balance: nb, totalEarned: nt }));
    await store.saveDayLog(family.id, selectedChild.id, todayStr(), newLog);
    await store.updateChild(family.id, selectedChild.id, { balance: nb, totalEarned: nt });
  };

  const handleWheelResult = async (reward, tier) => {
    if (!family || !selectedChild) return;
    const nb = (selectedChild.balance || 0) - tier.threshold;
    await store.updateChild(family.id, selectedChild.id, { balance: nb, lastSpinDate: todayStr() });
    await store.addWheelSpin(family.id, selectedChild.id, { tier: tier.key, reward: reward.name, date: todayStr() });
    setSelectedChild(prev => ({ ...prev, balance: nb, lastSpinDate: todayStr() }));
    showToast(`🎉 ${reward.name[lang]}`);
  };

  const approveDay = async (date) => {
    if (!family || !selectedChild) return;
    // Boş bırakılan cezalı görevlere otomatik ceza uygula
    let penaltyTotal = 0;
    const updatedLog = { ...todayLog };
    for (const task of relevantTasks) {
      if (task.penalty < 0 && !todayLog[task.id]) {
        updatedLog[task.id] = "penalty";
        penaltyTotal += task.penalty;
      }
    }
    if (penaltyTotal < 0) {
      await store.saveDayLog(family.id, selectedChild.id, date, updatedLog);
      setTodayLog(updatedLog);
    }
    await store.setApproval(family.id, selectedChild.id, date, true);
    const streak = (selectedChild.streakCount || 0) + 1;
    let bonus = 0;
    for (const sb of STREAK_BONUSES) { if (streak === sb.days) { bonus = sb.bonus; setStreakAnim(sb); setTimeout(() => setStreakAnim(null), 3000); } }
    const newBalance = (selectedChild.balance || 0) + penaltyTotal + bonus;
    await store.updateChild(family.id, selectedChild.id, { streakCount: streak, lastStreakDate: date, balance: newBalance, totalEarned: (selectedChild.totalEarned || 0) + bonus });
    setSelectedChild(prev => ({ ...prev, streakCount: streak, balance: newBalance, totalEarned: (prev.totalEarned || 0) + bonus }));
    const msg = penaltyTotal < 0
      ? t(`✅ Onaylandı! ${penaltyTotal} ceza uygulandı.`, `✅ Genehmigt! ${penaltyTotal} Strafe angewendet.`)
      : t("✅ Gün onaylandı!", "✅ Tag genehmigt!");
    showToast(msg);
  };

  const saveTask = async (task) => {
    if (!family) return;
    const nt = [...tasks]; const idx = nt.findIndex(t => t.id === task.id);
    if (idx >= 0) nt[idx] = task; else nt.push(task);
    setTasks(nt); await store.setTasks(family.id, nt);
    setEditingTask(null); setAddingTask(false);
    showToast(t("✅ Kaydedildi", "✅ Gespeichert"));
  };

  const deleteTask = async (id) => { if (!family) return; const nt = tasks.filter(t => t.id !== id); setTasks(nt); await store.setTasks(family.id, nt); };

  const level = getLevel(selectedChild?.totalEarned || 0);
  const nextLevel = getNextLevel(selectedChild?.totalEarned || 0);
  const levelProgress = nextLevel ? (((selectedChild?.totalEarned || 0) - level.min) / (nextLevel.min - level.min)) * 100 : 100;
  const balance = selectedChild?.balance || 0;
  const canSpin = (tier) => balance >= tier.threshold;
  const dow = new Date().getDay();
  const isWE = dow === 0 || dow === 6;
  const relevantTasks = tasks.filter(t => { if (!t.active) return false; if (t.freq === "daily") return true; if (t.freq === "weekly" && (isWE || dow === 5)) return true; if (t.freq === "once") return true; return false; });
  const tasksByCat = {};
  for (const task of relevantTasks) { if (!tasksByCat[task.cat]) tasksByCat[task.cat] = []; tasksByCat[task.cat].push(task); }
  const doneTasks = Object.values(todayLog).filter(s => s === "done").length;
  const totalTasks = relevantTasks.length;
  const dayPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // LOADING
  if (authLoading) return (<div style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center" }}><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" /><div style={{ textAlign: "center", color: "#4ECDC4", fontFamily: "'Nunito', sans-serif" }}><div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div><div style={{ fontSize: 20, fontWeight: 800 }}>StarKids</div></div></div>);

  const S = { fontFamily: "'Nunito', sans-serif" };
  const loginBg = { minHeight: "100vh", background: "linear-gradient(180deg, #0a0a1a, #16213e, #0a0a1a)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 28, ...S };
  const fontLink = <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />;

  // AD + KOD ile giriş
  if (!user && loginScreen === "join") return (
    <div style={loginBg}>
      {fontLink}
      <div style={{ fontSize: 48 }}>⭐</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#e0e0e0" }}>{t("Giriş Yap", "Anmelden")}</div>
      <div style={{ width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: 10 }}>
        <input value={childName} onChange={e => setChildName(e.target.value)} placeholder={t("Adın", "Dein Name")} style={inputStyle} />
        <input value={familyCode} onChange={e => setFamilyCode(e.target.value.toUpperCase())} placeholder={t("Aile kodu (örn. A1234)", "Familiencode (z.B. A1234)")} maxLength={5} style={{ ...inputStyle, letterSpacing: 4, fontWeight: 800 }} />
        {codeError && <div style={{ color: "#FF6B6B", fontSize: 13, textAlign: "center" }}>{codeError}</div>}
        <button onClick={loginWithCode} disabled={codeLoading} style={{ ...btnStyle, background: "#4ECDC4", fontSize: 16, padding: "14px" }}>{codeLoading ? "..." : t("Başla →", "Los →")}</button>
      </div>
      <button onClick={() => { setLoginScreen("main"); setCodeError(""); }} style={{ background: "none", border: "none", color: "#888", fontSize: 13, cursor: "pointer" }}>← {t("Geri", "Zurück")}</button>
    </div>
  );

  // YENİ AİLE KUR
  if (!user && loginScreen === "newFamily") return (
    <div style={loginBg}>
      {fontLink}
      <div style={{ fontSize: 48 }}>👨‍👩‍👦</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#e0e0e0" }}>{t("Yeni Aile Kur", "Neue Familie erstellen")}</div>
      <div style={{ width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: 10 }}>
        <input value={childName} onChange={e => setChildName(e.target.value)} placeholder={t("Adın (ebeveyn)", "Dein Name (Elternteil)")} style={inputStyle} />
        <input type="password" maxLength={4} value={setupPin} onChange={e => setSetupPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder={t("4 haneli PIN", "4-stellige PIN")} style={{ ...inputStyle, letterSpacing: 8, fontSize: 24, textAlign: "center" }} />
        {codeError && <div style={{ color: "#FF6B6B", fontSize: 13, textAlign: "center" }}>{codeError}</div>}
        <button onClick={createNewFamily} disabled={codeLoading} style={{ ...btnStyle, background: "#4ECDC4", fontSize: 16, padding: "14px" }}>{codeLoading ? "..." : t("Oluştur →", "Erstellen →")}</button>
      </div>
      <button onClick={() => { setLoginScreen("main"); setCodeError(""); }} style={{ background: "none", border: "none", color: "#888", fontSize: 13, cursor: "pointer" }}>← {t("Geri", "Zurück")}</button>
    </div>
  );

  // ANA GİRİŞ EKRANI
  if (!user) return (
    <div style={loginBg}>
      {fontLink}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 80, marginBottom: 8 }}>⭐</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: "#FFD700", letterSpacing: 2 }}>StarKids</div>
        <div style={{ fontSize: 13, color: "#888", marginTop: 6 }}>{t("Görev & Ödül Sistemi", "Aufgaben & Belohnungssystem")}</div>
      </div>
      <div style={{ width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        <button onClick={() => { setChildName(""); setFamilyCode(""); setCodeError(""); setLoginScreen("join"); }} style={{ ...btnStyle, background: "linear-gradient(135deg, #4ECDC4, #45B7D1)", padding: "16px", fontSize: 17, borderRadius: 14 }}>
          🔑 {t("Ad + Kod ile Giriş", "Mit Name + Code anmelden")}
        </button>
        <button onClick={() => { setChildName(""); setSetupPin(""); setCodeError(""); setLoginScreen("newFamily"); }} style={{ ...btnStyle, background: "#1a2a3a", border: "2px solid #4ECDC4", color: "#4ECDC4", padding: "14px", fontSize: 15, borderRadius: 14 }}>
          👨‍👩‍👦 {t("Yeni Aile Kur", "Neue Familie erstellen")}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 1, background: "#333" }} />
          <span style={{ color: "#444", fontSize: 11 }}>Google</span>
          <div style={{ flex: 1, height: 1, background: "#333" }} />
        </div>
        <button onClick={signInWithGoogle} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", background: "#fff", color: "#333", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer", ...S, justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Google {t("ile Giriş", "Anmelden")}
        </button>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button onClick={() => setLang("tr")} style={{ ...btnStyle, background: lang === "tr" ? "#4ECDC4" : "#333", padding: "6px 14px", fontSize: 12 }}>🇹🇷 TR</button>
        <button onClick={() => setLang("de")} style={{ ...btnStyle, background: lang === "de" ? "#4ECDC4" : "#333", padding: "6px 14px", fontSize: 12 }}>🇩🇪 DE</button>
      </div>
    </div>
  );

  // SETUP ROLE
  if (setupStep === "role") return (
    <div style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, padding: 20 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ fontSize: 48 }}>⭐</div><div style={{ fontSize: 22, fontWeight: 800, color: "#FFD700", fontFamily: "'Nunito', sans-serif" }}>{t("Hoş geldin!", "Willkommen!")}</div>
      <div style={{ fontSize: 14, color: "#888", fontFamily: "'Nunito', sans-serif" }}>{user.displayName}</div>
      <button onClick={() => setSetupStep("pin")} style={{ ...btnStyle, background: "linear-gradient(135deg, #4ECDC4, #45B7D1)", padding: "20px 30px", fontSize: 18, borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 20 }}><span style={{ fontSize: 36 }}>👨‍👩‍👦</span>{t("Ebeveyn olarak başla", "Als Elternteil starten")}</button>
    </div>
  );

  // SETUP PIN
  if (setupStep === "pin") return (
    <div style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, padding: 20 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ fontSize: 36 }}>🔒</div><div style={{ fontSize: 18, fontWeight: 800, color: "#e0e0e0", fontFamily: "'Nunito', sans-serif" }}>{t("Ebeveyn PIN Belirle", "Eltern-PIN festlegen")}</div>
      <input type="password" maxLength={4} value={setupPin} onChange={e => setSetupPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="• • • •" style={{ ...inputStyle, width: 200, textAlign: "center", fontSize: 32, letterSpacing: 16, background: "#111" }} />
      <button onClick={completeParentSetup} disabled={setupPin.length !== 4} style={{ ...btnStyle, background: setupPin.length === 4 ? "#4ECDC4" : "#333", padding: "14px 40px", fontSize: 16 }}>{t("Devam →", "Weiter →")}</button>
    </div>
  );

  // SETUP CHILD
  if (setupStep === "child") return (
    <div style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, padding: 20 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ fontSize: 36 }}>👶</div><div style={{ fontSize: 18, fontWeight: 800, color: "#e0e0e0", fontFamily: "'Nunito', sans-serif" }}>{t("Çocuk Ekle", "Kind hinzufügen")}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 300 }}>
        {AVATARS.map(a => <button key={a} onClick={() => setNewChildAvatar(a)} style={{ width: 50, height: 50, borderRadius: "50%", fontSize: 28, border: newChildAvatar === a ? "3px solid #4ECDC4" : "2px solid #333", background: newChildAvatar === a ? "#1a3a3a" : "#111", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{a}</button>)}
      </div>
      <input value={newChildName} onChange={e => setNewChildName(e.target.value)} placeholder={t("Çocuğun adı", "Name des Kindes")} style={{ ...inputStyle, width: 250, textAlign: "center" }} />
      <button onClick={addChildFromSetup} disabled={!newChildName.trim()} style={{ ...btnStyle, background: newChildName.trim() ? "#4ECDC4" : "#333", padding: "14px 40px", fontSize: 16 }}>{t("Ekle ✓", "Hinzufügen ✓")}</button>
      {children.length > 0 && <div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>{children.map(c => <span key={c.id} style={{ background: "#1a1a2e", padding: "6px 14px", borderRadius: 20, fontSize: 14 }}>{c.avatar} {c.name}</span>)}</div>
        <button onClick={() => { setSetupStep(null); setView("home"); }} style={{ ...btnStyle, background: "#4ECDC4", padding: "14px 40px", fontSize: 16, width: "100%" }}>{t("Başla! 🚀", "Los geht's! 🚀")}</button>
      </div>}
    </div>
  );

  if (!family || !selectedChild) return (<div style={{ minHeight: "100vh", background: "#0a0a1a", display: "flex", alignItems: "center", justifyContent: "center" }}><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" /><div style={{ color: "#888", fontFamily: "'Nunito', sans-serif" }}>⭐ Yükleniyor...</div></div>);

  // MAIN UI
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a0a1a 0%, #16213e 50%, #0a0a1a 100%)", color: "#e0e0e0", fontFamily: "'Nunito', sans-serif", paddingBottom: 90, maxWidth: 480, margin: "0 auto", position: "relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#1a1a2e", border: "2px solid #4ECDC4", color: "#fff", padding: "12px 24px", borderRadius: 50, fontSize: 16, fontWeight: 700, zIndex: 3000, animation: "slideDown 0.3s ease" }}>{toast}</div>}
      {streakAnim && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2500, flexDirection: "column" }}><div style={{ fontSize: 64, animation: "pulse 0.5s infinite" }}>🔥</div><div style={{ fontSize: 28, fontWeight: 900, color: "#FFD700", marginTop: 10 }}>{streakAnim.label[lang]}</div><div style={{ fontSize: 20, color: "#4ECDC4", marginTop: 8 }}>+{streakAnim.bonus} {t("puan", "Punkte")}!</div></div>}
      {showPin && <PinDialog lang={lang} correctPin={family.parentPin} onSuccess={() => { setShowPin(false); setView("parent"); }} onCancel={() => setShowPin(false)} />}
      {wheelTier && <RewardWheel tier={wheelTier.key} rewards={rewards} lang={lang} onResult={(r) => handleWheelResult(r, wheelTier)} onClose={() => setWheelTier(null)} />}
      {showCalendar && <Calendar lang={lang} familyId={family.id} childId={selectedChild.id} tasks={tasks} onClose={() => setShowCalendar(false)} />}

      {/* STICKY HEADER */}
      <div style={{ position: "sticky", top: 0, zIndex: 500, background: "linear-gradient(135deg, #0d0d1aee, #16213eee)", backdropFilter: "blur(10px)", borderBottom: "1px solid #222", padding: "10px 16px" }}>
        {children.length > 1 && <div style={{ display: "flex", gap: 6, marginBottom: 6, overflowX: "auto" }}>{children.map(c => <button key={c.id} onClick={() => setSelectedChild(c)} style={{ padding: "3px 10px", borderRadius: 16, border: selectedChild.id === c.id ? "2px solid #4ECDC4" : "1px solid #333", background: selectedChild.id === c.id ? "#1a3a3a" : "transparent", color: "#e0e0e0", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Nunito', sans-serif" }}>{c.avatar} {c.name}</button>)}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 28 }}>{selectedChild.avatar}</div>
            <div><div style={{ fontSize: 16, fontWeight: 900 }}>{selectedChild.name}</div><div style={{ fontSize: 10, color: "#888" }}>{level.emoji} {level.name[lang]} • 🔥{selectedChild.streakCount || 0}</div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => { const nl = lang === "tr" ? "de" : "tr"; setLang(nl); if (family) store.updateFamily(family.id, { lang: nl }); }} style={{ background: "none", border: "1px solid #444", borderRadius: 8, padding: "2px 7px", color: "#888", fontSize: 10, cursor: "pointer" }}>{lang === "tr" ? "DE" : "TR"}</button>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: 26, fontWeight: 900, color: "#FFD700" }}>{balance}</div><div style={{ fontSize: 9, color: "#888" }}>{t("puan", "Punkte")}</div></div>
          </div>
        </div>
        <div style={{ marginTop: 6 }}><div style={{ height: 5, background: "#333", borderRadius: 3 }}><div style={{ height: "100%", width: `${Math.min(levelProgress, 100)}%`, background: `linear-gradient(90deg, ${level.color}, #FFD700)`, borderRadius: 3, transition: "width 0.5s" }} /></div></div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: "16px 16px 0" }}>
        {view === "home" && <>
          <div style={{ marginBottom: 16 }}><div style={{ fontSize: 13, fontWeight: 700, color: "#888", marginBottom: 8 }}>🎡 {t("Ödül Çarkı", "Belohnungsrad")}</div>
            <div style={{ display: "flex", gap: 8 }}>{WHEEL_TIERS.map(tier => <button key={tier.key} disabled={!canSpin(tier)} onClick={() => canSpin(tier) && setWheelTier(tier)} style={{ flex: 1, padding: "12px 8px", borderRadius: 14, border: canSpin(tier) ? `2px solid ${tier.color}` : "2px solid #333", background: canSpin(tier) ? "#1a2a3a" : "#111", color: canSpin(tier) ? tier.color : "#555", cursor: canSpin(tier) ? "pointer" : "default", fontSize: 12, fontWeight: 700, textAlign: "center", fontFamily: "'Nunito', sans-serif" }}><div>{tier.label[lang]}</div><div style={{ fontSize: 10, marginTop: 3, opacity: 0.7 }}>{tier.threshold} {t("puan", "Pkt")}</div></button>)}</div></div>
          <div style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><span style={{ fontSize: 14, fontWeight: 700 }}>📋 {t("Bugün", "Heute")}</span><button onClick={() => setShowCalendar(true)} style={{ ...btnStyle, background: "#333", padding: "6px 12px", fontSize: 12 }}>📅</button></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#aaa", marginBottom: 6 }}><span>{doneTasks}/{totalTasks}</span><span>%{dayPct}</span></div>
            <div style={{ height: 6, background: "#333", borderRadius: 3 }}><div style={{ height: "100%", width: `${dayPct}%`, background: dayPct === 100 ? "#4ECDC4" : "#45B7D1", borderRadius: 3, transition: "width 0.3s" }} /></div></div>
          <WeeklyChart familyId={family.id} childId={selectedChild.id} tasks={tasks} lang={lang} />
          <button onClick={() => childSession ? childLogout() : signOut(auth)} style={{ ...btnStyle, background: "#1a1a1a", color: "#666", width: "100%", marginTop: 8, fontSize: 13, border: "1px solid #333" }}>🚪 {t("Çıkış Yap", "Abmelden")}</button>
        </>}

        {view === "daily" && <>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>📝 {t("Görevler", "Aufgaben")}</div>
          {Object.entries(tasksByCat).map(([cat, catTasks]) => <div key={cat} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#888", marginBottom: 8 }}>{CATEGORIES[cat]?.icon} {CATEGORIES[cat]?.[lang]}</div>
            {catTasks.map(task => { const st = todayLog[task.id]; return (
              <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", marginBottom: 6, background: st === "done" ? "#0a2a1a" : st === "penalty" ? "#2a0a0a" : "#111", borderRadius: 12, border: `1px solid ${st === "done" ? "#2a5a3a" : st === "penalty" ? "#5a2a2a" : "#222"}` }}>
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, textDecoration: st === "done" ? "line-through" : "none", opacity: st === "done" ? 0.7 : 1 }}>{task.name[lang]}</div><div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>+{task.pts}{task.penalty ? ` / ${task.penalty}` : ""}</div></div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => markTask(task.id, st === "done" ? "skip" : "done")} style={{ width: 38, height: 38, borderRadius: "50%", border: st === "done" ? "2px solid #4ECDC4" : "2px solid #444", background: st === "done" ? "#4ECDC4" : "transparent", color: st === "done" ? "#000" : "#888", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✓</button>
                  {task.penalty < 0 && <button onClick={() => markTask(task.id, st === "penalty" ? "skip" : "penalty")} style={{ width: 38, height: 38, borderRadius: "50%", border: st === "penalty" ? "2px solid #FF6B6B" : "2px solid #444", background: st === "penalty" ? "#FF6B6B" : "transparent", color: st === "penalty" ? "#fff" : "#888", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✗</button>}
                </div>
              </div>); })}
          </div>)}
        </>}

        {view === "stats" && <>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>📊 {t("İstatistikler", "Statistiken")}</div>
          <div style={{ padding: 20, background: "linear-gradient(135deg, #1a1a2e, #2a1a3e)", borderRadius: 16, marginBottom: 16, textAlign: "center", border: "1px solid #333" }}>
            <div style={{ fontSize: 56 }}>{selectedChild.avatar}</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 8 }}>{selectedChild.name}</div>
            <div style={{ fontSize: 48 }}>{level.emoji}</div><div style={{ fontSize: 20, fontWeight: 800, color: level.color }}>{level.name[lang]}</div>
            <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>{t("Toplam", "Gesamt")}: {selectedChild.totalEarned || 0}</div>
            {nextLevel && <div style={{ fontSize: 12, color: "#4ECDC4", marginTop: 6 }}>{nextLevel.name[lang]} → {nextLevel.min - (selectedChild.totalEarned || 0)} {t("puan daha", "mehr")}</div>}
          </div>
          <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 16 }}><div style={{ fontSize: 36 }}>🔥</div><div><div style={{ fontSize: 22, fontWeight: 900 }}>{selectedChild.streakCount || 0} {t("gün", "Tage")}</div><div style={{ fontSize: 12, color: "#888" }}>{t("Aktif seri", "Aktive Serie")}</div></div></div>
          <WeeklyChart familyId={family.id} childId={selectedChild.id} tasks={tasks} lang={lang} />
        </>}

        {view === "parent" && <>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>⚙️ {t("Ebeveyn Paneli", "Eltern-Panel")}</div>
          <div style={{ ...cardStyle, border: "2px solid #FFA500" }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: "#FFA500" }}>⏳ {selectedChild.avatar} {selectedChild.name}</div>
            {Object.entries(todayLog).map(([tid, st]) => { const task = tasks.find(t => t.id === tid); if (!task) return null; return <div key={tid} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #333", fontSize: 13 }}><span>{task.name[lang]}</span><span style={{ color: st === "done" ? "#4ECDC4" : st === "penalty" ? "#FF6B6B" : "#888" }}>{st === "done" ? `✓ +${task.pts}` : st === "penalty" ? `✗ ${task.penalty}` : "—"}</span></div>; })}
            <button onClick={() => approveDay(todayStr())} style={{ ...btnStyle, background: "#4ECDC4", width: "100%", marginTop: 12 }}>✅ {t("Onayla", "Genehmigen")}</button>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>👶 {t("Çocuk Ekle", "Kind hinzufügen")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>{AVATARS.map(a => <button key={a} onClick={() => setNewChildAvatar(a)} style={{ width: 40, height: 40, borderRadius: "50%", fontSize: 22, border: newChildAvatar === a ? "2px solid #4ECDC4" : "1px solid #333", background: newChildAvatar === a ? "#1a3a3a" : "#111", cursor: "pointer" }}>{a}</button>)}</div>
            <div style={{ display: "flex", gap: 8 }}><input value={newChildName} onChange={e => setNewChildName(e.target.value)} placeholder={t("Çocuk adı", "Kindername")} style={{ ...inputStyle, flex: 1 }} /><button onClick={addChildFromSetup} disabled={!newChildName.trim()} style={{ ...btnStyle, background: newChildName.trim() ? "#4ECDC4" : "#333" }}>+</button></div>
            {children.length > 0 && <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>{children.map(c => <span key={c.id} style={{ background: "#1a1a2e", padding: "4px 12px", borderRadius: 16, fontSize: 13 }}>{c.avatar} {c.name} ({c.balance || 0}⭐)</span>)}</div>}
          </div>
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><span style={{ fontSize: 14, fontWeight: 700 }}>📋 {t("Görevler", "Aufgaben")}</span><button onClick={() => setAddingTask(true)} style={{ ...btnStyle, background: "#4ECDC4", padding: "6px 14px", fontSize: 12 }}>+</button></div>
            {addingTask && <TaskEditor lang={lang} onSave={saveTask} onCancel={() => setAddingTask(false)} />}
            {editingTask && <TaskEditor lang={lang} task={editingTask} onSave={saveTask} onCancel={() => setEditingTask(null)} />}
            {Object.entries(CATEGORIES).map(([cat, info]) => { const ct = tasks.filter(t => t.cat === cat); if (!ct.length) return null; return (
              <div key={cat} style={{ marginBottom: 10 }}><div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{info.icon} {info[lang]}</div>
                {ct.map(task => <div key={task.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", marginBottom: 3, background: "#0d0d1a", borderRadius: 8, fontSize: 12, opacity: task.active ? 1 : 0.4 }}>
                  <span>{task.name[lang]} <span style={{ color: "#4ECDC4" }}>+{task.pts}</span>{task.penalty < 0 && <span style={{ color: "#FF6B6B" }}> {task.penalty}</span>}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => { const nt = tasks.map(t => t.id === task.id ? { ...t, active: !t.active } : t); setTasks(nt); store.setTasks(family.id, nt); }} style={{ background: "none", border: "none", color: task.active ? "#4ECDC4" : "#666", cursor: "pointer", fontSize: 14 }}>{task.active ? "👁" : "👁‍🗨"}</button>
                    <button onClick={() => setEditingTask(task)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13 }}>✏️</button>
                    <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", color: "#FF6B6B", cursor: "pointer", fontSize: 13 }}>🗑️</button>
                  </div>
                </div>)}
              </div>); })}
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🎯 {t("Manuel Puan", "Manuelle Punkte")} — {selectedChild.avatar} {selectedChild.name}</div>
            <div style={{ display: "flex", gap: 6 }}>{[-50, -10, -5, 5, 10, 50].map(val => <button key={val} onClick={async () => { const nb = (selectedChild.balance || 0) + val; const nt = val > 0 ? (selectedChild.totalEarned || 0) + val : (selectedChild.totalEarned || 0); await store.updateChild(family.id, selectedChild.id, { balance: nb, totalEarned: nt }); setSelectedChild(prev => ({ ...prev, balance: nb, totalEarned: nt })); showToast(`${val > 0 ? "+" : ""}${val}`); }} style={{ ...btnStyle, flex: 1, padding: "10px 2px", fontSize: 12, background: val > 0 ? "#1a3a2a" : "#3a1a1a", color: val > 0 ? "#4ECDC4" : "#FF6B6B" }}>{val > 0 ? "+" : ""}{val}</button>)}</div>
          </div>
          <button onClick={() => signOut(auth)} style={{ ...btnStyle, background: "#3a1a1a", color: "#FF6B6B", width: "100%", marginBottom: 16 }}>🚪 {t("Çıkış Yap", "Abmelden")}</button>
          <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#888" }}>🏠 {t("Aile Kodu", "Familiencode")}</div>
            <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: 10, color: "#FFD700", textAlign: "center" }}>{family?.familyCode || "—"}</div>
            <div style={{ fontSize: 11, color: "#555", textAlign: "center", marginTop: 4, marginBottom: 10 }}>{t("Çocuklar bu kodla giriş yapar", "Kinder melden sich mit diesem Code an")}</div>
            <button onClick={async () => {
              const code = await store.ensureFamilyCode(family.id, true);
              setFamily(f => ({ ...f, familyCode: code }));
              showToast(t("✅ Yeni kod: " + code, "✅ Neuer Code: " + code));
            }} style={{ ...btnStyle, background: "#1a1a2e", color: "#888", border: "1px solid #444", width: "100%", fontSize: 12 }}>🔄 {t("Yeni Kod Oluştur", "Neuen Code erstellen")}</button>
          </div>
        </>}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#0d0d1a", borderTop: "1px solid #333", display: "flex", padding: "8px 0 max(8px, env(safe-area-inset-bottom))", zIndex: 1000 }}>
        {[{ id: "home", icon: "🏠", l: { tr: "Ana Sayfa", de: "Start" } }, { id: "daily", icon: "📝", l: { tr: "Görevler", de: "Aufgaben" } }, { id: "stats", icon: "📊", l: { tr: "İstatistik", de: "Statistik" } }, ...(childSession ? [] : [{ id: "parent", icon: "⚙️", l: { tr: "Ebeveyn", de: "Eltern" } }])].map(tab =>
          <button key={tab.id} onClick={() => { if (tab.id === "parent" && view !== "parent") setShowPin(true); else setView(tab.id); }} style={{ flex: 1, background: "none", border: "none", color: view === tab.id ? "#4ECDC4" : "#666", fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 0", fontFamily: "'Nunito', sans-serif" }}><span style={{ fontSize: 22 }}>{tab.icon}</span><span>{tab.l[lang]}</span></button>
        )}
      </div>

      <style>{`
        @keyframes slideDown { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
        * { -webkit-tap-highlight-color: transparent; user-select: none; }
        body { margin: 0; background: #0a0a1a; }
        ::-webkit-scrollbar { width: 0; }
      `}</style>
    </div>
  );
}
