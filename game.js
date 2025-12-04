/* ============================================================
   CORE STATE
============================================================ */
let points = 0;
let money = 0;

let tasks = [];
let quests = [];
let store = [];
let badges = JSON.parse(localStorage.getItem("badges") || "[]");
let inventory = [];
let events = [];   // NEW event system

/* ============================================================
   SAVE & LOAD (LOCAL MEMORY ONLY)
============================================================ */
function saveState() {
    const data = {
        points,
        money,
        tasks,
        quests,
        store,
        badges,
        inventory,
        events
    };

    localStorage.setItem("scheduleGameSave", JSON.stringify(data));
}

function loadState() {
    const data = JSON.parse(localStorage.getItem("scheduleGameSave") || "{}");

    points = data.points || 0;
    money = data.money || 0;
    tasks = data.tasks || [];
    quests = data.quests || [];
    store = data.store || [];
    badges = data.badges || [];
    inventory = data.inventory || [];
    events = data.events || [];

    updateStats();
    renderTasks();
    renderQuests();
    renderStore();
    renderInventory();
    renderEvents();
}

/* ============================================================
   UI HELPERS
============================================================ */
function updateStats() {
    document.getElementById("points").innerText = points;
    document.getElementById("money").innerText = money;
}

/* ============================================================
   TASK SYSTEM
============================================================ */
function addTask() {
    const name = document.getElementById("taskName").value.trim();
    const pts = parseInt(document.getElementById("taskPoints").value);

    if (!name || !pts) return;

    const task = {
        id: Date.now(),
        name,
        pts
    };

    tasks.push(task);
    renderTasks();
    saveState();
}

function renderTasks() {
    const area = document.getElementById("taskList");
    if (!area) return;
    area.innerHTML = "";

    tasks.forEach(t => {
        const div = document.createElement("div");
        div.className = "task";
        div.innerHTML = `
            <span>${t.name} — <strong>${t.pts} pts</strong></span>
            <button onclick="completeTask(${t.id})">✔</button>
            <button onclick="deleteTask(${t.id})">✖</button>
        `;
        area.appendChild(div);
    });
}

function completeTask(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;

    points += t.pts;
    money += Math.floor(t.pts / 2);
    updateStats();

    tasks = tasks.filter(x => x.id !== id);
    renderTasks();
    saveState();

    updateEventProgress();
}

function deleteTask(id) {
    tasks = tasks.filter(x => x.id !== id);
    renderTasks();
    saveState();
}

/* ============================================================
   QUEST SYSTEM
============================================================ */
let selectingQuest = false;
let selectedQuestTasks = [];

function startQuestSelection() {
    selectingQuest = true;
    selectedQuestTasks = [];
    alert("Select exactly 5 tasks.");
}

function toggleTaskForQuest(id) {}

function finishQuestSelection() {}

function renderQuests() {
    document.getElementById("questDisplay").innerHTML = "";
}

/* ============================================================
   STORE + INVENTORY
============================================================ */
function addStoreItem() {
    const name = document.getElementById("storeItemName").value.trim();
    const cost = parseInt(document.getElementById("storeItemCost").value);
    if (!name || !cost) return;

    store.push({
        id: Date.now(),
        name,
        cost
    });

    renderStore();
    saveState();
}

function renderStore() {
    const area = document.getElementById("storeList");
    area.innerHTML = "";

    store.forEach(item => {
        const div = document.createElement("div");
        div.innerHTML = `
            <span>${item.name} — <strong>${item.cost} AM</strong></span>
            <button onclick="purchaseItem(${item.id})">Buy</button>
        `;
        area.appendChild(div);
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

    let owned = inventory.find(x => x.name === item.name);
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

    renderInventory();
    saveState();
}

function renderInventory() {
    const area = document.getElementById("inventoryList");
    area.innerHTML = "";

    inventory.forEach(i => {
        const div = document.createElement("div");
        div.innerHTML = `
            <span>${i.name} — x${i.qty}</span>
            <button onclick="useItem(${i.id})">Use</button>
            <button onclick="sellItem(${i.id})">Sell (${i.cost} AM)</button>
        `;
        area.appendChild(div);
    });
}

function useItem(id) {
    const item = inventory.find(x => x.id === id);
    if (!item) return;

    item.qty--;
    if (item.qty <= 0) inventory = inventory.filter(x => x.id !== id);

    renderInventory();
    saveState();
}

function sellItem(id) {
    const item = inventory.find(x => x.id === id);
    if (!item) return;

    money += item.cost;
    item.qty--;

    if (item.qty <= 0) inventory = inventory.filter(x => x.id !== id);

    updateStats();
    renderInventory();
    saveState();
}

/* ============================================================
   NEW: POINT CONVERSION (20 pts → 1 money)
============================================================ */
function convertPointsToMoney(amountPts) {
    amountPts = parseInt(amountPts);
    if (!amountPts || amountPts <= 0) return;

    if (points < amountPts) {
        alert("Not enough points.");
        return;
    }

    const moneyEarned = Math.floor(amountPts / 20);

    if (moneyEarned <= 0) {
        alert("You must convert at least 20 points.");
        return;
    }

    points -= amountPts;
    money += moneyEarned;

    updateStats();
    saveState();
}

/* ============================================================
   EVENT SYSTEM (MAX 3)
============================================================ */
function createEvent(name, goalPoints, durationMs, rewardMoney) {
    if (events.length >= 3) {
        alert("Max 3 events.");
        return;
    }

    events.push({
        id: Date.now(),
        name,
        goal: goalPoints,
        reward: rewardMoney,
        startTime: Date.now(),
        endTime: Date.now() + durationMs,
        startPoints: points,
        completed: false,
        failed: false
    });

    saveState();
    renderEvents();
}

function renderEvents() {
    const area = document.getElementById("eventList");
    if (!area) return;

    area.innerHTML = "";

    events.forEach(e => {
        const div = document.createElement("div");
        div.innerHTML = `
            <strong>${e.name}</strong><br>
            Goal: ${e.goal} pts<br>
            Ends: ${new Date(e.endTime).toLocaleString()}
        `;
        area.appendChild(div);
    });
}

function updateEventProgress() {
    const now = Date.now();

    events.forEach(e => {
        if (e.completed || e.failed) return;

        const earned = points - e.startPoints;

        if (earned >= e.goal) {
            money += e.reward;
            badges.push(`Completed ${e.name}`);
            e.completed = true;
        }

        if (now >= e.endTime && !e.completed) {
            e.failed = true;
            const pity = Math.floor(e.reward * 0.10);
            money += pity;
            badges.push(`Failed ${e.name}`);
        }
    });

    updateStats();
    renderEvents();
    saveState();
}

/* ============================================================
   INIT
============================================================ */
document.addEventListener("DOMContentLoaded", loadState);