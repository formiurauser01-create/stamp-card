/* @charset "UTF-8" */

const calendar = document.getElementById('calendar');
const currentDateEl = document.getElementById('currentDate');
const totalCountEl = document.getElementById('totalCount');
const messageEl = document.getElementById('rewardMessage');

const storageKey = 'myStampCardData_V2';
const rankKey = 'myStampCard_Rank'; 
const goalKey = 'myStampCard_Goals';

const iconMap = { 'normal': '♥', 'rankA': '★', 'god': '〠' };

let viewDate = new Date();
let currentRank = localStorage.getItem(rankKey) || 'normal';

let goals = JSON.parse(localStorage.getItem(goalKey)) || [
    { id: 1, text: "6個でカフェ", count: 6, isLoop: true },
    { id: 2, text: "40個でコンプリート", count: 40, isLoop: false }
];

// --- 特殊演出系 ---
function playCriticalHitSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
        oscGain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        oscGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.connect(oscGain);
        oscGain.connect(audioCtx.destination);
        noise.start(); osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) { console.log("Audio Error"); }
}

function playFanfare() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [
            {f: 523.25, t: 0.1}, {f: 523.25, t: 0.1}, {f: 523.25, t: 0.1},
            {f: 523.25, t: 0.2}, {f: 466.16, t: 0.2}, {f: 523.25, t: 0.2}, {f: 698.46, t: 0.8}
        ];
        let startTime = audioCtx.currentTime + 0.1;
        notes.forEach(note => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(note.f, startTime);
            gain.gain.setValueAtTime(0.1, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.t);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(startTime); osc.stop(startTime + note.t);
            startTime += note.t;
        });
    } catch (e) { console.log("Audio Error"); }
}

function triggerDqEffect() {
    document.body.classList.remove('shake-screen');
    void document.body.offsetWidth; 
    document.body.classList.add('shake-screen');
    if (navigator.vibrate) navigator.vibrate([50, 30, 100]); 
    playCriticalHitSound();
}

function showAchievementEffect() {
    triggerDqEffect(); 
    setTimeout(playFanfare, 200);
    const stamp = document.getElementById('achievementStamp');
    if (stamp) {
        stamp.classList.add('show');
        setTimeout(() => stamp.classList.remove('show'), 3000);
    }
}

// --- データ処理 ---
function getGrandTotal() {
    const allData = JSON.parse(localStorage.getItem(storageKey)) || {};
    let total = 0;
    Object.values(allData).forEach(monthStamps => {
        if (Array.isArray(monthStamps)) total += monthStamps.length;
    });
    return total;
}

function toggleStamp(monthKey, day, rank) {
    const allData = JSON.parse(localStorage.getItem(storageKey)) || {};
    if (!allData[monthKey]) allData[monthKey] = [];
    const index = allData[monthKey].findIndex(d => d.day === day);
    if (index > -1) allData[monthKey].splice(index, 1);
    if (rank) allData[monthKey].push({ day: day, rank: rank });
    localStorage.setItem(storageKey, JSON.stringify(allData));
    
    const newTotal = getGrandTotal();
    updateStatus(newTotal);
    if (rank) checkAchievement(newTotal);
}

function saveGoals() { localStorage.setItem(goalKey, JSON.stringify(goals)); }

function checkAchievement(currentDotCount) {
    let achieved = false;
    goals.forEach(goal => {
        if (goal.isLoop) {
            if (currentDotCount > 0 && currentDotCount % goal.count === 0) achieved = true;
        } else {
            if (currentDotCount === goal.count) achieved = true;
        }
    });
    if (achieved) {
        showAchievementEffect();
        renderGoals();
    }
}

// --- 画面描画 ---
function renderCalendar() {
    if (!calendar) return;
    calendar.innerHTML = ''; 
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth() + 1;
    const monthKey = `${year}-${month}`;
    const now = new Date();
    const isThisMonth = (now.getFullYear() === year && now.getMonth() + 1 === month);
		const todayBtn = document.getElementById('todayBtn');
			if (todayBtn) {
					if (isThisMonth) {
							todayBtn.classList.add('is-active-month'); // 今月なら薄くする
					} else {
							todayBtn.classList.remove('is-active-month'); // 他の月ならハッキリ出す
					}
			}
    
    currentDateEl.innerHTML = year + "年 " + month + "月"; 
    const allData = JSON.parse(localStorage.getItem(storageKey)) || {};
    const monthData = allData[monthKey] || [];
    updateStatus(getGrandTotal());

    const daysInMonth = new Date(year, month, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        dayDiv.textContent = i;
        
        // 1. 今月の表示を薄くする設定
        if (isThisMonth) {
            dayDiv.classList.add('this-month');
        }
        if (isThisMonth && i === now.getDate()) dayDiv.classList.add('today');

        const stampInfo = monthData.find(d => d.day === i);
        if (stampInfo) {
            dayDiv.classList.add('stamped', `rank-${stampInfo.rank}`);
        }

        dayDiv.addEventListener('click', () => {
            if (!dayDiv.classList.contains('stamped')) {
                dayDiv.classList.add('stamped', `rank-${currentRank}`);
                toggleStamp(monthKey, i, currentRank);
                triggerDqEffect();
            } else {
                dayDiv.className = 'day';
                if (isThisMonth) dayDiv.classList.add('this-month');
                if (isThisMonth && i === now.getDate()) dayDiv.classList.add('today');
                toggleStamp(monthKey, i, null);
            }
        });
        calendar.appendChild(dayDiv);
    }
}

function renderGoals() {
    const listEl = document.getElementById('goalList');
    if (!listEl) return;
    const currentTotal = getGrandTotal();
    listEl.innerHTML = '';
    
    // 優先順位のソート (通常目標優先)
    const sortedGoals = [...goals].sort((a, b) => {
        if (a.isLoop !== b.isLoop) return a.isLoop ? 1 : -1;
        return a.count - b.count;
    });

    sortedGoals.forEach((goal) => {
        const li = document.createElement('li');
        
        // 判定ロジック
        if (goal.isLoop) {
            li.classList.add('loop-goal');
            // ∞目標：1度でも達成（現在の合計が目標数以上）していれば黄色
            if (currentTotal >= goal.count) {
                li.classList.add('achieved-loop');
            }
        } else {
            // 通常目標：目標数に達していれば赤
            if (currentTotal >= goal.count) {
                li.classList.add('achieved-single');
            }
        }

        li.innerHTML = `
            <div class="goal-content">
                <span>${goal.isLoop ? '∞ ' : '▶ '}</span>
                <span class="editable-count">${goal.count}個</span>: 
                <span class="editable-text">${goal.text}</span>
            </div>
            <button onclick="deleteGoal(${goal.id})" class="dq-btn mini">削除</button>
        `;

        // タップで直接編集
        li.querySelector('.editable-count').addEventListener('click', (e) => {
            e.stopPropagation();
            const newVal = prompt("個数を変更:", goal.count);
            if (newVal !== null && !isNaN(newVal)) {
                goal.count = parseInt(newVal);
                saveGoals(); renderGoals(); updateStatus(getGrandTotal());
            }
        });
        li.querySelector('.editable-text').addEventListener('click', (e) => {
            e.stopPropagation();
            const newText = prompt("内容を変更:", goal.text);
            if (newText !== null) {
                goal.text = newText;
                saveGoals(); renderGoals(); updateStatus(getGrandTotal());
            }
        });

        listEl.appendChild(li);
    });
}

function updateStatus(count) {
    if (totalCountEl) totalCountEl.textContent = count;
    
    // 1. 全ての目標を「次の達成タイミング」で計算・整理
    const allGoalStatus = goals.map(g => {
        let nextAt = 0;
        let isFinished = false;

        if (g.isLoop) {
            // ∞目標：現在の数を超えた最小の倍数を計算
            nextAt = (Math.floor(count / g.count) + 1) * g.count;
        } else {
            // 1度きり目標：目標数そのもの
            nextAt = g.count;
            // すでに達成済みなら終了フラグ
            if (count >= g.count) isFinished = true;
        }

        return { 
            ...g, 
            nextAt, 
            remaining: nextAt - count,
            isFinished 
        };
    });

    // 2. 候補を絞り込み：未達成、かつ残り個数が正のもの
    const candidates = allGoalStatus.filter(g => !g.isFinished && g.remaining > 0);

    // 3. 優先順位でソート
    // 第一条件：残り個数 (remaining) が少ない順
    // 第二条件：残り個数が同じなら、通常目標 (isLoop === false) を優先
    candidates.sort((a, b) => {
        if (a.remaining !== b.remaining) {
            return a.remaining - b.remaining;
        }
        // remainingが同じ場合、isLoopがfalseのものを前にする
        return a.isLoop ? 1 : -1;
    });

    // 4. 小窓への表示
    const nextGoal = candidates[0];
    if (nextGoal) {
        messageEl.innerHTML = `<span style="color: #ffd600;">${nextGoal.text}</span> まで あと <span style="color: #f42920; font-size: 1.5rem; font-weight: bold;">${nextGoal.remaining}</span> 個`;
    } else {
        messageEl.textContent = "すべての 目標を クリア！";
    }
}

// --- ユーザー操作 ---
window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.currentTarget.classList.add('active');
};

window.toggleStampPopup = function() {
    document.getElementById('stampPopup').classList.toggle('show');
};

window.selectRank = function(rank) {
    currentRank = rank;
    localStorage.setItem(rankKey, rank);
    document.getElementById('activeStampIcon').textContent = iconMap[rank];
    document.getElementById('stampPopup').classList.remove('show');
};

window.addGoal = function() {
    const count = document.getElementById('newGoalCount');
    const text = document.getElementById('newGoalText');
    if (!count.value || !text.value) return;
    const isLoop = confirm("繰り返し目標にしますか？");
    goals.push({ id: Date.now(), count: parseInt(count.value), text: text.value, isLoop });
    saveGoals(); renderGoals(); updateStatus(getGrandTotal());
    count.value = ''; text.value = '';
};

window.deleteGoal = function(id) {
    if(confirm('削除しますか？')) {
        goals = goals.filter(g => g.id !== id);
        saveGoals(); renderGoals(); updateStatus(getGrandTotal());
    }
};

function init() {
    document.getElementById('activeStampIcon').textContent = iconMap[currentRank];
    document.getElementById('prevMonthBtn').onclick = () => { viewDate.setMonth(viewDate.getMonth() - 1); renderCalendar(); };
    document.getElementById('nextMonthBtn').onclick = () => { viewDate.setMonth(viewDate.getMonth() + 1); renderCalendar(); };
    document.getElementById('todayBtn').onclick = () => { viewDate = new Date(); renderCalendar(); };
    document.getElementById('resetBtn').onclick = () => { if(confirm('RESET?')) { localStorage.clear(); location.reload(); } };
    renderCalendar(); renderGoals();
}

init();