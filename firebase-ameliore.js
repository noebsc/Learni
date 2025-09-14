// firebase-ameliore.js - Configuration Firebase améliorée
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";

import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    collection, 
    getDocs, 
    onSnapshot,
    addDoc,
    query,
    orderBy,
    limit,
    where,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// Configuration Firebase - REMPLACEZ par vos propres clés
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

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = null;
const logEvent = () => {}; // Fonction vide
// Fournisseur Google pour l'authentification sociale
const googleProvider = new GoogleAuthProvider();

// Export des services Firebase
export { 
    app, 
    auth, 
    db, 
    analytics, 
    storage,
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile,
    googleProvider,
    signInWithPopup,
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    collection, 
    getDocs, 
    onSnapshot, 
    logEvent,
    addDoc,
    query,
    orderBy,
    limit,
    where,
    deleteDoc,
    serverTimestamp,
    ref,
    uploadBytes,
    getDownloadURL
};
