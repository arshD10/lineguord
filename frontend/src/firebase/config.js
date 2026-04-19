import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── YOUR FIREBASE KEYS (already filled in) ──────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyATghYQPxWopQmMHlBNmms_BP2GGk66AMM",
  authDomain:        "lineguard-d9869.firebaseapp.com",
  projectId:         "lineguard-d9869",
  storageBucket:     "lineguard-d9869.firebasestorage.app",
  messagingSenderId: "935918309466",
  appId:             "1:935918309466:web:a65185e3484f7d0ac3c863"
};

const app = initializeApp(firebaseConfig);

export const db      = getFirestore(app);
export const storage = getStorage(app);
export const auth    = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export default app;
