import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB-X22BLQ2ePpg3Z7i13xf1g1ZV7B1fWbQ",
  authDomain: "starkids-points.firebaseapp.com",
  projectId: "starkids-points",
  storageBucket: "starkids-points.firebasestorage.app",
  messagingSenderId: "132631515693",
  appId: "1:132631515693:web:ef297ec063dbae10af5ea4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
