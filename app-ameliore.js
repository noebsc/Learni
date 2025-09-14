/* ========== app-ameliore.js - Learni STI2D - Version Complète ========== */

// Import Firebase
import { 
    auth, 
    db, 
    analytics, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
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
    where 
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

// Configuration IA Gemini
const GEMINI_API_KEY = "AIzaSyDAQR7pK1DHSNdwQp_5Y4OVNsgXGl5dpSY"; // À remplacer par votre clé
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

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
        
        const resp = await fetch('./sti2d.json');
        if (!resp.ok) throw new Error('Erreur chargement quizzes');
        
        quizzes = await resp.json();
        
        // Mise en cache
        localStorage.setItem('quizzes_cache', JSON.stringify(quizzes));
        localStorage.setItem('quizzes_cache_time', Date.now().toString());
        
        console.log('✅ Quizzes chargés depuis le serveur');
    } catch (error) {
        console.error('❌ Erreur chargement quizzes:', error);
        toast('Erreur lors du chargement des quiz', 'error');
        
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

function renderQuizSelect() {
    const container = document.getElementById('quiz-select-container');
    if (!container || !quizzes) return;
    
    let html = '<div class="quiz-categories">';
    
    // Tronc commun
    html += '<div class="category"><h3>📚 Tronc Commun</h3><div class="subjects-grid">';
    
    Object.entries(STI2D_SUBJECTS["Tronc Commun"]).forEach(([subject, info]) => {
        const available = quizzes[subject] && quizzes[subject][0]?.questions?.length > 0;
        const questionCount = available ? quizzes[subject][0].questions.length : 0;
        
        html += `
            <div class="subject-card ${available ? '' : 'disabled'}" ${available ? `onclick="startQuiz('${subject}')"` : ''}>
                <div class="subject-icon">${getSubjectIcon(subject)}</div>
                <h4>${subject}</h4>
                <p class="question-count">${questionCount} questions</p>
                <p class="subject-themes">${info.themes.slice(0, 3).join(', ')}...</p>
                <p class="subject-description">${info.description}</p>
                ${!available ? '<div class="coming-soon">Bientôt disponible</div>' : ''}
            </div>
        `;
    });
    
    html += '</div></div>';
    
    // Spécialités
    html += '<div class="category"><h3>🔧 Spécialités</h3><div class="subjects-grid">';
    
    Object.entries(STI2D_SUBJECTS["Spécialités"]).forEach(([subject, info]) => {
        const available = quizzes[subject] && quizzes[subject][0]?.questions?.length > 0;
        const questionCount = available ? quizzes[subject][0].questions.length : 0;
        const isUserSpecialty = subject === userData.speciality || subject === '2I2D';
        
        html += `
            <div class="subject-card ${available ? '' : 'disabled'} ${isUserSpecialty ? 'user-specialty' : ''}" ${available ? `onclick="startQuiz('${subject}')"` : ''}>
                <div class="subject-icon">${getSubjectIcon(subject)}</div>
                <h4>${subject}</h4>
                <p class="question-count">${questionCount} questions</p>
                <p class="subject-themes">${info.themes.slice(0, 3).join(', ')}...</p>
                <p class="subject-description">${info.description}</p>
                ${isUserSpecialty ? '<div class="user-badge">Votre spécialité</div>' : ''}
                ${!available ? '<div class="coming-soon">Bientôt disponible</div>' : ''}
            </div>
        `;
    });
    
    html += '</div></div></div>';
    
    container.innerHTML = html;
}

function getSubjectIcon(subject) {
    const icons = {
        'Français': '📝',
        'Philosophie': '🧠',
        'Histoire-Géographie': '🌍',
        'Mathématiques': '📐',
        'Physique-Chimie': '⚗️',
        'EMC': '🏛️',
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

// ≡ --- SYSTÈME DE QUIZ ---

function startQuiz(subject) {
    if (!quizzes[subject] || !quizzes[subject][0]?.questions) {
        toast('Quiz non disponible pour cette matière', 'warning');
        return;
    }
    
    currentQuizData = {
        subject: subject,
        questions: [...quizzes[subject][0].questions], // Copie pour éviter la modification
        title: quizzes[subject][0].titre || `Quiz ${subject}`
    };
    
    // Mélanger les questions
    currentQuizData.questions = shuffleArray(currentQuizData.questions);
    
    currentQuizIndex = 0;
    userAnswers = [];
    quizStartTime = Date.now();
    
    renderQuizModal();
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function renderQuizModal() {
    const modal = document.getElementById('quizModal');
    const title = document.getElementById('quizModalTitle');
    const body = document.getElementById('quizModalBody');
    
    if (!modal || !title || !body || !currentQuizData) return;
    
    title.textContent = currentQuizData.title;
    
    if (currentQuizIndex < currentQuizData.questions.length) {
        renderQuestion();
    } else {
        renderQuizResults();
    }
    
    modal.classList.remove('hidden');
}

function renderQuestion() {
    const body = document.getElementById('quizModalBody');
    const question = currentQuizData.questions[currentQuizIndex];
    
    let html = `
        <div class="quiz-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(currentQuizIndex / currentQuizData.questions.length) * 100}%"></div>
            </div>
            <span class="progress-text">Question ${currentQuizIndex + 1} / ${currentQuizData.questions.length}</span>
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
                    <span class="choice-text">Vrai</span>
                </label>
                <label class="quiz-choice">
                    <input type="radio" name="answer" value="false">
                    <span class="choice-text">Faux</span>
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
                    Suivant →
                </button>
            </div>
        </div>
    `;
    
    body.innerHTML = html;
}

function nextQuestion() {
    const selectedAnswer = document.querySelector('input[name="answer"]:checked');
    
    if (!selectedAnswer) {
        toast('Veuillez sélectionner une réponse', 'warning');
        return;
    }
    
    // Sauvegarder la réponse
    const question = currentQuizData.questions[currentQuizIndex];
    let userAnswer = selectedAnswer.value;
    let isCorrect = false;
    
    if (question.type === 'qcm') {
        userAnswer = parseInt(userAnswer);
        isCorrect = userAnswer === question.solution;
    } else if (question.type === 'tf') {
        userAnswer = userAnswer === 'true';
        isCorrect = userAnswer === question.solution;
    }
    
    userAnswers.push({
        questionIndex: currentQuizIndex,
        userAnswer: userAnswer,
        isCorrect: isCorrect,
        question: question
    });
    
    currentQuizIndex++;
    renderQuizModal();
}

function previousQuestion() {
    if (currentQuizIndex > 0) {
        currentQuizIndex--;
        userAnswers.pop(); // Supprimer la dernière réponse
        renderQuizModal();
    }
}

function renderQuizResults() {
    const body = document.getElementById('quizModalBody');
    const correctAnswers = userAnswers.filter(a => a.isCorrect).length;
    const totalQuestions = currentQuizData.questions.length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const duration = Math.round((Date.now() - quizStartTime) / 1000);
    
    let resultClass = 'poor';
    let resultEmoji = '😟';
    let resultMessage = 'Continuez vos efforts !';
    
    if (score >= 90) {
        resultClass = 'excellent';
        resultEmoji = '🎉';
        resultMessage = 'Excellent travail !';
    } else if (score >= 70) {
        resultClass = 'good';
        resultEmoji = '😊';
        resultMessage = 'Bien joué !';
    } else if (score >= 50) {
        resultClass = 'average';
        resultEmoji = '🙂';
        resultMessage = 'Pas mal, continuez !';
    }
    
    let html = `
        <div class="quiz-result">
            <div class="result-header ${resultClass}">
                <div class="result-emoji">${resultEmoji}</div>
                <h3>${resultMessage}</h3>
                <div class="score-display">
                    <span class="score">${correctAnswers}/${totalQuestions}</span>
                    <span class="percentage">${score}%</span>
                </div>
                <div class="quiz-stats">
                    <span>Durée: ${duration}s</span>
                    <span>Matière: ${currentQuizData.subject}</span>
                </div>
            </div>
            
            <div class="results-details">
                <h4>Détail des réponses</h4>
    `;
    
    userAnswers.forEach((answer, index) => {
        const question = answer.question;
        const isCorrect = answer.isCorrect;
        
        html += `
            <div class="result-item ${isCorrect ? 'correct' : 'incorrect'}">
                <div class="result-question">
                    <span class="result-icon">${isCorrect ? '✅' : '❌'}</span>
                    <div>
                        <strong>Q${index + 1}: ${question.text}</strong>
                        <div class="result-answer">
                            Votre réponse: ${formatAnswer(question, answer.userAnswer)}
                            ${!isCorrect ? `<br>Réponse correcte: ${formatCorrectAnswer(question)}` : ''}
                        </div>
                    </div>
                </div>
                ${question.explication ? `<div class="result-explanation">${question.explication}</div>` : ''}
            </div>
        `;
    });
    
    html += `
            </div>
            
            <div class="result-actions">
                <button class="quiz-btn secondary" onclick="closeQuizModal()">Fermer</button>
                <button class="quiz-btn primary" onclick="retryQuiz()">Recommencer</button>
            </div>
        </div>
    `;
    
    body.innerHTML = html;
    
    // Sauvegarder le résultat
    saveQuizResult(score, correctAnswers, totalQuestions, duration);
}

function formatAnswer(question, userAnswer) {
    if (question.type === 'qcm') {
        return question.choices[userAnswer] || 'Erreur';
    } else if (question.type === 'tf') {
        return userAnswer ? 'Vrai' : 'Faux';
    }
    return String(userAnswer);
}

function formatCorrectAnswer(question) {
    if (question.type === 'qcm') {
        return question.choices[question.solution] || 'Erreur';
    } else if (question.type === 'tf') {
        return question.solution ? 'Vrai' : 'Faux';
    }
    return String(question.solution);
}

async function saveQuizResult(score, correctAnswers, totalQuestions, duration) {
    if (!currentUser) return;
    
    try {
        const result = {
            subject: currentQuizData.subject,
            score: score,
            correctAnswers: correctAnswers,
            totalQuestions: totalQuestions,
            duration: duration,
            completedAt: Date.now(),
            userAnswers: userAnswers
        };
        
        await addDoc(collection(db, 'users', currentUser.uid, 'quizHistory'), result);
        
        // Recharger les données
        await loadUserProgress();
        updateDashboard();
        
        console.log('✅ Résultat du quiz sauvegardé');
    } catch (error) {
        console.error('❌ Erreur sauvegarde résultat:', error);
    }
}

function retryQuiz() {
    currentQuizIndex = 0;
    userAnswers = [];
    quizStartTime = Date.now();
    
    // Mélanger à nouveau les questions
    currentQuizData.questions = shuffleArray(currentQuizData.questions);
    
    renderQuizModal();
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

// ≡ --- IA QUIZ GÉNÉRATION ---

function initAIQuiz() {
    const difficultySlider = document.getElementById('aiDifficulty');
    const difficultyDisplay = document.getElementById('difficultyDisplay');
    
    if (difficultySlider && difficultyDisplay) {
        difficultySlider.addEventListener('input', (e) => {
            const levels = ['Très facile', 'Facile', 'Moyen', 'Difficile', 'Très difficile'];
            difficultyDisplay.textContent = `Difficulté: ${levels[e.target.value - 1]}`;
        });
    }
}

async function generateAIQuiz() {
    const subject = document.getElementById('aiSubject').value;
    const theme = document.getElementById('aiTheme').value;
    const difficulty = document.getElementById('aiDifficulty').value;
    const questionCount = document.getElementById('aiQuestionCount').value;
    
    if (!subject) {
        toast('Veuillez sélectionner une matière', 'warning');
        return;
    }
    
    if (GEMINI_API_KEY === "VOTRE_CLE_API_GEMINI_ICI") {
        toast('Clé API Gemini non configurée', 'error');
        return;
    }
    
    // Afficher le loading
    document.getElementById('aiLoadingContainer').classList.remove('hidden');
    document.getElementById('aiQuizDisplay').classList.add('hidden');
    
    try {
        const prompt = createAIPrompt(subject, theme, difficulty, questionCount);
        const response = await callGeminiAPI(prompt);
        
        if (response && response.questions) {
            currentQuizData = {
                subject: `${subject} (IA)`,
                questions: response.questions,
                title: `Quiz IA - ${subject}${theme ? ` - ${theme}` : ''}`
            };
            
            currentQuizIndex = 0;
            userAnswers = [];
            quizStartTime = Date.now();
            
            renderAIQuizDisplay();
        } else {
            throw new Error('Réponse invalide de l\'IA');
        }
    } catch (error) {
        console.error('❌ Erreur génération quiz IA:', error);
        toast('Erreur lors de la génération du quiz', 'error');
    } finally {
        document.getElementById('aiLoadingContainer').classList.add('hidden');
    }
}

function createAIPrompt(subject, theme, difficulty, questionCount) {
    const difficultyLevels = {
        1: 'très facile (niveau première)',
        2: 'facile (niveau terminale débutant)',
        3: 'moyen (niveau terminale standard)',
        4: 'difficile (niveau terminale avancé)',
        5: 'très difficile (niveau supérieur au bac)'
    };
    
    const subjectInfo = STI2D_SUBJECTS["Tronc Commun"][subject] || STI2D_SUBJECTS["Spécialités"][subject];
    const themes = subjectInfo ? subjectInfo.themes.join(', ') : '';
    
    return `Génère un quiz de ${questionCount} questions pour le BAC STI2D 2025 en ${subject}.
    ${theme ? `Thème spécifique: ${theme}` : `Thèmes possibles: ${themes}`}
    Difficulté: ${difficultyLevels[difficulty]}
    
    Le quiz doit être au format JSON exact suivant:
    {
        "questions": [
            {
                "type": "qcm",
                "text": "Question ici ?",
                "choices": ["Réponse A", "Réponse B", "Réponse C", "Réponse D"],
                "solution": 0,
                "explication": "Explication de la réponse correcte"
            }
        ]
    }
    
    Règles importantes:
    - Questions adaptées au programme STI2D 2025
    - Mélange de QCM (type: "qcm") et vrai/faux (type: "tf")
    - Pour les vrai/faux: solution: true ou false
    - Explications claires et pédagogiques
    - Français correct et niveau approprié
    - Pas de contenu hors programme
    
    Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;
}

async function callGeminiAPI(prompt) {
    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048
            }
        })
    });
    
    if (!response.ok) {
        throw new Error(`Erreur API Gemini: ${response.status}`);
    }
    
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
        throw new Error('Réponse vide de l\'API');
    }
    
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error('Erreur parsing JSON:', text);
        throw new Error('Réponse invalide de l\'IA');
    }
}

function renderAIQuizDisplay() {
    const container = document.getElementById('aiQuizDisplay');
    container.classList.remove('hidden');
    
    let html = `
        <div class="ai-quiz-header">
            <h3>${currentQuizData.title}</h3>
            <p>${currentQuizData.questions.length} questions générées par IA</p>
        </div>
        <button class="quiz-btn primary large" onclick="startAIQuiz()">
            🚀 Commencer le quiz
        </button>
    `;
    
    container.innerHTML = html;
}

function startAIQuiz() {
    renderQuizModal();
}

// ≡ --- HISTORIQUE ---

function renderHistory() {
    const container = document.getElementById('history-container');
    if (!container) return;
    
    // Mise à jour des stats globales
    updateHistoryStats();
    
    // Rendu de la liste
    const historyItems = document.getElementById('history-items');
    if (!historyItems) return;
    
    if (quizHistory.length === 0) {
        historyItems.innerHTML = '<p class="no-data">Aucun quiz complété pour le moment</p>';
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
        
        const scoreClass = quiz.score >= 80 ? 'excellent' : quiz.score >= 60 ? 'good' : 'average';
        const duration = quiz.duration ? `${quiz.duration}s` : 'N/A';
        
        html += `
            <div class="history-item ${scoreClass}">
                <div class="history-header">
                    <h4>${quiz.subject}</h4>
                    <span class="history-score">${quiz.score}%</span>
                </div>
                <div class="history-details">
                    <span>📅 ${date}</span>
                    <span>📊 ${quiz.correctAnswers}/${quiz.totalQuestions}</span>
                    <span>⏱️ ${duration}</span>
                </div>
            </div>
        `;
    });
    
    historyItems.innerHTML = html;
}

function updateHistoryStats() {
    const totalEl = document.getElementById('history-total');
    const averageEl = document.getElementById('history-average');
    const bestEl = document.getElementById('history-best');
    
    if (totalEl) totalEl.textContent = userProgress.totalQuizzes;
    if (averageEl) averageEl.textContent = userProgress.averageScore + '%';
    if (bestEl) bestEl.textContent = userProgress.bestScore + '%';
}

// ≡ --- AUTHENTIFICATION ---

async function handleLogin(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        toast('Connexion réussie !', 'success');
        console.log('✅ Connexion réussie');
    } catch (error) {
        console.error('❌ Erreur connexion:', error);
        let message = 'Erreur de connexion';
        
        switch(error.code) {
            case 'auth/user-not-found':
                message = 'Utilisateur introuvable';
                break;
            case 'auth/wrong-password':
                message = 'Mot de passe incorrect';
                break;
            case 'auth/invalid-email':
                message = 'Email invalide';
                break;
            case 'auth/too-many-requests':
                message = 'Trop de tentatives, réessayez plus tard';
                break;
        }
        
        toast(message, 'error');
    }
}

async function handleSignup(email, password, specialty, lv1, lv2) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Créer le profil utilisateur
        const userData = {
            email: email,
            speciality: specialty,
            lv1: lv1,
            lv2: lv2 || '',
            createdAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'users', user.uid), userData);
        
        toast('Compte créé avec succès !', 'success');
        console.log('✅ Inscription réussie');
    } catch (error) {
        console.error('❌ Erreur inscription:', error);
        let message = 'Erreur lors de la création du compte';
        
        switch(error.code) {
            case 'auth/email-already-in-use':
                message = 'Cet email est déjà utilisé';
                break;
            case 'auth/weak-password':
                message = 'Mot de passe trop faible (min 6 caractères)';
                break;
            case 'auth/invalid-email':
                message = 'Email invalide';
                break;
        }
        
        toast(message, 'error');
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
        currentUser = null;
        userData = {};
        quizHistory = [];
        userProgress = {};
        toast('Déconnexion réussie', 'info');
        console.log('✅ Déconnexion réussie');
    } catch (error) {
        console.error('❌ Erreur déconnexion:', error);
        toast('Erreur lors de la déconnexion', 'error');
    }
}

// ≡ --- INITIALISATION ---

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.getAttribute('data-section');
            showSection(section);
        });
    });
    
    // Thème
    const themeBtn = document.getElementById('themeSwitcher');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => switchTheme());
    }
    
    // Déconnexion
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Onglets d'authentification
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabType = tab.getAttribute('data-tab');
            
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(tabType + 'Form').classList.add('active');
        });
    });
    
    // Formulaires
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            await handleLogin(email, password);
        });
    }
    
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const specialty = document.getElementById('signupSpecialty').value;
            const lv1 = document.getElementById('signupLV1').value;
            const lv2 = document.getElementById('signupLV2').value;
            await handleSignup(email, password, specialty, lv1, lv2);
        });
    }
    
    // Quiz IA
    const generateBtn = document.getElementById('generateQuizBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateAIQuiz);
    }
    
    // Modal quiz
    const closeModal = document.getElementById('closeQuizModal');
    if (closeModal) {
        closeModal.addEventListener('click', closeQuizModal);
    }
    
    // Fermeture modal par clic extérieur
    const modal = document.getElementById('quizModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeQuizModal();
            }
        });
    }
}

// Fonctions globales pour les event handlers inline
window.startQuiz = startQuiz;
window.nextQuestion = nextQuestion;
window.previousQuestion = previousQuestion;
window.retryQuiz = retryQuiz;
window.closeQuizModal = closeQuizModal;
window.startAIQuiz = startAIQuiz;

// ≡ --- DÉMARRAGE DE L'APP ---

async function initApp() {
    console.log('🚀 Initialisation de Learni STI2D...');
    
    // Configuration du thème initial
    switchTheme(theme);
    
    // Chargement des quizzes
    await loadQuizzes();
    
    // Configuration des event listeners
    setupEventListeners();
    
    // Initialisation de l'IA quiz
    initAIQuiz();
    
    // Écoute des changements d'authentification
    onAuthStateChanged(auth, async (user) => {
        // Masquer l'écran de chargement
        setTimeout(() => {
            document.getElementById('loadingScreen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loadingScreen').style.display = 'none';
            }, 300);
        }, 1000);
        
        if (user) {
            console.log('👤 Utilisateur connecté:', user.email);
            await fetchAndSyncUserData(user);
            showSection('dashboard');
        } else {
            console.log('👤 Utilisateur déconnecté');
            showSection('authSection');
        }
    });
    
    console.log('✅ Application initialisée');
}

// Démarrage quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
