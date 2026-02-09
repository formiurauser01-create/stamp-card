const calendar = document.getElementById('calendar');
const currentDateEl = document.getElementById('currentDate');
const totalCountEl = document.getElementById('totalCount');
const messageEl = document.getElementById('rewardMessage');

// 全データの保存キー
const storageKey = 'myStampCardData_V2'; 

// 表示している年月（初期値は今日）
let viewDate = new Date();

function init() {
    renderCalendar();
}

// ★全期間のスタンプ合計数を計算する関数（新規追加）
function getGrandTotal() {
    const allData = JSON.parse(localStorage.getItem(storageKey)) || {};
    let total = 0;
    // 保存されている全ての月（キー）を取り出し、その中の配列の長さを足す
    Object.values(allData).forEach(monthStamps => {
        if (Array.isArray(monthStamps)) {
            total += monthStamps.length;
        }
    });
    return total;
}

// カレンダーを描画するメイン関数
function renderCalendar() {
    calendar.innerHTML = ''; 

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth() + 1;
    const monthKey = `${year}-${month}`;
    
    currentDateEl.textContent = `${year}年 ${month}月`;

    const allData = JSON.parse(localStorage.getItem(storageKey)) || {};
    const monthData = allData[monthKey] || [];

    // ★ここで「その月の数」ではなく「全期間の合計」を渡す
    const grandTotal = getGrandTotal();
    updateStatus(grandTotal);

    // 月の日数計算
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        dayDiv.textContent = i;

        if (monthData.includes(i)) {
            dayDiv.classList.add('stamped');
        }

        dayDiv.addEventListener('click', () => {
            dayDiv.classList.toggle('stamped');
            toggleStamp(monthKey, i); 
        });

        calendar.appendChild(dayDiv);
    }
}

// スタンプの保存処理
function toggleStamp(monthKey, day) {
    const allData = JSON.parse(localStorage.getItem(storageKey)) || {};
    
    if (!allData[monthKey]) {
        allData[monthKey] = [];
    }

    const index = allData[monthKey].indexOf(day);
    if (index > -1) {
        allData[monthKey].splice(index, 1);
    } else {
        allData[monthKey].push(day);
    }

    localStorage.setItem(storageKey, JSON.stringify(allData));
    
    // ★保存後も「全期間の合計」を再計算して表示
    const grandTotal = getGrandTotal();
    updateStatus(grandTotal);
}

// メッセージ更新（長期目標用に数値を変更）
function updateStatus(count) {
    totalCountEl.textContent = count;
    
    let msg = "ちりも積もれば山となる！";
    if (count >= 10) msg = "いい調子！2桁突入！🎉";
    if (count >= 30) msg = "すごい！1ヶ月分達成！🔥";
    if (count >= 50) msg = "50個突破！継続の達人！✨";
    if (count >= 100) msg = "祝100個！伝説級の頑張り！🏆";
    if (count >= 365) msg = "1年間達成！？凄すぎる！！👑";
    
    messageEl.textContent = msg;
    
    // アニメーション
    messageEl.style.transform = "scale(1.05)";
    setTimeout(() => {
        messageEl.style.transform = "scale(1)";
    }, 200);
}

// 月移動ボタン
document.getElementById('prevMonthBtn').addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('nextMonthBtn').addEventListener('click', () => {
    viewDate.setMonth(viewDate.getMonth() + 1);
    renderCalendar();
});

// ★リセットボタン（全データを消去するように変更）
document.getElementById('resetBtn').addEventListener('click', () => {
    // 誤操作防止のため確認メッセージを少し強めに
    if(confirm('【注意】\nこれまでの全期間のスタンプを全て削除しますか？\n（元に戻せません）')) {
        localStorage.removeItem(storageKey);
        renderCalendar(); // 画面を更新して0に戻す
    }
});

init();