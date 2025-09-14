/* ========== app-ameliore.js - Learni STI2D COMPLET CORRIGÉ AVEC API GRATUITE ========== */

// Import Firebase
import { 
    auth, db, analytics, 
    signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    signOut, onAuthStateChanged,
    doc, setDoc, getDoc, updateDoc, 
    collection, getDocs, onSnapshot, logEvent, addDoc,
    query, orderBy, limit, where 
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

// 🔧 Configuration API Hugging Face GRATUITE - Créez votre clé sur https://huggingface.co/settings/tokens
const HUGGINGFACE_API_KEY = "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"; // GRATUIT - Remplacez par votre clé HF
const HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium";

// Alternative avec modèle Mistral (plus performant)
const MISTRAL_MODEL_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1";

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
    console.log('🔄 Affichage de la section:', sectionId);

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
        console.log('🔄 Chargement des quiz depuis ./sti2d.json');
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
        quizHistory = historySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

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
        const scoreClass = quiz.score >= 80 ? 'excellent' : 
                          quiz.score >= 60 ? 'good' : 'average';

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
    html += '<div class="category"><h3>📚 Tronc Commun</h3><div class="subjects-grid">';

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
    html += '<div class="category"><h3>🔬 Spécialités STI2D</h3><div class="subjects-grid">';

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
    container.addEventListener('click', (e) => {
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
        'Philosophie': '🤔',
        'Histoire-Géographie': '🌍',
        'Mathématiques': '📐',
        'Physique-Chimie': '⚗️',
        'EMC': '⚖️',
        'EPS': '🏃',
        'Anglais': '🇬🇧',
        '2I2D': '🔧',
        'AC': '🏗️',
        'ITEC': '💡',
        'EE': '🔋',
        'SIN': '💻'
    };
    return icons[subject] || '📚';
}

// ≡ --- GÉNÉRATION QUIZ IA AVEC HUGGING FACE (GRATUIT) ---

function initAIQuiz() {
    // Initialiser les éléments du formulaire IA
    const difficultySlider = document.getElementById('aiDifficulty');
    const difficultyDisplay = document.getElementById('difficultyDisplay');
    
    if (difficultySlider && difficultyDisplay) {
        difficultySlider.addEventListener('input', (e) => {
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

// 🆓 NOUVELLE API HUGGING FACE GRATUITE
async function callHuggingFaceAPI(subject, theme, difficulty, questionCount) {
    try {
        // Vérification de la clé API
        if (!HUGGINGFACE_API_KEY || HUGGINGFACE_API_KEY === "hf_VOTRE_CLE_ICI") {
            throw new Error('⚠️ Clé API Hugging Face non configurée.\n\nPour obtenir votre clé GRATUITE :\n1. Allez sur https://huggingface.co/settings/tokens\n2. Créez un compte (gratuit)\n3. Générez un token\n4. Remplacez "hf_VOTRE_CLE_ICI" par votre token dans app-ameliore.js ligne 28');
        }

        console.log(`🤖 Génération quiz Hugging Face: ${subject}, thème: "${theme}", difficulté ${difficulty}/5`);

        // Prompt optimisé pour Hugging Face
        const prompt = `Créer un quiz BAC STI2D ${questionCount} questions ${subject} ${theme ? 'thème ' + theme : ''} difficulté ${difficulty}/5.

Répondre en JSON strict:
{
  "questions": [
    {
      "type": "qcm",
      "text": "Question claire?",
      "choices": ["A", "B", "C", "D"],
      "solution": 0,
      "explication": "Explication détaillée"
    },
    {
      "type": "tf",
      "text": "Affirmation",
      "solution": true,
      "explication": "Justification"
    }
  ]
}

Programme BAC STI2D 2025 français. 70% QCM, 30% vrai/faux. Explications 25+ mots.`;

        // Essai avec modèle Mistral (meilleur pour les instructions)
        let response = await fetch(MISTRAL_MODEL_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: 1500,
                    temperature: 0.7,
                    top_p: 0.9,
                    do_sample: true
                },
                options: {
                    wait_for_model: true
                }
            })
        });

        // Si Mistral échoue, essayer avec DialoGPT
        if (!response.ok) {
            console.log('🔄 Tentative avec modèle alternatif...');
            response = await fetch(HUGGINGFACE_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_length: 1500,
                        temperature: 0.7,
                        top_p: 0.9
                    },
                    options: {
                        wait_for_model: true
                    }
                })
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erreur API Hugging Face:', response.status, errorText);
            throw new Error(`Erreur API Hugging Face: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        let aiResponse;
        
        // Extraire la réponse selon le format de l'API
        if (Array.isArray(data)) {
            aiResponse = data[0]?.generated_text || data[0]?.text || '';
        } else {
            aiResponse = data.generated_text || data.text || data.output || '';
        }

        if (!aiResponse) {
            console.error('❌ Réponse vide de Hugging Face:', data);
            throw new Error('Réponse vide de l\'IA Hugging Face');
        }

        console.log('🤖 Réponse brute Hugging Face:', aiResponse);

        // Nettoyage de la réponse
        aiResponse = aiResponse.replace(prompt, '').trim(); // Retirer le prompt original
        
        // Supprimer les backticks markdown
        aiResponse = aiResponse.replace(/```json\s*/gi, '');
        aiResponse = aiResponse.replace(/```\s*/g, '');
        
        // Extraire le JSON
        const firstBrace = aiResponse.indexOf('{');
        const lastBrace = aiResponse.lastIndexOf('}');
        
        if (firstBrace === -1 || lastBrace === -1) {
            // Si pas de JSON détecté, générer un quiz de fallback
            console.log('⚠️ Pas de JSON détecté, génération de quiz de secours...');
            return generateFallbackQuiz(subject, theme, questionCount);
        }
        
        aiResponse = aiResponse.substring(firstBrace, lastBrace + 1);
        
        console.log('🧹 JSON extrait:', aiResponse);

        // Parsing JSON
        let quizData;
        try {
            quizData = JSON.parse(aiResponse);
        } catch (parseError) {
            console.error('❌ Erreur parsing JSON:', parseError);
            console.log('🔄 Génération de quiz de secours...');
            return generateFallbackQuiz(subject, theme, questionCount);
        }
        
        // Validation
        if (!quizData.questions || !Array.isArray(quizData.questions)) {
            console.log('🔄 Structure invalide, génération de quiz de secours...');
            return generateFallbackQuiz(subject, theme, questionCount);
        }

        if (quizData.questions.length === 0) {
            return generateFallbackQuiz(subject, theme, questionCount);
        }

        // Validation et nettoyage des questions
        const validQuestions = [];
        for (let question of quizData.questions) {
            if (question.type && question.text && question.explication) {
                if (question.type === 'qcm' && question.choices && question.solution !== undefined) {
                    validQuestions.push(question);
                } else if (question.type === 'tf' && typeof question.solution === 'boolean') {
                    validQuestions.push(question);
                }
            }
        }

        if (validQuestions.length === 0) {
            return generateFallbackQuiz(subject, theme, questionCount);
        }

        console.log(`✅ Quiz Hugging Face validé: ${validQuestions.length} questions`);
        return { questions: validQuestions };

    } catch (error) {
        console.error('❌ Erreur Hugging Face complète:', error);
        
        // En cas d'erreur, retourner un quiz de secours
        if (error.message.includes('Clé API')) {
            throw error; // Remonter l'erreur de configuration
        } else {
            console.log('🔄 Génération de quiz de secours après erreur...');
            return generateFallbackQuiz(subject, theme, questionCount);
        }
    }
}

// Fonction de secours qui génère un quiz basique
function generateFallbackQuiz(subject, theme, questionCount) {
    console.log('📚 Génération quiz de secours pour', subject);
    
    const fallbackQuestions = {
        "Français": [
            {
                type: "qcm",
                text: "Qui a écrit 'Les Fleurs du Mal' ?",
                choices: ["Baudelaire", "Verlaine", "Rimbaud", "Mallarmé"],
                solution: 0,
                explication: "Charles Baudelaire est l'auteur des 'Fleurs du Mal' (1857), recueil emblématique du symbolisme français."
            },
            {
                type: "tf",
                text: "Le romantisme privilégie la raison sur l'émotion.",
                solution: false,
                explication: "Le romantisme privilégie au contraire l'émotion, les sentiments et la passion, en réaction au classicisme rationnel."
            }
        ],
        "Mathématiques": [
            {
                type: "qcm",
                text: "Quelle est la dérivée de x² ?",
                choices: ["x", "2x", "x³", "2x²"],
                solution: 1,
                explication: "La dérivée de x² est 2x selon la règle de dérivation des puissances."
            },
            {
                type: "tf", 
                text: "Une fonction continue est toujours dérivable.",
                solution: false,
                explication: "Une fonction peut être continue sans être dérivable (exemple : valeur absolue en 0)."
            }
        ],
        "Physique-Chimie": [
            {
                type: "qcm",
                text: "La loi d'Ohm s'écrit :",
                choices: ["U = R + I", "U = R × I", "U = R / I", "U = I / R"],
                solution: 1,
                explication: "La loi d'Ohm établit que la tension U est égale à la résistance R multipliée par l'intensité I."
            },
            {
                type: "tf",
                text: "L'énergie se conserve toujours dans un système isolé.",
                solution: true,
                explication: "Le principe de conservation de l'énergie est une loi fondamentale de la physique."
            }
        ]
    };

    const baseQuestions = fallbackQuestions[subject] || fallbackQuestions["Français"];
    const questions = [];
    
    // Répéter les questions de base pour atteindre le nombre souhaité
    for (let i = 0; i < questionCount; i++) {
        const baseQuestion = baseQuestions[i % baseQuestions.length];
        questions.push({
            ...baseQuestion,
            text: `${baseQuestion.text} ${theme ? `(${theme})` : ''}`
        });
    }

    return { questions };
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
            generateBtn.textContent = '🤖 Génération par IA...';
        }

        // Générer le quiz avec Hugging Face
        const quizData = await callHuggingFaceAPI(subject, theme, difficulty, questionCount);

        // Créer l'objet quiz complet
        const aiQuiz = {
            titre: `Quiz IA - ${subject}${theme ? ` (${theme})` : ''}`,
            niveau: 'Terminale STI2D',
            themes: theme ? [theme] : [],
            keywords: ['IA', 'Hugging Face', subject],
            memo: `Quiz généré par IA Hugging Face - Difficulté ${difficulty}/5 - ${quizData.questions.length} questions`,
            questions: quizData.questions,
            isAI: true
        };

        // Masquer le loading et démarrer le quiz
        if (loadingContainer) loadingContainer.classList.add('hidden');
        
        // Démarrer le quiz
        startQuiz(`${subject} (IA)`, aiQuiz);
        
        toast(`✅ Quiz IA généré ! ${quizData.questions.length} questions créées par Hugging Face.`, 'success');

    } catch (error) {
        console.error('❌ Erreur génération quiz IA:', error);
        
        if (loadingContainer) loadingContainer.classList.add('hidden');
        
        let errorMessage = 'Erreur lors de la génération du quiz IA';
        
        if (error.message.includes('Clé API')) {
            errorMessage = error.message; // Message détaillé pour la configuration
        } else if (error.message.includes('API')) {
            errorMessage = '🌐 Erreur de connexion à Hugging Face. Vérifiez votre connexion internet.';
        } else {
            errorMessage = '🤖 Erreur IA. Un quiz de secours a été généré.';
        }
        
        toast(errorMessage, 'error', 10000); // Plus long pour lire les instructions
        
    } finally {
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.textContent = '🚀 Générer le quiz';
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
    const progress = ((currentQuizIndex) / currentQuizData.questions.length) * 100;
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
                    <span class="choice-text">✅ Vrai</span>
                </label>
                <label class="quiz-choice">
                    <input type="radio" name="answer" value="false">
                    <span class="choice-text">❌ Faux</span>
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
                    ${isLastQuestion ? '🏁 Terminer le quiz' : 'Suivant →'}
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
    if (currentQuizIndex === currentQuizData.questions.length - 1) {
        finishQuiz();
    } else {
        currentQuizIndex++;
        displayCurrentQuestion();
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
            choices: question.choices || []
        });
    });
    
    const totalQuestions = currentQuizData.questions.length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const duration = Math.round((Date.now() - quizStartTime) / 1000); // en secondes

    console.log(`📊 Quiz terminé: ${correctAnswers}/${totalQuestions} (${score}%) en ${duration}s`);

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
            
            console.log('✅ Historique sauvegardé');
            
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
        resultEmoji = '🙂';
        resultMessage = 'Pas mal, continuez !';
    }

    let html = `
        <div class="quiz-result">
            <div class="result-header ${resultClass}">
                <span class="result-emoji">${resultEmoji}</span>
                <h3>${resultMessage}</h3>
                <div class="score-display">
                    <span class="score">${correct}/${total}</span>
                    <span class="percentage">(${score}%)</span>
                </div>
                <div class="quiz-stats">
                    <span>📊 Score: ${score}%</span>
                    <span>✅ Correct: ${correct}</span>
                    <span>❌ Incorrect: ${total - correct}</span>
                    <span>⏱️ Durée: ${duration}s</span>
                </div>
            </div>
            
            <div class="results-details">
                <h4>📝 Détail des réponses</h4>
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
                    <strong>Votre réponse:</strong> ${userChoice}
                    <br>
                    <strong>Bonne réponse:</strong> ${correctChoice}
                </div>
            `;
        } else if (result.type === 'tf') {
            html += `
                <div class="result-answer">
                    <strong>Votre réponse:</strong> ${result.userAnswer ? 'Vrai' : 'Faux'}
                    <br>
                    <strong>Bonne réponse:</strong> ${result.correctAnswer ? 'Vrai' : 'Faux'}
                </div>
            `;
        }

        html += `
                <div class="result-explanation">
                    💡 <strong>Explication:</strong> ${result.explanation}
                </div>
            </div>
        `;
    });

    html += `
            </div>
            
            <div class="result-actions">
                <button class="quiz-btn secondary" onclick="closeQuizModal()">Fermer</button>
                <button class="quiz-btn primary" onclick="restartCurrentQuiz()">Refaire ce quiz</button>
            </div>
        </div>
    `;

    modalBody.innerHTML = html;
}

function restartCurrentQuiz() {
    if (currentQuizData) {
        const subjectName = currentQuizData.titre || 'Quiz';
        startQuiz(subjectName, currentQuizData);
    } else {
        toast('Impossible de relancer le quiz', 'error');
    }
}

function closeQuizModal() {
    const modal = document.getElementById('quizModal');
    if (modal) modal.classList.add('hidden');
    
    // Nettoyer les données du quiz
    currentQuizData = null;
    currentQuizIndex = 0;
    userAnswers = [];
    quizStartTime = null;
}

// ≡ --- HISTORIQUE ---

function renderHistory() {
    // Mise à jour des stats globales dans l'historique
    const historyTotal = document.getElementById('history-total');
    const historyAverage = document.getElementById('history-average');
    const historyBest = document.getElementById('history-best');
    
    if (historyTotal) historyTotal.textContent = userProgress.totalQuizzes;
    if (historyAverage) historyAverage.textContent = userProgress.averageScore + '%';
    if (historyBest) historyBest.textContent = userProgress.bestScore + '%';
    
    // Affichage de l'historique détaillé
    const container = document.getElementById('history-items');
    if (!container) return;
    
    if (quizHistory.length === 0) {
        container.innerHTML = '<p class="no-data">Aucun quiz complété pour le moment</p>';
        return;
    }
    
    let html = '';
    quizHistory.forEach(quiz => {
        const date = new Date(quiz.completedAt).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const scoreClass = quiz.score >= 80 ? 'excellent' : 
                          quiz.score >= 60 ? 'good' : 'average';
        
        const duration = quiz.duration ? `${quiz.duration}s` : 'N/A';
        
        html += `
            <div class="history-item ${scoreClass}">
                <div class="history-header">
                    <h4>${quiz.subject}${quiz.isAI ? ' 🤖' : ''}</h4>
                    <span class="history-score">${quiz.score}%</span>
                </div>
                <div class="history-details">
                    <span>📅 ${date}</span>
                    <span>✅ ${quiz.correctAnswers}/${quiz.totalQuestions}</span>
                    <span>⏱️ ${duration}</span>
                    ${quiz.isAI ? '<span>🤖 Généré par IA Hugging Face</span>' : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ≡ --- AUTHENTIFICATION ---

async function handleLogin(event) {
    event.preventDefault();
    
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    
    if (!emailInput || !passwordInput) {
        toast('Erreur: champs de connexion manquants', 'error');
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        toast('Veuillez remplir tous les champs', 'warning');
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        toast('Connexion réussie !', 'success');
        
    } catch (error) {
        console.error('❌ Erreur connexion:', error);
        
        let errorMessage = 'Erreur de connexion';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Aucun compte trouvé avec cet email';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Mot de passe incorrect';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Email invalide';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Trop de tentatives. Réessayez plus tard';
        }
        
        toast(errorMessage, 'error');
    }
}

async function handleSignup(event) {
    event.preventDefault();
    
    const emailInput = document.getElementById('signupEmail');
    const passwordInput = document.getElementById('signupPassword');
    const specialtySelect = document.getElementById('signupSpecialty');
    const lv1Select = document.getElementById('signupLV1');
    const lv2Select = document.getElementById('signupLV2');
    
    if (!emailInput || !passwordInput || !specialtySelect || !lv1Select) {
        toast('Erreur: champs d\'inscription manquants', 'error');
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const specialty = specialtySelect.value;
    const lv1 = lv1Select.value;
    const lv2 = lv2Select ? lv2Select.value : '';
    
    if (!email || !password || !specialty || !lv1) {
        toast('Veuillez remplir tous les champs obligatoires', 'warning');
        return;
    }

    if (password.length < 6) {
        toast('Le mot de passe doit contenir au moins 6 caractères', 'warning');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Sauvegarder les informations utilisateur
        const userData = {
            email: email,
            speciality: specialty,
            lv1: lv1,
            lv2: lv2,
            createdAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'users', userCredential.user.uid), userData);
        
        toast('Compte créé avec succès !', 'success');
        
    } catch (error) {
        console.error('❌ Erreur inscription:', error);
        
        let errorMessage = 'Erreur lors de l\'inscription';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Un compte existe déjà avec cet email';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Email invalide';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Mot de passe trop faible';
        }
        
        toast(errorMessage, 'error');
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
        toast('Déconnexion réussie', 'success');
        
        // Nettoyer les données
        currentUser = null;
        userData = {};
        quizHistory = [];
        userProgress = {};
        
    } catch (error) {
        console.error('❌ Erreur déconnexion:', error);
        toast('Erreur lors de la déconnexion', 'error');
    }
}

// ≡ --- EVENT LISTENERS ---

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.getAttribute('data-section');
            if (section) showSection(section);
        });
    });

    // Thème
    const themeSwitcher = document.getElementById('themeSwitcher');
    if (themeSwitcher) {
        themeSwitcher.addEventListener('click', () => switchTheme());
    }

    // Déconnexion
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Authentification
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    // Tabs d'authentification
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // Mise à jour des tabs
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Mise à jour des formulaires
            document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
            const targetForm = document.getElementById(targetTab + 'Form');
            if (targetForm) targetForm.classList.add('active');
        });
    });

    // Fermeture modal quiz
    const closeQuizModalBtn = document.getElementById('closeQuizModal');
    if (closeQuizModalBtn) {
        closeQuizModalBtn.addEventListener('click', closeQuizModal);
    }

    // Listener d'état d'authentification
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('👤 Utilisateur connecté:', user.email);
            fetchAndSyncUserData(user).then(() => {
                showSection('dashboard');
            });
        } else {
            console.log('👤 Utilisateur déconnecté');
            showSection('authSection');
        }
    });
}

// Fonctions globales pour les event handlers inline du HTML
window.nextQuestion = nextQuestion;
window.previousQuestion = previousQuestion;
window.closeQuizModal = closeQuizModal;
window.restartCurrentQuiz = restartCurrentQuiz;

// ≡ --- INITIALISATION ---

async function initApp() {
    console.log('🚀 Initialisation de Learni STI2D avec Hugging Face...');
    
    try {
        // Charger les quiz
        await loadQuizzes();
        
        // Initialiser le thème
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            switchTheme(savedTheme);
        } else {
            switchTheme('dark'); // Thème par défaut
        }
        
        // Configuration des event listeners
        setupEventListeners();
        
        console.log('✅ Application initialisée avec succès');
        
    } catch (error) {
        console.error('❌ Erreur initialisation application:', error);
        toast('Erreur lors de l\'initialisation de l\'application', 'error');
    }
}

// ≡ --- DÉMARRAGE ---

document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 DOM chargé, démarrage de l\'application...');
    
    // Masquer l'écran de chargement après 2 secondes
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }, 2000);

    // Initialiser l'application
    initApp();
});

console.log('✅ Learni STI2D - Version Hugging Face GRATUITE - Fichier JavaScript chargé - Version 2.2.0');
