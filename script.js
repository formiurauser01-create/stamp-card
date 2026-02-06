const calendar = document.getElementById('calendar');
const totalDays = 31; // 夏休みの日数
const storageKey = 'radioTaisoData'; // 保存データの名前

// 初期化処理
function init() {
    // 保存されたデータを取得（なければ空の配列）
    const savedData = JSON.parse(localStorage.getItem(storageKey)) || [];

    for (let i = 1; i <= totalDays; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        dayDiv.textContent = i;

        // 保存データを見て、スタンプ済みならクラスをつける
        if (savedData.includes(i)) {
            dayDiv.classList.add('stamped');
        }

        // クリックイベント
        dayDiv.addEventListener('click', () => {
            dayDiv.classList.toggle('stamped');
            saveData(); // 保存
        });

        calendar.appendChild(dayDiv);
    }
}

// データの保存
function saveData() {
    const stampedDays = [];
    // .stamped クラスがついている要素の日付を集める
    document.querySelectorAll('.day.stamped').forEach(el => {
        stampedDays.push(parseInt(el.textContent));
    });
    localStorage.setItem(storageKey, JSON.stringify(stampedDays));
}

// リセットボタン
document.getElementById('resetBtn').addEventListener('click', () => {
    if(confirm('スタンプを全て消しますか？')) {
        localStorage.removeItem(storageKey);
        location.reload();
    }
});

init();