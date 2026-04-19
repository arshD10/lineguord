import {
  collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, updateDoc, doc, increment, getDoc,
  where, getDocs, setDoc, deleteDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./config";

// ── SUBMIT REPORT ────────────────────────────────────────────
// Anonymous — only stores location name, no user identity
export async function submitReport({ locationName, locationAddress, lat, lng, mediaUri, mediaType, userId }) {
  let mediaURL = null;
  if (mediaUri) {
    const res  = await fetch(mediaUri);
    const blob = await res.blob();
    const ext  = mediaType === "video" ? "mp4" : "jpg";
    const r    = ref(storage, `evidence/${Date.now()}.${ext}`);
    await uploadBytes(r, blob);
    mediaURL = await getDownloadURL(r);
  }
  return addDoc(collection(db, "reports"), {
    locationName,
    locationAddress,
    lat:        lat || null,
    lng:        lng || null,
    mediaURL,
    mediaType:  mediaType || "none",
    hasMedia:   !!mediaUri,
    status:     "pending",       // pending → guilty / dismissed
    reportedBy: userId || "anon",
    createdAt:  serverTimestamp(),
    votes:      { yes: 0, no: 0 },
    confirmCount: 0,
    appealCount:  0,
  });
}

// Confirm a report (other users)
export async function confirmReport(reportId, userId) {
  await updateDoc(doc(db, "reports", reportId), {
    confirmCount: increment(1),
    [`confirmedBy.${userId}`]: true,
  });
}

// ── STAFF ACTIONS ────────────────────────────────────────────
export async function markGuilty(reportId) {
  await updateDoc(doc(db, "reports", reportId), { status: "guilty" });
  const snap = await getDoc(doc(db, "reports", reportId));
  if (snap.exists()) {
    await addDoc(collection(db, "shameboard"), {
      ...snap.data(),
      reportId,
      postedAt:   serverTimestamp(),
      permanent:  true,
      appealCount: 0,
      appealsBy:  {},
    });
  }
}

export async function dismissReport(reportId) {
  await updateDoc(doc(db, "reports", reportId), { status: "dismissed" });
}

// ── REPORTS LISTENERS ────────────────────────────────────────
export function listenToReports(cb) {
  const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export function listenToPendingReports(cb) {
  const q = query(collection(db, "reports"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

// ── SHAME BOARD ───────────────────────────────────────────────
export function listenToShameBoard(cb) {
  const q = query(collection(db, "shameboard"), orderBy("postedAt", "desc"));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function castVote(shameId, verdict, userId) {
  const field = verdict === "yes" ? "votes.yes" : "votes.no";
  await updateDoc(doc(db, "shameboard", shameId), {
    [field]: increment(1),
    [`votedBy.${userId}`]: verdict,
  });
}

// Appeal — user requests removal
export async function fileAppeal(shameId, userId, reason) {
  await updateDoc(doc(db, "shameboard", shameId), {
    appealCount: increment(1),
    [`appealsBy.${userId}`]: { reason, createdAt: new Date().toISOString() },
  });
  // Also create appeal record for staff review
  await addDoc(collection(db, "appeals"), {
    shameId,
    userId,
    reason,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

// Staff resolves appeal — removes from shame board
export async function resolveAppeal(appealId, shameId, action) {
  await updateDoc(doc(db, "appeals", appealId), { status: action });
  if (action === "approved") {
    await deleteDoc(doc(db, "shameboard", shameId));
  }
}

export function listenToAppeals(cb) {
  const q = query(collection(db, "appeals"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

// ── COMMUNITY ─────────────────────────────────────────────────
export async function postToCommunity({ text, displayName, topic }) {
  return addDoc(collection(db, "community"), {
    text,
    displayName: displayName || "Anonymous",
    topic:       topic || "General",
    createdAt:   serverTimestamp(),
    likes:       0,
    likedBy:     {},
  });
}

export function listenToCommunity(cb) {
  const q = query(collection(db, "community"), orderBy("createdAt", "desc"));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function likePost(postId, userId) {
  await updateDoc(doc(db, "community", postId), {
    likes: increment(1),
    [`likedBy.${userId}`]: true,
  });
}

// ── USER PROFILE ──────────────────────────────────────────────
export async function createOrUpdateUser(uid, data) {
  await setDoc(doc(db, "users", uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Staff check
export async function isStaff(uid) {
  const snap = await getDoc(doc(db, "staff", uid));
  return snap.exists();
}
