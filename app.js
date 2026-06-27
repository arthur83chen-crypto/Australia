// ─────────────────────────────────────────────
// 🧠 核心全域狀態 (Single Source of Truth)
// ─────────────────────────────────────────────
const store = {
  trips: [],
  bags: {
    "證件":    [{ text: "護照與簽證", done: false }, { text: "國際駕照", done: false }],
    "電子用品": [{ text: "萬國轉接頭", done: false }, { text: "行動電源", done: false }],
    "衣物":    [{ text: "防風外套", done: false }],
    "盥洗用品": [{ text: "旅行牙刷組", done: false }],
    "常備藥":  [{ text: "暈車藥", done: false }],
    "其他":    [{ text: "太陽眼鏡", done: false }]
  }
};

let editMode = null;          // 正在編輯的景點 id，null = 新增模式
let sortableInstances = [];   // 🔑 追蹤所有 Sortable 實例，避免記憶體洩漏

const defaultTrips = [
  {
    day: 1, date: "2026/07/02", city: "Sydney",
    banner: "images/banner/sydney.jpg",
    places: [
      { id: 1001, time: "11:30", title: "Sydney Fish Market",  note: "大啖生蠔與龍蝦海鮮。",       img: "images/places/fishmarket.jpg" },
      { id: 1002, time: "15:00", title: "Sydney Opera House",  note: "世界文化遺產拍照點。",       img: "images/places/opera-house.jpg" }
    ]
  },
  {
    day: 2, date: "2026/07/03", city: "Blue Mountains",
    banner: "images/banner/blue-mountains.jpg",
    places: [
      { id: 1003, time: "09:00", title: "Scenic World", note: "體驗全世界最陡的森林鐵道纜車。", img: "images/places/scenic-world.jpg" }
    ]
  }
];

// ─────────────────────────────────────────────
// 💾 資料持久化模組
// ─────────────────────────────────────────────
function loadData() {
  try {
    const cache = localStorage.getItem("appData_v2");
    if (cache) {
      const parsed = JSON.parse(cache);
      store.trips = parsed.trips || [];
      store.bags  = parsed.bags  || store.bags;
    } else {
      store.trips = JSON.parse(JSON.stringify(defaultTrips));
      saveData();
    }
  } catch (e) {
    console.error("資料損毀，還原預設值", e);
    store.trips = JSON.parse(JSON.stringify(defaultTrips));
  }
}

function saveData() {
  try {
    localStorage.setItem("appData_v2", JSON.stringify(store));
  } catch (e) {
    toast("⚠️ 儲存失敗（儲存空間不足）");
  }
}

// 移除空天數 → 重排 day 序號
function normalizeDays() {
  store.trips = store.trips.filter(d => d.places && d.places.length > 0);
  store.trips.sort((a, b) => a.day - b.day);
  store.trips.forEach((d, i) => { d.day = i + 1; });
}

// ─────────────────────────────────────────────
// 🗺️ 行程渲染
// ─────────────────────────────────────────────
function renderTrips(keyword = "") {
  const container = document.getElementById("tripContainer");
  const cleanKey = keyword.trim().toLowerCase();

  // 🔑 銷毀舊 Sortable 實例，避免多重綁定
  sortableInstances.forEach(s => s.destroy());
  sortableInstances = [];

  // 完整重建 DOM
  container.innerHTML = "";

  const daysToRender = store.trips
    .map(dayGroup => ({
      ...dayGroup,
      filteredPlaces: dayGroup.places
        .filter(p =>
          cleanKey === "" ||
          p.title.toLowerCase().includes(cleanKey) ||
          p.note.toLowerCase().includes(cleanKey)
        )
        .slice()
        .sort((a, b) => a.time.localeCompare(b.time))
    }))
    .filter(d => d.filteredPlaces.length > 0 || cleanKey === "");

  if (daysToRender.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-text">找不到符合的景點</div>
        <div class="empty-sub">試試其他關鍵字</div>
      </div>`;
    return;
  }

  daysToRender.forEach(dayGroup => {
    const placesHTML = dayGroup.filteredPlaces.map(p => `
      <div class="place" data-id="${p.id}">
        <img class="placeImage"
             src="${p.img || ''}"
             alt="${p.title}"
             onerror="this.src='';this.style.cssText='width:80px;height:80px;border-radius:12px;flex-shrink:0;background:linear-gradient(135deg,#0a2138,#1a4a7a)'">
        <div class="placeInfo" onclick="editPlace(${p.id})">
          <div class="placeTime">${p.time}</div>
          <div class="placeTitle">${p.title}</div>
          <div class="placeNote">${p.note}</div>
        </div>
        <button class="delBtn" onclick="deletePlace(event,${p.id})" aria-label="刪除">🗑</button>
      </div>`).join("");

    const safeBanner = (dayGroup.banner && dayGroup.banner.trim())
      ? dayGroup.banner
      : "images/banner/sydney.jpg";

    const dayCard = document.createElement("div");
    dayCard.className = "dayCard";
    dayCard.dataset.day = dayGroup.day;
    dayCard.innerHTML = `
      <img class="dayImage" src="${safeBanner}" alt="Day ${dayGroup.day} banner"
           onerror="this.style.cssText='height:160px;background:linear-gradient(135deg,#0a2138,#1a4a7a)';this.removeAttribute('src')">
      <div class="dayContent" data-day="${dayGroup.day}">
        <div class="dayTop">
          <div class="dayBadge">Day ${dayGroup.day}</div>
          <div class="dayCity">${dayGroup.city}</div>
          <div class="dayDate">${dayGroup.date}</div>
        </div>
        ${placesHTML}
      </div>`;
    container.appendChild(dayCard);
  });

  // 搜尋中停用拖曳（避免搜尋結果集合不完整時排序混亂）
  if (cleanKey === "") initSortable();

  // 更新 Dashboard
  updateDashboard();
}

function updateDashboard() {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0].replace(/-/g, "/");
  const currentDay = store.trips.find(d => d.date === todayStr) || store.trips[0];
  if (currentDay) {
    document.getElementById("cityName").textContent  = currentDay.city;
    document.getElementById("dayNumber").textContent = currentDay.day;
  }
}

// ─────────────────────────────────────────────
// 🔥 拖曳排序（跨天 + 天內）
// ─────────────────────────────────────────────
function initSortable() {
  document.querySelectorAll(".dayContent").forEach(el => {
    const instance = new Sortable(el, {
      group: "shared",      // 跨天移動
      animation: 150,
      draggable: ".place",
      ghostClass: "sortable-ghost",
      onEnd: syncOrder
    });
    sortableInstances.push(instance);  // 🔑 記錄實例
  });
}

function syncOrder() {
  const newTrips = [];

  document.querySelectorAll(".dayContent").forEach(contentEl => {
    const currentDayNum = parseInt(contentEl.dataset.day);
    const oldMeta = store.trips.find(d => d.day === currentDayNum);
    if (!oldMeta) return;

    const orderedPlaces = [];
    contentEl.querySelectorAll(".place").forEach(placeEl => {
      const pid = parseInt(placeEl.dataset.id);
      // 在全部天數中找到這個景點
      for (const d of store.trips) {
        const p = d.places.find(i => i.id === pid);
        if (p) { orderedPlaces.push(p); break; }
      }
    });

    if (orderedPlaces.length > 0) {
      newTrips.push({ ...oldMeta, day: currentDayNum, places: orderedPlaces });
    }
  });

  store.trips = newTrips;
  normalizeDays();
  saveData();
  renderTrips();
  toast("已同步更新排序 🔁");
}

// ─────────────────────────────────────────────
// ⚡ 快速新增
// ─────────────────────────────────────────────
function quickAddPlace() {
  const input = document.getElementById("quickInput");
  const title = input.value.trim();
  if (!title) { input.focus(); return; }

  const item = { id: Date.now(), time: "12:00", title, note: "快速模式建立，點擊可編輯。", img: "" };
  const dayOne = store.trips.find(d => d.day === 1);

  if (dayOne) {
    dayOne.places.push(item);
  } else {
    store.trips.push({ day: 1, date: "2026/07/02", city: "Sydney", banner: "", places: [item] });
  }

  input.value = "";
  normalizeDays(); saveData(); renderTrips();
  toast("⚡ 快速新增成功");
}

// ─────────────────────────────────────────────
// ✏️ 完整彈窗儲存
// ─────────────────────────────────────────────
function saveTrip() {
  const dayNum  = parseInt(document.getElementById("editDayNum").value) || 1;
  const rawDate = document.getElementById("editDate").value.replace(/-/g, "/");
  const city    = document.getElementById("editCity").value.trim() || "Sydney";
  const title   = document.getElementById("editPlace").value.trim();
  const time    = document.getElementById("editTime").value || "12:00";
  const note    = document.getElementById("editNote").value.trim() || "無備註。";
  const photo   = document.getElementById("editPhoto").value.trim();
  let   banner  = document.getElementById("editBanner").value.trim();

  if (!banner) banner = "images/banner/sydney.jpg"; // 阻斷空值污染

  if (!title) {
    document.getElementById("editPlace").focus();
    toast("⚠️ 景點名稱不能為空");
    return;
  }

  if (editMode) {
    // 更新現有景點
    let srcDay = null, placeObj = null;
    for (const d of store.trips) {
      const f = d.places.find(p => p.id === editMode.id);
      if (f) { srcDay = d; placeObj = f; break; }
    }

    if (placeObj) {
      Object.assign(placeObj, { time, title, note, img: photo });

      if (srcDay.day === dayNum) {
        // 同天：只更新 meta
        Object.assign(srcDay, { date: rawDate, city, banner });
      } else {
        // 跨天移動
        srcDay.places = srcDay.places.filter(p => p.id !== editMode.id);
        let target = store.trips.find(d => d.day === dayNum);
        if (target) {
          target.places.push(placeObj);
        } else {
          store.trips.push({ day: dayNum, date: rawDate, city, banner, places: [placeObj] });
        }
      }
    }
    editMode = null;
  } else {
    // 新增景點
    const newItem = { id: Date.now(), time, title, note, img: photo };
    let target = store.trips.find(d => d.day === dayNum);
    if (target) {
      target.places.push(newItem);
    } else {
      store.trips.push({ day: dayNum, date: rawDate, city, banner, places: [newItem] });
    }
  }

  normalizeDays(); saveData(); renderTrips(); closeEditor();
  toast("行程已儲存 ✔");
}

function editPlace(id) {
  let dayObj = null, placeObj = null;
  for (const d of store.trips) {
    const f = d.places.find(p => p.id === id);
    if (f) { dayObj = d; placeObj = f; break; }
  }
  if (!placeObj) return;

  editMode = { id };
  document.getElementById("editDayNum").value  = dayObj.day;
  document.getElementById("editDate").value    = dayObj.date.replaceAll("/", "-");
  document.getElementById("editCity").value    = dayObj.city;
  document.getElementById("editPlace").value   = placeObj.title;
  document.getElementById("editTime").value    = placeObj.time;   // 🔑 修正：原版漏填
  document.getElementById("editNote").value    = placeObj.note;
  document.getElementById("editBanner").value  = dayObj.banner || "";
  document.getElementById("editPhoto").value   = placeObj.img  || "";

  openEditor("✏️ 編輯行程");
}

function deletePlace(e, id) {
  e.stopPropagation();
  if (!confirm("確定移除此景點？")) return;
  store.trips.forEach(d => { d.places = d.places.filter(p => p.id !== id); });
  normalizeDays(); saveData(); renderTrips();
  toast("景點已刪除 🗑");
}

// ─────────────────────────────────────────────
// 🧳 行李清單模組
// ─────────────────────────────────────────────
function renderBagSelect() {
  const select = document.getElementById("bagCategorySelect");
  select.innerHTML = Object.keys(store.bags).map(k =>
    `<option value="${k}">${k}</option>`
  ).join("");
}

function renderBag() {
  renderBagSelect();

  // 進度條
  let total = 0, done = 0;
  Object.values(store.bags).forEach(items => {
    total += items.length;
    done  += items.filter(i => i.done).length;
  });
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  document.getElementById("bagProgress").innerHTML = `
    <div class="progress-bar-wrap">
      <div class="progress-bar-fill" style="width:${pct}%"></div>
    </div>
    <div class="progress-label">${done} / ${total} 項已完成（${pct}%）</div>`;

  // 清單
  const container = document.getElementById("bagContainer");
  container.innerHTML = Object.keys(store.bags).map(category => {
    const items = store.bags[category];
    const itemsHTML = items.map((item, i) => `
      <div class="bagItem">
        <label class="bagItemLeft ${item.done ? 'done' : ''}">
          <input type="checkbox" ${item.done ? "checked" : ""}
                 onchange="toggleBag('${category}',${i})">
          <span>${item.text}</span>
        </label>
        <button class="bagItemDel" onclick="deleteBagItem('${category}',${i})"
                aria-label="刪除">✕</button>
      </div>`).join("");

    const allDone = items.length > 0 && items.every(i => i.done);
    return `
      <div class="bagCard ${allDone ? 'bag-complete' : ''}">
        <h3>${category} ${allDone ? '✅' : ''}</h3>
        <div>${itemsHTML}</div>
      </div>`;
  }).join("");
}

function toggleBag(category, index) {
  store.bags[category][index].done = !store.bags[category][index].done;
  saveData(); renderBag();
}

function addBagItem() {
  const cat   = document.getElementById("bagCategorySelect").value;
  const input = document.getElementById("bagInput");
  const text  = input.value.trim();
  if (!text) { input.focus(); return; }

  if (!store.bags[cat]) store.bags[cat] = [];
  store.bags[cat].push({ text, done: false });
  input.value = "";
  saveData(); renderBag();
  toast("已加到行李清單 🧳");
}

function deleteBagItem(category, index) {
  store.bags[category].splice(index, 1);
  saveData(); renderBag();
}

// ─────────────────────────────────────────────
// 🗃️ 更多頁面
// ─────────────────────────────────────────────
function renderMore() {
  const totalPlaces = store.trips.reduce((s, d) => s + d.places.length, 0);
  const totalBag    = Object.values(store.bags).reduce((s, a) => s + a.length, 0);
  document.getElementById("infoTripCount").textContent = `${store.trips.length} 天 / ${totalPlaces} 景點`;
  document.getElementById("infoBagCount").textContent  = `${totalBag} 項`;
}

function resetData() {
  if (!confirm("確定清除所有資料並還原預設行程？")) return;
  localStorage.removeItem("appData_v2");
  loadData(); normalizeDays(); renderTrips();
  toast("已還原預設資料 ✔");
}

// ─────────────────────────────────────────────
// 📦 SPA 分頁系統
// ─────────────────────────────────────────────
const tabs = document.querySelectorAll(".tab");
const fab  = document.getElementById("editButton");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    // 更新 tab 狀態
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    // 隱藏所有 page
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

    const pageKey = tab.dataset.page;
    const pageEl  = document.getElementById("page-" + pageKey);
    if (pageEl) pageEl.classList.add("active");

    // FAB 只在行程頁顯示
    fab.style.display = (pageKey === "home") ? "flex" : "none";

    // 各頁面 lazy render
    if (pageKey === "bag")   renderBag();
    if (pageKey === "more")  renderMore();
  });
});

// ─────────────────────────────────────────────
// 🛠️ Modal 控制
// ─────────────────────────────────────────────
function openEditor(title = "✏️ 新增行程") {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("editModal").style.display = "flex";
  // Trap focus
  setTimeout(() => document.getElementById("editPlace").focus(), 100);
}

function closeEditor() {
  document.getElementById("editModal").style.display = "none";
  editMode = null;
}

// 點 FAB → 新增模式
fab.addEventListener("click", () => {
  editMode = null;
  const today = new Date().toISOString().split("T")[0];
  const nextDay = (store.trips.length > 0)
    ? Math.max(...store.trips.map(d => d.day)) + 1
    : 1;
  const nextDate = store.trips.find(d => d.day === nextDay)?.date || today.replace(/-/g, "/");

  document.getElementById("editDayNum").value  = nextDay;
  document.getElementById("editDate").value    = nextDate.replace(/\//g, "-");
  document.getElementById("editCity").value    = "";
  document.getElementById("editPlace").value   = "";
  document.getElementById("editTime").value    = "09:00";
  document.getElementById("editNote").value    = "";
  document.getElementById("editBanner").value  = "";
  document.getElementById("editPhoto").value   = "";
  openEditor("✏️ 新增行程");
});

// Esc 關閉 modal
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeEditor();
});

// 點 modal 背景關閉
document.getElementById("editModal").addEventListener("click", e => {
  if (e.target === document.getElementById("editModal")) closeEditor();
});

// ─────────────────────────────────────────────
// 🔍 搜尋
// ─────────────────────────────────────────────
let searchDebounce = null;
document.getElementById("searchBox").addEventListener("input", e => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => renderTrips(e.target.value), 200);
});

// ─────────────────────────────────────────────
// 🛠️ PWA
// ─────────────────────────────────────────────
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("pwaBanner").style.display = "flex";
});

function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(choice => {
    console.log("PWA install:", choice.outcome);
    deferredPrompt = null;
    document.getElementById("pwaBanner").style.display = "none";
  });
}

// ─────────────────────────────────────────────
// 🍞 Toast 通知
// ─────────────────────────────────────────────
let toastTimer = null;
function toast(text) {
  const t = document.getElementById("toast");
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2000);
}

// ─────────────────────────────────────────────
// 🚀 啟動
// ─────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  loadData();
  normalizeDays();
  renderTrips();

  // 🔑 修正：正確的 SW 檔名
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js")
      .then(reg => console.log("SW 已就緒", reg.scope))
      .catch(err => console.warn("SW 註冊失敗", err));
  }
});
