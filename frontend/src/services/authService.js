import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const isConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId
);

const app = isConfigured ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const provider = auth ? new GoogleAuthProvider() : null;

export const authService = {
  isConfigured,
  auth,
  onAuthStateChanged: (callback) => {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, callback);
  },
  loginWithGoogle: async () => {
    if (!auth || !provider) throw new Error("Firebase is not configured");
    const result = await signInWithPopup(auth, provider);
    const token = await result.user.getIdToken();
    window.localStorage.setItem("smartchefai_token", token);
    return result.user;
  },
  logout: async () => {
    window.localStorage.removeItem("smartchefai_token");
    if (auth) await signOut(auth);
  },
};
