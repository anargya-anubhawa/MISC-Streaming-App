import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Konfigurasi client Firebase untuk autentikasi dan Firestore.
const firebaseConfig = {
  apiKey: "AIzaSyA136X6efSRy_T67TV1e4QUxLBhWVmKVAE",
  authDomain: "misc-streaming-app.firebaseapp.com",
  projectId: "misc-streaming-app",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
