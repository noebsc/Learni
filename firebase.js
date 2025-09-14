import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";
// Import Gemini AI and AI Monitoring as needed in app.js

const firebaseConfig = {
    apiKey: "AIzaSyCJvEKibP6odREiSx3AvLuFXvtqIXPVs28",
    authDomain: "learni-3fae2.firebaseapp.com",
    databaseURL: "https://learni-3fae2-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "learni-3fae2",
    storageBucket: "learni-3fae2.firebasestorage.app",
    messagingSenderId: "316348355341",
    appId: "1:316348355341:web:f3de7a1f1b8d20f1ef1644",
    measurementId: "G-RW6DT4GWX5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { app, auth, db, analytics, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, doc, setDoc, getDoc, updateDoc, collection, getDocs, onSnapshot, logEvent };
