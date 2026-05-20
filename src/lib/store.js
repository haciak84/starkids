import {
  doc, setDoc, getDoc, updateDoc, collection,
  query, where, getDocs, onSnapshot, deleteDoc,
  arrayUnion, serverTimestamp, writeBatch
} from "firebase/firestore";
import { db } from "./firebase";

// ============ FAMILY ============
const genFamilyCode = () => {
  const letter = "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 23)];
  const digits = String(Math.floor(Math.random() * 9000) + 1000);
  return letter + digits;
};

export async function createFamily(userId, displayName, email, pin) {
  const code = genFamilyCode();
  const familyRef = doc(db, "families", userId);
  await setDoc(familyRef, {
    ownerId: userId,
    ownerName: displayName,
    ownerEmail: email,
    parentPin: pin,
    lang: "tr",
    familyCode: code,
    createdAt: serverTimestamp(),
    parents: [userId],
  });
  await setDoc(doc(db, "familyCodes", code), { familyId: userId });
  await setDoc(doc(db, "users", userId), {
    uid: userId,
    email,
    displayName,
    role: "parent",
    familyId: userId,
    createdAt: serverTimestamp(),
  });
  return userId;
}

export async function getFamilyByCode(code) {
  const snap = await getDoc(doc(db, "familyCodes", code.toUpperCase().trim()));
  if (!snap.exists()) return null;
  return getFamily(snap.data().familyId);
}

export async function ensureFamilyCode(familyId, force = false) {
  const fam = await getFamily(familyId);
  if (fam?.familyCode && !force) return fam.familyCode;
  const code = genFamilyCode();
  await updateDoc(doc(db, "families", familyId), { familyCode: code });
  await setDoc(doc(db, "familyCodes", code), { familyId });
  return code;
}

export async function getFamily(familyId) {
  const snap = await getDoc(doc(db, "families", familyId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateFamily(familyId, data) {
  await updateDoc(doc(db, "families", familyId), data);
}

export function onFamilySnapshot(familyId, callback) {
  return onSnapshot(doc(db, "families", familyId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

// ============ USER ============
export async function getUser(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function setUser(uid, data) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}

// ============ CHILDREN ============
export async function addChild(familyId, childData) {
  const childId = "child_" + Date.now();
  const ref = doc(db, "families", familyId, "children", childId);
  await setDoc(ref, {
    ...childData,
    id: childId,
    balance: 0,
    totalEarned: 0,
    streakCount: 0,
    lastStreakDate: null,
    createdAt: serverTimestamp(),
  });
  return childId;
}

export async function getChildren(familyId) {
  const snap = await getDocs(collection(db, "families", familyId, "children"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function onChildrenSnapshot(familyId, callback) {
  return onSnapshot(collection(db, "families", familyId, "children"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function updateChild(familyId, childId, data) {
  await updateDoc(doc(db, "families", familyId, "children", childId), data);
}

export async function deleteChild(familyId, childId) {
  await deleteDoc(doc(db, "families", familyId, "children", childId));
}

// ============ TASKS ============
export async function setTasks(familyId, tasks) {
  await setDoc(doc(db, "families", familyId, "config", "tasks"), { list: tasks });
}

export async function getTasks(familyId) {
  const snap = await getDoc(doc(db, "families", familyId, "config", "tasks"));
  return snap.exists() ? snap.data().list : null;
}

export function onTasksSnapshot(familyId, callback) {
  return onSnapshot(doc(db, "families", familyId, "config", "tasks"), (snap) => {
    callback(snap.exists() ? snap.data().list : []);
  });
}

// ============ REWARDS ============
export async function setRewards(familyId, rewards) {
  await setDoc(doc(db, "families", familyId, "config", "rewards"), { data: rewards });
}

export async function getRewards(familyId) {
  const snap = await getDoc(doc(db, "families", familyId, "config", "rewards"));
  return snap.exists() ? snap.data().data : null;
}

export function onRewardsSnapshot(familyId, callback) {
  return onSnapshot(doc(db, "families", familyId, "config", "rewards"), (snap) => {
    callback(snap.exists() ? snap.data().data : {});
  });
}

// ============ DAILY LOGS ============
export async function saveDayLog(familyId, childId, date, log) {
  const ref = doc(db, "families", familyId, "children", childId, "logs", date);
  await setDoc(ref, { log, date, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getDayLog(familyId, childId, date) {
  const snap = await getDoc(doc(db, "families", familyId, "children", childId, "logs", date));
  return snap.exists() ? snap.data().log : {};
}

export function onDayLogSnapshot(familyId, childId, date, callback) {
  return onSnapshot(
    doc(db, "families", familyId, "children", childId, "logs", date),
    (snap) => callback(snap.exists() ? snap.data().log : {})
  );
}

export async function getLogsRange(familyId, childId, startDate, endDate) {
  // Get all logs in date range
  const logsRef = collection(db, "families", familyId, "children", childId, "logs");
  const snap = await getDocs(logsRef);
  const logs = {};
  snap.docs.forEach(d => {
    if (d.id >= startDate && d.id <= endDate) {
      logs[d.id] = d.data().log;
    }
  });
  return logs;
}

// ============ WHEEL HISTORY ============
export async function addWheelSpin(familyId, childId, spinData) {
  const ref = doc(db, "families", familyId, "children", childId, "wheelHistory", "spins_" + Date.now());
  await setDoc(ref, { ...spinData, timestamp: serverTimestamp() });
}

export async function getWheelHistory(familyId, childId) {
  const snap = await getDocs(collection(db, "families", familyId, "children", childId, "wheelHistory"));
  return snap.docs.map(d => d.data()).sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
}

// ============ SESSIONS (multi-device control) ============
export async function setSession(familyId, childId, deviceId) {
  await setDoc(doc(db, "families", familyId, "children", childId, "session", "active"), {
    deviceId,
    timestamp: serverTimestamp()
  });
}

export function onSessionSnapshot(familyId, childId, callback) {
  return onSnapshot(
    doc(db, "families", familyId, "children", childId, "session", "active"),
    (snap) => callback(snap.exists() ? snap.data() : null)
  );
}

// ============ APPROVAL ============
export async function setApproval(familyId, childId, date, approved) {
  const ref = doc(db, "families", familyId, "children", childId, "logs", date);
  await setDoc(ref, { approved, approvedAt: serverTimestamp() }, { merge: true });
}

export async function getApprovalStatus(familyId, childId, date) {
  const snap = await getDoc(doc(db, "families", familyId, "children", childId, "logs", date));
  return snap.exists() ? snap.data().approved : undefined;
}
