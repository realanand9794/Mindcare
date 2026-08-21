// =====================================
// Doctor Live Consultation Chat Script
// =====================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Session & URL Check
    const activeDoctorRaw = localStorage.getItem("mindcare_active_therapist_session");
    if (!activeDoctorRaw) {
        alert("Please log in to Doctor Portal first.");
        window.location.href = "therapist-login.html";
        return;
    }

    const activeDoctor = JSON.parse(activeDoctorRaw);

    const urlParams = new URLSearchParams(window.location.search);
    const patientName = urlParams.get("patient") || "Aarav Sharma";
    const roomKey = urlParams.get("room") || "room_default";
    const patientId = urlParams.get("patientId") || "default";

    // 2. Populate Header
    const loggedDoctorName = document.getElementById("loggedDoctorName");
    const patientNameTitle = document.getElementById("patientNameTitle");
    const docChatMessagesArea = document.getElementById("docChatMessagesArea");
    const docMessageForm = document.getElementById("docMessageForm");
    const docMessageInput = document.getElementById("docMessageInput");

    if (loggedDoctorName) loggedDoctorName.innerText = activeDoctor.name || "Doctor";
    if (patientNameTitle) patientNameTitle.innerText = `Patient: ${decodeURIComponent(patientName)}`;

    // Time slot validation for Therapist
    try {
        const allGlobal = JSON.parse(localStorage.getItem("mindcare_all_global_appointments") || "[]");
        const extraUserAppts = [];
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith("mindcare_user_appointments_")) {
                try {
                    const list = JSON.parse(localStorage.getItem(key) || "[]");
                    if (Array.isArray(list)) extraUserAppts.push(...list);
                } catch (e) {}
            }
        });
        const combined = [...allGlobal, ...extraUserAppts];

        const appt = combined.find(a => {
            return a.roomKey === roomKey || (a.fullName && decodeURIComponent(patientName).toLowerCase().includes(a.fullName.toLowerCase()));
        });

        if (appt) {
            const rawStatus = (appt.status || "").toLowerCase().trim();
            if (appt.attended === true || rawStatus === "completed" || rawStatus === "therapy session completed") {
                alert("🔒 Therapy session is completed. Live chat is closed.");
                window.location.href = "therapist-dashboard.html";
                return;
            }

            if (appt.date && appt.time) {
                const [year, month, day] = appt.date.split("-").map(Number);
                const timeParts = appt.time.trim().split(" ");
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
                    alert(`⏰ Live chat is not available yet. Scheduled for ${appt.date} at ${appt.time}. You can join during the appointment time slot.`);
                    window.location.href = "therapist-dashboard.html";
                    return;
                }

                if (now > apptEndTime && !appt.attended) {
                    alert("⚠️ Appointment time has expired (Missing). Live chat is closed.");
                    window.location.href = "therapist-dashboard.html";
                    return;
                }
            }
        }
    } catch (e) {
        console.warn("Therapist chat time slot validation error:", e);
    }

    // Storage Key shared with Patient
    const userObj = JSON.parse(localStorage.getItem("user") || "null");
    const userId = userObj ? (userObj.id || userObj._id || userObj.email) : "default";
    const roomStorageKey = `mindcare_chat_room_${roomKey}`;
    const legacyStorageKey = `mindcare_chat_${userId}_${encodeURIComponent(activeDoctor.name)}`;

    function getSyncedMessages() {
        let history1 = JSON.parse(localStorage.getItem(roomStorageKey) || "[]");
        let history2 = JSON.parse(localStorage.getItem(legacyStorageKey) || "[]");
        
        let extra = [];
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith("mindcare_chat_") && key.toLowerCase().includes(encodeURIComponent(activeDoctor.name).toLowerCase())) {
                try {
                    const list = JSON.parse(localStorage.getItem(key) || "[]");
                    if (Array.isArray(list)) extra.push(...list);
                } catch (e) {}
            }
        });

        const map = {};
        [...history1, ...history2, ...extra].forEach(m => {
            if (m.id) map[m.id] = m;
        });

        return Object.values(map);
    }

    function saveSyncedMessage(newMsg) {
        let history1 = JSON.parse(localStorage.getItem(roomStorageKey) || "[]");
        if (!history1.find(x => x.id === newMsg.id)) history1.push(newMsg);
        localStorage.setItem(roomStorageKey, JSON.stringify(history1));

        let history2 = JSON.parse(localStorage.getItem(legacyStorageKey) || "[]");
        if (!history2.find(x => x.id === newMsg.id)) history2.push(newMsg);
        localStorage.setItem(legacyStorageKey, JSON.stringify(history2));

        Object.keys(localStorage).forEach(key => {
            if (key.startsWith("mindcare_chat_") && key.toLowerCase().includes(encodeURIComponent(activeDoctor.name).toLowerCase())) {
                try {
                    let list = JSON.parse(localStorage.getItem(key) || "[]");
                    if (!list.find(x => x.id === newMsg.id)) {
                        list.push(newMsg);
                        localStorage.setItem(key, JSON.stringify(list));
                    }
                } catch (e) {}
            }
        });
    }

    // 3. Render Messages
    function renderDocMessages() {
        if (!docChatMessagesArea) return;

        let history = getSyncedMessages();

        // Baseline initial welcome message if empty
        if (history.length === 0) {
            const initMsg = {
                id: "msg_init_doc",
                sender: "therapist",
                type: "text",
                text: `Hello ${decodeURIComponent(patientName)}! 👋 I am ${activeDoctor.name}. Your live consultation session is now active. How can I help you today?`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            saveSyncedMessage(initMsg);
            history = [initMsg];
        }

        docChatMessagesArea.innerHTML = `
            <div class="encryption-notice">
                <i class="fa-solid fa-shield-halved"></i>
                <span>Private 1-on-1 Doctor-Patient Consultation. All advice and notes are encrypted & confidential.</span>
            </div>
        `;

        history.forEach(msg => {
            if (msg.type === "voice_call" || msg.type === "video_call") {
                const card = document.createElement("div");
                card.style.background = "#1e293b";
                card.style.border = "1px solid #334155";
                card.style.padding = "10px 14px";
                card.style.borderRadius = "10px";
                card.style.fontSize = "13px";
                card.style.color = "#a5b4fc";
                card.style.maxWidth = "320px";
                card.style.alignSelf = "center";
                card.innerHTML = `<i class="fa-solid fa-clock"></i> ${msg.title || 'Call Session'} (${msg.duration || 'Completed'}) • ${msg.timestamp}`;
                docChatMessagesArea.appendChild(card);
            } else {
                const isDoctor = msg.sender === "therapist";
                const bubble = document.createElement("div");
                bubble.className = `doc-msg-bubble ${isDoctor ? 'doctor-msg' : 'patient-msg'}`;
                bubble.innerHTML = `
                    <div class="doc-msg-sender">${isDoctor ? activeDoctor.name : decodeURIComponent(patientName)}</div>
                    <div>${msg.text}</div>
                    <span class="doc-msg-time">${msg.timestamp}</span>
                `;
                docChatMessagesArea.appendChild(bubble);
            }
        });

        docChatMessagesArea.scrollTop = docChatMessagesArea.scrollHeight;
    }

    // 4. Doctor Send Message Handler
    if (docMessageForm) {
        docMessageForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const text = docMessageInput.value.trim();
            if (!text) return;

            const newMsg = {
                id: "msg_" + Date.now(),
                sender: "therapist",
                type: "text",
                text: text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            saveSyncedMessage(newMsg);
            docMessageInput.value = "";
            renderDocMessages();

            // Push Real-Time Notification to Patient
            try {
                let targetUserId = patientId;
                if (!targetUserId || targetUserId === "default") {
                    const allGlobal = JSON.parse(localStorage.getItem("mindcare_all_global_appointments") || "[]");
                    const matchingAppt = allGlobal.find(a => a.roomKey === roomKey || (a.fullName && decodeURIComponent(patientName).toLowerCase().includes(a.fullName.toLowerCase())));
                    if (matchingAppt) {
                        targetUserId = matchingAppt.userId || matchingAppt.user;
                    }
                }

                if (targetUserId && targetUserId !== "default") {
                    const notifKey = `mindcare_notifs_${targetUserId}`;
                    const notifList = JSON.parse(localStorage.getItem(notifKey) || "[]");
                    notifList.unshift({
                        id: "notif_" + Date.now(),
                        type: "message",
                        title: `Message from ${activeDoctor.name || 'Therapist'}`,
                        text: `💬 "${text.length > 45 ? text.substring(0, 45) + '...' : text}"`,
                        link: `live-chat.html?therapist=${encodeURIComponent(activeDoctor.name)}`,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        read: false,
                        icon: "fa-comment-dots",
                        color: "#2563eb"
                    });
                    localStorage.setItem(notifKey, JSON.stringify(notifList));
                }
            } catch (e) {
                console.warn("Notification push error:", e);
            }
        });
    }

    // 5. Complete Session Handler
    document.getElementById("docCompleteSessionBtn")?.addEventListener("click", () => {
        if (!confirm("Are you sure you want to complete this consultation session?")) return;

        let allGlobal = JSON.parse(localStorage.getItem("mindcare_all_global_appointments") || "[]");
        allGlobal = allGlobal.map(a => {
            if (a.roomKey === roomKey || a._id === roomKey) {
                return { ...a, attended: true, status: "Therapy Session Completed" };
            }
            return a;
        });
        localStorage.setItem("mindcare_all_global_appointments", JSON.stringify(allGlobal));

        Object.keys(localStorage).forEach(key => {
            if (key.startsWith("mindcare_user_appointments_")) {
                try {
                    let userAppts = JSON.parse(localStorage.getItem(key) || "[]");
                    userAppts = userAppts.map(a => {
                        if (a.roomKey === roomKey || a._id === roomKey) {
                            return { ...a, attended: true, status: "Therapy Session Completed" };
                        }
                        return a;
                    });
                    localStorage.setItem(key, JSON.stringify(userAppts));
                } catch (e) {}
            }
        });

        alert("✅ Session marked as Completed! Returning to Therapist Portal.");
        window.location.href = "therapist-dashboard.html";
    });

    // 6. Real-Time Poll (Syncs Patient Messages Live Every 1.5s)
    setInterval(renderDocMessages, 1500);

    // Initial render
    renderDocMessages();
});
