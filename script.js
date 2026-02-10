const calendar = document.getElementById('calendar');
const currentDateEl = document.getElementById('currentDate');
const totalCountEl = document.getElementById('totalCount');
const messageEl = document.getElementById('rewardMessage');

const storageKey = 'myStampCardData_V2';
const rankKey = 'myStampCard_Rank'; 
const goalKey = 'myStampCard_Goals';

let viewDate = new Date();
// 初期ランクを読み込み、スタンプ台の表示を合わせる
let currentRank = localStorage.getItem(rankKey) || 'normal';

// 目標データの初期化
let goals = JSON.parse(localStorage.getItem(goalKey)) || [
    { count: 10, text: "プチご褒美" },
    { count: 30, text: "欲しかった本を買う" }
];

function init() {
    // スタンプ台の初期アクティブ状態を設定
    document.querySelectorAll('.pad-item').forEach(item => {
        item.classList.toggle('active', item.dataset.rank === currentRank);
    });

    // 設定タブ内のラジオボタン（予備用）の同期
    const rankInputs = document.querySelectorAll('input[name="rank"]');
    rankInputs.forEach(input => {
        if (input.value === currentRank) input.checked = true;
        input.addEventListener('change', (e) => {
            selectRank(e.target.value);
        });
    });

    renderCalendar();
    renderGoals();
}

// 全期間のスタンプ個数を計算
function getGrandTotal() {
    const allData = JSON.parse(localStorage.getItem(storageKey)) || {};
    let total = 0;
    Object.values(allData).forEach(monthStamps => {
        if (Array.isArray(monthStamps)) {
            total += monthStamps.length;
        }
    });
    return total;
}

// カレンダー描画（1日ごとにランクを判定）
function renderCalendar() {
    calendar.innerHTML = ''; 
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth() + 1;
    const monthKey = `${year}-${month}`;
    currentDateEl.textContent = `${year}年 ${month}月`;

    const allData = JSON.parse(localStorage.getItem(storageKey)) || {};
    const monthData = allData[monthKey] || []; // [{day:1, rank:'god'}, ...] 形式

    updateStatus(getGrandTotal());

    const daysInMonth = new Date(year, month, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        dayDiv.textContent = i;

        // 保存データからその日のランクを探す
        const stampInfo = monthData.find(d => d.day === i);
        if (stampInfo) {
            dayDiv.classList.add('stamped', `rank-${stampInfo.rank}`);
        }

        dayDiv.addEventListener('click', () => {
            if (!dayDiv.classList.contains('stamped')) {
                // 新しく押す：現在の選択ランクを付与
                dayDiv.classList.add('stamped', `rank-${currentRank}`);
                toggleStamp(monthKey, i, currentRank);
            } else {
                // 消す：すべてのランククラスを削除
                dayDiv.classList.remove('stamped', 'rank-normal', 'rank-god', 'rank-rankA');
                toggleStamp(monthKey, i, null);
            }
        });
        calendar.appendChild(dayDiv);
    }
}

// 保存・削除のメインロジック
function toggleStamp(monthKey, day, rank) {
    const allData = JSON.parse(localStorage.getItem(storageKey)) || {};
    if (!allData[monthKey]) allData[monthKey] = [];

    const index = allData[monthKey].findIndex(d => d.day === day);
    
    // 既存データがあれば一旦削除
    if (index > -1) {
        allData[monthKey].splice(index, 1);
    } 
    
    // rankが指定されていれば（＝追加なら）保存
    if (rank) {
        allData[monthKey].push({ day: day, rank: rank });
    }

    localStorage.setItem(storageKey, JSON.stringify(allData));
    updateStatus(getGrandTotal());
}

// スタンプ台での選択
window.selectRank = function(rank) {
    currentRank = rank;
    localStorage.setItem(rankKey, rank);
    
    // スタンプ台（pad-item）の見た目を更新
    document.querySelectorAll('.pad-item').forEach(item => {
        item.classList.toggle('active', item.dataset.rank === rank);
    });
    
    // 設定タブ内のラジオボタンも同期
    const radio = document.querySelector(`input[name="rank"][value="${rank}"]`);
    if (radio) radio.checked = true;
};

// 目標関連の関数
window.addGoal = function() {
    const countInput = document.getElementById('newGoalCount');
    const textInput = document.getElementById('newGoalText');
    if (!countInput.value || !textInput.value) return;

    goals.push({ count: parseInt(countInput.value), text: textInput.value });
    goals.sort((a, b) => a.count - b.count);
    saveGoals();
    renderGoals();
    updateStatus(getGrandTotal()); // 小窓表示を更新

    countInput.value = '';
    textInput.value = '';
};

function renderGoals() {
    const listEl = document.getElementById('goalList');
    const currentTotal = getGrandTotal();
    listEl.innerHTML = '';

    goals.forEach((goal, index) => {
        const isAchieved = currentTotal >= goal.count;
        const li = document.createElement('li');
        if (isAchieved) li.classList.add('achieved');
        li.innerHTML = `
            <div>
                <span style="color: #f42920">${goal.count}個</span>: ${goal.text}
                ${isAchieved ? '<span class="achieved-badge">【達成！】</span>' : ''}
            </div>
            <i class="fa-solid fa-trash-can delete-goal" onclick="deleteGoal(${index})"></i>
        `;
        listEl.appendChild(li);
    });
}

window.deleteGoal = function(index) {
    if(confirm('この目標を削除しますか？')) {
        goals.splice(index, 1);
        saveGoals();
        renderGoals();
        updateStatus(getGrandTotal());
    }
};

function saveGoals() {
    localStorage.setItem(goalKey, JSON.stringify(goals));
}

function updateStatus(count) {
    totalCountEl.textContent = count;
    const nextGoal = goals.find(g => g.count > count);
    
    if (nextGoal) {
        const remaining = nextGoal.count - count;
        messageEl.innerHTML = `<span style="color: #fffbc6; font-size: 1.1rem;">${nextGoal.text}</span> まで あと <span style="color: #f42920; font-size: 1.5rem;">${remaining}</span> 個`;
    } else if (goals.length > 0) {
        messageEl.textContent = "Clear!! 👑";
    } else {
        messageEl.textContent = "目標を設定しましょう ☉";
    }
    
    totalCountEl.style.transform = "scale(1.1)";
    setTimeout(() => { totalCountEl.style.transform = "scale(1)"; }, 200);
    renderGoals();
}

// タブ・ナビゲーション系
window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
};

document.getElementById('prevMonthBtn').addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('nextMonthBtn').addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() + 1);
    renderCalendar();
});

document.getElementById('resetBtn').addEventListener('click', () => {
    if(confirm('【注意】\nこれまでの全期間のスタンプとランク情報をすべて削除しますか？')) {
        localStorage.removeItem(storageKey);
        renderCalendar();
    }
});

init();

// ポップアップの表示・非表示
window.toggleStampPopup = function() {
    const popup = document.getElementById('stampPopup');
    popup.classList.toggle('show');
};

// スタンプ選択（選んだら閉じる）
window.selectRank = function(rank) {
    currentRank = rank;
    localStorage.setItem(rankKey, rank);
    
    // アイコン表示を更新
    const iconMap = { 'normal': 'fa-cat', 'rankA': 'fa-star', 'god': 'fa-crown' };
    document.getElementById('activeStampIcon').innerHTML = `<i class="fa-solid ${iconMap[rank]}"></i>`;
    
    // ポップアップを閉じる
    document.getElementById('stampPopup').classList.remove('show');
};

// 既存のinitに初期アイコン反映を追加
function init() {
    const iconMap = { 'normal': 'fa-cat', 'rankA': 'fa-star', 'god': 'fa-crown' };
    document.getElementById('activeStampIcon').innerHTML = `<i class="fa-solid ${iconMap[currentRank]}"></i>`;
    renderCalendar();
    renderGoals();
}