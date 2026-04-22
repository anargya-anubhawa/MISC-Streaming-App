import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA136X6efSRy_T67TV1e4QUxLBhWVmKVAE",
  authDomain: "misc-streaming-app.firebaseapp.com",
  projectId: "misc-streaming-app",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export { app };
export const db = getFirestore(app);