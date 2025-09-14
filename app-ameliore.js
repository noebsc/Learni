/* ========== app.js - Learni STI2D AMÉLIORÉ - Version Complète ========== */

// ≡ Import Firebase core/configs
import { 
    auth, db, analytics, 
    signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, 
    doc, setDoc, getDoc, updateDoc, collection, getDocs, onSnapshot, logEvent, addDoc, 
    query, orderBy, limit, where 
} from './firebase-ameliore.js';

// ≡ GLOBALS AMÉLIORÉS
let currentUser = null;
let userData = {};
let speciality = '';
let lv1 = '';
let lv2 = '';
let quizzes = {};
let theme = 'dark';
let currentSection = 'dashboard';
let currentQuiz = null;
let quizHistory = [];
let userProgress = {};
let achievements = [];
let streakCounter = 0;

// Nouvelles données pour l'IA
const GEMINI_API_KEY = "AIzaSyDAQR7pK1DHSNdwQp_5Y4OVNsgXGl5dpSY"; // À remplacer par votre clé API Gemini
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const THEMES = {
    dark: 'theme-dark',
    light: 'theme-light'
};

// Sujets STI2D 2025 complets avec détails
const STI2D_SUBJECTS = {
    "Tronc Commun": {
        "Français": ["Poésie", "Théâtre", "Roman", "Argumentation", "Réécriture"],
        "Philosophie": ["Liberté", "Justice", "Bonheur", "Connaissance", "Travail", "Art"],
        "Histoire-Géographie": ["Grandes guerres", "Totalitarismes", "Décolonisation", "Mondialisation", "Ville"],
        "Mathématiques": ["Algèbre", "Probabilités", "Statistiques", "Analyse", "Fonctions", "Trigonométrie"],
        "Physique-Chimie": ["Circuits électriques", "Loi d'Ohm", "Puissance", "Energie", "Mécanique", "Optique"],
        "LV1_Anglais": ["Vie quotidienne", "Technologie", "Société", "Environnement", "Innovation"],
        "LV2_Allemand": ["Conversation", "Technique", "Culture", "Actualité", "Vocabulaire"],
        "LV2_Espagnol": ["Expression", "Compréhension", "Civilisation", "Littérature", "Grammaire"],
        "LV2_Arabe": ["Vie quotidienne", "Science et technologie", "Monde moderne", "Écologie"]
    },
    "Spécialités": {
        "Innovation Technologique (ITEC)": ["Éco-conception", "Cycle de vie", "Matériaux", "Processus créatifs"],
        "Systèmes Information Numérique (SIN)": ["Réseaux", "Programmation", "Cybersécurité", "IoT"],
        "Énergies Environnement (EE)": ["Énergies renouvelables", "Efficacité énergétique", "Thermique", "Fluides"],
        "Architecture Construction (AC)": ["Structures", "Matériaux construction", "Thermique bâtiment", "Acoustique"]
    }
};

// ≡ --- UTILITAIRES GÉNÉRAUX AMÉLIORÉS --- //

// Switching d'onglet principal SPA avec animations
function showSection(id) {
    // Animation de sortie
    document.querySelectorAll('main > section:not(.hidden)').forEach(s => {
        s.style.opacity = '0';
        s.style.transform = 'translateY(-20px)';
        setTimeout(() => s.classList.add('hidden'), 200);
    });

    // Animation d'entrée
    setTimeout(() => {
        const section = document.getElementById(id);
        if (section) {
            section.classList.remove('hidden');
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            setTimeout(() => {
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }, 50);
        }
    }, 220);

    currentSection = id;

    // Mettre à jour les boutons de navigation
    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick*="${id}"]`)?.classList.add('active');
}

// Mode sombre/clair amélioré avec animation
function switchTheme(force) {
    if (force) theme = force;
    else theme = theme === 'dark' ? 'light' : 'dark';
    
    document.body.style.transition = 'all 0.3s ease';
    document.body.classList.remove(...Object.values(THEMES));
    document.body.classList.add(THEMES[theme]);
    localStorage.setItem('theme', theme);
    
    const switcher = document.getElementById('themeSwitcher');
    if (switcher) {
        switcher.textContent = theme === 'dark' ? '☀️' : '🌙';
        // Effet de pulse sur le bouton
        switcher.style.transform = 'scale(1.2)';
        setTimeout(() => switcher.style.transform = 'scale(1)', 150);
    }
}

// Toast notifications améliorées avec icônes
function toast(msg, type = 'info', timeout = 4000) {
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-message">${msg}</span>`;
    document.body.appendChild(el);

    // Animation d'entrée
    setTimeout(() => el.style.transform = 'translateX(0)', 10);
    setTimeout(() => {
        el.style.transform = 'translateX(400px)';
        setTimeout(() => el.remove(), 300);
    }, timeout);
}

// Chargement des quizz amélioré avec cache
async function loadQuizzes() {
    try {
        const cached = localStorage.getItem('quizzes_cache');
        const cacheTime = localStorage.getItem('quizzes_cache_time');
        
        // Utiliser le cache si moins de 1 heure
        if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 3600000) {
            quizzes = JSON.parse(cached);
            return;
        }

        const resp = await fetch('./quizzes/fr/sti2d.json');
        if (!resp.ok) throw new Error('Erreur chargement quizzes');
        quizzes = await resp.json();

        // Mise en cache
        localStorage.setItem('quizzes_cache', JSON.stringify(quizzes));
        localStorage.setItem('quizzes_cache_time', Date.now().toString());
    } catch (error) {
        console.error('Erreur chargement quizzes:', error);
        toast('Erreur lors du chargement des quiz', 'error');
    }
}

// ≡ --- FONCTIONS UTILISATEUR MANQUANTES --- //

async function fetchAndSyncUserData(user) {
    if (!user) return;
    
    try {
        currentUser = user;
        
        // Charger les données utilisateur depuis Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
            userData = userDoc.data();
            speciality = userData.speciality || '';
            lv1 = userData.lv1 || '';
            lv2 = userData.lv2 || '';
        } else {
            // Créer un profil par défaut
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
        
        // Charger la progression
        await loadUserProgress();
        updateDashboard();
        
    } catch (error) {
        console.error('Erreur sync données utilisateur:', error);
        toast('Erreur lors du chargement du profil', 'error');
    }
}

async function loadUserProgress() {
    if (!currentUser) return;
    
    try {
        // Charger l'historique des quiz
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
        
        // Calculer les statistiques
        calculateUserStats();
        
    } catch (error) {
        console.error('Erreur chargement progression:', error);
    }
}

function calculateUserStats() {
    if (quizHistory.length === 0) {
        userProgress = {
            totalQuizzes: 0,
            averageScore: 0,
            currentStreak: 0,
            totalCorrect: 0
        };
        return;
    }
    
    const scores = quizHistory.map(q => q.score || 0);
    const totalCorrect = quizHistory.reduce((sum, q) => sum + (q.correctAnswers || 0), 0);
    
    userProgress = {
        totalQuizzes: quizHistory.length,
        averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        currentStreak: calculateCurrentStreak(),
        totalCorrect: totalCorrect
    };
}

function calculateCurrentStreak() {
    let streak = 0;
    for (let i = 0; i < quizHistory.length; i++) {
        const quiz = quizHistory[i];
        if (quiz.score >= 70) { // 70% requis pour maintenir la série
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

function updateDashboard() {
    // Mise à jour des statistiques dans le DOM
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
}

function renderQuizSelect() {
    const container = document.getElementById('quiz-select-container');
    if (!container) return;

    let html = '<h3>🎯 Quiz par matière</h3><div class="quiz-grid">';
    
    Object.keys(quizzes).forEach(subject => {
        html += `
            <div class="quiz-card" onclick="startQuizBySubject('${subject}')">
                <h4>${subject}</h4>
                <p>${quizzes[subject][0]?.questions?.length || 0} questions</p>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function renderAllFiches() {
    const container = document.getElementById('fiches-container');
    if (!container) return;

    let html = '<h3>📚 Fiches de révision</h3><div class="fiches-grid">';
    
    Object.keys(quizzes).forEach(subject => {
        const subjectData = quizzes[subject][0];
        html += `
            <div class="fiche-card">
                <h4>${subject}</h4>
                <p><strong>Thèmes:</strong> ${subjectData.themes?.join(', ') || 'Non défini'}</p>
                <p><strong>Mémo:</strong> ${subjectData.memo || 'Pas de mémo disponible'}</p>
                <div class="keywords">
                    ${subjectData.keywords?.map(k => `<span class="keyword">${k}</span>`).join('') || ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function renderQuizHistory() {
    const container = document.getElementById('quiz-history-container');
    if (!container) return;

    if (quizHistory.length === 0) {
        container.innerHTML = '<p>Aucun quiz complété pour le moment</p>';
        return;
    }

    let html = '<h3>📊 Historique des quiz</h3><div class="history-list">';
    
    quizHistory.slice(0, 10).forEach(quiz => {
        const date = new Date(quiz.completedAt).toLocaleDateString();
        const scoreClass = quiz.score >= 80 ? 'excellent' : quiz.score >= 60 ? 'good' : 'average';
        
        html += `
            <div class="history-item ${scoreClass}">
                <div class="history-info">
                    <h5>${quiz.subject || 'Quiz'}</h5>
                    <p>${date}</p>
                </div>
                <div class="history-score">
                    <span class="score">${quiz.score}%</span>
                    <span class="details">${quiz.correctAnswers}/${quiz.totalQuestions}</span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// ≡ --- GÉNÉRATION IA GEMINI COMPLÈTE --- //

async function generateAIQuiz(subject, theme, difficulty, questionCount) {
    const loadingEl = document.getElementById('aiQuizLoading');
    const displayEl = document.getElementById('aiQuizDisplay');
    
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (displayEl) displayEl.innerHTML = '';

    try {
        const prompt = `Génère un quiz de ${questionCount} questions sur le sujet "${subject}" et le thème "${theme}" pour le niveau BAC STI2D français, difficulté ${difficulty}/5.

Format JSON strict requis :
{
  "titre": "Quiz ${subject} - ${theme}",
  "questions": [
    {
      "type": "qcm",
      "text": "Question ici ?",
      "choices": ["Réponse A", "Réponse B", "Réponse C", "Réponse D"],
      "solution": 0,
      "explication": "Explication détaillée"
    }
  ]
}

Règles importantes :
- Questions adaptées au programme STI2D 2025
- Variété dans les types de questions (QCM principalement)
- Explications pédagogiques détaillées
- Niveau de français correct
- Questions pratiques et concrètes
- Réponses d'une longueur similaire pour éviter les indices`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status}`);
        }

        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;

        // Nettoyer et parser le JSON
        let cleanedText = generatedText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .replace(/[\u201C\u201D]/g, '"') // Remplacer les guillemets typographiques
            .replace(/[\u2018\u2019]/g, "'") // Remplacer les apostrophes typographiques
            .trim();

        const quizData = JSON.parse(cleanedText);

        // Validation du format
        if (!quizData.questions || !Array.isArray(quizData.questions)) {
            throw new Error('Format de quiz invalide');
        }

        displayAIQuiz(quizData);

        // Sauvegarder dans l'historique
        await saveQuizToHistory({
            ...quizData,
            subject,
            theme,
            difficulty,
            createdAt: new Date().toISOString(),
            source: 'ai'
        });

    } catch (error) {
        console.error('Erreur génération IA:', error);
        toast(`Erreur génération IA: ${error.message}`, 'error');
        if (displayEl) {
            displayEl.innerHTML = `
                <div class="error-message">
                    <h3>❌ Erreur de génération</h3>
                    <p>${error.message}</p>
                    <button onclick="document.getElementById('aiQuizDisplay').innerHTML = ''">Fermer</button>
                </div>
            `;
        }
    } finally {
        if (loadingEl) loadingEl.classList.add('hidden');
    }
}

function displayAIQuiz(quizData) {
    const displayEl = document.getElementById('aiQuizDisplay');
    if (!displayEl) return;

    currentQuiz = quizData;

    let html = `
        <div class="quiz-display">
            <div class="quiz-header">
                <h3>${quizData.titre}</h3>
                <div class="quiz-meta">
                    <span class="question-count">${quizData.questions.length} questions</span>
                    <span class="quiz-type">IA Generated</span>
                </div>
            </div>
            <form id="aiQuizForm">
    `;

    quizData.questions.forEach((question, index) => {
        html += `
            <div class="quiz-question">
                <div class="question-header">
                    <span class="question-number">${index + 1}</span>
                    <div class="question-text">${question.text}</div>
                </div>
        `;

        if (question.type === 'qcm' && question.choices) {
            question.choices.forEach((choice, choiceIndex) => {
                html += `
                    <label class="quiz-choice">
                        <input type="radio" name="question_${index}" value="${choiceIndex}">
                        <span class="choice-text">${choice}</span>
                    </label>
                `;
            });
        } else if (question.type === 'tf') {
            html += `
                <label class="quiz-choice">
                    <input type="radio" name="question_${index}" value="true">
                    <span class="choice-text">Vrai</span>
                </label>
                <label class="quiz-choice">
                    <input type="radio" name="question_${index}" value="false">
                    <span class="choice-text">Faux</span>
                </label>
            `;
        }

        html += `</div>`;
    });

    html += `
                <button type="submit" class="quiz-submit-btn">🎯 Valider le Quiz</button>
            </form>
        </div>
    `;

    displayEl.innerHTML = html;
    displayEl.style.opacity = '1';
    displayEl.style.transform = 'translateY(0)';

    // Ajouter l'événement de soumission
    document.getElementById('aiQuizForm').addEventListener('submit', function(e) {
        e.preventDefault();
        checkAIQuizAnswers();
    });
}

function checkAIQuizAnswers() {
    if (!currentQuiz) return;

    const form = document.getElementById('aiQuizForm');
    const formData = new FormData(form);
    const answers = {};
    
    // Collecter les réponses
    for (let [key, value] of formData.entries()) {
        answers[key] = value;
    }

    let correctAnswers = 0;
    const results = [];

    currentQuiz.questions.forEach((question, index) => {
        const userAnswer = answers[`question_${index}`];
        let isCorrect = false;

        if (question.type === 'qcm') {
            isCorrect = parseInt(userAnswer) === question.solution;
        } else if (question.type === 'tf') {
            isCorrect = (userAnswer === 'true') === question.solution;
        }

        if (isCorrect) correctAnswers++;

        results.push({
            question: question.text,
            userAnswer: userAnswer,
            correctAnswer: question.solution,
            isCorrect: isCorrect,
            explanation: question.explication || 'Pas d\'explication disponible'
        });
    });

    const score = Math.round((correctAnswers / currentQuiz.questions.length) * 100);
    
    // Sauvegarder le résultat
    saveQuizResult(currentQuiz, score, correctAnswers, results);
    
    // Afficher les résultats
    displayQuizResults(score, correctAnswers, currentQuiz.questions.length, results);
}

function displayQuizResults(score, correctAnswers, totalQuestions, results) {
    const displayEl = document.getElementById('aiQuizDisplay');
    if (!displayEl) return;

    let resultClass = 'result-poor';
    let emoji = '😞';
    let message = 'Il faut encore travailler !';

    if (score >= 90) {
        resultClass = 'result-excellent';
        emoji = '🎉';
        message = 'Excellent travail !';
    } else if (score >= 70) {
        resultClass = 'result-good';
        emoji = '😊';
        message = 'Bon travail !';
    } else if (score >= 50) {
        resultClass = 'result-average';
        emoji = '🤔';
        message = 'Pas mal, continuez !';
    }

    let html = `
        <div class="quiz-result">
            <div class="result-header ${resultClass}">
                <span class="result-emoji">${emoji}</span>
                <h3>${message}</h3>
                <div class="score-display">
                    <span class="score">${correctAnswers}/${totalQuestions}</span>
                    <span class="percentage">${score}%</span>
                </div>
            </div>
            <div class="results-details">
                <h4>Détails des réponses</h4>
    `;

    results.forEach((result, index) => {
        html += `
            <div class="result-item ${result.isCorrect ? 'correct' : 'incorrect'}">
                <div class="result-question">
                    <span class="result-icon">${result.isCorrect ? '✅' : '❌'}</span>
                    <strong>Question ${index + 1}:</strong> ${result.question}
                </div>
                <div class="result-explanation">
                    <strong>💡 Explication:</strong> ${result.explanation}
                </div>
            </div>
        `;
    });

    html += `
            </div>
            <div class="result-actions">
                <button class="retry-btn" onclick="document.getElementById('aiQuizDisplay').innerHTML = ''">Nouveau Quiz</button>
                <button class="new-quiz-btn" onclick="showSection('dashboard')">Retour Dashboard</button>
            </div>
        </div>
    `;

    displayEl.innerHTML = html;
}

async function saveQuizResult(quiz, score, correctAnswers, results) {
    if (!currentUser) return;

    try {
        const quizResult = {
            subject: quiz.subject || 'Quiz IA',
            theme: quiz.theme || '',
            score: score,
            correctAnswers: correctAnswers,
            totalQuestions: quiz.questions.length,
            results: results,
            completedAt: new Date().toISOString(),
            source: quiz.source || 'ai'
        };

        await addDoc(collection(db, 'users', currentUser.uid, 'quizHistory'), quizResult);
        
        // Recharger les données
        await loadUserProgress();
        updateDashboard();

    } catch (error) {
        console.error('Erreur sauvegarde résultat:', error);
    }
}

async function saveQuizToHistory(quizData) {
    if (!currentUser) return;

    try {
        const historyEntry = {
            ...quizData,
            savedAt: new Date().toISOString(),
            userId: currentUser.uid
        };

        await addDoc(collection(db, 'users', currentUser.uid, 'savedQuizzes'), historyEntry);
    } catch (error) {
        console.error('Erreur sauvegarde historique:', error);
    }
}

function startQuizBySubject(subject) {
    if (!quizzes[subject] || !quizzes[subject][0] || !quizzes[subject][0].questions) {
        toast('Aucun quiz disponible pour cette matière', 'warning');
        return;
    }

    const subjectData = quizzes[subject][0];
    currentQuiz = {
        titre: `Quiz ${subject}`,
        subject: subject,
        questions: subjectData.questions.slice(0, 10) // Limiter à 10 questions
    };

    displayAIQuiz(currentQuiz);
    showSection('quiz-ai');
}

// ≡ --- ÉVÉNEMENTS PRINCIPAUX --- //
// ≡ --- INITIALISATION PRINCIPALE COMPLÈTE --- //
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Learni STI2D - Initialisation...');
    
    try {
        // Initialiser le thème
        const savedTheme = localStorage.getItem('theme') || 'dark';
        switchTheme(savedTheme);
        
        // Charger les quiz
        await loadQuizzes();
        
        // ≡ GESTIONNAIRES D'ÉVÉNEMENTS AUTH ≡
        
        // Gestion des onglets d'authentification
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Retirer active de tous les onglets
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
                
                // Activer l'onglet cliqué
                tab.classList.add('active');
                const targetForm = tab.getAttribute('data-tab');
                document.getElementById(targetForm).classList.add('active');
            });
        });
        
        // Formulaire de connexion
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                
                try {
                    await signInWithEmailAndPassword(auth, email, password);
                    toast('Connexion réussie !', 'success');
                } catch (error) {
                    console.error('Erreur de connexion:', error);
                    toast('Erreur de connexion : ' + error.message, 'error');
                }
            });
        }
        
        // Formulaire d'inscription
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('signupEmail').value;
                const password = document.getElementById('signupPassword').value;
                const specialty = document.getElementById('signupSpecialty').value;
                const lv1 = document.getElementById('signupLv1').value;
                const lv2 = document.getElementById('signupLv2').value;
                
                try {
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    
                    // Créer le profil utilisateur
                    await setDoc(doc(db, 'users', userCredential.user.uid), {
                        email: email,
                        speciality: specialty,
                        lv1: lv1,
                        lv2: lv2,
                        createdAt: new Date().toISOString()
                    });
                    
                    toast('Inscription réussie !', 'success');
                } catch (error) {
                    console.error('Erreur d\'inscription:', error);
                    toast('Erreur d\'inscription : ' + error.message, 'error');
                }
            });
        }
        
        // Bouton de déconnexion
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await signOut(auth);
                    toast('Déconnexion réussie', 'success');
                } catch (error) {
                    console.error('Erreur de déconnexion:', error);
                    toast('Erreur de déconnexion', 'error');
                }
            });
        }
        
        // Bouton de changement de thème
        const themeBtn = document.getElementById('themeSwitcher');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                switchTheme();
            });
        }
        
        // Boutons de navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.getAttribute('data-section');
                if (section) {
                    showSection(section);
                }
            });
        });
        
        // ≡ QUIZ ET IA ≡
        
        // Formulaire génération AI
        const aiForm = document.getElementById('aiQuizForm');
        if (aiForm) {
            aiForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const subject = document.getElementById('aiSubject').value;
                const theme = document.getElementById('aiTheme').value;
                const difficulty = document.getElementById('aiDifficulty').value;
                const questionCount = document.getElementById('aiQuestionCount').value;
                
                await generateAIQuiz(subject, theme, difficulty, questionCount);
            });
        }
        
        // Slider de difficulté
        const difficultySlider = document.getElementById('aiDifficulty');
        const difficultyDisplay = document.getElementById('difficultyValue');
        if (difficultySlider && difficultyDisplay) {
            difficultySlider.addEventListener('input', (e) => {
                const value = e.target.value;
                const levels = ['Très facile', 'Facile', 'Moyen', 'Difficile', 'Très difficile'];
                difficultyDisplay.textContent = levels[value - 1] || 'Moyen';
            });
        }
        
        // Render des sélections de quiz
        renderQuizSelect();
        
        // ≡ GESTION AUTH STATE ≡
        
        // Écouter les changements d'authentification
        onAuthStateChanged(auth, async (user) => {
            try {
                if (user) {
                    console.log('Utilisateur connecté:', user.email);
                    await fetchAndSyncUserData(user);
                    showSection('dashboard');
                    hideLoadingScreen();
                } else {
                    console.log('Utilisateur non connecté');
                    showSection('authSection');
                    hideLoadingScreen();
                }
            } catch (error) {
                console.error('Erreur lors de la gestion utilisateur:', error);
                showSection('authSection');
                hideLoadingScreen();
            }
        });
        
        // Forcer le masquage après 8 secondes maximum
        setTimeout(() => {
            hideLoadingScreen();
        }, 8000);
        
        console.log('✅ Learni STI2D - Initialisé avec succès');
        
    } catch (error) {
        console.error('Erreur d\'initialisation:', error);
        hideLoadingScreen();
        showSection('authSection');
    }
});

// Fonction pour masquer l'écran de chargement
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 300);
    }
}

// Fonctions globales pour les boutons inline
window.showSection = showSection;
window.switchTheme = switchTheme;
window.startQuizBySubject = startQuizBySubject;
window.renderQuizSelect = renderQuizSelect;
window.renderAllFiches = renderAllFiches;
window.renderQuizHistory = renderQuizHistory;
