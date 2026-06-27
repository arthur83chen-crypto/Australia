// ===============================
// Australia Trip v1.0
// app.js (Part 1)
// ===============================

// ---------- LocalStorage ----------

const STORAGE_KEY = "australia-trip-v1";

let appData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {

    trips: [
        {
            day: 1,
            city: "Sydney",
            items: [
                {
                    time: "09:00",
                    title: "Sydney Opera House"
                },
                {
                    time: "11:30",
                    title: "Sydney Fish Market"
                },
                {
                    time: "15:00",
                    title: "Queen Victoria Building"
                }
            ]
        },
        {
            day: 2,
            city: "Blue Mountains",
            items: [
                {
                    time: "09:00",
                    title: "Scenic World"
                },
                {
                    time: "13:30",
                    title: "Three Sisters"
                }
            ]
        }
    ],

    packing: [

        {
            title:"📄 證件",
            items:[
                {name:"護照（確認效期一年以上）",done:false},
                {name:"ETA簽證",done:false},
                {name:"信用卡",done:false}
            ]
        },

        {
            title:"📱 電子用品",
            items:[
                {name:"手機",done:false},
                {name:"充電器",done:false},
                {name:"行動電源",done:false}
            ]
        },

        {
            title:"👕 衣物",
            items:[
                {name:"長袖",done:false},
                {name:"短袖",done:false},
                {name:"厚外套",done:false},
                {name:"長褲",done:false},
                {name:"內衣褲",done:false},
                {name:"襪子",done:false},
                {name:"帽子",done:false},
                {name:"休閒鞋",done:false},
                {name:"拖鞋",done:false},
                {name:"圍巾",done:false}
            ]
        },

        {
            title:"🪥 盥洗用品",
            items:[
                {name:"牙刷",done:false},
                {name:"牙膏",done:false},
                {name:"洗面乳",done:false},
                {name:"浴巾",done:false},
                {name:"防曬 SPF50+",done:false}
            ]
        },

        {
            title:"💊 常備藥",
            items:[
                {name:"感冒藥",done:false},
                {name:"腸胃藥",done:false},
                {name:"止痛藥",done:false},
                {name:"過敏藥",done:false},
                {name:"個人藥品",done:false}
            ]
        },

        {
            title:"👜 其他",
            items:[
                {name:"水壺",done:false},
                {name:"雨傘",done:false},
                {name:"太陽眼鏡",done:false},
                {name:"護唇膏",done:false}
            ]
        }

    ],

    expenses:[]

};

function saveData(){

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(appData)
    );

}

// ===============================
// 分頁切換
// ===============================

const pages={

    trip:document.getElementById("tripPage"),

    packing:document.getElementById("packingPage"),

    expense:document.getElementById("expensePage"),

    more:document.getElementById("morePage")

};

document.querySelectorAll(".nav-btn").forEach(btn=>{

    btn.onclick=()=>{

        document
        .querySelectorAll(".nav-btn")
        .forEach(b=>b.classList.remove("active"));

        btn.classList.add("active");

        document
        .querySelectorAll(".page")
        .forEach(p=>p.classList.remove("active"));

        pages[
            btn.dataset.page
        ].classList.add("active");

    };

});

// ===============================
// Render 行程
// ===============================

function renderTrips(){

    const container=document.getElementById("tripContainer");

    container.innerHTML="";

    appData.trips.forEach(day=>{

        let html=`

        <div class="day-card">

            <div class="day-header">

                <div class="day-title">

                    Day ${day.day}

                    ·

                    ${day.city}

                </div>

            </div>

        `;

        day.items.forEach(item=>{

            html+=`

            <div class="trip-item">

                <div class="trip-left">

                    <span class="trip-time">

                    ${item.time}

                    </span>

                    <span class="trip-name">

                    ${item.title}

                    </span>

                </div>

                <button
                class="trip-delete">

                🗑

                </button>

            </div>

            `;

        });

        html+=`</div>`;

        container.innerHTML+=html;

    });

}
// ===============================
// Render 行李清單
// ===============================

function renderPacking() {

    const container = document.getElementById("packingContainer");
    container.innerHTML = "";

    appData.packing.forEach((category, categoryIndex) => {

        let html = `
            <div class="category">
                <h3>${category.title}</h3>
        `;

        category.items.forEach((item, itemIndex) => {

            html += `
                <label class="check-item">

                    <input
                        type="checkbox"
                        ${item.done ? "checked" : ""}
                        onchange="togglePacking(${categoryIndex},${itemIndex})">

                    <span style="
                        ${item.done ? "text-decoration:line-through;opacity:.5;" : ""}
                    ">
                        ${item.name}
                    </span>

                </label>
            `;

        });

        html += `</div>`;

        container.innerHTML += html;

    });

}

// ===============================
// 勾選行李
// ===============================

function togglePacking(categoryIndex, itemIndex) {

    appData.packing[categoryIndex]
        .items[itemIndex]
        .done = !appData.packing[categoryIndex]
        .items[itemIndex]
        .done;

    saveData();

    renderPacking();

}

// ===============================
// Render 記帳
// ===============================

function renderExpense() {

    const container = document.getElementById("expenseContainer");

    const totalLabel = document.getElementById("expenseTotal");

    container.innerHTML = "";

    let total = 0;

    appData.expenses.forEach((item, index) => {

        total += Number(item.amount);

        container.innerHTML += `

        <div class="expense-item">

            <div>

                <strong>${item.title}</strong>

                <br>

                <small>${item.date}</small>

            </div>

            <div>

                ${item.amount} AUD

            </div>

        </div>

        `;

    });

    totalLabel.innerHTML = total + " AUD";

}

// ===============================
// 新增記帳
// ===============================

document.getElementById("addExpenseBtn").onclick = () => {

    const title = prompt("輸入項目");

    if (!title) return;

    const amount = prompt("金額 (AUD)");

    if (!amount) return;

    appData.expenses.push({

        title,

        amount,

        date: new Date().toLocaleDateString()

    });

    saveData();

    renderExpense();

};

// ===============================
// 初始化
// ===============================

function init() {

    renderTrips();

    renderPacking();

    renderExpense();

}

init();
