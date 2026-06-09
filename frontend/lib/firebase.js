import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA_WapvuwaJvdD4_twqLmK8YsLIQn1i2Dw",
  authDomain: "teckpack-ai.firebaseapp.com",
  projectId: "teckpack-ai",
  storageBucket: "teckpack-ai.appspot.com",
  messagingSenderId: "780171617053",
  appId: "1:780171617053:web:5afff63a6453624778f7f4",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// IMPORTANT: your database name is "default"
export const db = getFirestore(app, "default");
export const storage = getStorage(app);