/* ========== app.js - Learni STI2D AMÉLIORÉ - Version Complète ========== */

// ≡ Import Firebase core/configs
import { 
    auth, db, analytics, 
    signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged,
    doc, setDoc, getDoc, updateDoc, collection, getDocs, onSnapshot, logEvent,
    addDoc, query, orderBy, limit, where
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
        section.classList.remove('hidden');
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        setTimeout(() => {
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
        }, 50);
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
    document.getElementById('themeSwitcher').textContent = theme === 'dark' ? '☀️' : '🌙';
    
    // Effet de pulse sur le bouton
    const switcher = document.getElementById('themeSwitcher');
    switcher.style.transform = 'scale(1.2)';
    setTimeout(() => switcher.style.transform = 'scale(1)', 150);
}

// Toast notifications améliorées avec icônes
function toast(msg, type = 'info', timeout = 4000) {
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${msg}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
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

// ≡ --- GÉNÉRATION IA GEMINI COMPLÈTE --- //

async function generateAIQuiz(subject, theme, difficulty, questionCount) {
    const loadingEl = document.getElementById('aiQuizLoading');
    const displayEl = document.getElementById('aiQuizDisplay');
    
    loadingEl.classList.remove('hidden');
    displayEl.innerHTML = '';
    
    try {
        const prompt = `
Génère un quiz de ${questionCount} questions sur le sujet "${subject}" et le thème "${theme}" 
pour le niveau BAC STI2D français, difficulté ${difficulty}/5.

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
- Réponses d'une longueur similaire pour éviter les indices
        `;

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
        let cleanedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
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
        displayEl.innerHTML = `
            <div class="error-message">
                <h3>❌ Erreur de génération</h3>
                <p>Impossible de générer le quiz. Vérifiez votre clé API Gemini.</p>
                <p><small>Erreur: ${error.message}</small></p>
            </div>
        `;
    } finally {
        loadingEl.classList.add('hidden');
    }
}

function displayAIQuiz(quizData) {
    const displayEl = document.getElementById('aiQuizDisplay');
    currentQuiz = quizData;
    
    let html = `
        <div class="quiz-header">
            <h3>🤖 ${quizData.titre}</h3>
            <div class="quiz-meta">
                <span class="question-count">${quizData.questions.length} questions</span>
                <span class="quiz-type">Généré par IA</span>
            </div>
        </div>
        <form id="aiQuizForm" onsubmit="submitAIQuiz(event)">
    `;

    quizData.questions.forEach((q, index) => {
        html += `
            <div class="quiz-question">
                <div class="question-header">
                    <span class="question-number">${index + 1}</span>
                    <strong class="question-text">${q.text}</strong>
                </div>
        `;

        if (q.type === 'qcm') {
            q.choices.forEach((choice, i) => {
                html += `
                    <label class="quiz-choice">
                        <input type="radio" name="q${index}" value="${i}">
                        <span class="choice-text">${choice}</span>
                    </label>
                `;
            });
        } else if (q.type === 'tf') {
            html += `
                <label class="quiz-choice">
                    <input type="radio" name="q${index}" value="true">
                    <span class="choice-text">Vrai</span>
                </label>
                <label class="quiz-choice">
                    <input type="radio" name="q${index}" value="false">
                    <span class="choice-text">Faux</span>
                </label>
            `;
        }

        html += '</div>';
    });

    html += `
            <button type="submit" class="quiz-submit-btn">
                🎯 Valider le Quiz
            </button>
        </form>
        <div id="aiQuizResult" class="quiz-result hidden"></div>
    `;

    displayEl.innerHTML = html;
    
    // Animation d'apparition
    setTimeout(() => {
        displayEl.style.opacity = '1';
        displayEl.style.transform = 'translateY(0)';
    }, 100);
}

async function submitAIQuiz(event) {
    event.preventDefault();
    
    if (!currentQuiz) return;
    
    const form = event.target;
    const formData = new FormData(form);
    let score = 0;
    let results = [];

    currentQuiz.questions.forEach((q, index) => {
        const userAnswer = formData.get(`q${index}`);
        const correct = checkAnswer(q, userAnswer);
        
        if (correct) score++;
        
        results.push({
            question: q.text,
            userAnswer,
            correctAnswer: q.solution,
            correct,
            explanation: q.explication
        });
    });

    const percentage = Math.round((score / currentQuiz.questions.length) * 100);
    
    // Afficher les résultats
    displayQuizResults(score, currentQuiz.questions.length, percentage, results);
    
    // Sauvegarder le score
    await saveQuizScore({
        quizTitle: currentQuiz.titre,
        score,
        totalQuestions: currentQuiz.questions.length,
        percentage,
        completedAt: new Date().toISOString(),
        type: 'ai'
    });
    
    // Mettre à jour les statistiques
    await updateUserProgress(score, currentQuiz.questions.length);
    
    // Logique d'achievements
    checkAchievements(score, percentage);
}

function checkAnswer(question, userAnswer) {
    if (question.type === 'tf') {
        return (userAnswer === 'true') === question.solution;
    }
    return parseInt(userAnswer) === question.solution;
}

function displayQuizResults(score, total, percentage, results) {
    const resultEl = document.getElementById('aiQuizResult');
    
    let emoji = '😔';
    let message = 'Il faut encore travailler !';
    let colorClass = 'result-poor';
    
    if (percentage >= 90) {
        emoji = '🏆';
        message = 'Excellent travail !';
        colorClass = 'result-excellent';
    } else if (percentage >= 75) {
        emoji = '🎉';
        message = 'Très bien !';
        colorClass = 'result-good';
    } else if (percentage >= 50) {
        emoji = '👍';
        message = 'Pas mal !';
        colorClass = 'result-average';
    }
    
    let html = `
        <div class="result-header ${colorClass}">
            <div class="result-score">
                <span class="result-emoji">${emoji}</span>
                <h3>${message}</h3>
                <div class="score-display">
                    <span class="score">${score}/${total}</span>
                    <span class="percentage">${percentage}%</span>
                </div>
            </div>
        </div>
        
        <div class="results-details">
            <h4>📝 Détail des réponses</h4>
    `;
    
    results.forEach((result, index) => {
        const icon = result.correct ? '✅' : '❌';
        html += `
            <div class="result-item ${result.correct ? 'correct' : 'incorrect'}">
                <div class="result-question">
                    <span class="result-icon">${icon}</span>
                    <strong>Q${index + 1}:</strong> ${result.question}
                </div>
                <div class="result-explanation">
                    <p><strong>💡 Explication:</strong> ${result.explanation}</p>
                </div>
            </div>
        `;
    });
    
    html += `
        </div>
        <div class="result-actions">
            <button onclick="retryQuiz()" class="retry-btn">🔄 Recommencer</button>
            <button onclick="generateNewQuiz()" class="new-quiz-btn">➕ Nouveau Quiz</button>
        </div>
    `;
    
    resultEl.innerHTML = html;
    resultEl.classList.remove('hidden');
    
    // Scroll vers les résultats
    resultEl.scrollIntoView({ behavior: 'smooth' });
}

// ≡ --- AUTH ET INSCRIPTION AMÉLIORÉS --- //

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        logEvent(analytics, 'login_success', { uid: user.uid });
        await fetchAndSyncUserData();
        showSection('dashboardSection');
        renderDashboard();
        document.getElementById('logoutBtn').classList.remove('hidden');
        
        // Charger les données utilisateur
        await loadUserProgress();
        await loadQuizHistory();
        
    } else {
        showSection('authSection');
        document.getElementById('logoutBtn').classList.add('hidden');
    }
});

// Connexion améliorée avec validation
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const pw = document.getElementById('password').value.trim();
    
    if (!validateEmail(email)) {
        toast('Adresse email invalide', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Connexion...';
    
    try {
        await signInWithEmailAndPassword(auth, email, pw);
        toast('Connexion réussie ! 🎉', 'success');
    } catch (error) {
        toast(`Erreur: ${getErrorMessage(error.code)}`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Se connecter';
    }
});

// Création compte améliorée
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value.trim();
    const pw = document.getElementById('regPassword').value.trim();
    
    if (!validateEmail(email) || !validatePassword(pw)) {
        toast('Email invalide ou mot de passe trop faible (min 8 caractères)', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Création...';
    
    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, pw);
        
        // Création du profil utilisateur complet
        await setDoc(doc(db, 'users', userCred.user.uid), {
            created: new Date().toISOString(),
            email,
            progress: {},
            config: {},
            stats: {
                totalQuizzes: 0,
                totalQuestions: 0,
                totalCorrect: 0,
                averageScore: 0,
                streak: 0,
                lastActivity: new Date().toISOString()
            },
            achievements: []
        });
        
        toast('Compte créé avec succès ! 🎊', 'success');
    } catch (error) {
        toast(`Erreur: ${getErrorMessage(error.code)}`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Créer le compte';
    }
});

// ≡ --- DASHBOARD AMÉLIORÉ --- //

function renderDashboard() {
    const section = document.getElementById('dashboardSection');
    
    const stats = userData.stats || {
        totalQuizzes: 0,
        totalQuestions: 0,
        totalCorrect: 0,
        averageScore: 0,
        streak: 0
    };
    
    let html = `
        <div class="dashboard-header">
            <h2>📊 Tableau de Bord STI2D</h2>
            <div class="user-info">
                <span class="user-email">${currentUser.email}</span>
                <div class="user-config">
                    ${speciality ? `<span class="specialty">🔧 ${speciality}</span>` : ''}
                    ${lv1 ? `<span class="lv1">🇬🇧 ${lv1}</span>` : ''}
                    ${lv2 ? `<span class="lv2">🗣️ ${lv2}</span>` : ''}
                </div>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">📝</div>
                <div class="stat-content">
                    <h3>${stats.totalQuizzes}</h3>
                    <p>Quiz complétés</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">🎯</div>
                <div class="stat-content">
                    <h3>${stats.averageScore}%</h3>
                    <p>Score moyen</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">🔥</div>
                <div class="stat-content">
                    <h3>${stats.streak}</h3>
                    <p>Série actuelle</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-content">
                    <h3>${stats.totalCorrect}/${stats.totalQuestions}</h3>
                    <p>Bonnes réponses</p>
                </div>
            </div>
        </div>
        
        <div class="progress-section">
            <h3>📈 Progression par matière</h3>
            <div class="subjects-progress">
    `;
    
    // Progression par matière
    Object.keys(STI2D_SUBJECTS["Tronc Commun"]).forEach(subject => {
        const progress = userProgress[subject] || 0;
        html += `
            <div class="subject-progress">
                <div class="subject-info">
                    <span class="subject-name">${subject}</span>
                    <span class="subject-score">${progress}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
        
        <div class="recent-activities">
            <h3>🕒 Activité récente</h3>
            <div id="recentQuizzes" class="recent-list">
                ${renderRecentQuizzes()}
            </div>
        </div>
        
        <div class="achievements-section">
            <h3>🏆 Achievements</h3>
            <div class="achievements-grid">
                ${renderAchievements()}
            </div>
        </div>
    `;
    
    section.innerHTML = html;
}

function renderRecentQuizzes() {
    if (!quizHistory.length) {
        return '<p class="no-data">Aucun quiz complété pour le moment</p>';
    }
    
    return quizHistory.slice(0, 5).map(quiz => `
        <div class="recent-item">
            <div class="recent-icon">${quiz.type === 'ai' ? '🤖' : '📚'}</div>
            <div class="recent-content">
                <span class="recent-title">${quiz.quizTitle}</span>
                <span class="recent-score">${quiz.score}/${quiz.totalQuestions} (${quiz.percentage}%)</span>
                <span class="recent-date">${formatDate(quiz.completedAt)}</span>
            </div>
        </div>
    `).join('');
}

function renderAchievements() {
    const allAchievements = [
        { id: 'first_quiz', name: 'Premier pas', description: 'Compléter votre premier quiz', icon: '🎯', unlocked: false },
        { id: 'perfect_score', name: 'Parfait !', description: 'Obtenir 100% à un quiz', icon: '🏆', unlocked: false },
        { id: 'streak_5', name: 'En série !', description: 'Réussir 5 quiz d\'affilée', icon: '🔥', unlocked: false },
        { id: 'quiz_master', name: 'Quiz Master', description: 'Compléter 50 quiz', icon: '👑', unlocked: false }
    ];
    
    // Vérifier les achievements débloqués
    const userAchievements = achievements || [];
    
    return allAchievements.map(achievement => {
        const unlocked = userAchievements.includes(achievement.id);
        return `
            <div class="achievement ${unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-content">
                    <h4>${achievement.name}</h4>
                    <p>${achievement.description}</p>
                </div>
                ${unlocked ? '<div class="achievement-badge">✓</div>' : ''}
            </div>
        `;
    }).join('');
}

// ≡ --- NAVIGATION AMÉLIORÉE --- //

document.getElementById('progressBtn').onclick = () => {
    showSection('dashboardSection');
    renderDashboard();
};

document.getElementById('quizBtn').onclick = () => {
    showSection('quizSection');
    renderQuizSelect();
};

document.getElementById('reviewBtn').onclick = () => {
    showSection('reviewSection');
    renderAllFiches();
};

document.getElementById('aiQuizBtn').onclick = () => {
    showSection('aiQuizSection');
    renderAIGenerator();
};

document.getElementById('historyBtn')?.addEventListener('click', () => {
    showSection('historySection');
    renderQuizHistory();
});

// ≡ --- GÉNÉRATION AI INTERFACE --- //

function renderAIGenerator() {
    const section = document.getElementById('aiQuizSection');
    
    let html = `
        <div class="ai-header">
            <h2>🤖 Générateur de Quiz IA</h2>
            <p class="ai-description">Créez des quiz personnalisés avec l'intelligence artificielle</p>
        </div>
        
        <form id="aiQuizForm" class="ai-form">
            <div class="form-group">
                <label for="aiSubject">📚 Matière</label>
                <select id="aiSubject" required>
                    <option value="">Choisir une matière...</option>
    `;
    
    // Options des matières
    Object.keys(STI2D_SUBJECTS["Tronc Commun"]).forEach(subject => {
        html += `<option value="${subject}">${subject}</option>`;
    });
    
    Object.keys(STI2D_SUBJECTS["Spécialités"]).forEach(subject => {
        html += `<option value="${subject}">${subject} (Spécialité)</option>`;
    });
    
    html += `
                </select>
            </div>
            
            <div class="form-group">
                <label for="aiTheme">🎯 Thème spécifique</label>
                <select id="aiTheme" required>
                    <option value="">Sélectionnez d'abord une matière</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="aiDifficulty">⚡ Difficulté</label>
                <div class="difficulty-selector">
                    <input type="range" id="aiDifficulty" min="1" max="5" value="3">
                    <div class="difficulty-labels">
                        <span>Facile</span>
                        <span>Moyen</span>
                        <span>Difficile</span>
                    </div>
                    <div class="difficulty-display">Niveau: <span id="difficultyValue">3</span>/5</div>
                </div>
            </div>
            
            <div class="form-group">
                <label for="aiQuestionCount">📝 Nombre de questions</label>
                <select id="aiQuestionCount">
                    <option value="5">5 questions (rapide)</option>
                    <option value="10" selected>10 questions (standard)</option>
                    <option value="15">15 questions (approfondi)</option>
                    <option value="20">20 questions (complet)</option>
                </select>
            </div>
            
            <button type="submit" class="generate-btn">
                ✨ Générer le Quiz
            </button>
        </form>
        
        <div id="aiQuizLoading" class="loading-container hidden">
            <div class="loading-animation">
                <div class="loading-spinner"></div>
                <p>🧠 L'IA génère votre quiz personnalisé...</p>
                <small>Cela peut prendre quelques secondes</small>
            </div>
        </div>
        
        <div id="aiQuizDisplay" class="quiz-display"></div>
    `;
    
    section.innerHTML = html;
    
    // Event listeners pour la génération IA
    setupAIFormListeners();
}

function setupAIFormListeners() {
    const subjectSelect = document.getElementById('aiSubject');
    const themeSelect = document.getElementById('aiTheme');
    const difficultySlider = document.getElementById('aiDifficulty');
    const form = document.getElementById('aiQuizForm');
    
    // Mise à jour des thèmes selon la matière
    subjectSelect.addEventListener('change', function() {
        const subject = this.value;
        themeSelect.innerHTML = '<option value="">Choisir un thème...</option>';
        
        if (subject) {
            let themes = [];
            
            if (STI2D_SUBJECTS["Tronc Commun"][subject]) {
                themes = STI2D_SUBJECTS["Tronc Commun"][subject];
            } else if (STI2D_SUBJECTS["Spécialités"][subject]) {
                themes = STI2D_SUBJECTS["Spécialités"][subject];
            }
            
            themes.forEach(theme => {
                const option = document.createElement('option');
                option.value = theme;
                option.textContent = theme;
                themeSelect.appendChild(option);
            });
        }
    });
    
    // Mise à jour affichage difficulté
    difficultySlider.addEventListener('input', function() {
        document.getElementById('difficultyValue').textContent = this.value;
    });
    
    // Soumission du formulaire
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const subject = document.getElementById('aiSubject').value;
        const theme = document.getElementById('aiTheme').value;
        const difficulty = document.getElementById('aiDifficulty').value;
        const questionCount = document.getElementById('aiQuestionCount').value;
        
        if (!subject || !theme) {
            toast('Veuillez sélectionner une matière et un thème', 'warning');
            return;
        }
        
        await generateAIQuiz(subject, theme, difficulty, parseInt(questionCount));
    });
}

// ≡ --- SAUVEGARDE ET DONNÉES UTILISATEUR --- //

async function saveQuizScore(scoreData) {
    if (!currentUser) return;
    
    try {
        await addDoc(collection(db, 'users', currentUser.uid, 'quizResults'), scoreData);
        
        // Mettre à jour les statistiques générales
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        const currentStats = userDoc.data()?.stats || {};
        
        const newStats = {
            totalQuizzes: (currentStats.totalQuizzes || 0) + 1,
            totalQuestions: (currentStats.totalQuestions || 0) + scoreData.totalQuestions,
            totalCorrect: (currentStats.totalCorrect || 0) + scoreData.score,
            averageScore: Math.round(((currentStats.totalCorrect || 0) + scoreData.score) / 
                         ((currentStats.totalQuestions || 0) + scoreData.totalQuestions) * 100),
            lastActivity: new Date().toISOString()
        };
        
        await updateDoc(userRef, { stats: newStats });
        userData.stats = newStats;
        
    } catch (error) {
        console.error('Erreur sauvegarde score:', error);
    }
}

async function loadUserProgress() {
    if (!currentUser) return;
    
    try {
        const resultsQuery = query(
            collection(db, 'users', currentUser.uid, 'quizResults'),
            orderBy('completedAt', 'desc'),
            limit(50)
        );
        
        const snapshot = await getDocs(resultsQuery);
        quizHistory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Calculer la progression par matière
        const progressBySubject = {};
        
        quizHistory.forEach(quiz => {
            const subject = quiz.quizTitle.split(' - ')[0]; // Extraire la matière du titre
            if (!progressBySubject[subject]) {
                progressBySubject[subject] = { total: 0, correct: 0 };
            }
            progressBySubject[subject].total += quiz.totalQuestions;
            progressBySubject[subject].correct += quiz.score;
        });
        
        // Convertir en pourcentages
        Object.keys(progressBySubject).forEach(subject => {
            const data = progressBySubject[subject];
            userProgress[subject] = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
        });
        
    } catch (error) {
        console.error('Erreur chargement progression:', error);
    }
}

// ≡ --- UTILITAIRES --- //

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
    return password.length >= 8;
}

function getErrorMessage(code) {
    const messages = {
        'auth/user-not-found': 'Utilisateur non trouvé',
        'auth/wrong-password': 'Mot de passe incorrect',
        'auth/email-already-in-use': 'Cette adresse email est déjà utilisée',
        'auth/weak-password': 'Mot de passe trop faible',
        'auth/invalid-email': 'Adresse email invalide'
    };
    return messages[code] || 'Erreur inconnue';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function checkAchievements(score, percentage) {
    const newAchievements = [];
    
    // Premier quiz
    if (userData.stats?.totalQuizzes === 1) {
        newAchievements.push('first_quiz');
    }
    
    // Score parfait
    if (percentage === 100) {
        newAchievements.push('perfect_score');
    }
    
    // Série de 5
    if (streakCounter >= 5) {
        newAchievements.push('streak_5');
    }
    
    // Quiz master
    if (userData.stats?.totalQuizzes >= 50) {
        newAchievements.push('quiz_master');
    }
    
    // Sauvegarder les nouveaux achievements
    if (newAchievements.length > 0) {
        achievements.push(...newAchievements);
        await updateDoc(doc(db, 'users', currentUser.uid), {
            achievements: achievements
        });
        
        // Notifications
        newAchievements.forEach(achievement => {
            toast(`🏆 Nouveau achievement débloqué !`, 'success');
        });
    }
}

// ≡ --- INITIALISATION --- //

window.addEventListener('DOMContentLoaded', () => {
    theme = localStorage.getItem('theme') || 'dark';
    switchTheme(theme);
    loadQuizzes();
    
    // Ajouter des event listeners pour les nouvelles fonctionnalités
    document.getElementById('themeSwitcher').onclick = () => switchTheme();
    document.getElementById('logoutBtn').onclick = () => signOut(auth);
});

// Fonctions pour compatibilité avec l'HTML existant
window.showSection = showSection;
window.switchTheme = switchTheme;
window.generateAIQuiz = generateAIQuiz;
window.submitAIQuiz = submitAIQuiz;
