// --- MODAL PARAMÈTRES ---
function openSettingsModal() {
    // Récupère les éléments select
    const langSel = document.getElementById('optionLang');
    const specSel = document.getElementById('optionSpecialty');
    const lv1Sel = document.getElementById('optionLV1');
    const lv2Sel = document.getElementById('optionLV2');
    const themeSel = document.getElementById('optionTheme');

    // Helper pour définir la valeur d'un select avec gestion des erreurs
    function setSelectValue(select, value, defaultValue = '') {
        if (!select) return;
        
        // Si la valeur est vide, on utilise la valeur par défaut
        const valueToSet = (value === undefined || value === null || value === '') ? defaultValue : value;
        if (valueToSet === '') return;

        // Vérifie si l'option existe déjà
        let optionExists = Array.from(select.options).some(opt => opt.value === valueToSet);
        
        // Si l'option n'existe pas, on l'ajoute
        if (!optionExists) {
            const opt = document.createElement('option');
            opt.value = valueToSet;
            opt.textContent = valueToSet;
            select.appendChild(opt);
        }

        // Définit la valeur
        select.value = valueToSet;
        
        // Déclenche un événement change pour s'assurer que tout listener est notifié
        select.dispatchEvent(new Event('change'));
    }

    // Charge les données utilisateur depuis Firebase
    if (currentUser && currentUser.uid) {
        getDoc(doc(db, 'users', currentUser.uid))
            .then(snap => {
                if (snap.exists()) {
                    const data = snap.data();
                    console.log('Données utilisateur chargées:', data); // Debug

                    // Applique les valeurs avec des valeurs par défaut
                    setSelectValue(langSel, data.lang, 'Français');
                    setSelectValue(specSel, data.specialty || data.speciality, 'STI2D');
                    setSelectValue(lv1Sel, data.lv1, 'Anglais');
                    setSelectValue(lv2Sel, data.lv2, 'Espagnol');
                    if (themeSel) {
                        setSelectValue(themeSel, data.theme, theme || 'dark');
                    }

                    // Stocke les valeurs actuelles dans userData pour référence
                    userData = { ...data };
                } else {
                    console.log('Aucune donnée utilisateur trouvée, utilisation des valeurs par défaut');
                    // Applique les valeurs par défaut si aucune donnée n'existe
                    setSelectValue(langSel, null, 'Français');
                    setSelectValue(specSel, null, 'STI2D');
                    setSelectValue(lv1Sel, null, 'Anglais');
                    setSelectValue(lv2Sel, null, 'Espagnol');
                    if (themeSel) {
                        setSelectValue(themeSel, null, theme || 'dark');
                    }
                }
            })
            .catch(error => {
                console.error('Erreur lors du chargement des paramètres:', error);
            })
            .finally(() => {
                // Affiche le modal dans tous les cas
                document.getElementById('settingsModal').classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            });
    } else {
        // Si non connecté, utilise les valeurs par défaut
        setSelectValue(langSel, null, 'Français');
        setSelectValue(specSel, null, 'STI2D');
        setSelectValue(lv1Sel, null, 'Anglais');
        setSelectValue(lv2Sel, null, 'Espagnol');
        if (themeSel) {
            setSelectValue(themeSel, null, theme || 'dark');
        }
        
        document.getElementById('settingsModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}
function closeSettingsModal() {
    document.getElementById('settingsModal').classList.add('hidden');
    document.body.style.overflow = '';
}

// Gestion des modals de suppression de compte
function showDeleteAccountModal() {
    const settingsModal = document.getElementById('settingsModal');
    const deleteAccountModal = document.getElementById('deleteAccountModal');
    
    // Ajoute une classe pour l'animation de sortie
    settingsModal.classList.add('fade-out');
    
    // Attend que l'animation de fermeture soit terminée
    setTimeout(() => {
        // Ferme complètement la modal des paramètres
        settingsModal.classList.add('hidden');
        settingsModal.classList.remove('fade-out');
        
        // Attend un court instant avant d'ouvrir la nouvelle modal
        setTimeout(() => {
            // Ouvre la modal de suppression avec une animation d'entrée
            deleteAccountModal.classList.remove('hidden');
            deleteAccountModal.classList.add('fade-in');
            document.body.style.overflow = 'hidden';
            
            // Retire la classe d'animation après qu'elle soit terminée
            setTimeout(() => {
                deleteAccountModal.classList.remove('fade-in');
            }, 300);
        }, 100);
    }, 200);
}

function closeDeleteAccountModal() {
    const deleteAccountModal = document.getElementById('deleteAccountModal');
    
    // Ajoute une classe pour l'animation de sortie
    deleteAccountModal.classList.add('fade-out');
    
    // Attend que l'animation soit terminée avant de cacher la modal
    setTimeout(() => {
        deleteAccountModal.classList.add('hidden');
        deleteAccountModal.classList.remove('fade-out');
        document.body.style.overflow = '';
    }, 200);
}

// Fonction de suppression du compte
async function deleteUserAccount() {
    if (!currentUser) return;

    try {
        // Récupère les données de l'utilisateur pour les supprimer
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            // Supprime les données de l'utilisateur
            await deleteDoc(userRef);
            
            // Supprime l'historique des quiz
            const quizHistoryRef = collection(db, 'users', currentUser.uid, 'quizHistory');
            const quizHistoryDocs = await getDocs(quizHistoryRef);
            const deletePromises = quizHistoryDocs.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
            
            // Supprime le compte Firebase Auth
            await currentUser.delete();
            
            // Déconnecte l'utilisateur
            await signOut(auth);
            
            // Nettoie les données locales
            currentUser = null;
            userData = {};
            localStorage.clear();
            
            // Recharge la page
            window.location.reload();
        }
    } catch (error) {
        console.error('Erreur lors de la suppression du compte:', error);
        alert('Une erreur est survenue lors de la suppression du compte. Veuillez réessayer.');
    }
}

// Event listeners pour la suppression du compte
document.addEventListener('DOMContentLoaded', () => {
    // Récupération des éléments DOM
    const showDeleteAccountBtn = document.getElementById('showDeleteAccountBtn');
    const deleteAccountModal = document.getElementById('deleteAccountModal');
    const confirmDeleteAccountBtn = document.getElementById('confirmDeleteAccountBtn');
    const cancelDeleteAccountBtn = document.getElementById('cancelDeleteAccountBtn');
    const closeDeleteAccountModal = document.getElementById('closeDeleteAccountModal');

    // Fonction de fermeture de la modal
    const closeModal = () => {
        deleteAccountModal?.classList.add('fade-out');
        setTimeout(() => {
            deleteAccountModal?.classList.add('hidden');
            deleteAccountModal?.classList.remove('fade-out');
            document.body.style.overflow = '';
        }, 200);
    };

    // Bouton pour afficher la modal de suppression
    showDeleteAccountBtn?.addEventListener('click', showDeleteAccountModal);

    // Bouton pour confirmer la suppression
    confirmDeleteAccountBtn?.addEventListener('click', () => {
        deleteUserAccount();
    });

    // Boutons pour fermer la modal
    cancelDeleteAccountBtn?.addEventListener('click', closeModal);
    closeDeleteAccountModal?.addEventListener('click', closeModal);

    // Ferme la modal si on clique en dehors
    deleteAccountModal?.addEventListener('click', (e) => {
        if (e.target === deleteAccountModal) {
            closeModal();
        }
    });

    // Empêche la propagation du clic depuis le contenu de la modal
    deleteAccountModal?.querySelector('.modal-content')?.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Gestion des touches clavier (Échap pour fermer)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !deleteAccountModal?.classList.contains('hidden')) {
            closeModal();
        }
    });
});
/* ========== app-ameliore.js - Learni STI2D COMPLET AVEC GROQ IA GRATUITE - NAVIGATION CORRIGÉE ========== */

// Import Firebase
import { 
    auth, db, analytics,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut, onAuthStateChanged,
    doc, setDoc, getDoc, updateDoc, deleteDoc,
    collection, getDocs, onSnapshot, logEvent,
    addDoc, query, orderBy, limit, where 
} from './firebase-ameliore.js';

// ≡ GLOBALS
let currentUser = null;
let userData = {};
let speciality = '';
let lv1 = '';
let lv2 = '';
let quizzes = {};
let theme = localStorage.getItem('theme') || 'dark';
let currentSection = 'dashboard';
let currentQuiz = null;
let quizHistory = [];
let userProgress = {};
let currentQuizData = null;
let currentQuizIndex = 0;
let userAnswers = [];
let quizStartTime = null;

// Mapping des noms de matières entre l'affichage et le stockage
const SUBJECT_MAPPING = {
    'EMC': 'EMC',
    'EPS': 'EPS',
    'Espagnol': 'Espagnol',
    'Allemand': 'Allemand',
    'Italien': 'Italien',
    'Arabe': 'Arabe'
};
// Firestore unsubscribe for realtime user doc listener
let userDocUnsubscribe = null;
// Lock to prevent concurrent AI generations
let isGeneratingAI = false;
// Block code for sensitive/irrelevant themes
const BLOCK_CODE = 'BLOCKED_SENSITIVE_CONTENT';

// Simple blacklist for clearly sensitive/indiscreet topics
const SENSITIVE_KEYWORDS = [
    'porn', 'porno', 'sex', 'sexual', 'drugs', 'drogue', 'suicide', 'bomb', 'terror', 'terrorist', 'gun', 'weapon'
];

// 🔐 Configuration GROQ API SÉCURISÉE - Utilisation du secret GROQ_KEY
import { GROQ_API_KEY } from "./groq-secret.js";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Sujets STI2D 2025 complets
const STI2D_SUBJECTS = {
    "Tronc Commun": {
        "Français": {
            themes: ["Poésie", "Théâtre", "Roman", "Argumentation", "Réécriture"],
            description: "Expression écrite et orale, littérature française et francophone"
        },
        "Philosophie": {
            themes: ["Liberté", "Justice", "Bonheur", "Connaissance", "Travail", "Art"],
            description: "Questionnement philosophique, esprit critique et analyse"
        },
        "Histoire-Géographie": {
            themes: ["Grandes guerres", "Totalitarismes", "Décolonisation", "Mondialisation", "Ville"],
            description: "Histoire contemporaine et géographie des territoires"
        },
        "Mathématiques": {
            themes: ["Algèbre", "Probabilités", "Statistiques", "Analyse", "Fonctions", "Trigonométrie"],
            description: "Mathématiques appliquées aux sciences et techniques"
        },
        "Physique-Chimie": {
            themes: ["Circuits électriques", "Loi d'Ohm", "Puissance", "Energie", "Mécanique", "Optique"],
            description: "Sciences physiques et chimiques appliquées"
        },
        "EMC": {
            themes: ["Valeurs républicaines", "Citoyenneté", "Droits et devoirs", "Démocratie", "Laïcité"],
            description: "Enseignement moral et civique"
        },
        "EPS": {
            themes: ["Performance", "Santé", "Sécurité", "Règles sportives", "Méthodologie"],
            description: "Éducation physique et sportive"
        },
        "Anglais": {
            themes: ["Vie quotidienne", "Technologie", "Société", "Environnement", "Innovation"],
            description: "Langue vivante 1 - Communication et culture"
        },
        "Espagnol": {
            themes: ["Compréhension", "Grammaire", "Vocabulaire", "Culture"],
            description: "Langue vivante 2 - Communication et culture hispanique"
        },
        "Allemand": {
            themes: ["Compréhension", "Grammaire", "Vocabulaire", "Culture"],
            description: "Langue vivante 2 - Communication et culture allemande"
        },
        "Italien": {
            themes: ["Compréhension", "Grammaire", "Vocabulaire", "Culture"],
            description: "Langue vivante 2 - Communication et culture italienne"
        },
        "Arabe": {
            themes: ["Compréhension", "Grammaire", "Vocabulaire", "Culture"],
            description: "Langue vivante 2 - Communication et culture arabe"
        }
    },
    "Spécialités": {
        "2I2D": {
            themes: ["Innovation", "Développement durable", "Matériaux", "Énergie", "Information"],
            description: "Ingénierie, Innovation et Développement Durable"
        },
        "AC": {
            themes: ["Structures", "Matériaux construction", "Thermique bâtiment", "Acoustique"],
            description: "Architecture et Construction"
        },
        "ITEC": {
            themes: ["Éco-conception", "Cycle de vie", "Matériaux", "Processus créatifs"],
            description: "Innovation Technologique et Éco-Conception"
        },
        "EE": {
            themes: ["Énergies renouvelables", "Efficacité énergétique", "Thermique", "Fluides"],
            description: "Énergies et Environnement"
        },
        "SIN": {
            themes: ["Réseaux", "Programmation", "Cybersécurité", "IoT"],
            description: "Systèmes d'Information et Numérique"
        }
    }
};

// ≡ --- UTILITAIRES GÉNÉRAUX ---

function showSection(sectionId) {
    console.log('📄 Affichage de la section:', sectionId);
    
    if (sectionId === 'authSection') {
        document.getElementById('appContent').classList.add('hidden');
        document.getElementById('authSection').classList.remove('hidden');
        return;
    }

    document.getElementById('appContent').classList.remove('hidden');
    document.getElementById('authSection').classList.add('hidden');

    // Masquer toutes les sections
    const sections = ['dashboard', 'quiz-select', 'fiches', 'quiz-ai', 'history', 'settingsSection'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.classList.add('hidden');
        }
    });

    // Afficher la section demandée
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        currentSection = sectionId;

        // Mise à jour des boutons de navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-section') === sectionId) {
                btn.classList.add('active');
            }
        });

        // Actions spécifiques par section
        switch(sectionId) {
            case 'dashboard':
                updateDashboard();
                break;
            case 'quiz-select':
                renderQuizSelect();
                break;
            case 'history':
                renderHistory();
                break;
            case 'quiz-ai':
                initAIQuiz();
                break;
        }
    }
}

function switchTheme(force) {
    if (force) {
        theme = force;
    } else {
        theme = theme === 'dark' ? 'light' : 'dark';
    }
    try {
        const root = document.documentElement;
        // Get current surface color for overlay
        const computed = getComputedStyle(root).getPropertyValue('--color-surface') || '';
        const overlayColor = computed.trim() || 'rgba(255,255,255,0.95)';

        // Remove any existing overlay
        const oldOverlay = document.getElementById('themeWaveOverlay');
        if (oldOverlay) oldOverlay.remove();

        // Create SVG overlay with animated wave mask
        const overlay = document.createElement('div');
        overlay.className = 'theme-wave-overlay';
        overlay.id = 'themeWaveOverlay';
        overlay.innerHTML = `
<svg class="theme-wave-svg" width="100vw" height="100vh" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <mask id="themeWaveMask">
      <rect x="0" y="0" width="1920" height="1080" fill="white"/>
      <path id="wavePath" d="M0,1080 Q480,1000 960,1080 T1920,1080 V0 H0 Z" fill="black"/>
    </mask>
  </defs>
  <rect class="theme-wave-rect animate" x="0" y="0" width="1920" height="1080" fill="${overlayColor}" mask="url(#themeWaveMask)" />
</svg>`;
        document.body.appendChild(overlay);

        // Animate the wave upward
        const waveRect = overlay.querySelector('.theme-wave-rect');
        if (waveRect) {
            waveRect.style.transform = 'translateY(100vh)';
            setTimeout(() => {
                waveRect.style.transition = 'transform 2.8s cubic-bezier(0.22,1,0.36,1)';
                waveRect.style.transform = 'translateY(-110vh)';
            }, 10);
        }

        // Switch theme after a short delay so the overlay covers the screen
        setTimeout(() => {
            document.documentElement.setAttribute('data-color-scheme', theme);
            document.body.classList.remove('theme-dark', 'theme-light');
            document.body.classList.add(`theme-${theme}`);
            localStorage.setItem('theme', theme);
        }, 300);

        // Fade out and remove overlay after animation (now 5.6s)
        setTimeout(() => {
            overlay.classList.add('hide');
            setTimeout(() => {
                overlay.remove();
            }, 400);
        }, 5600);
    } catch (err) {
        // Fallback: immediate switch
        document.documentElement.setAttribute('data-color-scheme', theme);
        document.body.classList.remove('theme-dark', 'theme-light');
        document.body.classList.add(`theme-${theme}`);
        localStorage.setItem('theme', theme);
    }
    
    const switcher = document.getElementById('themeSwitcher');
    if (switcher) {
        switcher.textContent = theme === 'dark' ? '☀️' : '🌙';
        switcher.style.transform = 'scale(1.2)';
        setTimeout(() => switcher.style.transform = 'scale(1)', 150);
    }

    // Persist theme preference for logged-in users
    if (currentUser && currentUser.uid) {
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            // updateDoc expects an object; do not await to avoid blocking UI
            updateDoc(userRef, { theme }).catch(err => console.warn('⚠️ Impossible de sauvegarder le thème utilisateur:', err));
        } catch (err) {
            console.warn('⚠️ Erreur en tentant de sauvegarder le thème:', err);
        }
    }
}

function toast(msg, type = 'info', timeout = 4000) {
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    
    const toastEl = document.createElement('div');
    toastEl.className = `toast ${type}`;
    toastEl.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${msg}</span>
        <button class="toast-close">×</button>
    `;

    // Container pour les toasts
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    container.appendChild(toastEl);

    // Animation d'entrée
    setTimeout(() => toastEl.style.transform = 'translateX(0)', 10);

    // Fermeture automatique et manuelle
    const closeToast = () => {
        toastEl.style.transform = 'translateX(400px)';
        setTimeout(() => toastEl.remove(), 300);
    };

    toastEl.querySelector('.toast-close').onclick = closeToast;
    setTimeout(closeToast, timeout);
}

// Helper: recursively replace undefined values with null (Firestore doesn't accept undefined)
function sanitizeForFirestore(obj) {
    if (obj === undefined) return null;
    if (obj === null) return null;
    if (Array.isArray(obj)) return obj.map(item => sanitizeForFirestore(item));
    if (typeof obj === 'object') {
        const out = {};
        Object.keys(obj).forEach(k => {
            const v = obj[k];
            if (v === undefined) {
                out[k] = null;
            } else if (typeof v === 'object' && v !== null) {
                out[k] = sanitizeForFirestore(v);
            } else {
                out[k] = v;
            }
        });
        return out;
    }
    return obj;
}

// 🔧 CORRECTION 1: Chargement des quiz avec bon chemin
async function loadQuizzes() {
    try {
        // Fonction de débogage pour voir la structure
        function debugQuizStructure(data) {
            console.log('📊 Structure des quiz chargés:');
            Object.entries(data).forEach(([subject, content]) => {
                const structure = Array.isArray(content) ? 
                    `[Array: ${content.length}] -> ${content[0]?.questions?.length || 0} questions` :
                    `[Object] -> ${content?.questions?.length || 0} questions`;
                console.log(`${subject}: ${structure}`);
            });
        }

        // Force le rechargement en ignorant le cache
        console.log('📄 Chargement frais des quiz depuis ./sti2d.json');        // 🔧 CHEMIN CORRIGÉ: ./sti2d.json au lieu de /Learni/sti2d.json
        console.log('📄 Chargement des quiz depuis ./sti2d.json');
        const resp = await fetch('./sti2d.json');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        
        quizzes = await resp.json();
        console.log('✅ Quiz chargés:', Object.keys(quizzes).length, 'matières');
        debugQuizStructure(quizzes);
        
        // Nettoie le cache existant
        localStorage.removeItem('quizzes_cache');
        localStorage.removeItem('quizzes_cache_time');
        
    } catch (error) {
        console.error('❌ Erreur chargement quizzes:', error);
        toast('Erreur lors du chargement des quiz: ' + error.message, 'error');
        
        // Quizzes de démonstration en cas d'erreur
        quizzes = {
            "Français": [{
                titre: "Quiz de démonstration - Français",
                niveau: "Terminale",
                themes: ["Poésie", "Théâtre"],
                questions: [
                    {
                        type: "qcm",
                        text: "Qui a écrit 'Les Fleurs du Mal' ?",
                        choices: ["Baudelaire", "Verlaine", "Rimbaud", "Mallarmé"],
                        solution: 0,
                        explication: "Charles Baudelaire est l'auteur des 'Fleurs du Mal' (1857)."
                    }
                ]
            }]
        };
        console.log('📚 Quiz de fallback chargés');
    }
}

// ≡ --- FONCTIONS UTILISATEUR ---

async function fetchAndSyncUserData(user) {
    if (!user) return;
    
    try {
        console.log('📊 Chargement des données utilisateur...');
        currentUser = user;
        // Detach previous listener if any
        if (userDocUnsubscribe) {
            try { userDocUnsubscribe(); } catch (e) { /* ignore */ }
            userDocUnsubscribe = null;
        }

        // Realtime listener on user doc to sync prefs like theme across devices
        const userRef = doc(db, 'users', user.uid);
        userDocUnsubscribe = onSnapshot(userRef, snapshot => {
            if (!snapshot.exists()) return;
            const data = snapshot.data();
            userData = data || {};
            speciality = userData.speciality || '';
            lv1 = userData.lv1 || '';
            lv2 = userData.lv2 || '';

            // Apply saved theme preference if present
            if (userData.theme && (userData.theme === 'dark' || userData.theme === 'light')) {
                theme = userData.theme;
                document.documentElement.setAttribute('data-color-scheme', theme);
                document.body.classList.remove('theme-dark', 'theme-light');
                document.body.classList.add(`theme-${theme}`);
                localStorage.setItem('theme', theme);
            }
            // Update UI elements that depend on user data
            updateUserInfo();
            // reload progress after user data changes
            loadUserProgress();
        }, err => {
            console.warn('⚠️ Erreur écoute user doc:', err);
        });
        
        await loadUserProgress();
        updateDashboard();
        updateUserInfo();
        console.log('✅ Synchronisation terminée');
    } catch (error) {
        console.error('❌ Erreur sync données utilisateur:', error);
        userData = { email: user.email };
        updateDashboard();
        updateUserInfo();
    }
}

async function loadUserProgress() {
    if (!currentUser) return;
    
    try {
        // Order by creation time so drafts (completedAt null) appear first
        const historyQuery = query(
            collection(db, 'users', currentUser.uid, 'quizHistory'),
            orderBy('createdAt', 'desc'),
            limit(100)
        );

        const historySnapshot = await getDocs(historyQuery);
        quizHistory = historySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        calculateUserStats();
    } catch (error) {
        console.error('❌ Erreur chargement progression:', error);
        quizHistory = [];
        calculateUserStats();
    }
}

function calculateUserStats() {
    if (quizHistory.length === 0) {
        userProgress = {
            totalQuizzes: 0,
            averageScore: 0,
            currentStreak: 0,
            totalCorrect: 0,
            bestScore: 0
        };
        return;
    }
    
    const scores = quizHistory.map(q => q.score || 0);
    const totalCorrect = quizHistory.reduce((sum, q) => sum + (q.correctAnswers || 0), 0);
    const bestScore = Math.max(...scores);
    
    userProgress = {
        totalQuizzes: quizHistory.length,
        averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        currentStreak: calculateCurrentStreak(),
        totalCorrect: totalCorrect,
        bestScore: bestScore
    };
}

function calculateCurrentStreak() {
    let streak = 0;
    for (let i = 0; i < quizHistory.length; i++) {
        const quiz = quizHistory[i];
        if (quiz.score >= 70) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

function updateDashboard() {
    const statsElements = {
        totalQuizzes: document.getElementById('stat-total-quizzes'),
        averageScore: document.getElementById('stat-average-score'),
        currentStreak: document.getElementById('stat-streak'),
        totalCorrect: document.getElementById('stat-correct')
    };
    
    if (statsElements.totalQuizzes) statsElements.totalQuizzes.textContent = userProgress.totalQuizzes;
    if (statsElements.averageScore) statsElements.averageScore.textContent = userProgress.averageScore + '%';
    if (statsElements.currentStreak) statsElements.currentStreak.textContent = userProgress.currentStreak;
    if (statsElements.totalCorrect) statsElements.totalCorrect.textContent = userProgress.totalCorrect;
    
    // Activité récente
    updateRecentActivity();
}

function updateUserInfo() {
    const emailEl = document.getElementById('userEmail');
    const specialtyEl = document.getElementById('userSpecialty');
    const lv1El = document.getElementById('userLV1');
    const lv2El = document.getElementById('userLV2');
    
    if (emailEl) emailEl.textContent = userData.email || 'utilisateur@example.com';
    if (specialtyEl) specialtyEl.textContent = userData.speciality || 'Spécialité';
    if (lv1El) lv1El.textContent = userData.lv1 || 'LV1';
    if (lv2El) lv2El.textContent = userData.lv2 || 'LV2';
}

function updateRecentActivity() {
    const container = document.getElementById('recent-activity-list');
    if (!container) return;
    
    if (quizHistory.length === 0) {
        container.innerHTML = '<p class="no-data">Aucun quiz complété pour le moment</p>';
        return;
    }
    
    const recentQuizzes = quizHistory.slice(0, 5);
    let html = '';
    
    recentQuizzes.forEach(quiz => {
        let dateStr = '-';
        let d = null;
        if (quiz.completedAt) {
            d = new Date(quiz.completedAt);
        } else if (quiz.createdAt) {
            d = new Date(quiz.createdAt);
        }
        if (d && !isNaN(d) && d.getFullYear() > 1971) {
            dateStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        const scoreClass = quiz.score >= 80 ? 'excellent' : quiz.score >= 60 ? 'good' : 'average';
        html += `
            <div class="activity-item ${scoreClass}">
                <div class="activity-info">
                    <strong>${quiz.subject}</strong>
                    <span class="activity-date">${dateStr}</span>
                </div>
                <div class="activity-score">${quiz.score}%</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ≡ --- QUIZ SELECT ---

function renderQuizSelect() {
    const container = document.getElementById('quiz-select-container');
    if (!container || !quizzes) return;
    
    let html = '<div class="quiz-categories">';
    
    // Tronc Commun
    html += `<div class="category"><h3>📚 Tronc Commun</h3><div class="subjects-grid">`;
    Object.entries(STI2D_SUBJECTS["Tronc Commun"]).forEach(([subject, info]) => {
        // Utilise le mapping pour trouver le bon nom dans quizzes
        const quizSubject = SUBJECT_MAPPING[subject] || subject;
        let questionCount = 0;
        
        console.log(`🔍 Recherche des questions pour ${subject} (${quizSubject}):`, quizzes[quizSubject]);
        
        try {
            // Vérifie si la matière existe dans quizzes
            if (quizzes[quizSubject]) {
                const quizData = quizzes[quizSubject];
                // Si c'est un tableau
                if (Array.isArray(quizData)) {
                    questionCount = quizData.reduce((total, quiz) => {
                        return total + (quiz.questions ? quiz.questions.length : 0);
                    }, 0);
                }
                // Si c'est un objet direct
                else if (quizData.questions) {
                    questionCount = quizData.questions.length;
                }
            }
            console.log(`📊 ${subject}: ${questionCount} questions trouvées`);
        } catch (error) {
            console.error(`❌ Erreur comptage questions pour ${subject}:`, error);
        }
        
        const isUserSubject = subject === lv1 || subject === lv2;
        
        html += `
            <div class="subject-card ${isUserSubject ? 'user-specialty' : ''}" 
                 data-subject="${quizSubject}">
                ${isUserSubject ? '<span class="user-badge">Votre matière</span>' : ''}
                <div class="subject-icon">${getSubjectIcon(subject)}</div>
                <h4>${subject}</h4>
                <div class="question-count">${questionCount} questions</div>
                <div class="subject-themes">${info.themes.slice(0, 3).join(', ')}...</div>
                <div class="subject-description">${info.description}</div>
            </div>
        `;
    });
    html += '</div></div>';
    
    // Spécialités
    html += `<div class="category"><h3>🔧 Spécialités STI2D</h3><div class="subjects-grid">`;
    Object.entries(STI2D_SUBJECTS["Spécialités"]).forEach(([subject, info]) => {
        // Utilise le mapping pour trouver le bon nom dans quizzes
        const quizSubject = SUBJECT_MAPPING[subject] || subject;
        let questionCount = 0;
        
        try {
            // Vérifie si la matière existe dans quizzes
            if (quizzes[quizSubject]) {
                const quizData = quizzes[quizSubject];
                // Si c'est un tableau
                if (Array.isArray(quizData)) {
                    questionCount = quizData.reduce((total, quiz) => {
                        return total + (quiz.questions ? quiz.questions.length : 0);
                    }, 0);
                }
                // Si c'est un objet direct
                else if (quizData.questions) {
                    questionCount = quizData.questions.length;
                }
            }
            console.log(`📊 ${subject}: ${questionCount} questions trouvées`);
        } catch (error) {
            console.error(`❌ Erreur comptage questions pour ${subject}:`, error);
        }
        
        const isUserSpecialty = subject === speciality;
        
        html += `
            <div class="subject-card ${isUserSpecialty ? 'user-specialty' : ''}" 
                 data-subject="${quizSubject}">
                ${isUserSpecialty ? '<span class="user-badge">Votre spécialité</span>' : ''}
                <div class="subject-icon">${getSubjectIcon(subject)}</div>
                <h4>${subject}</h4>
                <div class="question-count">${questionCount} questions</div>
                <div class="subject-themes">${info.themes.slice(0, 3).join(', ')}...</div>
                <div class="subject-description">${info.description}</div>
            </div>
        `;
    });
    html += '</div></div></div>';
    
    container.innerHTML = html;
    
    // Event listeners
    container.addEventListener('click', e => {
        const subjectCard = e.target.closest('.subject-card');
        if (subjectCard && !subjectCard.classList.contains('unavailable')) {
            const subject = subjectCard.getAttribute('data-subject');
            const quizData = quizzes[subject];
            if (quizData && quizData.length > 0) {
                showQuizOptionsModal(subject, quizData[0].questions || []);
            }
        }
    });
}

function getSubjectIcon(subject) {
    const icons = {
        'Français': '📖',
        'Philosophie': '💭',
        'Histoire-Géographie': '🌍',
        'Mathématiques': '📐',
        'Physique-Chimie': '⚗️',
        'EMC': '🏛️',
        'EPS': '⚽',
        'Anglais': '🇬🇧',
        'Espagnol': '🇪🇸',
        'Allemand': '🇩🇪',
        'Italien': '🇮🇹',
        'Arabe': '🇸🇦',
        '2I2D': '⚙️',
        'AC': '🏗️',
        'ITEC': '💡',
        'EE': '🔋',
        'SIN': '💻'
    };
    return icons[subject] || '📚';
}

// Fonction pour mélanger un tableau (questions)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Fonction pour ouvrir le modal de sélection du nombre de questions
function showQuizOptionsModal(subject, questions) {
    const modal = document.getElementById('quizOptionsModal');
    const subjectDisplay = modal.querySelector('.quiz-subject-name');
    const buttonsContainer = modal.querySelector('.quiz-options-buttons');
    
    // Afficher le nom de la matière
    subjectDisplay.textContent = subject;
    
    // Vider le conteneur des boutons
    buttonsContainer.innerHTML = '';
    
    // Calculer le nombre total de questions
    const totalQuestions = questions.length;
    
    // Créer les options de nombre de questions
    const options = [];
    
    // Toujours proposer 10 questions si possible
    if (totalQuestions >= 10) {
        options.push({ count: 10, label: '10 questions' });
    }
    
    // Proposer 20 questions si possible
    if (totalQuestions >= 20) {
        options.push({ count: 20, label: '20 questions' });
    }
    
    // Si on a plus de 20 questions, proposer la moitié du total (arrondi à 5)
    if (totalQuestions > 20) {
        const halfCount = Math.floor(totalQuestions / 2 / 5) * 5;
        if (halfCount > 20 && halfCount < totalQuestions) {
            options.push({ count: halfCount, label: `${halfCount} questions` });
        }
    }
    
    // Toujours proposer toutes les questions
    options.push({ 
        count: totalQuestions, 
        label: `Toutes les questions (${totalQuestions})` 
    });

    // Ajouter les boutons
    options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option.label;
        button.onclick = () => {
            startRandomQuiz(subject, questions, option.count);
            closeQuizOptionsModal();
        };
        buttonsContainer.appendChild(button);
    });

    // Afficher le modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Fonction pour démarrer un quiz avec des questions aléatoires
function startRandomQuiz(subject, allQuestions, questionCount) {
    // Mélanger les questions et en sélectionner le nombre demandé
    const selectedQuestions = shuffleArray(allQuestions).slice(0, questionCount);
    
    // Créer l'objet quiz avec les questions sélectionnées
    const quizData = {
        titre: `Quiz de ${subject}`,
        questions: selectedQuestions
    };

    // Démarrer le quiz
    startQuiz(subject, quizData);
}

// Fonction pour fermer le modal de sélection
function closeQuizOptionsModal() {
    const modal = document.getElementById('quizOptionsModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// ≡ --- GÉNÉRATION QUIZ IA AVEC GROQ GRATUIT ET RAPIDE ---

function initAIQuiz() {
    // Initialiser les éléments du formulaire IA
    const difficultySlider = document.getElementById('aiDifficulty');
    const difficultyDisplay = document.getElementById('difficultyDisplay');
    
    if (difficultySlider && difficultyDisplay) {
        difficultySlider.addEventListener('input', e => {
            const levels = ['Très facile', 'Facile', 'Moyen', 'Difficile', 'Expert'];
            const level = parseInt(e.target.value) - 1;
            difficultyDisplay.textContent = `Difficulté: ${levels[level]}`;
        });
    }
    
    // The generate button is handled by event delegation in setupEventListeners
    // to avoid double-binding we do not attach a direct click listener here.
}

// 🚀 GROQ API CORRIGÉ - Version la plus récente 2025
async function callGroqAPI(subject, theme, difficulty, questionCount) {
    try {
        // 🔐 Vérification de la clé API depuis le secret
        if (!GROQ_API_KEY) {
            throw new Error(`Clé API Groq non configurée. 

Configuration requise:
1. Créez un secret GROQ_KEY dans votre environnement
2. La clé doit commencer par "gsk_"
3. Obtenez votre clé GRATUITE sur https://console.groq.com/keys

GROQ est 100% gratuit avec des limites très généreuses !`);
        }

        console.log('🚀 Génération quiz Groq:', subject, 'thème:', theme, 'difficulté:', difficulty+'/5');

        // Prompt système optimisé pour Groq 2025
        const systemPrompt = `Tu es un professeur expert du programme BAC STI2D 2025 français. Génère des questions de qualité pédagogique strictement conformes au programme officiel.

CONTRAINTES ABSOLUES:
- Questions adaptées au niveau Terminale STI2D uniquement
- 70% QCM (4 choix), 30% Vrai/Faux
- Explications pédagogiques détaillées (minimum 30 mots)
- Format JSON strict sans commentaires
- Vocabulaire technique précis et actuel`;

        const userPrompt = `Créer exactement ${questionCount} questions de ${subject}${theme ? ' sur ' + theme : ''} pour élèves Terminale STI2D.

Niveau de difficulté ${difficulty}/5:
- 1-2: Connaissances de base, définitions
- 3: Application directe, exercices standards  
- 4-5: Analyse, synthèse, résolution complexe

STRUCTURE JSON REQUISE:
{
    "questions": [
        {
            "type": "qcm",
            "text": "Question claire et précise ?",
            "choices": ["Option A", "Option B", "Option C", "Option D"],
            "solution": 0,
            "explication": "Justification complète et pédagogique expliquant pourquoi cette réponse est correcte."
        },
        {
            "type": "tf",
            "text": "Affirmation précise à évaluer.",
            "solution": true,
            "explication": "Explication détaillée justifiant la véracité ou fausseté de l'affirmation."
        }
    ]
}

Génère ${questionCount} questions diversifiées et progressives.`;

        // Requête API Groq avec paramètres optimisés 2025
        const requestBody = {
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            max_tokens: 4000, // Augmenté pour plus de questions
            temperature: 0.3, // Réduit pour plus de cohérence
            top_p: 0.95,
            frequency_penalty: 0.1,
            presence_penalty: 0.1,
            stream: false
        };

        console.log('📡 Envoi requête Groq avec modèle llama-3.1-70b-versatile...');
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Learni-STI2D/1.0'
            },
            body: JSON.stringify(requestBody)
        });

        // Gestion d'erreurs HTTP améliorée
        if (!response.ok) {
            let errorMessage;
            let errorDetails;
            try {
                const errorData = await response.json();
                errorDetails = errorData.error?.message || JSON.stringify(errorData);
            } catch {
                errorDetails = await response.text();
            }
            
            console.error('❌ Erreur HTTP Groq:', response.status, errorDetails);

            switch (response.status) {
                case 400:
                    errorMessage = 'Paramètres de requête invalides. Vérifiez le format de la demande.';
                    break;
                case 401:
                    errorMessage = `Clé API Groq invalide ou expirée. 

Vérifications:
1. Le secret GROQ_KEY est-il bien configuré ?
2. La clé commence-t-elle par "gsk_" ?
3. Le compte Groq est-il activé sur console.groq.com ?`;
                    break;
                case 429:
                    errorMessage = 'Limite de requêtes Groq atteinte. Attendez 60 secondes et ressayez.';
                    break;
                case 500:
                case 502:
                case 503:
                    errorMessage = 'Serveurs Groq temporairement indisponibles. Ressayez dans quelques minutes.';
                    break;
                default:
                    errorMessage = `Erreur serveur Groq ${response.status}: ${errorDetails}`;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('📨 Réponse Groq reçue:', data);

        // Validation de la structure de réponse
        if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('❌ Structure réponse invalide:', data);
            throw new Error('Réponse Groq mal structurée');
        }

        let aiResponse = data.choices[0].message.content;
        if (!aiResponse || aiResponse.trim().length === 0) {
            console.error('❌ Réponse vide de Groq');
            throw new Error('Groq a retourné une réponse vide');
        }

        console.log('📄 Réponse brute Groq:', aiResponse.substring(0, 500) + '...');

        // 🧹 NETTOYAGE DE RÉPONSE ROBUSTE - REGEX CORRIGÉE ⚠️
        aiResponse = aiResponse.trim();

        // Supprimer markdown et balises
        aiResponse = aiResponse.replace(/```json/gi, '');
        aiResponse = aiResponse.replace(/```/g, '');
        
        // 🔧 CORRECTION REGEX: Utilisation de replace simple au lieu de regex complexe
        const startIndex = aiResponse.indexOf('{');
        const endIndex = aiResponse.lastIndexOf('}');
        
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            aiResponse = aiResponse.substring(startIndex, endIndex + 1);
        }

        console.log('🧹 JSON nettoyé:', aiResponse.substring(0, 200) + '...');

        // Parse JSON avec gestion d'erreur détaillée
        let quizData;
        try {
            quizData = JSON.parse(aiResponse);
        } catch (parseError) {
            console.error('❌ Erreur parsing JSON:', parseError.message);
            console.error('🔍 JSON problématique (100 premiers caractères):', aiResponse.substring(0, 100));
            
            // Tentative de réparation JSON
            try {
                // Remplacer guillemets simples par doubles
                let repairedJSON = aiResponse.replace(/'/g, '"');
                quizData = JSON.parse(repairedJSON);
                console.log('✅ JSON réparé avec succès');
            } catch (repairError) {
                throw new Error(`JSON invalide généré par Groq. Erreur: ${parseError.message}`);
            }
        }

        // Validation stricte de la structure
        if (!quizData || typeof quizData !== 'object') {
            throw new Error('Réponse Groq invalide: format non-objet');
        }

        if (!quizData.questions || !Array.isArray(quizData.questions)) {
            console.error('❌ Structure invalide:', Object.keys(quizData));
            throw new Error('Structure JSON invalide: propriété "questions" manquante ou incorrecte');
        }

        if (quizData.questions.length === 0) {
            throw new Error('Aucune question générée par Groq');
        }

        // Validation détaillée de chaque question
        for (let i = 0; i < quizData.questions.length; i++) {
            const question = quizData.questions[i];
            const qNum = i + 1;

            // Validation structure de base
            if (!question || typeof question !== 'object') {
                throw new Error(`Question ${qNum}: structure invalide`);
            }

            if (!question.type || !question.text || !question.explication) {
                console.error(`❌ Question ${qNum} incomplète:`, question);
                throw new Error(`Question ${qNum}: champs obligatoires manquants (type, text, explication)`);
            }

            // Validation par type
            if (question.type === 'qcm') {
                if (!question.choices || !Array.isArray(question.choices) || question.choices.length < 2) {
                    throw new Error(`QCM ${qNum}: propriété "choices" invalide`);
                }
                if (typeof question.solution !== 'number' || question.solution < 0 || question.solution >= question.choices.length) {
                    throw new Error(`QCM ${qNum}: solution invalide (${question.solution}), doit être entre 0 et ${question.choices.length - 1}`);
                }
            } else if (question.type === 'tf') {
                if (typeof question.solution !== 'boolean') {
                    throw new Error(`Vrai/Faux ${qNum}: solution doit être boolean, reçu ${typeof question.solution}`);
                }
            } else {
                throw new Error(`Question ${qNum}: type "${question.type}" invalide (accepté: "qcm", "tf")`);
            }

            // Validation qualité du contenu
            if (question.text.length < 10) {
                throw new Error(`Question ${qNum}: texte trop court`);
            }
            if (question.explication.length < 20) {
                throw new Error(`Question ${qNum}: explication trop courte`);
            }
        }

        console.log(`✅ Quiz Groq validé: ${quizData.questions.length} questions de qualité générées`);

        // Log statistiques
        const stats = {
            qcm: quizData.questions.filter(q => q.type === 'qcm').length,
            tf: quizData.questions.filter(q => q.type === 'tf').length,
            avgExplanationLength: Math.round(quizData.questions.reduce((sum, q) => sum + q.explication.length, 0) / quizData.questions.length)
        };
        console.log('📊 Stats quiz:', stats);

    return quizData;

    } catch (error) {
        console.error('❌ Erreur complète génération Groq:', error);
        throw error;
    }
}

async function generateAIQuiz() {
    const subjectSelect = document.getElementById('aiSubject');
    const themeInput = document.getElementById('aiTheme');
    const difficultySlider = document.getElementById('aiDifficulty');
    const questionCountSelect = document.getElementById('aiQuestionCount');
    
    if (!subjectSelect || !difficultySlider || !questionCountSelect) {
        toast('Erreur: éléments du formulaire manquants', 'error');
        return;
    }
    
    const subject = subjectSelect.value;
    const theme = themeInput ? themeInput.value.trim() : '';
    const difficulty = parseInt(difficultySlider.value);
    const questionCount = parseInt(questionCountSelect.value);
    
    if (!subject) {
        toast('Veuillez choisir une matière', 'warning');
        return;
    }
    
    const loadingContainer = document.getElementById('aiLoadingContainer');
    const quizDisplay = document.getElementById('aiQuizDisplay');
    const generateBtn = document.getElementById('generateQuizBtn');
    
    try {
        // Sensitivity check on theme and subject
        const combined = (subject + ' ' + (theme || '')).toLowerCase();
        for (const bad of SENSITIVE_KEYWORDS) {
            if (combined.includes(bad)) {
                // Return special code to the caller
                const err = new Error('Thème sensible détecté');
                err.code = BLOCK_CODE;
                err.reason = `Le thème demandé contient un terme sensible: "${bad}"`;
                throw err;
            }
        }

        // Prevent concurrent AI generations
        if (isGeneratingAI) {
            toast('Une génération IA est déjà en cours. Patientez...', 'warning');
            return;
        }
        isGeneratingAI = true;
        // Afficher le loading
        if (loadingContainer) loadingContainer.classList.remove('hidden');
        if (quizDisplay) quizDisplay.classList.add('hidden');
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.textContent = 'Génération par Groq IA...';
        }
        
    // Générer le quiz avec Groq
    const quizData = await callGroqAPI(subject, theme, difficulty, questionCount);
        
        // Dédupliquer questions similaires (prévention de doublons IA)
        const seenTexts = new Set();
        quizData.questions = quizData.questions.filter(q => {
            const key = (q.text || '').trim();
            if (seenTexts.has(key)) return false;
            seenTexts.add(key);
            return true;
        });

        // Créer l'objet quiz complet
        const aiQuiz = {
            titre: `Quiz IA - ${subject}${theme ? ' - ' + theme : ''}`,
            niveau: 'Terminale STI2D',
            themes: theme ? [theme] : [],
            keywords: ['IA', 'Groq', subject],
            memo: `Quiz généré par IA Groq - Difficulté ${difficulty}/5 - ${quizData.questions.length} questions`,
            questions: quizData.questions,
            isAI: true
        };
        
        // Masquer le loading et démarrer le quiz
        if (loadingContainer) loadingContainer.classList.add('hidden');
        
        // Immediately persist a draft entry to history (user may not finish)
        let createdHistoryId = null;
        if (currentUser) {
            try {
                const draftData = {
                    subject: aiQuiz.titre,
                    score: 0,
                    correctAnswers: 0,
                    totalQuestions: aiQuiz.questions.length,
                    createdAt: new Date().toISOString(),
                    completedAt: null,
                    duration: 0,
                    isAI: true,
                    status: "N'a pas répondu",
                    quizSnapshot: aiQuiz // store full quiz for replay
                };

                const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'quizHistory'), sanitizeForFirestore(draftData));
                // Add local id for immediate UX
                createdHistoryId = docRef.id;
                // attach id to the quiz snapshot so startQuiz receives it
                aiQuiz._historyId = createdHistoryId;
                quizHistory.unshift({ id: createdHistoryId, ...draftData });
                calculateUserStats();
                updateDashboard();
            } catch (err) {
                console.error('❌ Erreur sauvegarde draft IA:', err);
            }
        }

        // Démarrer le quiz, passer l'id du draft si disponible
        startQuiz(subject + ' IA', aiQuiz, createdHistoryId);
        toast(`Quiz IA généré ! ${quizData.questions.length} questions créées par Groq.`, 'success');
        
    } catch (error) {
        console.error('❌ Erreur génération quiz IA:', error);
        if (loadingContainer) loadingContainer.classList.add('hidden');
        
        let errorMessage = 'Erreur lors de la génération du quiz IA';
        if (error.code === BLOCK_CODE) {
            // Sensitivity block: show reason and do not generate
            const reason = error.reason || 'Sujet non autorisé';
            toast(`Sujet bloqué: ${reason}`, 'error', 10000);
            // Also record a blocked entry locally for traceability (do not save quizSnapshot)
            if (currentUser) {
                try {
                    const blockEntry = {
                        subject: `Quiz IA - ${subject}${theme ? ' - ' + theme : ''}`,
                        score: 0,
                        correctAnswers: 0,
                        totalQuestions: 0,
                        createdAt: new Date().toISOString(),
                        completedAt: new Date().toISOString(),
                        duration: 0,
                        isAI: true,
                        status: 'Bloqué',
                        blockReason: reason
                    };
                    const ref = await addDoc(collection(db, 'users', currentUser.uid, 'quizHistory'), sanitizeForFirestore(blockEntry));
                    quizHistory.unshift({ id: ref.id, ...blockEntry });
                    calculateUserStats();
                    updateDashboard();
                } catch (saveErr) {
                    console.error('❌ Erreur sauvegarde entrée bloquée:', saveErr);
                }
            }
            return;
        } else if (error.message.includes('Clé API') || error.message.includes('secret GROQ_KEY')) {
            errorMessage = error.message; // Message détaillé pour la configuration
        } else if (error.message.includes('API')) {
            errorMessage = 'Erreur de connexion Groq. Vérifiez votre connexion internet et votre clé API.';
        } else if (error.message.includes('JSON')) {
            errorMessage = 'Erreur de format de réponse IA. Ressayez avec des paramètres différents.';
        } else if (error.message.includes('mal formaté')) {
            errorMessage = 'Groq a généré une réponse incorrecte. Veuillez ressayer.';
        } else if (error.message.includes('limite')) {
            errorMessage = 'Limite de requêtes atteinte. Ressayez dans quelques minutes.';
        }
        
        toast(errorMessage, 'error', 12000); // Plus long pour lire les instructions
    } finally {
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.textContent = '🤖 Générer le quiz';
        }
        isGeneratingAI = false;
    }
}

// ≡ --- QUIZ GAMEPLAY ---

// startQuiz(subjectName, quizData, fromAIImmediateSaveId)
function startQuiz(subjectName, quizData, fromAIImmediateSaveId = null) {
    if (!quizData || !quizData.questions || quizData.questions.length === 0) {
        toast('Quiz non disponible ou vide', 'error');
        return;
    }
    
    currentQuizData = quizData;
    currentQuizIndex = 0;
    // Initialize answers as null = not answered
    userAnswers = new Array(currentQuizData.questions.length).fill(null);
    quizStartTime = Date.now();
    // Attach history id if provided so finishQuiz can update the draft
    // Only attach history id for AI-generated quizzes (drafts)
    if (currentQuizData.isAI) {
        currentQuizData._historyId = fromAIImmediateSaveId || currentQuizData._historyId || null;
    } else {
        // Ensure normal quizzes never inherit a history id and are not treated as drafts
        currentQuizData._historyId = null;
    }
    
    console.log('🎯 Démarrage quiz:', subjectName, '- Questions:', quizData.questions.length);
    
    // Ouvrir le modal de quiz
    const modal = document.getElementById('quizModal');
    const modalTitle = document.getElementById('quizModalTitle');
    
    if (modalTitle) modalTitle.textContent = quizData.titre || subjectName;
    if (modal) modal.classList.remove('hidden');
    
    // Afficher la première question
    displayCurrentQuestion();
}

function displayCurrentQuestion() {
    if (!currentQuizData || currentQuizIndex >= currentQuizData.questions.length) {
        console.error('❌ Erreur affichage question: données invalides');
        return;
    }
    
    const modalBody = document.getElementById('quizModalBody');
    if (!modalBody) {
        console.error('❌ Modal body non trouvé');
        return;
    }
    
    const question = currentQuizData.questions[currentQuizIndex];
    const progress = ((currentQuizIndex / currentQuizData.questions.length) * 100);
    const isLastQuestion = currentQuizIndex === currentQuizData.questions.length - 1;
    
    let html = `
        <div class="quiz-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="progress-text">Question ${currentQuizIndex + 1} sur ${currentQuizData.questions.length}</div>
        </div>
        
        <div class="question-container">
            <div class="question-header">
                <div class="question-number">${currentQuizIndex + 1}</div>
                <div class="question-text">${question.text}</div>
            </div>
    `;
    
    // Affichage des choix selon le type de question
    if (question.type === 'qcm') {
        html += '<div class="choices-container">';
        question.choices.forEach((choice, index) => {
            html += `
                <label class="quiz-choice">
                    <input type="radio" name="answer" value="${index}">
                    <span class="choice-text">${choice}</span>
                </label>
            `;
        });
        html += '</div>';
    } else if (question.type === 'tf') {
        html += `
            <div class="choices-container">
                <label class="quiz-choice">
                    <input type="radio" name="answer" value="true">
                    <span class="choice-text">✓ Vrai</span>
                </label>
                <label class="quiz-choice">
                    <input type="radio" name="answer" value="false">
                    <span class="choice-text">✗ Faux</span>
                </label>
            </div>
        `;
    }
    
    html += `
            <div class="question-actions">
                <button class="quiz-btn secondary" onclick="previousQuestion()" ${currentQuizIndex === 0 ? 'disabled' : ''}>
                    ← Précédent
                </button>
                <button class="quiz-btn primary" onclick="nextQuestion()">
                    ${isLastQuestion ? 'Terminer le quiz' : 'Suivant →'}
                </button>
            </div>
        </div>
    `;
    
    modalBody.innerHTML = html;
    
    // Restaurer la réponse précédente si elle existe
    const previousAnswer = userAnswers[currentQuizIndex];
    if (previousAnswer !== undefined && previousAnswer !== null) {
        const radio = modalBody.querySelector(`input[value="${previousAnswer}"]`);
        if (radio) radio.checked = true;
    }
}

function nextQuestion() {
    const selectedAnswer = document.querySelector('input[name="answer"]:checked');
    if (!selectedAnswer) {
        toast('Veuillez sélectionner une réponse', 'warning');
        return;
    }
    
    // Sauvegarder la réponse
    const answerValue = selectedAnswer.value;
    let userAnswer;
    if (currentQuizData.questions[currentQuizIndex].type === 'tf') {
        userAnswer = answerValue === 'true';
    } else {
        userAnswer = parseInt(answerValue);
    }
    
    userAnswers[currentQuizIndex] = userAnswer;
    
    // Passer à la question suivante ou terminer
    if (currentQuizIndex < currentQuizData.questions.length - 1) {
        currentQuizIndex++;
        displayCurrentQuestion();
    } else {
        finishQuiz();
    }
}

function previousQuestion() {
    if (currentQuizIndex > 0) {
        currentQuizIndex--;
        displayCurrentQuestion();
    }
}

async function finishQuiz() {
    if (!currentQuizData || !userAnswers) {
        toast('Erreur lors de la finalisation du quiz', 'error');
        return;
    }
    
    // Calculer le score
    let correctAnswers = 0;
    const results = [];
    
    currentQuizData.questions.forEach((question, index) => {
    const userAnswer = userAnswers[index];
        const correctAnswer = question.solution;
    const isCorrect = userAnswer === correctAnswer;
        
        if (isCorrect) correctAnswers++;
        
        results.push({
            question: question.text,
            userAnswer,
            correctAnswer,
            isCorrect,
            explanation: question.explication,
            type: question.type,
            choices: question.choices
        });
    });
    
    const totalQuestions = currentQuizData.questions.length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const duration = Math.round((Date.now() - quizStartTime) / 1000); // en secondes
    
    console.log(`🏆 Quiz terminé: ${correctAnswers}/${totalQuestions} (${score}%) en ${duration}s`);
    
    // Sauvegarder l'historique si utilisateur connecté
    if (currentUser) {
        try {
            const historyRefColl = collection(db, 'users', currentUser.uid, 'quizHistory');

            const payload = {
                subject: currentQuizData.titre || currentQuizData.subject || 'Quiz',
                score: score,
                correctAnswers: correctAnswers,
                totalQuestions: totalQuestions,
                completedAt: new Date().toISOString(),
                duration: duration,
                isAI: currentQuizData.isAI || false,
                status: "Terminé",
                quizSnapshot: currentQuizData,
                results: results
            };

            // Ensure createdAt exists so queries ordering by createdAt include this doc
            if (!payload.createdAt) payload.createdAt = new Date().toISOString();

            // If we have a history id, ensure it's a valid string; otherwise attempt to resolve it
            let historyId = currentQuizData._historyId;
            if (historyId && typeof historyId !== 'string') historyId = null;

            // Try to resolve locally if missing
            if (!historyId) {
                // Find a likely matching draft in local quizHistory
                const candidate = quizHistory.find(q => {
                    if (!q) return false;
                    // draft entries have status "N'a pas répondu" or completedAt null
                    const isDraft = (!q.completedAt) || (q.status && q.status === "N'a pas répondu");
                    return isDraft && q.subject === (currentQuizData.titre || currentQuizData.subject) && (q.totalQuestions === totalQuestions);
                });
                if (candidate && candidate.id) {
                    historyId = candidate.id;
                    // also attach back to currentQuizData for future
                    currentQuizData._historyId = historyId;
                }
            }

            if (historyId) {
                // Update existing draft
                try {
                    const refDoc = doc(db, 'users', currentUser.uid, 'quizHistory', historyId);
                    await updateDoc(refDoc, sanitizeForFirestore(payload));
                    console.log('🔁 Historique (draft) mis à jour');
                    // update local quizHistory entry to reflect completion
                    const idx = quizHistory.findIndex(q => q.id === historyId);
                    if (idx !== -1) {
                        quizHistory[idx] = { ...quizHistory[idx], ...payload, id: historyId };
                    }
                } catch (updateErr) {
                    console.error('❌ Erreur mise à jour draft:', updateErr);
                    // Fallback to add new entry
                    const newDocRef = await addDoc(historyRefColl, sanitizeForFirestore(payload));
                    // If we had a local draft, replace it with the new completed entry
                    if (historyId) {
                        const idx = quizHistory.findIndex(q => q.id === historyId);
                        if (idx !== -1) {
                            quizHistory[idx] = { id: newDocRef.id, ...payload };
                        } else {
                            quizHistory.unshift({ id: newDocRef.id, ...payload });
                        }
                    } else {
                        quizHistory.unshift({ id: newDocRef.id, ...payload });
                    }
                }
            } else {
                console.debug('📥 Ajout nouvel historique (non-draft) payload:', { subject: payload.subject, createdAt: payload.createdAt, totalQuestions: payload.totalQuestions });
                const newDocRef = await addDoc(historyRefColl, sanitizeForFirestore(payload));
                console.debug('📤 Document créé id:', newDocRef.id);
                quizHistory.unshift({ id: newDocRef.id, ...payload });
            }
            // Recharger les données utilisateur (async) and immediately update UI
            try {
                loadUserProgress();
            } catch (e) {
                console.warn('⚠️ loadUserProgress non critique a échoué:', e);
            }
            updateDashboard();
            // Re-render history now from local array to show updated status quickly
            try {
                renderHistory();
            } catch (e) {
                console.warn('⚠️ renderHistory non critique a échoué:', e);
            }
            // Delayed re-sync: sometimes Firestore needs a moment to be query-able
            setTimeout(() => {
                try {
                    loadUserProgress();
                    renderHistory();
                } catch (e) {
                    console.warn('⚠️ re-sync non critique a échoué:', e);
                }
            }, 1200);
            console.log('💾 Historique sauvegardé');
        } catch (error) {
            console.error('❌ Erreur sauvegarde quiz:', error);
            toast('Quiz terminé mais erreur de sauvegarde', 'warning');
        }
    }
    
    // Afficher les résultats
    displayQuizResults(score, correctAnswers, totalQuestions, results, duration);
}

function displayQuizResults(score, correct, total, results, duration) {
    const modalBody = document.getElementById('quizModalBody');
    if (!modalBody) return;
    
    // Déterminer le niveau de performance
    let resultClass = 'poor';
    let resultEmoji = '😞';
    let resultMessage = 'Il faut encore travailler !';
    
    if (score >= 90) {
        resultClass = 'excellent';
        resultEmoji = '🎉';
        resultMessage = 'Excellent travail !';
    } else if (score >= 75) {
        resultClass = 'good';
        resultEmoji = '😊';
        resultMessage = 'Très bien joué !';
    } else if (score >= 60) {
        resultClass = 'average';
        resultEmoji = '😐';
        resultMessage = 'Pas mal, continuez !';
    }
    
    let html = `
        <div class="quiz-result">
            <div class="result-header ${resultClass}">
                <span class="result-emoji">${resultEmoji}</span>
                <h3>${resultMessage}</h3>
                <div class="score-display">
                    <span class="score">${correct}/${total}</span>
                    <span class="percentage">${score}%</span>
                </div>
            </div>
            
            <div class="quiz-stats">
                <span>📊 Score: ${score}%</span>
                <span>✅ Correct: ${correct}</span>
                <span>❌ Incorrect: ${total - correct}</span>
                <span>⏱️ Durée: ${duration}s</span>
            </div>
        </div>

        <div class="results-details">
            <h4>📋 Détail des réponses</h4>
    `;
    
    results.forEach((result, index) => {
        html += `
            <div class="result-item ${result.isCorrect ? 'correct' : 'incorrect'}">
                <div class="result-question">
                    <span class="result-icon">${result.isCorrect ? '✅' : '❌'}</span>
                    <div>
                        <strong>Question ${index + 1}:</strong> ${result.question}
                    </div>
                </div>
        `;
        
        if (result.type === 'qcm') {
            const userChoice = result.choices[result.userAnswer] || 'Aucune réponse';
            const correctChoice = result.choices[result.correctAnswer] || 'Erreur';
            html += `
                <div class="result-answer">
                    <strong>Votre réponse:</strong> ${userChoice}<br>
                    <strong>Bonne réponse:</strong> ${correctChoice}
                </div>
            `;
        } else if (result.type === 'tf') {
            html += `
                <div class="result-answer">
                    <strong>Votre réponse:</strong> ${result.userAnswer ? 'Vrai' : 'Faux'}<br>
                    <strong>Bonne réponse:</strong> ${result.correctAnswer ? 'Vrai' : 'Faux'}
                </div>
            `;
        }
        
        html += `
                <div class="result-explanation">
                    <strong>Explication:</strong> ${result.explanation}
                </div>
            </div>
        `;
    });
    
    html += `
        </div>
        
        <div class="quiz-actions">
            <button class="quiz-btn secondary" onclick="closeQuizModal()">Fermer</button>
            <button class="quiz-btn primary" id="restartSameQuizBtn">Recommencer ce quiz</button>
        </div>
    `;
    
    modalBody.innerHTML = html;

    // Attach restart handler
    const restartBtn = document.getElementById('restartSameQuizBtn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            // Restart using the same snapshot (deep clone to avoid mutation)
            const snapshot = JSON.parse(JSON.stringify(currentQuizData));
            closeQuizModal();
            startQuiz(snapshot.titre || 'Quiz', snapshot);
        });
    }
}

function closeQuizModal() {
    const modal = document.getElementById('quizModal');
    if (modal) modal.classList.add('hidden');
    
    currentQuizData = null;
    currentQuizIndex = 0;
    userAnswers = [];
}

// ≡ --- HISTORIQUE ---

function renderHistory() {
    const container = document.getElementById('history-container');
    if (!container) return;
    
    if (quizHistory.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <h3>Aucun historique</h3>
                <p>Commencez par faire quelques quiz pour voir vos statistiques apparaître ici !</p>
                <button class="quiz-btn primary" onclick="showSection('quiz-select')">Faire un quiz</button>
            </div>
        `;
        return;
    }
    
    // Statistiques globales
    const stats = calculateDetailedStats();
    let html = `
        <div class="history-stats">
            <div class="stat-card">
                <div class="stat-value">${stats.totalQuizzes}</div>
                <div class="stat-label">Quiz complétés</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.averageScore}%</div>
                <div class="stat-label">Score moyen</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.bestScore}%</div>
                <div class="stat-label">Meilleur score</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.currentStreak}</div>
                <div class="stat-label">Série actuelle</div>
            </div>
        </div>
        
        <div class="history-list">
            <h3>📚 Historique détaillé</h3>
    `;
    
    quizHistory.forEach((quiz, index) => {
        const date = new Date(quiz.completedAt);
    // Handle drafts and blocked entries (drafts only for AI-generated quizzes)
    const isDraft = quiz.isAI && !quiz.completedAt;
        const createdDate = new Date(quiz.createdAt || Date.now());
        const formattedDate = createdDate.toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
        const formattedTime = createdDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        const scoreClass = (quiz.score || 0) >= 80 ? 'excellent' : (quiz.score || 0) >= 60 ? 'good' : 'average';
        const aiLabel = quiz.isAI ? '<span class="ai-badge">IA</span>' : '';
        const statusLabel = quiz.status ? `<span class="history-status">${quiz.status}</span>` : (isDraft ? "N'a pas répondu" : 'Terminé');
        const blockReason = quiz.blockReason ? `<div class="block-reason">🔒 ${quiz.blockReason}</div>` : '';

        html += `
            <div class="history-item ${scoreClass}" data-history-id="${quiz.id}">
                <div class="history-header">
                    <div class="history-subject">
                        <strong>${quiz.subject}</strong>
                        ${aiLabel}
                    </div>
                    <div class="history-score">${quiz.score ? quiz.score + '%' : '-'}</div>
                </div>
                <div class="history-details">
                    <span>📅 ${formattedDate} ${formattedTime}</span>
                    <span>📊 ${quiz.correctAnswers || 0}/${quiz.totalQuestions || 0}</span>
                    <span>⏱️ ${quiz.duration || 0}s</span>
                    ${statusLabel}
                </div>
                ${blockReason}
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;

    // Make items clickable
    container.querySelectorAll('.history-item[data-history-id]').forEach(item => {
        item.addEventListener('click', async () => {
            const id = item.getAttribute('data-history-id');
            openHistoryQuiz(id);
        });
    });
}

async function openHistoryQuiz(historyId) {
    if (!currentUser) {
        toast('Veuillez vous connecter pour voir l\'historique', 'warning');
        return;
    }

    try {
        const docRef = doc(db, 'users', currentUser.uid, 'quizHistory', historyId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
            toast('Entrée historique introuvable', 'error');
            return;
        }

        const data = snap.data();

        if (data.status === 'Bloqué' || data.blockReason) {
            // Show a blocked message
            toast(`Quiz bloqué: ${data.blockReason || 'Sujet non autorisé'}`, 'error', 8000);
            return;
        }

        if (data.quizSnapshot && data.quizSnapshot.questions && data.quizSnapshot.questions.length > 0) {
            // Show a choice modal: Revoir ou Retenter (works for AI and normal quizzes)
            const snapshot = JSON.parse(JSON.stringify(data.quizSnapshot));

            const modal = document.getElementById('quizModal');
            const modalTitle = document.getElementById('quizModalTitle');
            const modalBody = document.getElementById('quizModalBody');
            if (modalTitle) modalTitle.textContent = data.subject || snapshot.titre || 'Quiz';
            if (!modalBody) {
                toast('Impossible d\'ouvrir le modal', 'error');
                return;
            }

            const formattedDate = new Date(data.completedAt || data.createdAt || Date.now()).toLocaleString('fr-FR');

            modalBody.innerHTML = `
                <div class="history-choices">
                    <h4>${data.subject || snapshot.titre || 'Quiz'}</h4>
                    <div class="meta">📅 ${formattedDate} • ${snapshot.questions.length} questions ${data.isAI ? '• IA' : ''}</div>
                    <p>Que voulez-vous faire ?</p>
                    <div class="choice-buttons">
                        <button class="quiz-btn secondary" id="historyReviewBtn">Revoir (questions & réponses)</button>
                        <button class="quiz-btn primary" id="historyRetakeBtn">Retenter ce quiz</button>
                        <button class="quiz-btn" id="historyCloseBtn">Fermer</button>
                    </div>
                </div>
            `;

            if (modal) modal.classList.remove('hidden');

            // Review handler
            const reviewBtn = document.getElementById('historyReviewBtn');
            if (reviewBtn) {
                reviewBtn.addEventListener('click', () => {
                    // Prepare fake results if none exist
                    const fakeResults = data.results || snapshot.questions.map(q => ({
                        question: q.text,
                        userAnswer: null,
                        correctAnswer: q.solution,
                        isCorrect: false,
                        explanation: q.explication,
                        type: q.type,
                        choices: q.choices
                    }));

                    const fakeScore = data.score || 0;
                    const fakeCorrect = data.correctAnswers || 0;
                    const fakeTotal = data.totalQuestions || snapshot.questions.length;

                    // Set currentQuizData for consistent behavior (for restart button inside results)
                    currentQuizData = snapshot;
                    // Prefill userAnswers from results if present
                    if (data.results && Array.isArray(data.results)) {
                        userAnswers = data.results.map(r => r.userAnswer === undefined ? null : r.userAnswer);
                    } else {
                        userAnswers = new Array(snapshot.questions.length).fill(null);
                    }

                    displayQuizResults(fakeScore, fakeCorrect, fakeTotal, fakeResults, data.duration || 0);
                });
            }

            // Retake handler
            const retakeBtn = document.getElementById('historyRetakeBtn');
            if (retakeBtn) {
                retakeBtn.addEventListener('click', () => {
                    // Deep clone and ensure we don't reuse the old history id for updating
                    const retakeSnapshot = JSON.parse(JSON.stringify(snapshot));
                    // Avoid updating the original history entry when retaking
                    if (retakeSnapshot.isAI) retakeSnapshot._historyId = null;
                    closeQuizModal();
                    startQuiz(retakeSnapshot.titre || data.subject || 'Quiz', retakeSnapshot);
                });
            }

            const closeBtn = document.getElementById('historyCloseBtn');
            if (closeBtn) closeBtn.addEventListener('click', () => closeQuizModal());
        } else {
            toast('Aucun quiz associé à cette entrée', 'warning');
        }
    } catch (err) {
        console.error('❌ Erreur ouverture historique:', err);
        toast('Erreur lors de l\'ouverture de l\'historique', 'error');
    }
}

function calculateDetailedStats() {
    if (quizHistory.length === 0) {
        return {
            totalQuizzes: 0,
            averageScore: 0,
            bestScore: 0,
            currentStreak: 0
        };
    }
    
    const scores = quizHistory.map(q => q.score || 0);
    const totalQuizzes = quizHistory.length;
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / totalQuizzes);
    const bestScore = Math.max(...scores);
    
    // Calculer la série actuelle (scores >= 70%)
    let currentStreak = 0;
    for (let i = 0; i < quizHistory.length; i++) {
        if (quizHistory[i].score >= 70) {
            currentStreak++;
        } else {
            break;
        }
    }
    
    return {
        totalQuizzes,
        averageScore,
        bestScore,
        currentStreak
    };
}

// ≡ --- AUTHENTIFICATION ---

async function loginUser() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');
    
    if (!email || !password) {
        toast('Veuillez remplir tous les champs', 'warning');
        return;
    }
    
    try {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Connexion...';
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ Connexion réussie:', userCredential.user.email);
        toast('Connexion réussie !', 'success');
        
        // Track login
        if (analytics) {
            logEvent(analytics, 'login');
        }
        
    } catch (error) {
        console.error('❌ Erreur connexion:', error);
        let errorMessage = 'Erreur de connexion';
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Aucun compte trouvé avec cet email';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Mot de passe incorrect';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Adresse email invalide';
        }
        
        toast(errorMessage, 'error');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Se connecter';
    }
}

async function registerUser() {
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const specialty = document.getElementById('signupSpecialty').value;
    const lv1 = document.getElementById('signupLV1').value;
    const lv2 = document.getElementById('signupLV2').value;
    const registerBtn = document.getElementById('signupBtn');
    
    if (!email || !password || !specialty || !lv1) {
        toast('Veuillez remplir tous les champs obligatoires', 'warning');
        return;
    }
    
    if (password.length < 6) {
        toast('Le mot de passe doit contenir au moins 6 caractères', 'warning');
        return;
    }
    
    try {
        registerBtn.disabled = true;
        registerBtn.textContent = 'Inscription...';
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Créer le profil utilisateur
        await setDoc(doc(db, 'users', user.uid), {
            email: email,
            displayName: email.split('@')[0],
            speciality: specialty,
            lv1: lv1,
            lv2: lv2 || '',
            createdAt: new Date().toISOString()
        });
        
        console.log('✅ Inscription réussie:', user.email);
        toast('Inscription réussie ! Bienvenue sur Learni !', 'success');
        
        // Track registration
        if (analytics) {
            logEvent(analytics, 'signup');
        }
        
    } catch (error) {
        console.error('❌ Erreur inscription:', error);
        let errorMessage = 'Erreur d\'inscription';
        
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Cette adresse email est déjà utilisée';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Le mot de passe est trop faible';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Adresse email invalide';
        }
        
        toast(errorMessage, 'error');
    } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = 'Créer mon compte';
    }
}

async function logoutUser() {
    try {
        // Detach realtime listener if present
        if (userDocUnsubscribe) {
            try { userDocUnsubscribe(); } catch (e) { /* ignore */ }
            userDocUnsubscribe = null;
        }

        await signOut(auth);
        console.log('✅ Déconnexion réussie');
        toast('Déconnecté avec succès', 'success');
        
        // Réinitialiser les données
        currentUser = null;
        userData = {};
        quizHistory = [];
        userProgress = {};
        
    } catch (error) {
        console.error('❌ Erreur déconnexion:', error);
        toast('Erreur lors de la déconnexion', 'error');
    }
}

function showAuthForm(formType) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('signupForm');
    const loginTab = document.querySelector('.auth-tab[data-tab="login"]');
    const registerTab = document.querySelector('.auth-tab[data-tab="signup"]');
    
    if (formType === 'login') {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
    } else {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        loginTab.classList.remove('active');
        registerTab.classList.add('active');
    }
}

// 🔧 FONCTION D'INITIALISATION CORRIGÉE - VERSION FONCTIONNELLE
function hideLoadingScreen() {
    console.log('🔧 Masquage de l\'écran de chargement...');
    
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingText = document.querySelector('#loadingScreen p');
    
    if (loadingText) {
        loadingText.textContent = 'Initialisation terminée !';
    }
    
    setTimeout(() => {
        if (loadingScreen) {
            console.log('🔧 Application de la classe hidden à loadingScreen');
            loadingScreen.classList.add('hidden');
            
            // Double vérification que l'écran est bien masqué
            setTimeout(() => {
                if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
                    console.log('🔧 Force hiding loadingScreen avec style direct');
                    loadingScreen.style.display = 'none';
                }
            }, 100);
        }
    }, 800);
}

// Initialiser les écouteurs d'événements pour les modals
function initModals() {
    // Modal de sélection du nombre de questions
    const closeQuizOptionsBtn = document.getElementById('closeQuizOptionsModal');
    if (closeQuizOptionsBtn) {
        closeQuizOptionsBtn.onclick = closeQuizOptionsModal;
    }
}

// ≡ --- INITIALISATION ---

document.addEventListener('DOMContentLoaded', async () => {
    // Initialiser les modals
    initModals();
    // Animation d'entrée uniquement au premier vrai chargement (pas navigation interne)
    if (!sessionStorage.getItem('homeAnimated')) {
        document.body.classList.add('home-animate-in');
        sessionStorage.setItem('homeAnimated', '1');
        setTimeout(() => document.body.classList.remove('home-animate-in'), 1800);
    }
    console.log('🚀 Initialisation Learni STI2D...');
    
    try {
        // Appliquer le thème
        switchTheme(theme);
        
        // Charger les quiz
        const loadingText = document.querySelector('#loadingScreen p');
        if (loadingText) loadingText.textContent = 'Chargement des quiz...';
        
        await loadQuizzes();
        
        // Configuration des event listeners
        if (loadingText) loadingText.textContent = 'Configuration de l\'interface...';
        
        setupEventListeners();
        
        // Écouter les changements d'authentification
        onAuthStateChanged(auth, user => {
            if (user) {
                console.log('👤 Utilisateur connecté:', user.email);
                fetchAndSyncUserData(user);
                hideLoadingScreen();
                setTimeout(() => showSection('dashboard'), 1000);
            } else {
                console.log('👤 Utilisateur déconnecté');
                // Detach any realtime listener when signed out
                if (userDocUnsubscribe) {
                    try { userDocUnsubscribe(); } catch (e) { /* ignore */ }
                    userDocUnsubscribe = null;
                }
                hideLoadingScreen();
                setTimeout(() => showSection('authSection'), 1000);
            }
        });
        
        console.log('✅ Application initialisée avec succès');
        
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        toast('Erreur lors de l\'initialisation: ' + error.message, 'error');
        hideLoadingScreen();
        setTimeout(() => showSection('authSection'), 1000);
    }
});

// 🔧 CORRECTION NAVIGATION : Event Listeners améliorés pour résoudre le problème de clic
function setupEventListeners() {
    // 🔧 NAVIGATION CORRIGÉE : Event delegation pour capturer les clics partout sur les boutons
    document.addEventListener('click', e => {
        // Bouton paramètres (ouvre le modal)
        if (e.target.closest('#settingsBtn')) {
            e.preventDefault();
            openSettingsModal();
            return;
        }
        // Fermeture du modal paramètres
        if (e.target.closest('#closeSettingsModal')) {
            e.preventDefault();
            closeSettingsModal();
            return;
        }
        // Bouton voir mes données (transparence)
        if (e.target.closest('#showUserDataBtn')) {
            e.preventDefault();
            closeSettingsModal();
            setTimeout(() => openUserDataModal(), 180);
            return;
        }
        // Fermeture du modal données utilisateur
        if (e.target.closest('#closeUserDataModal')) {
            e.preventDefault();
            closeUserDataModal();
            return;
        }
function closeUserDataModal() {
    document.getElementById('userDataModal').classList.add('hidden');
    document.body.style.overflow = '';
}
        // Boutons de navigation principale - SOLUTION pour le problème de clic sur les spans
        const navBtn = e.target.closest('.nav-btn[data-section]');
        if (navBtn) {
            e.preventDefault();
            e.stopPropagation();
            const section = navBtn.getAttribute('data-section');
            if (section) {
                console.log('🔧 Navigation vers:', section);
                showSection(section);
            }
            return;
        }
        
        // Onglets d'authentification - SOLUTION pour les auth-tabs
        const authTab = e.target.closest('.auth-tab[data-tab]');
        if (authTab) {
            e.preventDefault();
            e.stopPropagation();
            const tabType = authTab.getAttribute('data-tab');
            if (tabType) {
                console.log('🔧 Onglet auth:', tabType);
                showAuthForm(tabType);
            }
            return;
        }
        
        // Bouton de thème
        if (e.target.closest('#themeSwitcher')) {
            e.preventDefault();
            switchTheme();
            return;
        }
        
        // Bouton de déconnexion
        if (e.target.closest('#logoutBtn')) {
            e.preventDefault();
            logoutUser();
            return;
        }
        
        // Bouton de fermeture modal quiz
        if (e.target.closest('#closeQuizModal, .quiz-modal-close')) {
            e.preventDefault();
            closeQuizModal();
            return;
        }
        
        // Bouton génération quiz IA
        if (e.target.closest('#generateQuizBtn')) {
            e.preventDefault();
            generateAIQuiz();
            return;
        }
    });
    
    // Formulaires d'authentification
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', e => {
            e.preventDefault();
            loginUser();
        });
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', e => {
            e.preventDefault();
            registerUser();
        });
    }
    
    // Fermeture de modal en cliquant sur le fond
    const quizModal = document.getElementById('quizModal');
    if (quizModal) {
        quizModal.addEventListener('click', e => {
            if (e.target === quizModal) closeQuizModal();
        });
    }
    
    // Raccourcis clavier
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeQuizModal();
    });
    
    console.log('✅ Event listeners configurés avec correction navigation');
    // Formulaire changement de mot de passe
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async e => {
            e.preventDefault();
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            if (!currentUser || !currentUser.email) {
                toast('Utilisateur non connecté', 'error');
                return;
            }
            try {
                // Re-authentifier l'utilisateur
                const cred = firebase.auth.EmailAuthProvider.credential(currentUser.email, currentPassword);
                await firebase.auth().currentUser.reauthenticateWithCredential(cred);
                await firebase.auth().currentUser.updatePassword(newPassword);
                toast('Mot de passe changé avec succès', 'success');
                changePasswordForm.reset();
            } catch (err) {
                toast('Erreur : ' + (err.message || err), 'error');
            }
        });
    }

    // Formulaire options utilisateur
    const userOptionsForm = document.getElementById('userOptionsForm');
    if (userOptionsForm) {
        userOptionsForm.addEventListener('submit', async e => {
            e.preventDefault();
            if (!currentUser || !currentUser.uid) {
                toast('Utilisateur non connecté', 'error');
                return;
            }
            const lang = document.getElementById('optionLang').value;
            const specialty = document.getElementById('optionSpecialty').value;
            const lv1 = document.getElementById('optionLV1').value;
            const lv2 = document.getElementById('optionLV2').value;
            try {
                await updateDoc(doc(db, 'users', currentUser.uid), {
                    lang, speciality: specialty, lv1, lv2
                });
                toast('Options enregistrées', 'success');
            } catch (err) {
                toast('Erreur : ' + (err.message || err), 'error');
            }
        });
    }
}
// Affiche toutes les données connues sur l'utilisateur (Firebase Auth, Firestore, quizHistory...)
async function openUserDataModal() {
    try {
        const modal = document.getElementById('userDataModal');
        const list = document.getElementById('userDataList');
        if (!currentUser) {
            list.innerHTML = '<div style="text-align:center;color:#888;">Non connecté.</div>';
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            return;
        }
        // Firebase Auth user
        const authData = { ...currentUser };
        // Firestore user doc
        let firestoreData = {};
        try {
            const snap = await getDoc(doc(db, 'users', currentUser.uid));
            if (snap.exists()) firestoreData = snap.data();
        } catch {}
        // Quiz history (local cache)
        let historyData = [];
        try {
            historyData = Array.isArray(quizHistory) ? quizHistory : [];
        } catch {}
        // Affichage lisible
        let html = '';
        const fields = [
            { label: 'Email', value: authData.email },
            { label: 'Nom affiché', value: authData.displayName },
            { label: 'Spécialité', value: firestoreData.specialty || firestoreData.speciality },
            { label: 'LV1', value: firestoreData.lv1 },
            { label: 'LV2', value: firestoreData.lv2 },
            { label: 'Langue', value: firestoreData.lang },
            { label: 'Date de création', value: authData.metadata?.creationTime },
            { label: 'Dernière connexion', value: authData.metadata?.lastSignInTime },
        ];
        fields.forEach(f => {
            if (f.value) {
                html += `<div class=\"user-data-item\"><div class=\"user-data-label\">${f.label}</div><div class=\"user-data-value\">${f.value}</div></div>`;
            }
        });
        if (Array.isArray(historyData) && historyData.length) {
            html += `<div class=\"user-data-item\"><div class=\"user-data-label\">Historique des quiz</div><div class=\"user-data-value\">${historyData.length} quiz enregistrés</div></div>`;
        }
        if (!html) html = '<div style=\"text-align:center;color:#888;\">Aucune donnée à afficher.</div>';
        list.innerHTML = html;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } catch (err) {
        alert('Erreur lors de la récupération des données : ' + err);
    }
}

// ≡ --- FONCTIONS GLOBALES EXPOSÉES ---

window.showSection = showSection;
window.switchTheme = switchTheme;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;
window.showAuthForm = showAuthForm;
window.generateAIQuiz = generateAIQuiz;
window.startQuiz = startQuiz;
window.nextQuestion = nextQuestion;
window.previousQuestion = previousQuestion;
window.closeQuizModal = closeQuizModal;

console.log('📝 app-ameliore.js chargé avec Groq IA gratuite et navigation corrigée');
