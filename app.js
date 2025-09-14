/* ========== app.js - Learni STI2D - SPA front full Firebase/AI ========== */

// ≡  Import Firebase core/configs
import {
    auth, db, analytics,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
    onAuthStateChanged, doc, setDoc, getDoc, updateDoc, collection, getDocs, onSnapshot, logEvent
} from './firebase.js';

// ≡  GLOBALS
let currentUser = null;
let userData = {};
let speciality = '';
let lv1 = '';
let lv2 = '';
let quizzes = {}; // Fichier importé
let theme = 'dark';
let currentSection = 'dashboard'; // SPA navigation
const THEMES = { dark: 'theme-dark', light: 'theme-light' };

// ≡  --- UTILITAIRES GÉNÉRAUX ---

// Switching d'onglet principal SPA
function showSection(id) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    currentSection = id;
}

// Mode sombre/clair
function switchTheme(force) {
    if (force) theme = force;
    else theme = theme === 'dark' ? 'light' : 'dark';
    document.body.classList.remove(...Object.values(THEMES));
    document.body.classList.add(THEMES[theme]);
    localStorage.setItem('theme', theme);
    document.getElementById('themeSwitcher').textContent = theme === 'dark' ? '☀️' : '🌙';
}

// Toast notifications
function toast(msg, type='info', timeout=3000) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), timeout);
}

// Récupère quizz JSON (100% dynamique)
async function loadQuizzes() {
    const resp = await fetch('./quizzes/fr/sti2d.json');
    quizzes = await resp.json();
}

// --- ≡ AUTH et INSCRIPTION ---

// Affiche connexion ou dashboard si déjà connecté
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        logEvent(analytics, 'login_success', { uid: user.uid });
        await fetchAndSyncUserData();
        showSection('dashboardSection');
        renderDashboard();
        document.getElementById('logoutBtn').classList.remove('hidden');
    } else {
        showSection('authSection');
        document.getElementById('logoutBtn').classList.add('hidden');
    }
});

// Connexion simple
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const pw = document.getElementById('password').value.trim();
    try {
        await signInWithEmailAndPassword(auth, email, pw);
        toast('Connexion réussie', 'success');
    } catch (e) {
        toast('Identifiants érronés', 'error');
    }
});

// Création compte
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value.trim();
    const pw = document.getElementById('regPassword').value.trim();
    if (pw.length < 8 || !/@/.test(email)) {
        toast('Mot de passe min 8 char et email valide', 'error'); return;
    }
    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, pw);
        // Création doc profil Firestore
        await setDoc(doc(db, 'users', userCred.user.uid), {
            created: new Date().toISOString(),
            email,
            progress: {},
            config: {}
        });
        toast('Compte créé !');
    } catch (e) {
        toast('Erreur création compte', 'error');
    }
});

// Déconnexion
document.getElementById('logoutBtn').onclick = () => signOut(auth);

// --- ≡ PROFIL BAC / SETUP INITIAL ---

async function fetchAndSyncUserData() {
    const ref = doc(db, 'users', currentUser.uid);
    let snap = await getDoc(ref);
    if (!snap.exists()) {
        // Nouveau user : demande spécialité, lv1, lv2
        showSection('setupSection');
        document.getElementById('setupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            speciality = document.getElementById('specialite').value;
            lv1 = document.getElementById('lv1').value;
            lv2 = document.getElementById('lv2').value;
            await updateDoc(ref, { config: { speciality, lv1, lv2 } });
            toast('Profil enregistré !');
            showSection('dashboardSection');
            renderDashboard();
        }, { once: true });
    } else {
        userData = snap.data();
        if (!userData.config || !userData.config.speciality) {
            showSection('setupSection');
        } else {
            speciality = userData.config.speciality;
            lv1 = userData.config.lv1;
            lv2 = userData.config.lv2;
            showSection('dashboardSection');
            renderDashboard();
        }
    }
}

// ≡ NAVIGATION PRINCIPALE SPA

document.getElementById('progressBtn').onclick = () => {
    showSection('dashboardSection'); renderDashboard();
};
document.getElementById('quizBtn').onclick = () => {
    showSection('quizSection'); renderQuizSelect();
};
document.getElementById('reviewBtn').onclick = () => {
    showSection('reviewSection'); renderAllFiches();
};
document.getElementById('aiQuizBtn').onclick = () => {
    showSection('aiQuizSection'); renderAIGenerator();
};

// Thème
document.getElementById('themeSwitcher').onclick = () => switchTheme();

// Initialisation thème auto + quiz loading
window.addEventListener('DOMContentLoaded', () => {
    theme = localStorage.getItem('theme') || 'dark';
    switchTheme(theme);
    loadQuizzes();
});

// --- ≡ DASHBOARD : Suivi & Statistiques ---

function renderDashboard() {
    const section = document.getElementById('dashboardSection');
    let html = `<h2>Progression globale</h2>`;
    // Récup stats depuis Firestore
    let progress = userData.progress || {};
    html += `<div class="progress-heatmap">${Object.keys(progress).map(mat => {
        const p = progress[mat] || {};
        let percent = calcProgressPercent(p);
        return `<div class="matStat"><strong>${mat}</strong> : <span>${percent}%</span>
                <progress value="${percent}" max="100"></progress></div>`;
    }).join('')}</div>`;
    // Indices
    html += `<div id="stat-details"></div><button id="refreshStats">🔄 Rafraîchir stats</button>`;
    section.innerHTML = html;
    document.getElementById('refreshStats').onclick = () => renderDashboard();
    renderStatDetails();
}
function renderStatDetails() {
    // Affiche stats détaillées du user (heatmap, badges gagnés, etc.)
    // À compléter ou enrichir selon la structure finale
}

// Calcule la progression pour une matière/thème
function calcProgressPercent(pObj) {
    if (!pObj || !pObj.completed) return 0;
    let done = pObj.completed.length;
    let total = pObj.total || 1;
    return Math.floor(100 * done / total);
}

// --- ≡ SÉLECTEUR & LANCEMENT DE QUIZZS ---

function renderQuizSelect() {
    const section = document.getElementById('quizSection');
    let html = `<h2>Quiz par matière</h2><div class="quiz-list">`;
    Object.keys(quizzes).forEach(mat => {
        // Si user n'a pas choisi matière/spé, ne propose pas
        if (mat === 'LV1' && lv1 === '') return;
        if (mat === 'LV2' && lv2 === '') return;
        html += `<button class="quiz-btn" data-mat="${mat}">${mat}</button>`;
    });
    html += `</div><div id="quizplay"></div>`;
    section.innerHTML = html;
    for (const btn of section.querySelectorAll('.quiz-btn')) {
        btn.onclick = (e) => launchQuiz(e.target.dataset.mat, 0);
    }
}
async function launchQuiz(mat, quizIndex=0) {
    let quiz = quizzes[mat][quizIndex];
    if (!quiz) return toast('Aucun quiz pour cette matière', 'error');
    let html = `<h3>Quiz ${mat} – ${quiz.titre || ''}</h3><form id="quizForm">`;
    quiz.questions.forEach((q, i) => {
        html += `<div class="quiz-q">
            <strong>Q${i+1}.</strong> ${q.text}<br/>` +
            (q.type === 'qcm'
            ? q.choices.map((ch,j) =>
            `<label><input type="radio" name="q${i}" value="${j}">${ch}</label>`).join('')
            : q.type === 'tf'
            ? `<label><input type="radio" name="q${i}" value="1">Vrai</label><label><input type="radio" name="q${i}" value="0">Faux</label>`
            : '') + `</div>`;
    });
    html += `<button type="submit">Valider</button></form><div id="quizResult"></div>`;
    document.getElementById('quizplay').innerHTML = html;
    document.getElementById('quizForm').onsubmit = (e) => validateQuiz(e, mat, quiz);
}

// Correction et sauvegarde
function validateQuiz(e, mat, quiz) {
    e.preventDefault();
    let score = 0;
    quiz.questions.forEach((q,i) => {
        const ans = document.querySelector(`[name="q${i}"]:checked`);
        if (!ans) return;
        if (q.type === 'qcm' && parseInt(ans.value) === q.solution) score++;
        if (q.type === 'tf' && ((ans.value === '1') === q.solution)) score++;
    });
    let total = quiz.questions.length;
    let percent = Math.round(100*score/total);
    document.getElementById('quizResult').innerHTML =
        `<strong>Score : ${score}/${total} (${percent}%)</strong>`;
    // Maj progression Firestore : ajoute score + completion
    updateUserProgress(mat, quiz.titre, percent);
}

// Met à jour la progression dans la base
async function updateUserProgress(mat, quizLabel, percent) {
    const userRef = doc(db, 'users', currentUser.uid);
    userData.progress = userData.progress || {};
    userData.progress[mat] = userData.progress[mat] || { completed: [], total: quizzes[mat].length };
    if (!userData.progress[mat].completed.includes(quizLabel)) 
        userData.progress[mat].completed.push(quizLabel);
    await updateDoc(userRef, { progress: userData.progress });
    toast('Progression mise à jour', 'success');
    renderDashboard();
}

// ≡ ≡ ≡  FICHES DE COURS / MÉMOS

function renderAllFiches() {
    const section = document.getElementById('reviewSection');
    let html = `<h2>Fiches de révision</h2><div class="fiche-list">`;
    Object.keys(quizzes).forEach(mat => {
        html += `<details><summary>${mat}</summary><section>`;
        quizzes[mat].forEach(qz => {
            html += `<div class="fiche">
            <h4>${qz.titre}</h4>
            <div class="keywords"><small>Mots clés : ${qz.keywords.join(', ')}</small></div>
            <p>${qz.memo}</p>
            </div>`;
        });
        html += `</section></details>`;
    });
    html += `</div>`;
    section.innerHTML = html;
}


// ≡ ≡ ≡  GÉNÉRATEUR DE QUIZZ IA GEMINI

function renderAIGenerator() {
    const section = document.getElementById('aiQuizSection');
    section.innerHTML =
        `<h2>Générer un quiz avec l'IA</h2>
         <form id="aiQuizForm">
             <label>Matière :
                 <select id="aiQuizMat">${Object.keys(quizzes).map(mat => `<option>${mat}</option>`)}</select>
             </label>
             <label>Thème ou chapitre précis :
                 <input type="text" id="aiQuizTheme" placeholder="ex : Loi d'Ohm" />
             </label>
             <label>Nombre de questions :
                 <input type="number" id="aiQuizNb" min="5" max="50" value="10" />
             </label>
             <button type="submit">Générer</button>
         </form>
         <div id="aiQuizDisplay"></div>`;
    document.getElementById('aiQuizForm').onsubmit = generateAIQuiz;
}

// Integration Gemini AI par API HTTP
async function generateAIQuiz(e) {
    e.preventDefault();
    const mat = document.getElementById('aiQuizMat').value;
    const theme = document.getElementById('aiQuizTheme').value;
    const nb = document.getElementById('aiQuizNb').value;

    toast('Génération du quiz IA en cours...');

    // Prompt ultra-dirigiste pour format JSON compatible
    const prompt = `Génère un quiz scolaire niveau BAC STI2D sur le programme scolaire français le plus récent possible pour la matière ${mat}, thème "${theme}". 
Donne exactement ${nb} questions, au format JSON strict (toutes questions dans un tableau, pas d'objet racine), chaque question doit contenir les champs : "type":"qcm", "text" (énoncé), "choices" (tableau de 4 réponses), "solution" (index), et "explication" (phrase). Donne uniquement le tableau JSON, rien d'autre.`;

    try {
        // Préfère /v1/ si erreur 404 sur v1beta
        const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyDOeHF6la3IFedlVC4-NM0Yjgj737AIAWo";

        const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    { parts: [{ text: prompt }] }
                ]
            })
        });

        if (!resp.ok) {
            toast(`Erreur Gemini API : ${resp.status}`, 'error');
            return;
        }

        const data = await resp.json();

        // Gemini API v1beta retourne le JSON à parser dans : data.candidates[0].content.parts[0].text
        let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        // Cas où Gemini encapsule le résultat dans ``````
        if (raw && raw.trim().startsWith("```
            raw = raw.replace(/```json/g, "").replace(/```
        }

        let quizAI = [];
        try {
            quizAI = JSON.parse(raw);
        } catch {
            toast('Erreur de parsing JSON retour Gemini', 'error');
            // Pour debug : console.log("Texte IA : ", raw);
            return;
        }

        displayAIQuiz(quizAI);

    } catch (err) {
        toast('Erreur appel Gemini API', 'error');
        // Pour debug : console.error(err);
    }
}


// Affiche quiz AI, permet correction locale immédiate
function displayAIQuiz(quizAI) {
    let html = `<form id="aiQuizEval">`;
    quizAI.forEach((q, i) => {
        html += `<div class="quiz-q">
        <strong>Q${i+1}.</strong> ${q.text}<br/>${q.choices.map(
            (ch,j)=> `<label><input type="radio" name="q${i}" value="${j}">${ch}</label>`).join('')}
        <small>${q.explication||""}</small></div>`;
    });
    html += `<button type="submit">Corriger</button></form><div id="aiQuizResult"></div>`;
    document.getElementById('aiQuizDisplay').innerHTML = html;
    document.getElementById('aiQuizEval').onsubmit = (e) => {
        e.preventDefault();
        let score=0;
        quizAI.forEach((q,i)=>{
            const ans=document.querySelector(`[name="q${i}"]:checked`);
            if(ans && parseInt(ans.value)===q.solution)score++;
        });
        let total=quizAI.length,percent=Math.round(100*score/total);
        document.getElementById('aiQuizResult').innerHTML=`<strong>Score IA : ${score}/${total} (${percent}%)</strong>`;
    };
}

// ≡ ≡ Mode d'affichage selon la structure
window.addEventListener('hashchange', () => {
    let section = window.location.hash.slice(1) || 'dashboardSection';
    showSection(section);
});

// ≡ Fin du JS Learni STI2D, SPA moderne, performant et 100% front
