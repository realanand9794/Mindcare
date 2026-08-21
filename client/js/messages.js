// ================= LOGIN & USER CHECK =================
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) {
    alert("Please login first to access messages.");
    window.location.href = "login.html";
}

const currentUserId = user.id || user._id;

// Default Therapist Metadata Mapping
const therapistDefaults = {
    "dr. sarah wilson": {
        specialization: "Clinical Psychologist",
        image: "https://randomuser.me/api/portraits/women/44.jpg"
    },
    "dr. david smith": {
        specialization: "Anxiety Specialist",
        image: "https://randomuser.me/api/portraits/men/32.jpg"
    },
    "dr. emily johnson": {
        specialization: "Relationship Counselor",
        image: "https://randomuser.me/api/portraits/women/68.jpg"
    },
    "dr. michael brown": {
        specialization: "Depression Expert",
        image: "https://randomuser.me/api/portraits/men/45.jpg"
    }
};

let therapistInboxList = [];
let currentTherapist = null;

// URL Parameters
const params = new URLSearchParams(window.location.search);
let targetTherapistId = params.get("therapistId") || localStorage.getItem("therapistId");

// Socket Setup
const socket = io("https://mindcare-1-r9a5.onrender.com");

socket.on("connect", () => {
    console.log("Socket Connected:", socket.id);
    socket.emit("joinUser", currentUserId);
});

// Elements
const therapistListElem = document.getElementById("therapistList");
const searchTherapistInput = document.getElementById("searchTherapistInput");
const chatHeader = document.getElementById("chatHeader");
const chatBox = document.getElementById("chatBox");
const emptyState = document.getElementById("emptyState");
const inputArea = document.getElementById("inputArea");

const therapistNameElem = document.getElementById("therapistName");
const therapistSpecElem = document.getElementById("therapistSpecialization");
const therapistImgElem = document.getElementById("therapistImage");
const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("sendBtn");

// Initialize Messages Inbox
document.addEventListener("DOMContentLoaded", async () => {
    await loadTherapistsInbox();

    if (searchTherapistInput) {
        searchTherapistInput.addEventListener("keyup", () => {
            filterTherapistList();
        });
    }

    if (sendBtn) sendBtn.addEventListener("click", sendMessage);
    if (messageInput) {
        messageInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});

// ================= LOAD THERAPISTS INBOX LIST =================
async function loadTherapistsInbox() {
    therapistInboxList = [];
    const userObj = JSON.parse(localStorage.getItem("user") || "null");
    const userId = userObj ? (userObj.id || userObj._id || userObj.email) : "default";
    const userEmail = (userObj && userObj.email) ? userObj.email.toLowerCase().trim() : "";
    const localKey = `mindcare_user_appointments_${userId}`;

    const rawLocalAppts = JSON.parse(localStorage.getItem(localKey) || "[]");
    const globalAppts = JSON.parse(localStorage.getItem("mindcare_all_global_appointments") || "[]");

    const userBookedAppts = [...rawLocalAppts, ...globalAppts].filter(a => {
        if (!a) return false;
        const apptUserId = (a.userId || a.user || "").toString();
        const apptEmail = (a.email || "").toLowerCase().trim();
        const cleanUserId = userId ? userId.toString() : "";
        const cleanUserEmail = userEmail ? userEmail.toLowerCase().trim() : "";

        if (cleanUserId && cleanUserId !== "default" && apptUserId && apptUserId !== "default" && apptUserId === cleanUserId) {
            return true;
        }
        if (cleanUserEmail && apptEmail && apptEmail === cleanUserEmail) {
            return true;
        }
        return false;
    });

    // 1. Fetch user booked appointments from API if available
    let allUserAppointments = [...userBookedAppts];
    try {
        const res = await fetch("https://mindcare-1-r9a5.onrender.com/api/appointment/my", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.appointments)) {
            allUserAppointments = [...data.appointments, ...userBookedAppts];
        }
    } catch (err) {
        console.warn("Could not load booked appointments from API, using user local storage:", err);
    }

    const bookedMap = {};
    allUserAppointments.forEach(app => {
        const nameKey = (app.therapist || "").toLowerCase().trim();
        if (!nameKey) return;

        if (!bookedMap[nameKey]) {
            const def = therapistDefaults[nameKey] || {
                specialization: app.therapistSpecialization || "Therapist",
                image: app.therapistImage || "https://randomuser.me/api/portraits/women/44.jpg"
            };

            bookedMap[nameKey] = {
                _id: app.therapistId || app._id || ("t_" + nameKey.replace(/\s+/g, '_')),
                fullName: app.therapist,
                specialization: app.therapistSpecialization || def.specialization,
                profileImage: app.therapistImage || def.image,
                lastMsg: `Session booked (${app.date || 'Active'})`
            };
        }
    });

    therapistInboxList = Object.values(bookedMap);

    renderTherapistList(therapistInboxList);

    // Pick target therapist if booked, or first booked therapist
    let selected = therapistInboxList.find(t => t._id === targetTherapistId || t.fullName.toLowerCase().trim() === (localStorage.getItem("therapistName") || "").toLowerCase().trim());
    if (!selected && therapistInboxList.length > 0) {
        selected = therapistInboxList[0];
    }

    if (selected) {
        selectTherapist(selected);
    } else {
        showEmptyState();
    }
}

// Render Left Sidebar List
function renderTherapistList(list) {
    if (!therapistListElem) return;
    therapistListElem.innerHTML = "";

    if (list.length === 0) {
        therapistListElem.innerHTML = `<div class="list-loading">No therapists found</div>`;
        return;
    }

    list.forEach(t => {
        const item = document.createElement("div");
        item.className = "therapist-item";
        if (currentTherapist && currentTherapist._id === t._id) {
            item.classList.add("active");
        }

        item.innerHTML = `
            <img src="${t.profileImage}" alt="${t.fullName}">
            <div class="item-info">
                <h4>${t.fullName}</h4>
                <p>${t.specialization}</p>
            </div>
        `;

        item.onclick = () => selectTherapist(t);
        therapistListElem.appendChild(item);
    });
}

function filterTherapistList() {
    const val = searchTherapistInput ? searchTherapistInput.value.toLowerCase() : "";
    const filtered = therapistInboxList.filter(t => t.fullName.toLowerCase().includes(val) || t.specialization.toLowerCase().includes(val));
    renderTherapistList(filtered);
}

function handleSessionJoin(event, mode, dateStr, timeStr) {
    if (dateStr && timeStr) {
        try {
            const [year, month, day] = dateStr.split("-").map(Number);
            const timeParts = timeStr.trim().split(" ");
            const [hrsStr, minsStr] = timeParts[0].split(":");
            let hours = parseInt(hrsStr, 10);
            const minutes = parseInt(minsStr, 10) || 0;
            const modifier = timeParts[1] ? timeParts[1].toUpperCase() : "AM";

            if (modifier === "PM" && hours < 12) hours += 12;
            if (modifier === "AM" && hours === 12) hours = 0;

            const apptStartTime = new Date(year, month - 1, day, hours, minutes);
            const apptEndTime = new Date(apptStartTime.getTime() + 30 * 60 * 1000);
            const now = new Date();

            if (now < apptStartTime) {
                if (event) event.preventDefault();
                alert(`⏰ ${mode || 'Session'} is not available yet. Scheduled for ${dateStr} at ${timeStr}. You can only join during your appointment time slot.`);
                return false;
            }

            if (now > apptEndTime) {
                if (event) event.preventDefault();
                alert(`⚠️ Appointment time has expired (Missing). ${mode || 'Session'} is closed.`);
                return false;
            }
        } catch (e) {
            console.warn("Time slot validation error:", e);
        }
    }
    return true;
}

// Select Therapist & Activate Chat Window
async function selectTherapist(t) {
    currentTherapist = t;

    // Highlight active in list
    document.querySelectorAll(".therapist-item").forEach(item => {
        if (item.querySelector("h4")?.innerText === t.fullName) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    // Save active therapist
    localStorage.setItem("therapistId", t._id);
    localStorage.setItem("therapistName", t.fullName);
    localStorage.setItem("therapistSpecialization", t.specialization);
    localStorage.setItem("therapistImage", t.profileImage);

    // Update Header UI
    if (therapistNameElem) therapistNameElem.innerText = t.fullName;
    if (therapistSpecElem) therapistSpecElem.innerText = t.specialization;
    if (therapistImgElem) therapistImgElem.src = t.profileImage;

    // Update Header Action Button according to booked mode
    const headerActionElem = document.getElementById("headerSessionAction");
    if (headerActionElem) {
        headerActionElem.innerHTML = "";
        const userObj = JSON.parse(localStorage.getItem("user") || "null");
        const userId = userObj ? (userObj.id || userObj._id || userObj.email) : "default";
        const localKey = `mindcare_user_appointments_${userId}`;

        const rawLocalAppts = JSON.parse(localStorage.getItem(localKey) || "[]");
        const globalAppts = JSON.parse(localStorage.getItem("mindcare_all_global_appointments") || "[]");
        const userBookedAppts = [...rawLocalAppts, ...globalAppts];

        const targetName = (t.fullName || "").toLowerCase().trim();
        const appt = userBookedAppts.find(a => {
            const apptDoc = (a.therapist || "").toLowerCase().trim();
            return apptDoc && (apptDoc.includes(targetName) || targetName.includes(apptDoc));
        });

        if (appt) {
            const mode = appt.mode || "Video Call";
            const modeLower = mode.toLowerCase();
            const roomKey = appt.roomKey || ("room_" + appt._id);

            let btnHtml = "";
            if (modeLower.includes("voice") || modeLower.includes("audio") || modeLower.includes("phone")) {
                btnHtml = `
                    <a href="video-call.html?mode=audio&room=${roomKey}&therapist=${encodeURIComponent(t.fullName)}" onclick="return handleSessionJoin(event, '${mode}', '${appt.date}', '${appt.time}')" style="background: #0284c7; color: white; padding: 6px 14px; border-radius: 20px; font-size: 12.5px; font-weight: 500; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-phone"></i> Start Voice Call
                    </a>
                `;
            } else if (modeLower.includes("chat") || modeLower.includes("live")) {
                btnHtml = `
                    <a href="live-chat.html?room=${roomKey}&therapist=${encodeURIComponent(t.fullName)}" onclick="return handleSessionJoin(event, '${mode}', '${appt.date}', '${appt.time}')" style="background: #16a34a; color: white; padding: 6px 14px; border-radius: 20px; font-size: 12.5px; font-weight: 500; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-comments"></i> Start Live Chat
                    </a>
                `;
            } else {
                btnHtml = `
                    <a href="video-call.html?room=${roomKey}&therapist=${encodeURIComponent(t.fullName)}" onclick="return handleSessionJoin(event, '${mode}', '${appt.date}', '${appt.time}')" style="background: #4f46e5; color: white; padding: 6px 14px; border-radius: 20px; font-size: 12.5px; font-weight: 500; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-video"></i> Join Video Call
                    </a>
                `;
            }
            headerActionElem.innerHTML = btnHtml;
        }
    }

    if (chatHeader) chatHeader.style.display = "flex";
    if (chatBox) chatBox.style.display = "flex";
    if (inputArea) inputArea.style.display = "flex";
    if (emptyState) emptyState.style.display = "none";

    markMessageNotificationsAsRead(t._id, t.fullName);

    await loadChatHistory(t._id, t.fullName);
}

function markMessageNotificationsAsRead(tId, tName) {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user) return;
    const userId = user.id || user._id;
    const key = `mindcare_notifs_${userId}`;
    let list = JSON.parse(localStorage.getItem(key) || "[]");

    list = list.map(n => {
        if (n.type === "message" && (n.therapistId === tId || (n.link && n.link.includes(tId)) || (n.title && n.title.includes(tName)))) {
            return { ...n, read: true };
        }
        return n;
    });

    localStorage.setItem(key, JSON.stringify(list));
}

function showEmptyState() {
    if (chatHeader) chatHeader.style.display = "none";
    if (chatBox) chatBox.style.display = "none";
    if (inputArea) inputArea.style.display = "none";
    if (emptyState) emptyState.style.display = "flex";
}

// ================= LOAD CHAT HISTORY =================
async function loadChatHistory(tId, tName) {
    if (!chatBox) return;

    chatBox.innerHTML = `
        <div class="chat-start-notice">
            <i class="fa-solid fa-shield-halved"></i>
            End-to-end encrypted session with ${tName}.
        </div>
    `;

    let loadedFromApi = false;

    try {
        const res = await fetch(`https://mindcare-1-r9a5.onrender.com/api/messages/conversation/${tId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success && data.messages && data.messages.length > 0) {
            data.messages.forEach(msg => {
                const senderObj = msg.sender || {};
                const senderId = senderObj._id || senderObj;
                const isMyMessage = senderId === currentUserId;
                appendMessageBubble(isMyMessage ? "sent" : "received", msg.message);
            });
            loadedFromApi = true;
        }
    } catch (e) {
        console.warn("Could not fetch remote messages, checking local storage:", e);
    }

    if (!loadedFromApi) {
        const storageKey = `chat_${currentUserId}_${tId}`;
        let localMsgs = JSON.parse(localStorage.getItem(storageKey) || "[]");

        if (localMsgs.length === 0) {
            const welcomeText = `Hello! 👋 Welcome to MindCare. I am ${tName}. How can I support your mental wellness today?`;
            localMsgs = [{ type: "received", text: welcomeText, time: new Date().toISOString() }];
            localStorage.setItem(storageKey, JSON.stringify(localMsgs));
        }

        localMsgs.forEach(msg => {
            appendMessageBubble(msg.type, msg.text);
        });
    }


    scrollToBottom();
}

function appendMessageBubble(type, text) {
    const bubble = document.createElement("p");
    bubble.className = type === "sent" ? "my-message" : "therapist-message";
    bubble.innerText = text;
    chatBox.appendChild(bubble);
}

function saveLocalMessage(type, text) {
    if (!currentTherapist) return;
    const storageKey = `chat_${currentUserId}_${currentTherapist._id}`;
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    saved.push({ type, text, time: new Date().toISOString() });
    localStorage.setItem(storageKey, JSON.stringify(saved));
}

function scrollToBottom() {
    if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
}

// ================= SEND MESSAGE =================
function sendMessage() {
    if (!currentTherapist) return;

    const text = messageInput.value.trim();
    if (!text) return;

    // 1. Emit via socket
    socket.emit("privateMessage", {
        senderId: currentUserId,
        receiverId: currentTherapist._id,
        message: text
    });

    // 2. Append to UI & Save
    appendMessageBubble("sent", text);
    saveLocalMessage("sent", text);

    messageInput.value = "";
    scrollToBottom();
}

function pushNotification(notif) {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user) return;
    const userId = user.id || user._id;
    const key = `mindcare_notifs_${userId}`;
    const list = JSON.parse(localStorage.getItem(key) || "[]");

    const newNotif = {
        id: "notif_" + Date.now(),
        type: notif.type || "message",
        title: notif.title,
        text: notif.text,
        link: notif.link || "messages.html",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
        icon: notif.icon || "fa-comment-dots",
        color: notif.color || "#4f46e5"
    };

    list.unshift(newNotif);
    if (list.length > 20) list.pop();
    localStorage.setItem(key, JSON.stringify(list));
}

// ================= RECEIVE MESSAGE =================
socket.on("privateMessage", (data) => {
    console.log("Received Socket Message:", data);

    if (!data || !data.message) return;

    if (currentTherapist && (data.senderId === currentTherapist._id || data.receiverId === currentUserId)) {
        appendMessageBubble("received", data.message);
        saveLocalMessage("received", data.message);
        scrollToBottom();

        pushNotification({
            type: "message",
            therapistId: currentTherapist._id,
            title: `Message from ${currentTherapist.fullName}`,
            text: `💬 "${data.message.length > 45 ? data.message.substring(0, 45) + '...' : data.message}"`,
            link: `messages.html?therapistId=${currentTherapist._id}`,
            icon: "fa-comment-dots",
            color: "#4f46e5",
            read: true
        });
    }
});