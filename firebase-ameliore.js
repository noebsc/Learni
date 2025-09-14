// firebase-ameliore.js - Configuration Firebase optimisée

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

// Analytics désactivé pour éviter les erreurs de compatibilité
let analytics = null;

// Fonction logEvent de secours (toujours disponible)
const logEvent = (...args) => {
    // Version de développement/fallback
    console.log('📊 Analytics Event (dev mode):', args[0], args[1] || '');
};

// Configuration des règles Firestore pour optimiser les performances
const firestoreSettings = {
    cacheSizeBytes: 50000000, // 50MB de cache
};

// Fournisseur Google pour l'authentification sociale
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Configuration de l'auth avec persistence
auth.setPersistence = true;

// Messages d'erreur personnalisés
const authErrorMessages = {
    'auth/user-not-found': 'Utilisateur introuvable. Vérifiez votre email.',
    'auth/wrong-password': 'Mot de passe incorrect.',
    'auth/invalid-email': 'Format d\'email invalide.',
    'auth/email-already-in-use': 'Cet email est déjà utilisé.',
    'auth/weak-password': 'Mot de passe trop faible (minimum 6 caractères).',
    'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
    'auth/network-request-failed': 'Erreur de connexion. Vérifiez votre internet.',
    'auth/popup-closed-by-user': 'Fenêtre de connexion fermée.',
    'auth/cancelled-popup-request': 'Connexion annulée.'
};

// Fonction utilitaire pour obtenir un message d'erreur lisible
export const getAuthErrorMessage = (errorCode) => {
    return authErrorMessages[errorCode] || 'Une erreur inattendue s\'est produite.';
};

// Fonction de reconnexion automatique
export const reconnectAuth = async () => {
    try {
        if (auth.currentUser) {
            await auth.currentUser.reload();
            console.log('🔄 Reconnexion auth réussie');
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ Erreur reconnexion:', error);
        return false;
    }
};

// Fonction de vérification de connexion
export const checkAuthConnection = () => {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(!!user);
        });
        
        // Timeout après 5 secondes
        setTimeout(() => {
            unsubscribe();
            resolve(false);
        }, 5000);
    });
};

// Fonction utilitaire pour les opérations Firestore sécurisées
export const safeFirestoreOperation = async (operation, fallback = null) => {
    try {
        return await operation();
    } catch (error) {
        console.error('🔥 Erreur Firestore:', error);
        if (fallback) {
            return fallback;
        }
        throw error;
    }
};

// Fonction de nettoyage des données utilisateur
export const cleanUserData = (userData) => {
    const cleaned = {};
    const allowedFields = [
        'email', 'displayName', 'speciality', 'lv1', 'lv2', 
        'createdAt', 'updatedAt', 'preferences', 'settings'
    ];
    
    allowedFields.forEach(field => {
        if (userData[field] !== undefined) {
            cleaned[field] = userData[field];
        }
    });
    
    return cleaned;
};

// Configuration des indexes Firestore recommandés
export const recommendedIndexes = [
    {
        collection: 'users/{userId}/quizHistory',
        fields: [
            { field: 'completedAt', order: 'desc' },
            { field: 'subject', order: 'asc' }
        ]
    },
    {
        collection: 'users/{userId}/quizHistory',
        fields: [
            { field: 'score', order: 'desc' },
            { field: 'completedAt', order: 'desc' }
        ]
    }
];

// Fonction d'export des données utilisateur (RGPD)
export const exportUserData = async (userId) => {
    if (!userId) throw new Error('User ID required');
    
    try {
        const userData = await getDoc(doc(db, 'users', userId));
        const quizHistory = await getDocs(
            collection(db, 'users', userId, 'quizHistory')
        );
        
        return {
            profile: userData.data(),
            quizHistory: quizHistory.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })),
            exportedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('❌ Erreur export données:', error);
        throw error;
    }
};

// Fonction de suppression des données utilisateur (RGPD)
export const deleteUserData = async (userId) => {
    if (!userId) throw new Error('User ID required');
    
    try {
        // Supprimer l'historique des quiz
        const quizHistory = await getDocs(
            collection(db, 'users', userId, 'quizHistory')
        );
        
        const deletePromises = quizHistory.docs.map(doc => 
            deleteDoc(doc.ref)
        );
        
        await Promise.all(deletePromises);
        
        // Supprimer le profil utilisateur
        await deleteDoc(doc(db, 'users', userId));
        
        console.log('✅ Données utilisateur supprimées');
        return true;
    } catch (error) {
        console.error('❌ Erreur suppression données:', error);
        throw error;
    }
};

// Fonction de surveillance de la connexion
export const watchAuthState = (callback) => {
    return onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('👤 Utilisateur connecté:', {
                uid: user.uid,
                email: user.email,
                emailVerified: user.emailVerified
            });
        } else {
            console.log('👤 Utilisateur déconnecté');
        }
        callback(user);
    });
};

// Message de statut
console.log('🔥 Firebase initialisé avec succès');
console.log('📊 Analytics désactivé pour le développement');

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
