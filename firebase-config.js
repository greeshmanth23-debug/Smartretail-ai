const firebaseConfig = {
  apiKey: "AIzaSyAEvlklrNSTy_fJum3WKhtxJ3W0l4YMF-U",
  authDomain: "smartretail-ai-app.firebaseapp.com",
  projectId: "smartretail-ai-app",
  storageBucket: "smartretail-ai-app.firebasestorage.app",
  messagingSenderId: "819408877313",
  appId: "1:819408877313:web:db254ca2af3ddc20e7cd00",
  measurementId: "G-3GM0DRBEG0"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, increment, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db, collection, addDoc, getDocs, doc, updateDoc, increment, setDoc, getDoc };
