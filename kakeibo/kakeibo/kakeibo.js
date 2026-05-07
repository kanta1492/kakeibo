document.addEventListener('DOMContentLoaded', () => {
    // データ取得（キーを統一）
    let records = JSON.parse(localStorage.getItem('kakeibo_pro_v5')) || [];
    let displayDate = new Date();
    let myChart = null;

    const categoryColors = {
        '食費': '#ff4757', '交通費': '#54a0ff', '日用品': '#2ecc71',
        '娯楽': '#feca57', '固定費': '#5f27cd', '給与': '#1dd1a1', 'その他': '#8395a7'
    };

    // UI更新のメイン関数
    const updateUI = () => {
        try {
            const year = displayDate.getFullYear();
            const month = displayDate.getMonth();
            
            const filtered = records.filter(r => {
                const d = new Date(r.date);
                return d.getFullYear() === year && d.getMonth() === month;
            });

            let inc = 0, exp = 0, kanta = 0, nao = 0, shared = 0;
            const cats = {};
            
            filtered.forEach(r => {
                const v = parseInt(r.amount) || 0;
                if(r.type === '収入') {
                    inc += v;
                } else {
                    exp += v;
                    cats[r.category] = (cats[r.category] || 0) + v;
                    
                    // ユーザー別の支出計算
                    if(r.user === 'かんた') kanta += v;
                    else if(r.user === 'なお') nao += v;
                    else if(r.user === '2人分') shared += v;
                }
            });

            // 表示の更新（存在チェック付き）
            const safeSetText = (id, text) => {
                const el = document.getElementById(id);
                if(el) el.textContent = text;
            };

            safeSetText('total-income', inc.toLocaleString());
            safeSetText('total-expense', exp.toLocaleString());
            safeSetText('total-balance', (inc - exp).toLocaleString());
            safeSetText('center-total', exp.toLocaleString());
            safeSetText('kanta-val', kanta.toLocaleString() + "円");
            safeSetText('nao-val', nao.toLocaleString() + "円");
            safeSetText('shared-val', shared.toLocaleString() + "円");

            // 予算表示
            const budget = 150000;
            const pct = exp > 0 ? Math.floor((exp / budget) * 100) : 0;
            const bar = document.getElementById('budget-bar');
            if(bar) bar.style.width = Math.min(pct, 100) + '%';
            safeSetText('budget-percent', pct + '%');
            safeSetText('budget-text', `残¥${(budget - exp).toLocaleString()}`);

            renderCalendar(filtered);
            renderChart(cats);
        } catch (e) {
            console.error("UI Update Error:", e);
        }
    };

    // カレンダー描画
    const renderCalendar = (monthRecords) => {
        const grid = document.getElementById('calendar-grid');
        if(!grid) return;
        grid.innerHTML = '';
        
        const y = displayDate.getFullYear(), m = displayDate.getMonth();
        const monthLabel = document.getElementById('month-label');
        if(monthLabel) monthLabel.textContent = `${y}年 ${m + 1}月`;
        
        const first = new Date(y, m, 1).getDay();
        const days = new Date(y, m + 1, 0).getDate();

        for (let i = 0; i < first; i++) {
            grid.appendChild(document.createElement('div')).className = 'day';
        }

        for (let i = 1; i <= days; i++) {
            const d = document.createElement('div');
            d.className = 'day';
            d.innerHTML = `<span>${i}</span><div class="dot-container"></div>`;
            
            const dayRecords = monthRecords.filter(r => new Date(r.date).getDate() === i);
            const dotContainer = d.querySelector('.dot-container');
            const dayCats = [...new Set(dayRecords.filter(r=>r.type==='支出').map(r => r.category))];

            dayCats.forEach(cat => {
                const dot = document.createElement('span');
                dot.className = 'dot';
                dot.style.backgroundColor = categoryColors[cat] || '#ccc';
                dotContainer.appendChild(dot);
            });

            d.onclick = () => {
                if (dayRecords.length > 0) showHistoryModal(`${m + 1}月${i}日の履歴`, dayRecords);
            };
            grid.appendChild(d);
        }
    };

    // 履歴モーダル表示
    const showHistoryModal = (title, dataList) => {
        const modalTitle = document.getElementById('modal-title');
        const list = document.getElementById('history-list');
        if(!modalTitle || !list) return;

        modalTitle.textContent = title;
        list.innerHTML = '';
        
        dataList.sort((a,b) => b.date - a.date).forEach(r => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <div>
                    <small>${r.user} - ${new Date(r.date).getDate()}日</small><br>
                    <strong>${r.item || 'なし'}</strong> <small>(${r.category})</small>
                </div>
                <div style="text-align:right">
                    <span style="color:${r.type==='収入'?'#2ecc71':'#ff4757'}; font-weight:bold; display:block;">
                        ${r.type==='収入'?'':'-'}${parseInt(r.amount).toLocaleString()}
                    </span>
                    <div class="action-btns">
                        <button class="edit-btn" onclick="startEdit(${r.date})">編集</button>
                        <button class="delete-btn" onclick="deleteRecord(${r.date})">削除</button>
                    </div>
                </div>`;
            list.appendChild(li);
        });
        document.getElementById('history-modal').classList.remove('hidden');
    };

    // 削除機能
    window.deleteRecord = (timestamp) => {
        if (!confirm('このデータを削除してもよろしいですか？')) return;
        records = records.filter(r => r.date !== timestamp);
        localStorage.setItem('kakeibo_pro_v5', JSON.stringify(records));
        document.getElementById('history-modal').classList.add('hidden');
        updateUI();
    };

    // 編集開始
    window.startEdit = (timestamp) => {
        const r = records.find(rec => rec.date === timestamp);
        if(!r) return;
        document.getElementById('edit-id').value = timestamp;
        const typeInp = document.querySelector(`input[name="type"][value="${r.type}"]`);
        if(typeInp) typeInp.checked = true;
        document.getElementById('user-select').value = r.user;
        document.getElementById('category-select').value = r.category;
        document.getElementById('item-input').value = r.item;
        document.getElementById('amount-input').value = r.amount;
        document.getElementById('submit-btn').textContent = "修正を保存する";
        document.getElementById('cancel-edit').classList.remove('hidden');
        document.getElementById('history-modal').classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // フォーム送信（追加・更新）
    const entryForm = document.getElementById('entry-form');
    if(entryForm) {
        entryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const editId = document.getElementById('edit-id').value;
            const amountVal = document.getElementById('amount-input').value;
            
            if(!amountVal) return;

            const data = {
                type: document.querySelector('input[name="type"]:checked').value,
                user: document.getElementById('user-select').value,
                category: document.getElementById('category-select').value,
                item: document.getElementById('item-input').value,
                amount: amountVal,
                date: editId ? parseInt(editId) : new Date().getTime()
            };

            if(editId) {
                const idx = records.findIndex(r => r.date === parseInt(editId));
                if(idx !== -1) records[idx] = data;
                document.getElementById('edit-id').value = "";
                document.getElementById('submit-btn').textContent = "データを追加する";
                document.getElementById('cancel-edit').classList.add('hidden');
            } else {
                records.push(data);
            }

            localStorage.setItem('kakeibo_pro_v5', JSON.stringify(records));
            entryForm.reset();
            updateUI();
        });
    }

    // グラフ描画
    const renderChart = (data) => {
        try {
            const canvas = document.getElementById('expenseChart');
            if(!canvas || typeof Chart === 'undefined') return;
            const ctx = canvas.getContext('2d');
            if (myChart) myChart.destroy();
            const labels = Object.keys(data);
            if (labels.length === 0) return;
            myChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{ data: Object.values(data), backgroundColor: labels.map(l => categoryColors[l]), borderWidth: 0 }]
                },
                options: { cutout: '80%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        } catch (e) {
            console.error("Chart Error:", e);
        }
    };

    // ボタンイベント一括登録
    const bindClick = (id, fn) => {
        const el = document.getElementById(id);
        if(el) el.onclick = fn;
    };

    bindClick('prev-month', () => { displayDate.setMonth(displayDate.getMonth() - 1); updateUI(); });
    bindClick('next-month', () => { displayDate.setMonth(displayDate.getMonth() + 1); updateUI(); });
    bindClick('close-modal', () => document.getElementById('history-modal').classList.add('hidden'));
    bindClick('cancel-edit', () => {
        document.getElementById('edit-id').value = "";
        entryForm.reset();
        document.getElementById('submit-btn').textContent = "データを追加する";
        document.getElementById('cancel-edit').classList.add('hidden');
    });
    bindClick('open-history-btn', () => {
        const monthRecords = records.filter(r => {
            const d = new Date(r.date);
            return d.getFullYear() === displayDate.getFullYear() && d.getMonth() === displayDate.getMonth();
        });
        showHistoryModal(`${displayDate.getMonth() + 1}月の全履歴`, monthRecords);
    });

    // 初期起動
    updateUI();
});