// ============================================
// APPLICATION PRINCIPALE - AVEC HISTORIQUE
// ============================================

let currentLang = 'fr';
let currentUser = null;
let timerInterval = null;

function initApp(lang, user) {
    currentLang = lang;
    currentUser = user;

    // Charger la langue
    changeLang(lang);

    // Démarrer le timer d'abonnement
    startSubscriptionTimer();

    // Charger les données
    fetchData();
    setInterval(fetchData, 3000);

    // 🔧 NOUVEAU: Charger l'historique des prédictions
    loadPredictionHistory();
    setInterval(loadPredictionHistory, 30000); // Rafraîchir toutes les 30s
}

function changeLang(lang) {
    currentLang = lang;
    const t = TRANSLATIONS[lang];

    // Mettre à jour tous les éléments avec data-translate
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.dataset.translate;
        if (t[key]) {
            el.textContent = t[key];
        }
    });

    // Mettre à jour le drapeau
    const flagEl = document.getElementById('userFlag');
    if (flagEl && t.flag) {
        flagEl.textContent = t.flag;
    }

    localStorage.setItem('preferred_lang', lang);
}

function getSuitDisplay(suit) {
    const displays = {
        '♠': '♠️ Pique',
        '♥': '❤️ Cœur',
        '♦': '♦️ Carreau',
        '♣': '♣️ Trèfle'
    };
    return displays[suit] || suit;
}

function getSuitClass(suit) {
    return `suit-${suit === '♥' ? 'heart' : suit === '♦' ? 'diamond' : suit === '♣' ? 'club' : 'spade'}`;
}

// 🔧 MODIFIÉ: Fonction renderHistory remplacée par loadPredictionHistory
function renderHistory(predictions) {
    // Cette fonction est maintenant gérée par loadPredictionHistory
    // qui récupère spécifiquement les 20 dernières prédictions
    console.log('Utiliser loadPredictionHistory() pour l'historique complet');
}

function updateActivePrediction(predictions) {
    // Trouver la prédiction en attente (statut ⏳)
    const active = predictions.find(p => p.status === '⏳');

    const activePredictionDiv = document.getElementById('activePrediction');
    const largePredictionBox = document.getElementById('largePredictionBox');
    const largePredNumber = document.getElementById('largePredNumber');
    const largePredSuit = document.getElementById('largePredSuit');
    const largePredStatus = document.getElementById('largePredStatus');

    const numberEl = document.getElementById('predNumber');
    const suitEl = document.getElementById('predSuit');
    const statusEl = document.getElementById('predStatus');
    const timeEl = document.getElementById('predTime');

    if (!active) {
        if (activePredictionDiv) activePredictionDiv.style.display = 'none';
        if (largePredictionBox) largePredictionBox.style.display = 'none';
        return;
    }

    // Bloc standard (caché comme demandé pour ne voir que le live large)
    if (activePredictionDiv) activePredictionDiv.style.display = 'none';

    // Nouveau Bloc Large - Affichage en temps réel
    if (largePredictionBox) {
        largePredictionBox.style.display = 'block';
        largePredNumber.textContent = `🎰 PRÉDICTION #${active.game_number}`;
        largePredSuit.textContent = `🎯 Couleur: ${getSuitDisplay(active.suit)}`;
        largePredStatus.textContent = `📊 Statut: EN ATTENTE DU RÉSULTAT...`;
    }
}

function startSubscriptionTimer() {
    if (!currentUser || !currentUser.subscription_end) {
        showExpiredModal();
        return;
    }

    const updateTimer = () => {
        const end = new Date(currentUser.subscription_end);
        const now = new Date();
        const diff = end - now;

        const timerDisplay = document.getElementById('timerDisplay');
        const timerValue = document.getElementById('timerValue');

        if (diff <= 0) {
            timerValue.textContent = '00:00:00';
            timerDisplay.classList.add('expired');
            showExpiredModal();
            clearInterval(timerInterval);
            return;
        }

        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);

        if (days > 0) {
            timerValue.textContent = `${days}j ${hours.toString().padStart(2, '0')}h`;
        } else {
            timerValue.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    };

    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

function showExpiredModal() {
    const modal = document.getElementById('expiredModal');
    const userName = document.getElementById('expiredUserName');

    if (currentUser) {
        userName.textContent = currentUser.first_name;
    }

    modal.classList.remove('hidden');
}

async function fetchData() {
    try {
        const res = await fetch('/api/predictions');
        if (!res.ok) {
            if (res.status === 401) {
                window.location = '/login';
            }
            return;
        }

        const data = await res.json();

        // Mettre à jour les stats
        document.getElementById('winRateValue').textContent = data.win_rate + '%';
        document.getElementById('wonValue').textContent = data.won_predictions;
        document.getElementById('lostValue').textContent = data.lost_predictions;

        // Mise à jour des nouveaux compteurs (Préd. restantes et Pause)
        if (data.pause_info) {
            document.getElementById('topWonCount').textContent = data.pause_info.remaining_before_pause;
            if (data.pause_info.is_paused) {
                document.getElementById('topLostCount').textContent = data.pause_info.remaining_pause_time;
                // Si en pause, on peut changer la couleur ou ajouter un effet
                document.getElementById('topLostCount').style.color = '#ff4b2b';
            } else {
                document.getElementById('topLostCount').textContent = "0";
                document.getElementById('topLostCount').style.color = '';
            }
        }

        document.getElementById('progressHeader').textContent = 
            `${data.won_predictions + data.lost_predictions} / ${data.total_predictions}`;

        if (data.last_source_game) {
            document.getElementById('sourceGameNumber').textContent = '#' + data.last_source_game;
        }

        // Update Pause Info
        const pauseInfoBar = document.getElementById('pauseInfoBar');
        if (pauseInfoBar) {
            if (data.pause_info) {
                pauseInfoBar.style.display = 'flex';
                document.getElementById('predRemaining').textContent = data.pause_info.remaining_before_pause;
                const pauseTimerBox = document.getElementById('pauseTimerBox');
                const pauseTimerValue = document.getElementById('pauseTimerValue');

                if (data.pause_info.is_paused) {
                    pauseTimerBox.style.display = 'block';
                    pauseTimerValue.textContent = data.pause_info.remaining_pause_time;
                } else {
                    pauseTimerBox.style.display = 'none';
                }
            } else {
                pauseInfoBar.style.display = 'none';
            }
        }

        // Mettre à jour la prédiction active
        updateActivePrediction(data.predictions);

    } catch (e) {
        console.error('Fetch error:', e);
    }
}

// ============================================================
// 🔧 NOUVELLES FONCTIONS POUR L'HISTORIQUE (STYLE ADMIN)
// ============================================================

// Mapping des costumes vers symboles
const suitSymbols = {
    '♥': '♥',
    '♦': '♦',
    '♣': '♣',
    '♠': '♠',
    'hearts': '♥',
    'diamonds': '♦',
    'clubs': '♣',
    'spades': '♠',
    'coeur': '♥',
    'carreau': '♦',
    'trefle': '♣',
    'pique': '♠'
};

// Obtenir la classe CSS pour le costume
function getSuitClassForHistory(suit) {
    if (!suit) return '';
    const s = suit.toLowerCase();
    if (s.includes('♥') || s.includes('heart') || s.includes('coeur')) return 'suit-hearts';
    if (s.includes('♦') || s.includes('diamond') || s.includes('carreau')) return 'suit-diamonds';
    if (s.includes('♣') || s.includes('club') || s.includes('trefle')) return 'suit-clubs';
    if (s.includes('♠') || s.includes('spade') || s.includes('pique')) return 'suit-spades';
    return '';
}

// Formater le statut comme admin (✅0, ✅1, ✅2, ❌)
function formatStatusForHistory(status) {
    if (!status) return { text: '⏳', class: 'status-pending', num: '' };

    // Si c'est déjà un format ✅0, ✅1, etc.
    const match = status.match(/✅(\d)/);
    if (match) {
        return { 
            text: '', 
            class: 'status-won', 
            num: match[1]
        };
    }

    if (status.includes('GAGNÉ') || status.includes('GAGNE') || status.includes('✅')) {
        // Extraire le numéro si présent
        const numMatch = status.match(/(\d)/);
        return { 
            text: '', 
            class: 'status-won', 
            num: numMatch ? numMatch[1] : ''
        };
    }

    if (status.includes('PERDU') || status.includes('❌')) {
        return { text: '', class: 'status-lost', num: '' };
    }

    return { text: '⏳', class: 'status-pending', num: '' };
}

// 🔧 NOUVELLE FONCTION: Charger l'historique des 20 dernières prédictions
async function loadPredictionHistory() {
    try {
        const res = await fetch('/api/predictions?limit=20');
        if (res.ok) {
            const data = await res.json();
            const tbody = document.getElementById('predictionsHistoryBody');

            if (!tbody) {
                console.error('Element predictionsHistoryBody non trouvé');
                return;
            }

            if (data.predictions && data.predictions.length > 0) {
                tbody.innerHTML = '';

                data.predictions.forEach(p => {
                    const tr = document.createElement('tr');

                    // Formater le statut
                    const status = formatStatusForHistory(p.status);

                    // Formater le costume
                    const suitClass = getSuitClassForHistory(p.suit);
                    const suitSymbol = p.suit ? p.suit.charAt(0) : '-';

                    // Formater la date comme dans la capture (18/02 18:12)
                    const date = new Date(p.timestamp);
                    const dateStr = date.toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit'
                    });
                    const timeStr = date.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    // Construire le badge de statut
                    let statusBadge = '';
                    if (status.class === 'status-won') {
                        statusBadge = `<span class="status-badge ${status.class}">✅${status.num}</span>`;
                    } else if (status.class === 'status-lost') {
                        statusBadge = `<span class="status-badge ${status.class}">❌</span>`;
                    } else {
                        statusBadge = `<span class="status-badge ${status.class}">⏳</span>`;
                    }

                    tr.innerHTML = `
                        <td class="game-number">#${p.game_number}</td>
                        <td><span class="suit-symbol ${suitClass}">${suitSymbol}</span></td>
                        <td>${p.result || '-'}</td>
                        <td>${statusBadge}</td>
                        <td class="date-cell">${dateStr}<br>${timeStr}</td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="history-empty">
                            <div class="history-empty-icon">📭</div>
                            Aucune prédiction dans l'historique
                        </td>
                    </tr>
                `;
            }
        } else {
            console.error('Erreur chargement historique:', res.status);
            const tbody = document.getElementById('predictionsHistoryBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="history-empty">
                            <div class="history-empty-icon">⚠️</div>
                            Erreur de chargement
                        </td>
                    </tr>
                `;
            }
        }
    } catch (e) {
        console.error('Erreur:', e);
        const tbody = document.getElementById('predictionsHistoryBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="history-empty">
                        <div class="history-empty-icon">⚠️</div>
                        Erreur de connexion
                    </td>
                </tr>
            `;
        }
    }
}

// 🔧 NOUVELLE FONCTION: Rafraîchir l'historique
async function refreshHistory() {
    const btn = document.querySelector('.btn-refresh');
    if (!btn) return;

    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Chargement...';
    btn.disabled = true;

    await loadPredictionHistory();

    btn.innerHTML = originalText;
    btn.disabled = false;
}

async function logout() {
    await fetch('/api/logout', {method: 'POST'});
    window.location = '/login';
}

// Gestionnaire de sélection de langue
document.getElementById('langSelect')?.addEventListener('change', (e) => {
    changeLang(e.target.value);
});
