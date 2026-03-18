import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCITncTQyPQQz9CgqhJgQkb6opd3tnTYtE",
  authDomain: "capfinder-4d7a5.firebaseapp.com",
  projectId: "capfinder-4d7a5",
  storageBucket: "capfinder-4d7a5.firebasestorage.app",
  messagingSenderId: "385388070031",
  appId: "1:385388070031:web:cfb6f7cc341c99f510dcfa",
  measurementId: "G-P29CHLCJ1N"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
