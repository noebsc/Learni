/* ========== app-ameliore.js - Learni STI2D COMPLET AVEC GROQ IA GRATUITE ========== */

// Import Firebase
import { 
    auth, db, analytics, 
    signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    signOut, onAuthStateChanged,
    doc, setDoc, getDoc, updateDoc, 
    collection, getDocs, onSnapshot, logEvent, addDoc,
    query, orderBy, limit, where 
} from './firebase-ameliore.js';

// â‰¡ GLOBALS
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

// ðŸš€ Configuration GROQ API GRATUITE - CrÃ©ez votre clÃ© sur https://console.groq.com/keys
const GROQ_API_KEY = "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"; // GRATUIT - Remplacez par votre clÃ© Groq
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Sujets STI2D 2025 complets
const STI2D_SUBJECTS = {
    "Tronc Commun": {
        "FranÃ§ais": {
            themes: ["PoÃ©sie", "ThÃ©Ã¢tre", "Roman", "Argumentation", "RÃ©Ã©criture"],
            description: "Expression Ã©crite et orale, littÃ©rature franÃ§aise et francophone"
        },
        "Philosophie": {
            themes: ["LibertÃ©", "Justice", "Bonheur", "Connaissance", "Travail", "Art"],
            description: "Questionnement philosophique, esprit critique et analyse"
        },
        "Histoire-GÃ©ographie": {
            themes: ["Grandes guerres", "Totalitarismes", "DÃ©colonisation", "Mondialisation", "Ville"],
            description: "Histoire contemporaine et gÃ©ographie des territoires"
        },
        "MathÃ©matiques": {
            themes: ["AlgÃ¨bre", "ProbabilitÃ©s", "Statistiques", "Analyse", "Fonctions", "TrigonomÃ©trie"],
            description: "MathÃ©matiques appliquÃ©es aux sciences et techniques"
        },
        "Physique-Chimie": {
            themes: ["Circuits Ã©lectriques", "Loi d'Ohm", "Puissance", "Energie", "MÃ©canique", "Optique"],
            description: "Sciences physiques et chimiques appliquÃ©es"
        },
        "EMC": {
            themes: ["Valeurs rÃ©publicaines", "CitoyennetÃ©", "Droit et devoirs", "LibertÃ©", "Ã‰galitÃ©"],
            description: "Enseignement moral et civique"
        },
        "EPS": {
            themes: ["Sport collectif", "Sport individuel", "SantÃ©", "SÃ©curitÃ©", "Nutrition"],
            description: "Ã‰ducation physique et sportive"
        },
        "Anglais": {
            themes: ["Vie quotidienne", "Technologie", "SociÃ©tÃ©", "Environnement", "Innovation"],
            description: "Langue vivante 1 - Communication et culture"
        }
    },
    "SpÃ©cialitÃ©s": {
        "2I2D": {
            themes: ["Innovation", "DÃ©veloppement durable", "MatÃ©riaux", "Ã‰nergie", "Information"],
            description: "IngÃ©nierie, Innovation et DÃ©veloppement Durable"
        },
        "AC": {
            themes: ["Structures", "MatÃ©riaux construction", "Thermique bÃ¢timent", "Acoustique"],
            description: "Architecture et Construction"
        },
        "ITEC": {
            themes: ["Ã‰co-conception", "Cycle de vie", "MatÃ©riaux", "Processus crÃ©atifs"],
            description: "Innovation Technologique et Ã‰co-Conception"
        },
        "EE": {
            themes: ["Ã‰nergies renouvelables", "EfficacitÃ© Ã©nergÃ©tique", "Thermique", "Fluides"],
            description: "Ã‰nergies et Environnement"
        },
        "SIN": {
            themes: ["RÃ©seaux", "Programmation", "CybersÃ©curitÃ©", "IoT"],
            description: "SystÃ¨mes d'Information et NumÃ©rique"
        }
    }
};

// â‰¡ --- UTILITAIRES GÃ‰NÃ‰RAUX ---

function showSection(sectionId) {
    console.log('ðŸ”„ Affichage de la section:', sectionId);

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

    // Afficher la section demandÃ©e
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        currentSection = sectionId;

        // Mise Ã  jour des boutons de navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-section') === sectionId) {
                btn.classList.add('active');
            }
        });

        // Actions spÃ©cifiques par section
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
        switcher.textContent = theme === 'dark' ? 'â˜€ï¸' : 'ðŸŒ™';
        switcher.style.transform = 'scale(1.2)';
        setTimeout(() => switcher.style.transform = 'scale(1)', 150);
    }
}

function toast(msg, type = 'info', timeout = 4000) {
    const icons = {
        success: 'âœ…',
        error: 'âŒ',
        info: 'â„¹ï¸',
        warning: 'âš ï¸'
    };

    const toastEl = document.createElement('div');
    toastEl.className = `toast ${type}`;
    toastEl.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${msg}</span>
        <button class="toast-close">Ã—</button>
    `;

    // Container pour les toasts
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    container.appendChild(toastEl);

    // Animation d'entrÃ©e
    setTimeout(() => toastEl.style.transform = 'translateX(0)', 10);

    // Fermeture automatique et manuelle
    const closeToast = () => {
        toastEl.style.transform = 'translateX(400px)';
        setTimeout(() => toastEl.remove(), 300);
    };

    toastEl.querySelector('.toast-close').onclick = closeToast;
    setTimeout(closeToast, timeout);
}

// ðŸ”§ CORRECTION 1: Chargement des quiz avec bon chemin
async function loadQuizzes() {
    try {
        const cached = localStorage.getItem('quizzes_cache');
        const cacheTime = localStorage.getItem('quizzes_cache_time');

        // Utiliser le cache si moins de 1 heure
        if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 3600000) {
            quizzes = JSON.parse(cached);
            console.log('âœ… Quizzes chargÃ©s depuis le cache');
            return;
        }

        // ðŸ”§ CHEMIN CORRIGÃ‰: ./sti2d.json au lieu de /Learni/sti2d.json
        console.log('ðŸ”„ Chargement des quiz depuis ./sti2d.json');
        const resp = await fetch('./sti2d.json');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);

        quizzes = await resp.json();
        console.log('âœ… Quiz chargÃ©s:', Object.keys(quizzes).length, 'matiÃ¨res');

        // Mise en cache
        localStorage.setItem('quizzes_cache', JSON.stringify(quizzes));
        localStorage.setItem('quizzes_cache_time', Date.now().toString());
        
    } catch (error) {
        console.error('âŒ Erreur chargement quizzes:', error);
        toast('Erreur lors du chargement des quiz: ' + error.message, 'error');
        
        // Quizzes de dÃ©monstration en cas d'erreur
        quizzes = {
            "FranÃ§ais": [{
                titre: "Quiz de dÃ©monstration - FranÃ§ais",
                niveau: "Terminale",
                themes: ["PoÃ©sie", "ThÃ©Ã¢tre"],
                questions: [
                    {
                        type: "qcm",
                        text: "Qui a Ã©crit 'Les Fleurs du Mal' ?",
                        choices: ["Baudelaire", "Verlaine", "Rimbaud", "MallarmÃ©"],
                        solution: 0,
                        explication: "Charles Baudelaire est l'auteur des 'Fleurs du Mal' (1857)."
                    }
                ]
            }]
        };
        console.log('ðŸ“š Quiz de fallback chargÃ©s');
    }
}

// â‰¡ --- FONCTIONS UTILISATEUR ---

async function fetchAndSyncUserData(user) {
    if (!user) return;

    try {
        console.log('ðŸ“Š Chargement des donnÃ©es utilisateur...');
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
        console.log('âœ… Synchronisation terminÃ©e');

    } catch (error) {
        console.error('âŒ Erreur sync donnÃ©es utilisateur:', error);
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
        console.error('âŒ Erreur chargement progression:', error);
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

    // ActivitÃ© rÃ©cente
    updateRecentActivity();
}

function updateUserInfo() {
    const emailEl = document.getElementById('userEmail');
    const specialtyEl = document.getElementById('userSpecialty');
    const lv1El = document.getElementById('userLV1');
    const lv2El = document.getElementById('userLV2');

    if (emailEl) emailEl.textContent = userData.email || 'utilisateur@example.com';
    if (specialtyEl) specialtyEl.textContent = userData.speciality || 'SpÃ©cialitÃ©';
    if (lv1El) lv1El.textContent = userData.lv1 || 'LV1';
    if (lv2El) lv2El.textContent = userData.lv2 || 'LV2';
}

function updateRecentActivity() {
    const container = document.getElementById('recent-activity-list');
    if (!container) return;

    if (quizHistory.length === 0) {
        container.innerHTML = '<p class="no-data">Aucun quiz complÃ©tÃ© pour le moment</p>';
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

// â‰¡ --- QUIZ SELECT ---

function renderQuizSelect() {
    const container = document.getElementById('quiz-select-container');
    if (!container || !quizzes) return;

    let html = '<div class="quiz-categories">';

    // Tronc Commun
    html += '<div class="category"><h3>ðŸ“š Tronc Commun</h3><div class="subjects-grid">';

    Object.entries(STI2D_SUBJECTS["Tronc Commun"]).forEach(([subject, info]) => {
        const available = quizzes[subject] && quizzes[subject].length > 0;
        const questionCount = available ? quizzes[subject][0].questions?.length || 0 : 'N/A';
        const isUserSubject = subject === lv1 || subject === lv2;

        html += `
            <div class="subject-card ${!available ? 'unavailable' : ''} ${isUserSubject ? 'user-specialty' : ''}" 
                 data-subject="${subject}" ${!available ? 'title="Quiz non disponible"' : ''}>
                ${isUserSubject ? '<span class="user-badge">Votre matiÃ¨re</span>' : ''}
                <div class="subject-icon">${getSubjectIcon(subject)}</div>
                <h4>${subject}</h4>
                <div class="question-count">${questionCount} questions</div>
                <div class="subject-themes">${info.themes.slice(0, 3).join(', ')}...</div>
                <div class="subject-description">${info.description}</div>
                ${!available ? '<div class="unavailable-badge">BientÃ´t disponible</div>' : ''}
            </div>
        `;
    });

    html += '</div></div>';

    // SpÃ©cialitÃ©s
    html += '<div class="category"><h3>ðŸ”¬ SpÃ©cialitÃ©s STI2D</h3><div class="subjects-grid">';

    Object.entries(STI2D_SUBJECTS["SpÃ©cialitÃ©s"]).forEach(([subject, info]) => {
        const available = quizzes[subject] && quizzes[subject].length > 0;
        const questionCount = available ? quizzes[subject][0].questions?.length || 0 : 'N/A';
        const isUserSpecialty = subject === speciality;

        html += `
            <div class="subject-card ${!available ? 'unavailable' : ''} ${isUserSpecialty ? 'user-specialty' : ''}" 
                 data-subject="${subject}" ${!available ? 'title="Quiz non disponible"' : ''}>
                ${isUserSpecialty ? '<span class="user-badge">Votre spÃ©cialitÃ©</span>' : ''}
                <div class="subject-icon">${getSubjectIcon(subject)}</div>
                <h4>${subject}</h4>
                <div class="question-count">${questionCount} questions</div>
                <div class="subject-themes">${info.themes.slice(0, 3).join(', ')}...</div>
                <div class="subject-description">${info.description}</div>
                ${!available ? '<div class="unavailable-badge">BientÃ´t disponible</div>' : ''}
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
        'FranÃ§ais': 'ðŸ“–',
        'Philosophie': 'ðŸ¤”',
        'Histoire-GÃ©ographie': 'ðŸŒ',
        'MathÃ©matiques': 'ðŸ“',
        'Physique-Chimie': 'âš—ï¸',
        'EMC': 'âš–ï¸',
        'EPS': 'ðŸƒ',
        'Anglais': 'ðŸ‡¬ðŸ‡§',
        '2I2D': 'ðŸ”§',
        'AC': 'ðŸ—ï¸',
        'ITEC': 'ðŸ’¡',
        'EE': 'ðŸ”‹',
        'SIN': 'ðŸ’»'
    };
    return icons[subject] || 'ðŸ“š';
}

// â‰¡ --- GÃ‰NÃ‰RATION QUIZ IA AVEC GROQ (GRATUIT ET RAPIDE) ---

function initAIQuiz() {
    // Initialiser les Ã©lÃ©ments du formulaire IA
    const difficultySlider = document.getElementById('aiDifficulty');
    const difficultyDisplay = document.getElementById('difficultyDisplay');
    
    if (difficultySlider && difficultyDisplay) {
        difficultySlider.addEventListener('input', (e) => {
            const levels = ['TrÃ¨s facile', 'Facile', 'Moyen', 'Difficile', 'Expert'];
            const level = parseInt(e.target.value) - 1;
            difficultyDisplay.textContent = `DifficultÃ©: ${levels[level]}`;
        });
    }

    const generateBtn = document.getElementById('generateQuizBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateAIQuiz);
    }
}

// ðŸš€ GROQ API CORRIGÃ‰E - Version la plus rÃ©cente 2025
async function callGroqAPI(subject, theme, difficulty, questionCount) {
    try {
        // VÃ©rification de la clÃ© API
        if (!GROQ_API_KEY || GROQ_API_KEY === "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") {
            throw new Error(`âš ï¸ ClÃ© API Groq non configurÃ©e.

Pour obtenir votre clÃ© GRATUITE :
1. Allez sur https://console.groq.com/keys
2. CrÃ©ez un compte (gratuit)
3. Cliquez "Create API Key"
4. Copiez la clÃ© (commence par "gsk_")
5. Remplacez la clÃ© dans app-ameliore.js ligne 28

GROQ est 100% gratuit avec des limites trÃ¨s gÃ©nÃ©reuses !`);
        }

        console.log(`ðŸš€ GÃ©nÃ©ration quiz Groq: ${subject}, thÃ¨me: "${theme}", difficultÃ© ${difficulty}/5`);

        // Prompt systÃ¨me optimisÃ© pour Groq 2025
        const systemPrompt = `Tu es un professeur expert du programme BAC STI2D 2025 franÃ§ais. GÃ©nÃ¨re des questions de qualitÃ© pÃ©dagogique strictement conformes au programme officiel.

CONTRAINTES ABSOLUES :
- Questions adaptÃ©es au niveau Terminale STI2D uniquement
- 70% QCM (4 choix), 30% Vrai/Faux
- Explications pÃ©dagogiques dÃ©taillÃ©es (minimum 30 mots)
- Format JSON strict sans commentaires
- Vocabulaire technique prÃ©cis et actuel`;

        const userPrompt = `CrÃ©er exactement ${questionCount} questions de ${subject}${theme ? ` sur "${theme}"` : ''} pour Ã©lÃ¨ves Terminale STI2D.

Niveau de difficultÃ©: ${difficulty}/5
- 1-2: Connaissances de base, dÃ©finitions
- 3: Application directe, exercices standards
- 4-5: Analyse, synthÃ¨se, rÃ©solution complexe

STRUCTURE JSON REQUISE :
{
    "questions": [
        {
            "type": "qcm",
            "text": "Question claire et prÃ©cise ?",
            "choices": ["Option A", "Option B", "Option C", "Option D"],
            "solution": 0,
            "explication": "Justification complÃ¨te et pÃ©dagogique expliquant pourquoi cette rÃ©ponse est correcte."
        },
        {
            "type": "tf",
            "text": "Affirmation prÃ©cise Ã  Ã©valuer.",
            "solution": true,
            "explication": "Explication dÃ©taillÃ©e justifiant la vÃ©racitÃ© ou faussetÃ© de l'affirmation."
        }
    ]
}

GÃ©nÃ¨re ${questionCount} questions diversifiÃ©es et progressives.`;

        // RequÃªte API Groq avec paramÃ¨tres optimisÃ©s 2025
        const requestBody = {
            model: "llama-3.1-70b-versatile", // ModÃ¨le le plus performant disponible
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            max_tokens: 4000, // AugmentÃ© pour plus de questions
            temperature: 0.3, // RÃ©duit pour plus de cohÃ©rence
            top_p: 0.95,
            frequency_penalty: 0.1,
            presence_penalty: 0.1,
            stream: false
        };

        console.log('ðŸ“¡ Envoi requÃªte Groq avec modÃ¨le llama-3.1-70b-versatile...');

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Learni-STI2D/1.0'
            },
            body: JSON.stringify(requestBody)
        });

        // Gestion d'erreurs HTTP amÃ©liorÃ©e
        if (!response.ok) {
            let errorMessage;
            let errorDetails = '';
            
            try {
                const errorData = await response.json();
                errorDetails = errorData.error?.message || JSON.stringify(errorData);
            } catch {
                errorDetails = await response.text();
            }
            
            console.error('âŒ Erreur HTTP Groq:', response.status, errorDetails);
            
            switch (response.status) {
                case 400:
                    errorMessage = 'ParamÃ¨tres de requÃªte invalides. VÃ©rifiez le format de la demande.';
                    break;
                case 401:
                    errorMessage = `ClÃ© API Groq invalide ou expirÃ©e.
                    
VÃ©rifications :
1. ClÃ© commence bien par "gsk_"
2. ClÃ© copiÃ©e entiÃ¨rement
3. Compte Groq activÃ© sur console.groq.com`;
                    break;
                case 429:
                    errorMessage = 'Limite de requÃªtes Groq atteinte. Attendez 60 secondes et rÃ©essayez.';
                    break;
                case 500:
                case 502:
                case 503:
                    errorMessage = 'Serveurs Groq temporairement indisponibles. RÃ©essayez dans quelques minutes.';
                    break;
                default:
                    errorMessage = `Erreur serveur Groq (${response.status}): ${errorDetails}`;
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('ðŸ“¨ RÃ©ponse Groq reÃ§ue:', data);

        // Validation de la structure de rÃ©ponse
        if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('âŒ Structure rÃ©ponse invalide:', data);
            throw new Error('RÃ©ponse Groq mal structurÃ©e');
        }

        let aiResponse = data.choices[0].message.content;

        if (!aiResponse || aiResponse.trim().length === 0) {
            console.error('âŒ RÃ©ponse vide de Groq');
            throw new Error('Groq a retournÃ© une rÃ©ponse vide');
        }

        console.log('ðŸ¤– RÃ©ponse brute Groq:', aiResponse.substring(0, 500) + '...');

        // ðŸ”§ NETTOYAGE DE RÃ‰PONSE ROBUSTE
        aiResponse = aiResponse.trim();
        
        // Supprimer markdown et balises
        aiResponse = aiResponse.replace(/```json\s*/gi, '');
        aiResponse = aiResponse.replace(/```\s*/g, '');
        aiResponse = aiResponse.replace(/^.*?(\{)/s, '$1'); // Tout avant le premier {
        aiResponse = aiResponse.replace(/(\}).*$/s, '$1');  // Tout aprÃ¨s le dernier }
        
        console.log('ðŸ§¹ JSON nettoyÃ©:', aiResponse.substring(0, 200) + '...');

        // Parse JSON avec gestion d'erreur dÃ©taillÃ©e
        let quizData;
        try {
            quizData = JSON.parse(aiResponse);
        } catch (parseError) {
            console.error('âŒ Erreur parsing JSON:', parseError.message);
            console.error('ðŸ’¾ JSON problÃ©matique (100 premiers caractÃ¨res):', aiResponse.substring(0, 100));
            
            // Tentative de rÃ©paration JSON
            try {
                // Remplacer guillemets simples par doubles
                let repairedJSON = aiResponse.replace(/'/g, '"');
                quizData = JSON.parse(repairedJSON);
                console.log('âœ… JSON rÃ©parÃ© avec succÃ¨s');
            } catch (repairError) {
                throw new Error(`JSON invalide gÃ©nÃ©rÃ© par Groq. Erreur: ${parseError.message}`);
            }
        }
        
        // Validation stricte de la structure
        if (!quizData || typeof quizData !== 'object') {
            throw new Error('RÃ©ponse Groq invalide: format non-objet');
        }
        
        if (!quizData.questions || !Array.isArray(quizData.questions)) {
            console.error('âŒ Structure invalide:', Object.keys(quizData));
            throw new Error('Structure JSON invalide: propriÃ©tÃ© "questions" manquante ou incorrecte');
        }

        if (quizData.questions.length === 0) {
            throw new Error('Aucune question gÃ©nÃ©rÃ©e par Groq');
        }

        // Validation dÃ©taillÃ©e de chaque question
        for (let i = 0; i < quizData.questions.length; i++) {
            const question = quizData.questions[i];
            const qNum = i + 1;
            
            // Validation structure de base
            if (!question || typeof question !== 'object') {
                throw new Error(`Question ${qNum}: structure invalide`);
            }
            
            if (!question.type || !question.text || !question.explication) {
                console.error(`âŒ Question ${qNum} incomplÃ¨te:`, question);
                throw new Error(`Question ${qNum}: champs obligatoires manquants (type, text, explication)`);
            }
            
            // Validation par type
            if (question.type === 'qcm') {
                if (!question.choices || !Array.isArray(question.choices) || question.choices.length < 2) {
                    throw new Error(`QCM ${qNum}: propriÃ©tÃ© "choices" invalide`);
                }
                if (typeof question.solution !== 'number' || question.solution < 0 || question.solution >= question.choices.length) {
                    throw new Error(`QCM ${qNum}: solution invalide (${question.solution}), doit Ãªtre entre 0 et ${question.choices.length - 1}`);
                }
            } else if (question.type === 'tf') {
                if (typeof question.solution !== 'boolean') {
                    throw new Error(`Vrai/Faux ${qNum}: solution doit Ãªtre boolean, reÃ§u ${typeof question.solution}`);
                }
            } else {
                throw new Error(`Question ${qNum}: type "${question.type}" invalide (acceptÃ©: "qcm", "tf")`);
            }

            // Validation qualitÃ© du contenu
            if (question.text.length < 10) {
                throw new Error(`Question ${qNum}: texte trop court`);
            }
            if (question.explication.length < 20) {
                throw new Error(`Question ${qNum}: explication trop courte`);
            }
        }

        console.log(`âœ… Quiz Groq validÃ©: ${quizData.questions.length} questions de qualitÃ© gÃ©nÃ©rÃ©es`);
        
        // Log statistiques
        const stats = {
            qcm: quizData.questions.filter(q => q.type === 'qcm').length,
            tf: quizData.questions.filter(q => q.type === 'tf').length,
            avgExplanationLength: Math.round(quizData.questions.reduce((sum, q) => sum + q.explication.length, 0) / quizData.questions.length)
        };
        console.log('ðŸ“Š Stats quiz:', stats);

        return quizData;

    } catch (error) {
        console.error('âŒ Erreur complÃ¨te gÃ©nÃ©ration Groq:', error);
        throw error;
    }
}

async function generateAIQuiz() {
    const subjectSelect = document.getElementById('aiSubject');
    const themeInput = document.getElementById('aiTheme');
    const difficultySlider = document.getElementById('aiDifficulty');
    const questionCountSelect = document.getElementById('aiQuestionCount');

    if (!subjectSelect || !difficultySlider || !questionCountSelect) {
        toast('Erreur: Ã©lÃ©ments du formulaire manquants', 'error');
        return;
    }

    const subject = subjectSelect.value;
    const theme = themeInput ? themeInput.value.trim() : '';
    const difficulty = parseInt(difficultySlider.value);
    const questionCount = parseInt(questionCountSelect.value);

    if (!subject) {
        toast('Veuillez choisir une matiÃ¨re', 'warning');
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
            generateBtn.textContent = 'ðŸš€ GÃ©nÃ©ration par Groq IA...';
        }

        // GÃ©nÃ©rer le quiz avec Groq
        const quizData = await callGroqAPI(subject, theme, difficulty, questionCount);

        // CrÃ©er l'objet quiz complet
        const aiQuiz = {
            titre: `Quiz IA - ${subject}${theme ? ` (${theme})` : ''}`,
            niveau: 'Terminale STI2D',
            themes: theme ? [theme] : [],
            keywords: ['IA', 'Groq', subject],
            memo: `Quiz gÃ©nÃ©rÃ© par IA Groq - DifficultÃ© ${difficulty}/5 - ${quizData.questions.length} questions`,
            questions: quizData.questions,
            isAI: true
        };

        // Masquer le loading et dÃ©marrer le quiz
        if (loadingContainer) loadingContainer.classList.add('hidden');
        
        // DÃ©marrer le quiz
        startQuiz(`${subject} (IA)`, aiQuiz);
        
        toast(`âœ… Quiz IA gÃ©nÃ©rÃ© ! ${quizData.questions.length} questions crÃ©Ã©es par Groq.`, 'success');

    } catch (error) {
        console.error('âŒ Erreur gÃ©nÃ©ration quiz IA:', error);
        
        if (loadingContainer) loadingContainer.classList.add('hidden');
        
        let errorMessage = 'Erreur lors de la gÃ©nÃ©ration du quiz IA';
        
        if (error.message.includes('ClÃ© API')) {
            errorMessage = error.message; // Message dÃ©taillÃ© pour la configuration
        } else if (error.message.includes('API')) {
            errorMessage = 'ðŸŒ Erreur de connexion Ã  Groq. VÃ©rifiez votre connexion internet et votre clÃ© API.';
        } else if (error.message.includes('JSON')) {
            errorMessage = 'ðŸ”§ Erreur de format de rÃ©ponse IA. RÃ©essayez avec des paramÃ¨tres diffÃ©rents.';
        } else if (error.message.includes('mal formatÃ©e')) {
            errorMessage = 'ðŸ¤– Groq a gÃ©nÃ©rÃ© une rÃ©ponse incorrecte. Veuillez rÃ©essayer.';
        } else if (error.message.includes('limite')) {
            errorMessage = 'â±ï¸ Limite de requÃªtes atteinte. RÃ©essayez dans quelques minutes.';
        }
        
        toast(errorMessage, 'error', 12000); // Plus long pour lire les instructions
        
    } finally {
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.textContent = 'ðŸš€ GÃ©nÃ©rer le quiz';
        }
    }
}

// â‰¡ --- QUIZ GAMEPLAY ---

function startQuiz(subjectName, quizData) {
    if (!quizData || !quizData.questions || quizData.questions.length === 0) {
        toast('Quiz non disponible ou vide', 'error');
        return;
    }

    currentQuizData = quizData;
    currentQuizIndex = 0;
    userAnswers = [];
    quizStartTime = Date.now();

    console.log('ðŸŽ¯ DÃ©marrage quiz:', subjectName, '- Questions:', quizData.questions.length);

    // Ouvrir le modal de quiz
    const modal = document.getElementById('quizModal');
    const modalTitle = document.getElementById('quizModalTitle');

    if (modalTitle) modalTitle.textContent = quizData.titre || subjectName;
    if (modal) modal.classList.remove('hidden');

    // Afficher la premiÃ¨re question
    displayCurrentQuestion();
}

function displayCurrentQuestion() {
    if (!currentQuizData || currentQuizIndex >= currentQuizData.questions.length) {
        console.error('âŒ Erreur affichage question: donnÃ©es invalides');
        return;
    }

    const modalBody = document.getElementById('quizModalBody');
    if (!modalBody) {
        console.error('âŒ Modal body non trouvÃ©');
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
                    <span class="choice-text">âœ… Vrai</span>
                </label>
                <label class="quiz-choice">
                    <input type="radio" name="answer" value="false">
                    <span class="choice-text">âŒ Faux</span>
                </label>
            </div>
        `;
    }

    html += `
            <div class="question-actions">
                <button class="quiz-btn secondary" onclick="previousQuestion()" ${currentQuizIndex === 0 ? 'disabled' : ''}>
                    â† PrÃ©cÃ©dent
                </button>
                <button class="quiz-btn primary" onclick="nextQuestion()">
                    ${isLastQuestion ? 'ðŸ Terminer le quiz' : 'Suivant â†’'}
                </button>
            </div>
        </div>
    `;

    modalBody.innerHTML = html;

    // Restaurer la rÃ©ponse prÃ©cÃ©dente si elle existe
    const previousAnswer = userAnswers[currentQuizIndex];
    if (previousAnswer !== undefined) {
        const radio = modalBody.querySelector(`input[value="${previousAnswer}"]`);
        if (radio) radio.checked = true;
    }
}

function nextQuestion() {
    const selectedAnswer = document.querySelector('input[name="answer"]:checked');
    
    if (!selectedAnswer) {
        toast('Veuillez sÃ©lectionner une rÃ©ponse', 'warning');
        return;
    }

    // Sauvegarder la rÃ©ponse
    const answerValue = selectedAnswer.value;
    let userAnswer;
    
    if (currentQuizData.questions[currentQuizIndex].type === 'tf') {
        userAnswer = answerValue === 'true';
    } else {
        userAnswer = parseInt(answerValue);
    }
    
    userAnswers[currentQuizIndex] = userAnswer;

    // Passer Ã  la question suivante ou terminer
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

    console.log(`ðŸ“Š Quiz terminÃ©: ${correctAnswers}/${totalQuestions} (${score}%) en ${duration}s`);

    // Sauvegarder l'historique si utilisateur connectÃ©
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
            
            // Recharger les donnÃ©es utilisateur
            await loadUserProgress();
            updateDashboard();
            
            console.log('âœ… Historique sauvegardÃ©');
            
        } catch (error) {
            console.error('âŒ Erreur sauvegarde quiz:', error);
            toast('Quiz terminÃ© mais erreur de sauvegarde', 'warning');
        }
    }

    // Afficher les rÃ©sultats
    displayQuizResults(score, correctAnswers, totalQuestions, results, duration);
}

function displayQuizResults(score, correct, total, results, duration) {
    const modalBody = document.getElementById('quizModalBody');
    if (!modalBody) return;
    
    // DÃ©terminer le niveau de performance
    let resultClass = 'poor';
    let resultEmoji = 'ðŸ˜ž';
    let resultMessage = 'Il faut encore travailler !';
    
    if (score >= 90) {
        resultClass = 'excellent';
        resultEmoji = 'ðŸŽ‰';
        resultMessage = 'Excellent travail !';
    } else if (score >= 75) {
        resultClass = 'good';
        resultEmoji = 'ðŸ˜Š';
        resultMessage = 'TrÃ¨s bien jouÃ© !';
    } else if (score >= 60) {
        resultClass = 'average';
        resultEmoji = 'ðŸ™‚';
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
                    <span>ðŸ“Š Score: ${score}%</span>
                    <span>âœ… Correct: ${correct}</span>
                    <span>âŒ Incorrect: ${total - correct}</span>
                    <span>â±ï¸ DurÃ©e: ${duration}s</span>
                </div>
            </div>
            
            <div class="results-details">
                <h4>ðŸ“ DÃ©tail des rÃ©ponses</h4>
    `;

    results.forEach((result, index) => {
        html += `
            <div class="result-item ${result.isCorrect ? 'correct' : 'incorrect'}">
                <div class="result-question">
                    <span class="result-icon">${result.isCorrect ? 'âœ…' : 'âŒ'}</span>
                    <div>
                        <strong>Question ${index + 1}:</strong> ${result.question}
                    </div>
                </div>
        `;

        if (result.type === 'qcm') {
            const userChoice = result.choices[result.userAnswer] || 'Aucune rÃ©ponse';
            const correctChoice = result.choices[result.correctAnswer] || 'Erreur';
            
            html += `
                <div class="result-answer">
                    <strong>Votre rÃ©ponse:</strong> ${userChoice}
                    <br>
                    <strong>Bonne rÃ©ponse:</strong> ${correctChoice}
                </div>
            `;
        } else if (result.type === 'tf') {
            html += `
                <div class="result-answer">
                    <strong>Votre rÃ©ponse:</strong> ${result.userAnswer ? 'Vrai' : 'Faux'}
                    <br>
                    <strong>Bonne rÃ©ponse:</strong> ${result.correctAnswer ? 'Vrai' : 'Faux'}
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
        </div>
    `;

    modalBody.innerHTML = html;
}

function closeQuizModal() {
    const modal = document.getElementById('quizModal');
    if (modal) {
        modal.classList.add('hidden');
        currentQuizData = null;
        currentQuizIndex = 0;
        userAnswers = [];
    }
}

// â‰¡ --- HISTORIQUE ---

function renderHistory() {
    const container = document.getElementById('history-container');
    if (!container) return;

    if (quizHistory.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">ðŸ“Š</div>
                <h3>Aucun historique</h3>
                <p>Commencez par faire quelques quiz pour voir vos statistiques apparaÃ®tre ici !</p>
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
                <div class="stat-label">Quiz complÃ©tÃ©s</div>
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
                <div class="stat-label">SÃ©rie actuelle</div>
            </div>
        </div>
        
        <div class="history-list">
            <h3>ðŸ“ˆ Historique dÃ©taillÃ©</h3>
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
        
        const scoreClass = quiz.score >= 80 ? 'excellent' : 
                          quiz.score >= 60 ? 'good' : 'average';
        
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
                    <span>ðŸ“… ${formattedDate} Ã  ${formattedTime}</span>
                    <span>âœ… ${quiz.correctAnswers}/${quiz.totalQuestions}</span>
                    <span>â±ï¸ ${quiz.duration}s</span>
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
    
    // Calculer la sÃ©rie actuelle (scores >= 70%)
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

// â‰¡ --- AUTHENTIFICATION ---

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
        console.log('âœ… Connexion rÃ©ussie:', userCredential.user.email);
        
        toast('Connexion rÃ©ussie !', 'success');
        
        // Track login
        if (analytics) {
            logEvent(analytics, 'login');
        }

    } catch (error) {
        console.error('âŒ Erreur connexion:', error);
        
        let errorMessage = 'Erreur de connexion';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Aucun compte trouvÃ© avec cet email';
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
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const specialty = document.getElementById('registerSpecialty').value;
    const lv1 = document.getElementById('registerLV1').value;
    const lv2 = document.getElementById('registerLV2').value;
    const registerBtn = document.getElementById('registerBtn');

    if (!email || !password || !confirmPassword || !specialty || !lv1 || !lv2) {
        toast('Veuillez remplir tous les champs', 'warning');
        return;
    }

    if (password !== confirmPassword) {
        toast('Les mots de passe ne correspondent pas', 'error');
        return;
    }

    if (password.length < 6) {
        toast('Le mot de passe doit contenir au moins 6 caractÃ¨res', 'warning');
        return;
    }

    try {
        registerBtn.disabled = true;
        registerBtn.textContent = 'Inscription...';

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // CrÃ©er le profil utilisateur
        await setDoc(doc(db, 'users', user.uid), {
            email: email,
            displayName: email.split('@')[0],
            speciality: specialty,
            lv1: lv1,
            lv2: lv2,
            createdAt: new Date().toISOString()
        });

        console.log('âœ… Inscription rÃ©ussie:', user.email);
        toast('Inscription rÃ©ussie ! Bienvenue sur Learni !', 'success');

        // Track registration
        if (analytics) {
            logEvent(analytics, 'sign_up');
        }

    } catch (error) {
        console.error('âŒ Erreur inscription:', error);
        
        let errorMessage = 'Erreur d\'inscription';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Cette adresse email est dÃ©jÃ  utilisÃ©e';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Le mot de passe est trop faible';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Adresse email invalide';
        }
        
        toast(errorMessage, 'error');
    } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = 'S\'inscrire';
    }
}

async function logoutUser() {
    try {
        await signOut(auth);
        console.log('âœ… DÃ©connexion rÃ©ussie');
        toast('DÃ©connectÃ© avec succÃ¨s', 'success');
        
        // RÃ©initialiser les donnÃ©es
        currentUser = null;
        userData = {};
        quizHistory = [];
        userProgress = {};
        
    } catch (error) {
        console.error('âŒ Erreur dÃ©connexion:', error);
        toast('Erreur lors de la dÃ©connexion', 'error');
    }
}

function showAuthForm(formType) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');

    if (formType === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        loginTab.classList.remove('active');
        registerTab.classList.add('active');
    }
}

// â‰¡ --- INITIALISATION ---

document.addEventListener('DOMContentLoaded', async () => {
    console.log('ðŸš€ Initialisation Learni STI2D...');
    
    // Appliquer le thÃ¨me
    switchTheme(theme);
    
    // Charger les quiz
    await loadQuizzes();
    
    // Configuration des event listeners
    setupEventListeners();
    
    // Ã‰couter les changements d'authentification
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('ðŸ‘¤ Utilisateur connectÃ©:', user.email);
            fetchAndSyncUserData(user);
            showSection('dashboard');
        } else {
            console.log('ðŸ‘¤ Utilisateur dÃ©connectÃ©');
            showSection('authSection');
        }
    });

    console.log('âœ… Application initialisÃ©e avec succÃ¨s');
});

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.target.getAttribute('data-section');
            if (section) showSection(section);
        });
    });

    // Bouton de thÃ¨me
    const themeSwitcher = document.getElementById('themeSwitcher');
    if (themeSwitcher) {
        themeSwitcher.addEventListener('click', () => switchTheme());
    }

    // Bouton de dÃ©connexion
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }

    // Onglets d'authentification
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    if (loginTab) loginTab.addEventListener('click', () => showAuthForm('login'));
    if (registerTab) registerTab.addEventListener('click', () => showAuthForm('register'));

    // Formulaires d'authentification
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    if (loginBtn) loginBtn.addEventListener('click', loginUser);
    if (registerBtn) registerBtn.addEventListener('click', registerUser);

    // Fermeture de modal
    const closeModalBtn = document.getElementById('closeQuizModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeQuizModal);
    }

    // Fermeture de modal en cliquant sur le fond
    const quizModal = document.getElementById('quizModal');
    if (quizModal) {
        quizModal.addEventListener('click', (e) => {
            if (e.target === quizModal) {
                closeQuizModal();
            }
        });
    }

    // Raccourcis clavier
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeQuizModal();
        }
    });
}

// â‰¡ --- FONCTIONS GLOBALES EXPOSÃ‰ES ---
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

console.log('ðŸ“š app-ameliore.js chargÃ© avec Groq IA gratuite');