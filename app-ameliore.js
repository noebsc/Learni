/* ========== app-ameliore.js - Learni STI2D COMPLET AVEC GROQ IA GRATUITE - NAVIGATION CORRIGÉE ========== */

// Import Firebase
import { 
    auth, db, analytics,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut, onAuthStateChanged,
    doc, setDoc, getDoc, updateDoc,
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
            themes: ["Valeurs républicaines", "Citoyenneté", "Droit et devoirs", "Liberté", "Égalité"],
            description: "Enseignement moral et civique"
        },
        "EPS": {
            themes: ["Sport collectif", "Sport individuel", "Santé", "Sécurité", "Nutrition"],
            description: "Éducation physique et sportive"
        },
        "Anglais": {
            themes: ["Vie quotidienne", "Technologie", "Société", "Environnement", "Innovation"],
            description: "Langue vivante 1 - Communication et culture"
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
    const sections = ['dashboard', 'quiz-select', 'fiches', 'quiz-ai', 'history'];
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
    
    document.body.className = `theme-${theme}`;
    localStorage.setItem('theme', theme);
    
    const switcher = document.getElementById('themeSwitcher');
    if (switcher) {
        switcher.textContent = theme === 'dark' ? '☀️' : '🌙';
        switcher.style.transform = 'scale(1.2)';
        setTimeout(() => switcher.style.transform = 'scale(1)', 150);
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

// 🔧 CORRECTION 1: Chargement des quiz avec bon chemin
async function loadQuizzes() {
    try {
        const cached = localStorage.getItem('quizzes_cache');
        const cacheTime = localStorage.getItem('quizzes_cache_time');
        
        // Utiliser le cache si moins de 1 heure
        if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 3600000) {
            quizzes = JSON.parse(cached);
            console.log('✅ Quizzes chargés depuis le cache');
            return;
        }

        // 🔧 CHEMIN CORRIGÉ: ./sti2d.json au lieu de /Learni/sti2d.json
        console.log('📄 Chargement des quiz depuis ./sti2d.json');
        const resp = await fetch('./sti2d.json');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        
        quizzes = await resp.json();
        console.log('✅ Quiz chargés:', Object.keys(quizzes).length, 'matières');
        
        // Mise en cache
        localStorage.setItem('quizzes_cache', JSON.stringify(quizzes));
        localStorage.setItem('quizzes_cache_time', Date.now().toString());
        
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
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
            speciality = userData.speciality || '';
            lv1 = userData.lv1 || '';
            lv2 = userData.lv2 || '';
        } else {
            userData = {
                email: user.email,
                displayName: user.displayName || 'Utilisateur',
                speciality: '',
                lv1: '',
                lv2: '',
                createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', user.uid), userData);
        }
        
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
        const historyQuery = query(
            collection(db, 'users', currentUser.uid, 'quizHistory'),
            orderBy('completedAt', 'desc'),
            limit(50)
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
        const date = new Date(quiz.completedAt).toLocaleDateString('fr-FR');
        const scoreClass = quiz.score >= 80 ? 'excellent' : quiz.score >= 60 ? 'good' : 'average';
        
        html += `
            <div class="activity-item ${scoreClass}">
                <div class="activity-info">
                    <strong>${quiz.subject}</strong>
                    <span class="activity-date">${date}</span>
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
        const available = quizzes[subject] && quizzes[subject].length > 0;
        const questionCount = available ? quizzes[subject][0].questions?.length || 0 : 'N/A';
        const isUserSubject = subject === lv1 || subject === lv2;
        
        html += `
            <div class="subject-card ${!available ? 'unavailable' : ''} ${isUserSubject ? 'user-specialty' : ''}" 
                 data-subject="${subject}" ${!available ? 'title="Quiz non disponible"' : ''}>
                ${isUserSubject ? '<span class="user-badge">Votre matière</span>' : ''}
                <div class="subject-icon">${getSubjectIcon(subject)}</div>
                <h4>${subject}</h4>
                <div class="question-count">${questionCount} questions</div>
                <div class="subject-themes">${info.themes.slice(0, 3).join(', ')}...</div>
                <div class="subject-description">${info.description}</div>
                ${!available ? '<div class="unavailable-badge">Bientôt disponible</div>' : ''}
            </div>
        `;
    });
    html += '</div></div>';
    
    // Spécialités
    html += `<div class="category"><h3>🔧 Spécialités STI2D</h3><div class="subjects-grid">`;
    Object.entries(STI2D_SUBJECTS["Spécialités"]).forEach(([subject, info]) => {
        const available = quizzes[subject] && quizzes[subject].length > 0;
        const questionCount = available ? quizzes[subject][0].questions?.length || 0 : 'N/A';
        const isUserSpecialty = subject === speciality;
        
        html += `
            <div class="subject-card ${!available ? 'unavailable' : ''} ${isUserSpecialty ? 'user-specialty' : ''}" 
                 data-subject="${subject}" ${!available ? 'title="Quiz non disponible"' : ''}>
                ${isUserSpecialty ? '<span class="user-badge">Votre spécialité</span>' : ''}
                <div class="subject-icon">${getSubjectIcon(subject)}</div>
                <h4>${subject}</h4>
                <div class="question-count">${questionCount} questions</div>
                <div class="subject-themes">${info.themes.slice(0, 3).join(', ')}...</div>
                <div class="subject-description">${info.description}</div>
                ${!available ? '<div class="unavailable-badge">Bientôt disponible</div>' : ''}
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
            if (subject && quizzes[subject] && quizzes[subject].length > 0) {
                startQuiz(subject, quizzes[subject][0]);
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
        '2I2D': '⚙️',
        'AC': '🏗️',
        'ITEC': '💡',
        'EE': '🔋',
        'SIN': '💻'
    };
    return icons[subject] || '📚';
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
    
    const generateBtn = document.getElementById('generateQuizBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateAIQuiz);
    }
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
            model: "llama-3.1-70b-versatile", // Modèle le plus performant disponible
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
        // Afficher le loading
        if (loadingContainer) loadingContainer.classList.remove('hidden');
        if (quizDisplay) quizDisplay.classList.add('hidden');
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.textContent = 'Génération par Groq IA...';
        }
        
        // Générer le quiz avec Groq
        const quizData = await callGroqAPI(subject, theme, difficulty, questionCount);
        
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
        
        // Démarrer le quiz
        startQuiz(subject + ' IA', aiQuiz);
        toast(`Quiz IA généré ! ${quizData.questions.length} questions créées par Groq.`, 'success');
        
    } catch (error) {
        console.error('❌ Erreur génération quiz IA:', error);
        if (loadingContainer) loadingContainer.classList.add('hidden');
        
        let errorMessage = 'Erreur lors de la génération du quiz IA';
        if (error.message.includes('Clé API') || error.message.includes('secret GROQ_KEY')) {
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
    }
}

// ≡ --- QUIZ GAMEPLAY ---

function startQuiz(subjectName, quizData) {
    if (!quizData || !quizData.questions || quizData.questions.length === 0) {
        toast('Quiz non disponible ou vide', 'error');
        return;
    }
    
    currentQuizData = quizData;
    currentQuizIndex = 0;
    userAnswers = [];
    quizStartTime = Date.now();
    
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
    if (previousAnswer !== undefined) {
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
            const historyData = {
                subject: currentQuizData.titre || 'Quiz',
                score: score,
                correctAnswers: correctAnswers,
                totalQuestions: totalQuestions,
                completedAt: new Date().toISOString(),
                duration: duration,
                isAI: currentQuizData.isAI || false
            };
            
            await addDoc(collection(db, 'users', currentUser.uid, 'quizHistory'), historyData);
            
            // Recharger les données utilisateur
            await loadUserProgress();
            updateDashboard();
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
            <button class="quiz-btn primary" onclick="showSection('quiz-select')">Nouveau quiz</button>
        </div>
    `;
    
    modalBody.innerHTML = html;
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
        const formattedDate = date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        const formattedTime = date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const scoreClass = quiz.score >= 80 ? 'excellent' : quiz.score >= 60 ? 'good' : 'average';
        const aiLabel = quiz.isAI ? '<span class="ai-badge">IA</span>' : '';
        
        html += `
            <div class="history-item ${scoreClass}">
                <div class="history-header">
                    <div class="history-subject">
                        <strong>${quiz.subject}</strong>
                        ${aiLabel}
                    </div>
                    <div class="history-score">${quiz.score}%</div>
                </div>
                <div class="history-details">
                    <span>📅 ${formattedDate} ${formattedTime}</span>
                    <span>📊 ${quiz.correctAnswers}/${quiz.totalQuestions}</span>
                    <span>⏱️ ${quiz.duration}s</span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
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

// ≡ --- INITIALISATION ---

document.addEventListener('DOMContentLoaded', async () => {
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
