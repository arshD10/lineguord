import React, { createContext, useContext, useEffect, useState } from "react";
import {
  GoogleAuthProvider, signInWithCredential,
  signInAnonymously, onAuthStateChanged, signOut
} from "firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { auth } from "../firebase/config";
import { createOrUpdateUser, isStaff } from "../firebase/helpers";

// ── IMPORTANT: Replace with your Web Client ID from Google Cloud Console
// Go to: console.cloud.google.com → your project → APIs → Credentials → Web Client ID
const GOOGLE_WEB_CLIENT_ID = "935918309466-REPLACE_WITH_YOUR_WEB_CLIENT_ID.apps.googleusercontent.com";

GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [staff, setStaff]     = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const staffCheck = await isStaff(u.uid);
        setStaff(staffCheck);
        if (!u.isAnonymous) {
          await createOrUpdateUser(u.uid, {
            email:       u.email,
            displayName: u.displayName || "Anonymous",
            photoURL:    u.photoURL,
            isAnonymous: false,
          });
        }
      } else {
        setUser(null);
        setStaff(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function signInWithGoogle() {
    try {
      await GoogleSignin.hasPlayServices();
      const { idToken } = await GoogleSignin.signIn();
      const credential  = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    } catch (e) {
      console.error("Google sign in error:", e);
      throw e;
    }
  }

  async function signInAnon() {
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.error("Anonymous sign in error:", e);
      throw e;
    }
  }

  async function logout() {
    try {
      await GoogleSignin.signOut();
    } catch {}
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, staff, loading, signInWithGoogle, signInAnon, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
