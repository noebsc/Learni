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

// === Analytics PRODUCTION uniquement (aucune erreur en dev) ===
let analytics = null;
let logEvent = (...args) => {
    // logEvent de secours fallback
    console.log('📊 logEvent simulé (dev/fallback):', ...args);
};

if (
    typeof window !== 'undefined'
    && window.location.hostname !== 'localhost'
    && window.location.hostname !== '127.0.0.1'
) {
    // En prod uniquement : import dynamique d'analytics
    import("https://www.gstatic.com/firebasejs/10.12.4/firebase-analytics.js")
        .then(({ getAnalytics, logEvent: firebaseLogEvent }) => {
            analytics = getAnalytics(app);
            logEvent = (...args) => {
                try {
                    firebaseLogEvent(analytics, ...args);
                } catch (error) {
                    console.warn('Analytics event failed:', error);
                }
            };
            console.log('📊 Firebase Analytics initialisé');
        })
        .catch(error => {
            console.warn('⚠️ Analytics non disponible:', error.message);
        });
} else {
    console.log('📊 Analytics désactivé en développement');
}

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
