let points = 0;
let money = 0;

let tasks = [];
let quests = [];
let selectingQuest = false;
let selectedQuestTasks = [];

let events = [];
let eventTimer = null;

let store = [];
let badges = JSON.parse(localStorage.getItem("badges") || "[]");
let inventory = [];

// Supabase client initialization
const supabaseUrl = 'https://vvbwyetqiqpccfdsjqle.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2Ynd5ZXRxaXFwY2NmZHNqcWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTg4OTcsImV4cCI6MjA4MDM3NDg5N30.-YbxkZ6-eG1HUTutXhgKcR-y9YL486wqwEP96QgR-7c';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

async function cloudSave() {
    const userId = 'default_user'; // Replace with actual user ID logic if available
    const data = {
        user_id: userId,
        save_data: JSON.stringify({
            points,
            money,
            tasks,
            quests,
            badges,
            store,
            inventory
        })
    };

    const { error } = await supabase
        .from('usersaves')
        .upsert(data, { onConflict: 'user_id' });

    if (error) {
        console.error('Cloud save failed:', error);
    }
}

async function loadCloudAndLocal() {
    const userId = 'default_user'; // Replace with actual user ID logic if available
    const { data, error } = await supabase
        .from('usersaves')
        .select('save_data')
        .eq('user_id', userId)
        .single();

    if (!error && data && data.save_data) {
        const saved = JSON.parse(data.save_data);

        points = saved.points || 0;
        money = saved.money || 0;
        tasks = saved.tasks || [];
        quests = saved.quests || [];
        badges = saved.badges || [];
        store = saved.store || [];
        inventory = saved.inventory || [];

        updateStats();
        renderTasks();
        renderQuests();
        renderStore();
        renderInventory();
    } else {
        await loadLocalSave();
    }
}

async function loadLocalSave() {
    const saved = JSON.parse(localStorage.getItem("saveData") || "{}");

    points = saved.points || 0;
    money = saved.money || 0;
    tasks = saved.tasks || [];
    quests = saved.quests || [];
    badges = saved.badges || [];
    store = saved.store || [];
    inventory = saved.inventory || [];

    updateStats();
    renderTasks();
    renderQuests();
    renderStore();
    renderInventory();
}

function saveState() {
    const data = {
        points,
        money,
        tasks,
        quests,
        badges,
        store,
        inventory
    };
    localStorage.setItem("saveData", JSON.stringify(data));
    cloudSave();
}

/* ============================================================
   INVENTORY
============================================================ */

function renderInventory() {
    const area = document.getElementById("inventoryList");
    if (!area) return;

    area.innerHTML = "";

    inventory.forEach(item => {
        const div = document.createElement("div");
        div.className = "inventory-item";

        div.innerHTML = `
            <span>${item.name} — x${item.qty}</span>

            <div class="inv-controls">
                <button onclick="useItem(${item.id})">Use 1</button>
                <button onclick="sellItem(${item.id})">Sell 1 (${item.cost} AM)</button>
                
                <input id="bulk-${item.id}" type="number" min="1" placeholder="#">

                <button onclick="useItemBulk(${item.id}, document.getElementById('bulk-${item.id}').value)">Use X</button>
                <button onclick="sellItemBulk(${item.id}, document.getElementById('bulk-${item.id}').value)">Sell X</button>

                <button onclick="useAll(${item.id})">Use All</button>
                <button onclick="sellAll(${item.id})">Sell All</button>
            </div>
        `;

        area.appendChild(div);
    });
}

function useItem(id) {
    const item = inventory.find(x => x.id === id);
    if (!item) return;

    item.qty -= 1;
    if (item.qty <= 0) {
        inventory = inventory.filter(x => x.id !== id);
    }

    saveState();
    renderInventory();

    alert(`Used 1 ${item.name}`);
}

function sellItem(id) {
    const item = inventory.find(x => x.id === id);
    if (!item) return;

    money += item.cost;
    updateStats();

    item.qty -= 1;
    if (item.qty <= 0) {
        inventory = inventory.filter(x => x.id !== id);
    }

    saveState();
    renderInventory();

    alert(`Sold 1 ${item.name}`);
}

function useItemBulk(id, amount) {
    const item = inventory.find(x => x.id === id);
    if (!item) return;

    amount = parseInt(amount);
    if (isNaN(amount) || amount <= 0) return;

    if (amount > item.qty) amount = item.qty;

    item.qty -= amount;
    if (item.qty <= 0) {
        inventory = inventory.filter(x => x.id !== id);
    }

    saveState();
    renderInventory();

    alert(`Used ${amount} × ${item.name}`);
}

function sellItemBulk(id, amount) {
    const item = inventory.find(x => x.id === id);
    if (!item) return;

    amount = parseInt(amount);
    if (isNaN(amount) || amount <= 0) return;

    if (amount > item.qty) amount = item.qty;

    money += item.cost * amount;
    updateStats();

    item.qty -= amount;
    if (item.qty <= 0) {
        inventory = inventory.filter(x => x.id !== id);
    }

    saveState();
    renderInventory();

    alert(`Sold ${amount} × ${item.name}`);
}

function useAll(id) {
    const item = inventory.find(x => x.id === id);
    if (!item) return;
    useItemBulk(id, item.qty);
}

function sellAll(id) {
    const item = inventory.find(x => x.id === id);
    if (!item) return;
    sellItemBulk(id, item.qty);
}

function addTask() {
    const name = document.getElementById("taskName").value.trim();
    const pts = parseInt(document.getElementById("taskPoints").value);

    if (!name || !pts) return;

    const task = {
        id: Date.now(),
        name,
        pts,
        selectedForQuest: false
    };

    tasks.push(task);
    renderTasks();
    saveState();
}

function renderTasks() {
    const list = document.getElementById("taskList");
    list.innerHTML = "";

    tasks.forEach(t => {
        const div = document.createElement("div");
        div.className = "task";
        div.id = `task-${t.id}`;

        if (t.selectedForQuest) div.classList.add("task-selected");

        div.onclick = () => {
            if (selectingQuest) toggleTaskForQuest(t.id);
        };

        div.innerHTML = `
            <span>${t.name} — <strong>${t.pts} pts</strong></span>
            <button class="complete-btn" onclick="completeTask(${t.id}); event.stopPropagation();">✔</button>
        `;

        list.appendChild(div);
    });
}

function completeTask(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;

    points += t.pts;
    money += Math.floor(t.pts / 2);
    updateStats();

    const el = document.getElementById(`task-${id}`);
    if (el) {
        el.classList.add("fade-out");
        setTimeout(() => {
            tasks = tasks.filter(x => x.id !== id);
            renderTasks();
            saveState();
        }, 700);
    }

    quests.forEach(q => {
        if (q.tasks.includes(id) && q.completedCount < 5) {
            q.completedCount += 1;
            updateQuestProgress(q.id);
        }
    });

    updateEventPointChecks();
}

function startQuestSelection() {
    selectingQuest = true;
    selectedQuestTasks = [];

    document.getElementById("finishQuestBtn").style.display = "inline-block";

    tasks.forEach(t => (t.selectedForQuest = false));
    renderTasks();
}

function toggleTaskForQuest(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;

    if (t.selectedForQuest) {
        t.selectedForQuest = false;
        selectedQuestTasks = selectedQuestTasks.filter(x => x !== id);
    } else {
        if (selectedQuestTasks.length >= 5) return;
        t.selectedForQuest = true;
        selectedQuestTasks.push(id);
    }

    renderTasks();
}

function finishQuestSelection() {
    if (selectedQuestTasks.length !== 5) {
        alert("Select exactly 5 tasks.");
        return;
    }

    const name = document.getElementById("questName").value.trim();
    if (!name) {
        alert("Name the quest.");
        return;
    }

    const rewardPoints = parseInt(document.getElementById("questRewardPoints").value) || 0;
    const rewardMoney = parseInt(document.getElementById("questRewardMoney").value) || 0;

    const quest = {
        id: Date.now(),
        name,
        tasks: [...selectedQuestTasks],
        completedCount: 0,
        rewardPoints,
        rewardMoney
    };

    quests.push(quest);

    selectingQuest = false;
    selectedQuestTasks = [];
    tasks.forEach(t => (t.selectedForQuest = false));

    document.getElementById("finishQuestBtn").style.display = "none";

    renderTasks();
    saveState();
    renderQuests();
    saveState();
}

function renderQuests() {
    const area = document.getElementById("questDisplay");
    area.innerHTML = "";

    quests.forEach(q => {
        const pct = (q.completedCount / 5) * 100;

        const div = document.createElement("div");
        div.className = "questCard";
        div.id = `quest-${q.id}`;

        div.innerHTML = `
            <h3>${q.name}</h3>
            <div class="quest-bar">
                <div class="quest-fill" style="width:${pct}%"></div>
            </div>
            <button class="action-btn" onclick="attemptQuestDelete(${q.id})">Delete Quest</button>
        `;

        area.appendChild(div);
    });
}

function updateQuestProgress(id) {
    const q = quests.find(x => x.id === id);
    if (!q) return;

    renderQuests();
    saveState();

    if (q.completedCount === 5) {
        const questEl = document.getElementById(`quest-${id}`);
        if (questEl) questEl.classList.add("fade-out");

        setTimeout(() => {
            points += q.rewardPoints;
            money += q.rewardMoney;
            updateStats();

            quests = quests.filter(x => x.id !== id);
            renderQuests();
            saveState();
        }, 700);
    }
}

function attemptQuestDelete(id) {
    const q = quests.find(x => x.id === id);
    if (!q) return;

    q.deleteStage = (q.deleteStage || 0) + 1;

    if (q.deleteStage >= 3) {
        quests = quests.filter(x => x.id !== id);
    } else {
        alert(`Delete step ${q.deleteStage}/3`);
    }

    renderQuests();
    saveState();
}

function earnBadge(name) {
    if (!badges.includes(name)) {
        badges.push(name);
        localStorage.setItem("badges", JSON.stringify(badges));
    }
}

function resetPointsMoney() {
    points = 0;
    money = 0;
    updateStats();
    saveState();
}

function removePoints(amount) {
    amount = parseInt(amount);
    if (!amount || amount <= 0) return;
    points = Math.max(0, points - amount);
    updateStats();
    saveState();
}

function removeMoney(amount) {
    amount = parseInt(amount);
    if (!amount || amount <= 0) return;
    money = Math.max(0, money - amount);
    updateStats();
    saveState();
}

function addStoreItem() {
    const name = document.getElementById("storeItemName").value.trim();
    const cost = parseInt(document.getElementById("storeItemCost").value);

    if (!name || !cost) return;

    const item = {
        id: Date.now(),
        name,
        cost
    };

    store.push(item);
    renderStore();
    saveState();
}

function renderStore() {
    const list = document.getElementById("storeList");
    if (!list) return;

    list.innerHTML = "";

    store.forEach(item => {
        const div = document.createElement("div");
        div.className = "store-item";

        div.innerHTML = `
            <span>${item.name} — <strong>${item.cost} AM</strong></span>
            <button class="action-btn" onclick="purchaseItem(${item.id})">Buy</button>
        `;

        list.appendChild(div);
    });
}

function purchaseItem(id) {
    const item = store.find(x => x.id === id);
    if (!item) return;

    if (money < item.cost) {
        alert("Not enough action money.");
        return;
    }

    money -= item.cost;
    updateStats();

    // ✔ Inventory integration
    let owned = inventory.find(i => i.name === item.name);

    if (owned) {
        owned.qty += 1;
    } else {
        inventory.push({
            id: Date.now(),
            name: item.name,
            cost: item.cost,
            qty: 1
        });
    }

    saveState();
    renderInventory();

    alert(`Purchased: ${item.name}`);
}

function updateStats() {
    document.getElementById("points").textContent = points;
    document.getElementById("money").textContent = money;
}

function updateEventPointChecks() {
    return;
}

window.onload = () => {
    loadCloudAndLocal();
};