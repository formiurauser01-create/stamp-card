/* @charset "UTF-8" */

/**
 * ============================================================
 * 1. 定数・グローバル変数の設定
 * ============================================================
 */
const calendar = document.getElementById('calendar');
const currentDateEl = document.getElementById('currentDate');
const totalCountEl = document.getElementById('totalCount');
const messageEl = document.getElementById('rewardMessage');

const storageKey = 'myStampCardData_V2';
const rankKey = 'myStampCard_Rank'; 
const goalKey = 'myStampCard_Goals';

// スタンプの見た目設定
const iconMap = { 'normal': '♥', 'rankA': '★', 'god': '〠' };

let viewDate = new Date();
let currentRank = localStorage.getItem(rankKey) || 'normal';

// 初期目標（文字化け回避のエスケープ文字）
let goals = JSON.parse(localStorage.getItem(goalKey)) || [
    { count: 10, text: "\u30D7\u30C1\u3054\u8912\u7F8E" }, // プチご褒美
    { count: 30, text: "\u672C\u3092\u8CB7\u3046" }       // 本を買う
];

/**
 * ============================================================
 * 2. 特殊演出（ドラクエ風エフェクト：音・揺れ・バイブ）
 * ============================================================
 */

// 会心の一撃サウンド生成
function playCriticalHitSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // 1. 衝撃のノイズ（「ザッ」）
        const bufferSize = audioCtx.sampleRate * 0.15;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
        
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.6, audioCtx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        noise.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        
        // 2. 低音の衝撃（「ドシュッ」）
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
        oscGain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        oscGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.connect(oscGain);
        oscGain.connect(audioCtx.destination);

        noise.start();
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
        console.log("Audio Error: ", e);
    }
}

// 揺れ・バイブ・サウンドを統合したエフェクト
function triggerDqEffect() {
    // 画面全体を揺らす
    document.body.classList.remove('shake-screen');
    void document.body.offsetWidth; // リフロー強制
    document.body.classList.add('shake-screen');

    // バイブレーション（ト・トン！）
    if (navigator.vibrate) {
        navigator.vibrate([50, 30, 100]); 
    }

    // サウンド再生
    playCriticalHitSound();
}

/**
 * ============================================================
 * 3. データ処理・計算系
 * ============================================================
 */

// 全期間のスタンプ合計を計算
function getGrandTotal() {
    const allData = JSON.parse(localStorage.getItem(storageKey)) || {};
    let total = 0;
    Object.values(allData).forEach(monthStamps => {
        if (Array.isArray(monthStamps)) total += monthStamps.length;
    });
    return total;
}

// スタンプのON/OFF切り替え保存
function toggleStamp(monthKey, day, rank) {
    const allData = JSON.parse(localStorage.getItem(storageKey)) || {};
    if (!allData[monthKey]) allData[monthKey] = [];
    
    const index = allData[monthKey].findIndex(d => d.day === day);
    if (index > -1) allData[monthKey].splice(index, 1); // 既にあれば消す
    if (rank) allData[monthKey].push({ day: day, rank: rank }); // 指定があれば追加
    
    localStorage.setItem(storageKey, JSON.stringify(allData));
    updateStatus(getGrandTotal());
}

// 目標データの保存
function saveGoals() {
    localStorage.setItem(goalKey, JSON.stringify(goals));
}

/**
 * ============================================================
 * 4. 画面描画系
 * ============================================================
 */

// カレンダーの表示
function renderCalendar() {
    if (!calendar) return;
    calendar.innerHTML = ''; 

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth() + 1;
    const monthKey = `${year}-${month}`;
    
    const now = new Date();
    const isThisMonth = (now.getFullYear() === year && now.getMonth() + 1 === month);
    const todayDate = now.getDate();

    // 今日ボタンの表示状態
    const todayBtn = document.getElementById('todayBtn');
    if (todayBtn) {
        todayBtn.style.opacity = isThisMonth ? "0.3" : "1";
        todayBtn.style.pointerEvents = isThisMonth ? "none" : "auto";
    }

    // 年月表示
    currentDateEl.innerHTML = year + "\u5E74 " + month + "\u6708"; 

    const allData = JSON.parse(localStorage.getItem(storageKey)) || {};
    const monthData = allData[monthKey] || [];

    updateStatus(getGrandTotal());

    const daysInMonth = new Date(year, month, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        dayDiv.textContent = i;

        if (isThisMonth && i === todayDate) {
            dayDiv.classList.add('today');
        }

        const stampInfo = monthData.find(d => d.day === i);
        if (stampInfo) {
            dayDiv.classList.add('stamped', `rank-${stampInfo.rank}`);
        }

        // マス目クリック時の挙動
        dayDiv.addEventListener('click', () => {
            if (!dayDiv.classList.contains('stamped')) {
                dayDiv.classList.add('stamped', `rank-${currentRank}`);
                toggleStamp(monthKey, i, currentRank);
                triggerDqEffect(); // スタンプ時のみエフェクト
            } else {
                dayDiv.className = 'day';
                if (isThisMonth && i === todayDate) dayDiv.classList.add('today');
                toggleStamp(monthKey, i, null);
            }
        });
        calendar.appendChild(dayDiv);
    }
}

// 目標リストの表示
function renderGoals() {
    const listEl = document.getElementById('goalList');
    if (!listEl) return;
    const currentTotal = getGrandTotal();
    listEl.innerHTML = '';
    
    goals.forEach((goal, index) => {
        const isAchieved = currentTotal >= goal.count;
        const li = document.createElement('li');
        if (isAchieved) li.classList.add('achieved');
        li.innerHTML = `
            <div><span style="color: #f42920">${goal.count}\u500B</span>: ${goal.text}</div>
            <i class="fa-solid fa-trash-can delete-goal" onclick="deleteGoal(${index})"></i>
        `;
        listEl.appendChild(li);
    });
}

// メッセージと合計個数の更新
function updateStatus(count) {
    if (totalCountEl) totalCountEl.textContent = count;
    const nextGoal = goals.find(g => g.count > count);
    
    if (nextGoal) {
        const remaining = nextGoal.count - count;
        messageEl.innerHTML = `<span style="color: #fffbc6;">${nextGoal.text}</span> \u307E\u3067 \u3042\u3068 <span style="color: #f42920; font-size: 1.5rem;">${remaining}</span> \u500B`;
    } else {
        messageEl.textContent = "Clear!! \uD83D\uDC51";
    }
}

/**
 * ============================================================
 * 5. ユーザー操作（イベントハンドラ）
 * ============================================================
 */

// タブ切り替え
window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.add('active');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
};

// スタンプ選択ポップアップ
window.toggleStampPopup = function() {
    const popup = document.getElementById('stampPopup');
    if (popup) popup.classList.toggle('show');
};

// スタンプの種類を変更
window.selectRank = function(rank) {
    currentRank = rank;
    localStorage.setItem(rankKey, rank);
    
    const iconEl = document.getElementById('activeStampIcon');
    if (iconEl) iconEl.textContent = iconMap[rank];
    
    const popup = document.getElementById('stampPopup');
    if (popup) popup.classList.remove('show');
};

// 目標の追加
window.addGoal = function() {
    const countInput = document.getElementById('newGoalCount');
    const textInput = document.getElementById('newGoalText');
    if (!countInput.value || !textInput.value) return;
    
    goals.push({ count: parseInt(countInput.value), text: textInput.value });
    goals.sort((a, b) => a.count - b.count);
    
    saveGoals();
    renderGoals();
    updateStatus(getGrandTotal());
    
    countInput.value = '';
    textInput.value = '';
};

// 目標の削除
window.deleteGoal = function(index) {
    if(confirm('\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F')) { // 削除しますか？
        goals.splice(index, 1);
        saveGoals();
        renderGoals();
        updateStatus(getGrandTotal());
    }
};

/**
 * ============================================================
 * 6. 初期化と静的イベント
 * ============================================================
 */

function init() {
    // 初期アイコンの反映
    const iconEl = document.getElementById('activeStampIcon');
    if (iconEl) iconEl.textContent = iconMap[currentRank];

    // 月移動ボタン
    document.getElementById('prevMonthBtn').addEventListener('click', () => {
        viewDate.setMonth(viewDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('nextMonthBtn').addEventListener('click', () => {
        viewDate.setMonth(viewDate.getMonth() + 1);
        renderCalendar();
    });

    // 今日へ戻るボタン
    const todayBtn = document.getElementById('todayBtn');
    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            viewDate = new Date();
            renderCalendar();
        });
    }

    // データリセットボタン
    document.getElementById('resetBtn').addEventListener('click', () => {
        if(confirm('DATA RESET? (GAME OVER)')) {
            localStorage.removeItem(storageKey);
            renderCalendar();
        }
    });

    renderCalendar();
    renderGoals();
}

// 冒険の開始
init();