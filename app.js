// Base config
const SPOTS = [
    {
        id: 'spot-01',
        name: '白神山地 暗門の滝',
        lat: 40.528,
        lng: 140.176,
        image: 'https://images.unsplash.com/photo-1542051812871-f925b42d5f2f?auto=format&fit=crop&q=80&w=800',
        description: '世界自然遺産に登録されたブナの原生林。人の手の入っていない太古の森の息吹を感じられる場所。'
    },
    {
        id: 'spot-02',
        name: '屋久島 縄文杉',
        lat: 30.344,
        lng: 130.536,
        image: 'https://images.unsplash.com/photo-1596707334468-1eb5d0644b9b?auto=format&fit=crop&q=80&w=800',
        description: '樹齢数千年の杉の巨木が立ち並ぶ苔むす森。道なき道を歩いた者だけが到達できる神聖な場所。'
    },
    {
        id: 'spot-03',
        name: '知床五湖',
        lat: 44.124,
        lng: 145.084,
        image: 'https://images.unsplash.com/photo-1582294119853-9d040a4545cb?auto=format&fit=crop&q=80&w=800',
        description: 'ヒグマの生息地でもあり、日本では数少ない真の原野。湖面に映り込む連山は息をのむ美しさ。'
    },
    {
        id: 'spot-04',
        name: '小笠原諸島 南島',
        lat: 27.039,
        lng: 142.186,
        image: 'https://images.unsplash.com/photo-1506159904225-baca70798e6c?auto=format&fit=crop&q=80&w=800',
        description: '東洋のガラパゴス。限られた人数しか上陸できない沈水カルスト地形で、幻の白い砂浜が広がる。'
    },
    {
        id: 'spot-05',
        name: '高千穂峡',
        lat: 32.701,
        lng: 131.303,
        image: 'https://images.unsplash.com/photo-1549444005-cb628e83b4fa?auto=format&fit=crop&q=80&w=800',
        description: '阿蘇山の火山活動によって形成されたV字渓谷。神話が息づく静寂の峡谷。'
    }
];

const UNLOCK_RADIUS_KM = 30; // prototype buffer
const DB_KEY_COMMENTS = 'hj_comments';
const DB_KEY_VISITS = 'hj_visits';

// Global State
let map;
let currentMockLocationId = 'none'; // 'none' or spot ID
let selectedSpotId = null;

// Initialize Map
function initMap() {
    map = L.map('map').setView([36.2048, 138.2529], 5); // Center on Japan

    // Bright entertainment aesthetics basemap
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Add Markers
    SPOTS.forEach(spot => {
        const marker = L.circleMarker([spot.lat, spot.lng], {
            radius: 8,
            fillColor: "#FF4081",
            color: "#FFC107",
            weight: 3,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map);

        marker.on('click', () => openSpotPanel(spot));
        
        // Add option to debug select
        const option = document.createElement('option');
        option.value = spot.id;
        option.textContent = spot.name;
        document.getElementById('mock-location').appendChild(option);
    });
}

// Haversine Distance (km)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
}

// Database / LocalStorage simulation
function getComments(spotId) {
    const data = localStorage.getItem(DB_KEY_COMMENTS);
    const all = data ? JSON.parse(data) : [];
    return all.filter(c => c.spotId === spotId);
}

function saveComment(spotId, text, dateObj) {
    const data = localStorage.getItem(DB_KEY_COMMENTS);
    const all = data ? JSON.parse(data) : [];
    all.push({ spotId, text, date: dateObj.toISOString() });
    localStorage.setItem(DB_KEY_COMMENTS, JSON.stringify(all));
}

// UI Panel logic
function openSpotPanel(spot) {
    selectedSpotId = spot.id;
    const panel = document.getElementById('spot-panel');
    
    // Populate data
    document.getElementById('spot-title').textContent = spot.name;
    document.getElementById('spot-description').textContent = spot.description;
    document.getElementById('spot-image').src = spot.image;

    updateSpotStatus(spot);
    
    // Slide in
    panel.classList.remove('hidden');
}

function closeSpotPanel() {
    selectedSpotId = null;
    document.getElementById('spot-panel').classList.add('hidden');
}

// Assess distance, update UI lock status & load comments
function updateSpotStatus(spot) {
    // Determine distance based on mock location
    let distance = Infinity;
    if (currentMockLocationId === spot.id) {
        distance = 0;
    } else if (currentMockLocationId !== 'none') {
        const mockSpot = SPOTS.find(s => s.id === currentMockLocationId);
        distance = getDistance(mockSpot.lat, mockSpot.lng, spot.lat, spot.lng);
    } // If "none", distance is infinity (locked) in this prototype for simplicity

    document.getElementById('spot-distance').textContent = distance === Infinity ? '不明' : `${Math.round(distance)} km`;

    const isUnlocked = distance <= UNLOCK_RADIUS_KM;
    const badge = document.getElementById('spot-status');
    const msg = document.getElementById('unlock-message');
    const form = document.getElementById('action-form');

    if (isUnlocked) {
        badge.textContent = '到達済み';
        badge.classList.add('unlocked');
        msg.classList.add('hidden');
        form.classList.remove('hidden');
    } else {
        badge.textContent = '未到達';
        badge.classList.remove('unlocked');
        msg.classList.remove('hidden');
        form.classList.add('hidden');
    }

    renderComments(spot.id, isUnlocked);
}

// Render comments with "Next Day" rule
function renderComments(spotId, isUnlocked) {
    const list = document.getElementById('comments-list');
    list.innerHTML = ''; // clear

    if (!isUnlocked) {
        list.innerHTML = '<p style="color: #666; font-size: 0.85rem;">※到達していないため、過去の記録を見ることはできません。</p>';
        return;
    }

    const comments = getComments(spotId);
    let visibleCount = 0;

    // "Next day" logic: Compare real current date with commentDate
    const currentDayStart = new Date();
    currentDayStart.setHours(0,0,0,0);

    comments.forEach(c => {
        const commentDayStart = new Date(c.date);
        commentDayStart.setHours(0,0,0,0);

        // Only show if the current day is STRICTLY greater than the day it was commented
        if (currentDayStart.getTime() > commentDayStart.getTime()) {
            visibleCount++;
            const div = document.createElement('div');
            div.className = 'comment-card';
            
            const dateStr = new Date(c.date).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'});
            
            div.innerHTML = `
                <div class="comment-date">${dateStr}</div>
                <div class="comment-text">${c.text}</div>
            `;
            list.appendChild(div);
        }
    });

    if (visibleCount === 0) {
        list.innerHTML = '<p style="color: #9aa8b6; font-size: 0.85rem;">まだ解放された記録はありません。明日になればあなたの記録も誰かに読まれるでしょう。</p>';
    }
}

// Event Listeners
document.getElementById('close-panel').addEventListener('click', closeSpotPanel);

document.getElementById('mock-location').addEventListener('change', (e) => {
    currentMockLocationId = e.target.value;
    if (selectedSpotId) {
        const spot = SPOTS.find(s => s.id === selectedSpotId);
        updateSpotStatus(spot);
    }
});


document.getElementById('submit-comment').addEventListener('click', () => {
    const text = document.getElementById('comment-input').value;
    if (!text.trim()) return;

    saveComment(selectedSpotId, text, new Date());
    document.getElementById('comment-input').value = '';
    
    alert('記録を刻みました。明日以降、あなたと同じ領域に到達した者だけがこの声を聞くことができます。');
    
    // Refresh
    const spot = SPOTS.find(s => s.id === selectedSpotId);
    updateSpotStatus(spot);
});

// --- Diagnosis Logic ---
const quizData = [
    {
        q: "Q1. 今週末、遊ぶならどっち？",
        a: [
            { text: "🌊 海や川でチャプチャプ水遊び！", score: { 'spot-03': 1, 'spot-04': 2, 'spot-05': 2 } },
            { text: "🌲 森や山でガッツリ探検！", score: { 'spot-01': 2, 'spot-02': 2 } }
        ]
    },
    {
        q: "Q2. 旅行のアクティビティは？",
        a: [
            { text: "🚗 ドライブで楽ちん絶景めぐり派！", score: { 'spot-01': 1, 'spot-03': 1, 'spot-05': 2 } },
            { text: "🥾 ガンガン歩く！体力勝負のハイキング派！", score: { 'spot-01': 1, 'spot-02': 2, 'spot-04': 2 } }
        ]
    },
    {
        q: "Q3. 秘境で一番撮りたい写真は？",
        a: [
            { text: "📸 神秘的で「エモい」風景！", score: { 'spot-02': 1, 'spot-05': 2 } },
            { text: "🦖 大自然のド迫力ダイナミック写真！", score: { 'spot-01': 1, 'spot-03': 2, 'spot-04': 1 } }
        ]
    }
];

let currentQuestion = 0;
let quizScores = { 'spot-01': 0, 'spot-02': 0, 'spot-03': 0, 'spot-04': 0, 'spot-05': 0 };

function renderQuizQuestion() {
    if (currentQuestion >= quizData.length) {
        showQuizResult();
        return;
    }

    const q = quizData[currentQuestion];
    document.getElementById('q-title').textContent = `質問 ${currentQuestion + 1} / 3`;
    document.getElementById('q-text').textContent = q.q;

    const answersContainer = document.getElementById('answers');
    answersContainer.innerHTML = '';

    q.a.forEach(answer => {
        const btn = document.createElement('button');
        btn.className = 'secondary-btn';
        btn.style.padding = '1rem';
        btn.textContent = answer.text;
        btn.onclick = () => {
            // Apply scores
            for (let spotId in answer.score) {
                quizScores[spotId] += answer.score[spotId];
            }
            currentQuestion++;
            renderQuizQuestion();
        };
        answersContainer.appendChild(btn);
    });
}

function showQuizResult() {
    // Find highest score
    let highestSpot = 'spot-01';
    let max = -1;
    for (let spotId in quizScores) {
        if (quizScores[spotId] > max) {
            max = quizScores[spotId];
            highestSpot = spotId;
        }
    }

    const recommended = SPOTS.find(s => s.id === highestSpot);
    
    document.getElementById('q-title').textContent = "🎯 ピッタリの秘境を発見！";
    document.getElementById('q-text').innerHTML = `診断の結果、キミにおすすめの場所は<br><strong style="color: #FF4081; font-size: 1.8rem; display: inline-block; margin-top: 0.5rem;">${recommended.name}</strong><br>だよ！さっそく行ってみよう！`;
    
    const answersContainer = document.getElementById('answers');
    answersContainer.innerHTML = '';
    
    const btn = document.createElement('button');
    btn.className = 'primary-btn';
    btn.style.padding = '1rem';
    btn.textContent = "このスポットをマップで見る！";
    btn.onclick = () => {
        document.getElementById('diagnosis-modal').classList.add('hidden');
        map.setView([recommended.lat, recommended.lng], 9, { animate: true });
        openSpotPanel(recommended);
    };
    answersContainer.appendChild(btn);
}

document.getElementById('open-diagnosis').addEventListener('click', () => {
    currentQuestion = 0;
    quizScores = { 'spot-01': 0, 'spot-02': 0, 'spot-03': 0, 'spot-04': 0, 'spot-05': 0 };
    document.getElementById('q-title').textContent = "🎯 ワクワク秘境診断！";
    document.getElementById('q-text').textContent = "今の気分で直感で答えてね！";
    document.getElementById('answers').innerHTML = `<button class="primary-btn" id="start-quiz-btn" style="padding: 1rem;">診断を始める！</button>`;
    
    document.getElementById('start-quiz-btn').addEventListener('click', () => {
        renderQuizQuestion();
    });

    document.getElementById('diagnosis-modal').classList.remove('hidden');
});

document.getElementById('close-diagnosis').addEventListener('click', () => {
    document.getElementById('diagnosis-modal').classList.add('hidden');
});


// Boot
initMap();
