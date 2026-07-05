import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBzor34l4cBVg7tYFZy6Z4s6tyKZgZrly8",
  authDomain: "gaming-console-97808.firebaseapp.com",
  projectId: "gaming-console-97808",
  storageBucket: "gaming-console-97808.firebasestorage.app",
  messagingSenderId: "726026179236",
  appId: "1:726026179236:web:b55c302463dcc0ad5d0c31"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);