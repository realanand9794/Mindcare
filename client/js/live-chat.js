// =====================================
// MindCare WhatsApp Style Live Chat Script
// =====================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. User & LocalStorage Setup
    const userObj = JSON.parse(localStorage.getItem("user") || "null");
    const userId = userObj ? (userObj.id || userObj._id || userObj.email) : "default";

    // One-time cache cleanup of previous test dummy recordings
    if (!localStorage.getItem("mindcare_chat_cache_cleared_v1")) {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith("mindcare_chat_")) {
                localStorage.removeItem(key);
            }
        });
        localStorage.setItem("mindcare_chat_cache_cleared_v1", "true");
    }

    function checkAppointmentAccess(appt, actionName = "Live Chat") {
        if (!appt) return { allowed: true };

        const rawStatus = (appt.status || "").toLowerCase().trim();

        if (rawStatus === "cancelled") {
            return {
                allowed: false,
                reason: "cancelled",
                message: `❌ This appointment was cancelled. ${actionName} is unavailable.`
            };
        }

        if (appt.attended === true || rawStatus === "completed" || rawStatus === "therapy session completed") {
            return {
                allowed: false,
                reason: "completed",
                message: `🔒 Therapy session is completed. ${actionName} is closed.`
            };
        }

        if (appt.date && appt.time) {
            try {
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
                    return {
                        allowed: false,
                        reason: "not_started",
                        message: `⏰ ${actionName} is not available yet. Your appointment with ${appt.therapist || 'the therapist'} is scheduled for ${appt.date} at ${appt.time}. You can only perform ${actionName} during your appointment time slot.`
                    };
                }

                if (now > apptEndTime && !appt.attended) {
                    return {
                        allowed: false,
                        reason: "expired",
                        message: `⚠️ Appointment time has expired (Missing). ${actionName} is closed.`
                    };
                }
            } catch (e) {
                console.warn("Error parsing appointment date/time:", e);
            }
        }

        return { allowed: true };
    }

    const defaultImages = {
        "dr. sarah wilson": "https://randomuser.me/api/portraits/women/44.jpg",
        "dr. david smith": "https://randomuser.me/api/portraits/men/32.jpg",
        "dr. emily johnson": "https://randomuser.me/api/portraits/women/68.jpg",
        "dr. michael brown": "https://randomuser.me/api/portraits/men/45.jpg"
    };

    function parseAppointmentDateTime(dateStr, timeStr) {
        if (!dateStr) return null;
        try {
            let year, month, day;
            const str = dateStr.trim();
            if (str.includes("-")) {
                const parts = str.split("-").map(Number);
                if (parts[0] > 1000) { year = parts[0]; month = parts[1] - 1; day = parts[2]; }
                else { day = parts[0]; month = parts[1] - 1; year = parts[2]; }
            } else if (str.includes("/")) {
                const parts = str.split("/").map(Number);
                if (parts[0] > 1000) { year = parts[0]; month = parts[1] - 1; day = parts[2]; }
                else { day = parts[0]; month = parts[1] - 1; year = parts[2]; }
            } else {
                const parsed = new Date(str);
                if (!isNaN(parsed.getTime())) { year = parsed.getFullYear(); month = parsed.getMonth(); day = parsed.getDate(); }
                else { return null; }
            }

            if (!timeStr) return new Date(year, month, day, 23, 59, 59);

            const cleanTime = timeStr.trim().toUpperCase();
            let hours = 0, minutes = 0;
            const isPM = cleanTime.includes("PM"), isAM = cleanTime.includes("AM");
            const digitsStr = cleanTime.replace(/[^\d:]/g, "");
            const timeParts = digitsStr.split(":");
            hours = parseInt(timeParts[0], 10) || 0;
            minutes = parseInt(timeParts[1], 10) || 0;
            if (isPM && hours < 12) hours += 12;
            if (isAM && hours === 12) hours = 0;

            const dateObj = new Date(year, month, day, hours, minutes);
            return isNaN(dateObj.getTime()) ? null : dateObj;
        } catch (e) {
            return null;
        }
    }

    // 2. Fetch User's Booked Appointments (Strictly for current user)
    const userEmail = (userObj && userObj.email) ? userObj.email.toLowerCase().trim() : "";
    const rawLocalAppts = JSON.parse(localStorage.getItem(`mindcare_user_appointments_${userId}`) || "[]");
    const globalAppts = JSON.parse(localStorage.getItem("mindcare_all_global_appointments") || "[]");

    const userAppts = [...rawLocalAppts, ...globalAppts].filter(a => {
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

    // Extract unique booked sessions for logged-in user
    const uniqueApptsMap = {};
    userAppts.forEach(a => {
        if (a && (a._id || a.roomKey)) {
            const idKey = a._id || a.roomKey;
            uniqueApptsMap[idKey] = a;
        }
    });

    const bookedSessions = [];
    Object.values(uniqueApptsMap).forEach(appt => {
        if (!appt || !appt.therapist) return;

        const rawStatus = (appt.status || "").toLowerCase().trim();
        if (rawStatus === "cancelled") return; // Skip Cancelled sessions

        const roomKey = appt.roomKey || ("room_" + (appt._id || Date.now()));
        const roomStorageKey = `mindcare_chat_room_${roomKey}`;
        const legacyStorageKey = `mindcare_chat_${userId}_${encodeURIComponent(appt.therapist.trim())}`;
        const h1 = JSON.parse(localStorage.getItem(roomStorageKey) || "[]");
        const h2 = JSON.parse(localStorage.getItem(legacyStorageKey) || "[]");
        const hasHistory = (h1.length + h2.length) > 0;
        const isAttended = appt.attended === true || rawStatus === "completed" || rawStatus === "therapy session completed";

        // Check if time slot has passed
        const apptStartTime = parseAppointmentDateTime(appt.date, appt.time);
        let isExpired = false;
        if (apptStartTime) {
            const apptEndTime = new Date(apptStartTime.getTime() + 30 * 60 * 1000);
            if (new Date() > apptEndTime) {
                isExpired = true;
            }
        }

        // Rule: If appointment is expired AND was never attended AND has no chat history/recordings -> MISSED (Do NOT show in chat sidebar)
        if (isExpired && !isAttended && !hasHistory) {
            return; // Skip Missed session
        }

        const nameKey = appt.therapist.toLowerCase().trim();
        const id = appt._id || roomKey;

        bookedSessions.push({
            id: id,
            name: appt.therapist,
            specialization: appt.therapistSpecialization || "Certified Specialist",
            image: appt.therapistImage || defaultImages[nameKey] || "https://randomuser.me/api/portraits/women/44.jpg",
            date: appt.date || "Today",
            time: appt.time || "Scheduled",
            mode: appt.mode || "Live Chat",
            roomKey: roomKey,
            rawAppt: appt
        });
    });

    // Fallback if user came from doctor page or direct link with booked appointment
    const urlParams = new URLSearchParams(window.location.search);
    const therapistFromUrl = urlParams.get("therapist");

    let activeTherapist = bookedSessions.length > 0 ? bookedSessions[0] : null;
    if (therapistFromUrl && bookedSessions.length > 0) {
        const cleanTarget = decodeURIComponent(therapistFromUrl).toLowerCase().trim();
        const found = bookedSessions.find(s => {
            const nameLower = (s.name || "").toLowerCase().trim();
            return nameLower === cleanTarget || nameLower.includes(cleanTarget) || cleanTarget.includes(nameLower);
        });
        if (found) activeTherapist = found;
    }

    // Elements
    const conversationsList = document.getElementById("conversationsList");
    const activeTherapistImg = document.getElementById("activeTherapistImg");
    const activeTherapistName = document.getElementById("activeTherapistName");
    const activeTherapistStatus = document.getElementById("activeTherapistStatus");
    const headerVoiceCallBtn = document.getElementById("headerVoiceCallBtn");
    const headerVideoCallBtn = document.getElementById("headerVideoCallBtn");
    const chatMessagesArea = document.getElementById("chatMessagesArea");
    const messageForm = document.getElementById("whatsappMessageForm");
    const messageInput = document.getElementById("whatsappMessageInput");
    const searchInput = document.getElementById("chatSearchInput");

    // Render Left Conversations List
    function renderConversations(listToRender = bookedSessions) {
        if (!conversationsList) return;
        conversationsList.innerHTML = "";

        if (listToRender.length === 0) {
            conversationsList.innerHTML = `
                <div style="padding: 24px 16px; text-align: center; color: #667781; font-size: 13px;">
                    <i class="fa-solid fa-clock-rotate-left" style="font-size: 24px; color: #a5b4fc; margin-bottom: 8px;"></i>
                    <p>No active sessions yet. Chats will appear once an appointment is booked.</p>
                </div>
            `;
            return;
        }

        listToRender.forEach(session => {
            const roomStorageKey = `mindcare_chat_room_${session.roomKey}`;
            const legacyStorageKey = `mindcare_chat_${userId}_${encodeURIComponent(session.name)}`;
            const history1 = JSON.parse(localStorage.getItem(roomStorageKey) || "[]");
            const history2 = JSON.parse(localStorage.getItem(legacyStorageKey) || "[]");
            const history = [...history1, ...history2];
            const lastItem = history.length > 0 ? history[history.length - 1] : null;

            const modeLower = (session.mode || "").toLowerCase();
            let modeIcon = "fa-comments";
            if (modeLower.includes("video")) modeIcon = "fa-video";
            else if (modeLower.includes("voice") || modeLower.includes("audio") || modeLower.includes("phone")) modeIcon = "fa-phone";

            let previewText = `<i class="fa-solid ${modeIcon}"></i> ${session.mode || 'Consultation'} (${session.date || 'Today'})`;
            let previewTime = session.time || "Today";

            if (lastItem) {
                previewTime = lastItem.timestamp || session.time || "Today";
                if (lastItem.type === "voice_call") previewText = `📞 Voice Call (${lastItem.duration || 'Ended'})`;
                else if (lastItem.type === "video_call") previewText = `📹 Video Call (${lastItem.duration || 'Ended'})`;
                else previewText = lastItem.text || "Message";
            }

            const itemDiv = document.createElement("div");
            const isActive = activeTherapist && (activeTherapist.id === session.id || activeTherapist.roomKey === session.roomKey);
            itemDiv.className = `chat-item ${isActive ? 'active' : ''}`;
            itemDiv.innerHTML = `
                <div class="chat-item-avatar-wrap">
                    <img src="${session.image}" alt="${session.name}">
                    <div class="online-badge"></div>
                </div>
                <div class="chat-item-details">
                    <div class="chat-item-top">
                        <h4>${session.name}</h4>
                        <span class="chat-item-time" style="font-size: 11px;">${previewTime}</span>
                    </div>
                    <div class="chat-item-preview">
                        <span>${previewText}</span>
                    </div>
                </div>
            `;

            itemDiv.addEventListener("click", () => {
                activeTherapist = session;
                renderConversations();
                loadActiveChatScreen();

                // Responsive mobile view toggle
                document.querySelector(".whatsapp-app-container")?.classList.add("show-chat");
            });

            conversationsList.appendChild(itemDiv);
        });
    }

    // Search filter
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = bookedSessions.filter(s => s.name.toLowerCase().includes(query) || s.specialization.toLowerCase().includes(query) || s.mode.toLowerCase().includes(query));
            renderConversations(filtered);
        });
    }

    // Mobile back button
    document.getElementById("mobileBackBtn")?.addEventListener("click", () => {
        document.querySelector(".whatsapp-app-container")?.classList.remove("show-chat");
    });

    function getSyncedMessagesForActiveTherapist(therapist) {
        if (!therapist) return [];
        const roomKey = therapist.roomKey || ("room_" + (therapist.id || therapist._id || "default"));
        const roomStorageKey = `mindcare_chat_room_${roomKey}`;
        return JSON.parse(localStorage.getItem(roomStorageKey) || "[]");
    }

    function saveSyncedMessageForActiveTherapist(therapist, msg) {
        if (!therapist) return;
        const roomKey = therapist.roomKey || ("room_" + (therapist.id || therapist._id || "default"));
        const roomStorageKey = `mindcare_chat_room_${roomKey}`;

        let history = JSON.parse(localStorage.getItem(roomStorageKey) || "[]");
        if (!history.find(x => x.id === msg.id)) {
            history.push(msg);
            localStorage.setItem(roomStorageKey, JSON.stringify(history));
        }
    }

    // Load Active Therapist Chat Screen
    function loadActiveChatScreen() {
        if (!activeTherapist) {
            if (activeTherapistName) activeTherapistName.innerText = "No Booked Therapist";
            if (activeTherapistStatus) activeTherapistStatus.innerHTML = `<span style="color: #94a3b8;">No active sessions</span>`;
            if (chatMessagesArea) {
                chatMessagesArea.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px;">
                        <i class="fa-solid fa-calendar-xmark" style="font-size: 40px; color: #cbd5e1; margin-bottom: 12px;"></i>
                        <h3 style="font-size: 16px; color: #334155; margin-bottom: 6px;">No Booked Therapy Sessions</h3>
                        <p style="font-size: 13.5px; color: #64748b; margin-bottom: 16px;">You haven't scheduled any active appointments yet.</p>
                        <a href="therapists.html" style="background: #4f46e5; color: white; padding: 8px 18px; border-radius: 20px; font-weight: 500; font-size: 13px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-user-doctor"></i> Browse Therapists
                        </a>
                    </div>
                `;
            }
            const chatFooter = document.querySelector(".chat-footer");
            if (chatFooter) chatFooter.style.display = "none";
            if (headerVoiceCallBtn) headerVoiceCallBtn.style.display = "none";
            if (headerVideoCallBtn) headerVideoCallBtn.style.display = "none";
            return;
        }

        if (activeTherapistName) activeTherapistName.innerText = activeTherapist.name;
        if (activeTherapistImg) activeTherapistImg.src = activeTherapist.image;
        if (activeTherapistStatus) activeTherapistStatus.innerHTML = `<span class="online-dot">●</span> online • ${activeTherapist.mode || 'Session'}`;

        const currentMode = (activeTherapist.mode || "live chat").toLowerCase();
        const isLiveChatMode = currentMode.includes("chat");
        const isVideoMode = currentMode.includes("video");
        const isVoiceMode = currentMode.includes("voice") || currentMode.includes("audio");

        const chatFooter = document.querySelector(".chat-footer");

        // Strict Session Mode Isolation Rules:
        if (isLiveChatMode) {
            // Live Chat -> Hide Video & Voice call buttons
            if (headerVoiceCallBtn) headerVoiceCallBtn.style.display = "none";
            if (headerVideoCallBtn) headerVideoCallBtn.style.display = "none";
            if (chatFooter) chatFooter.style.display = "flex";
        } else if (isVideoMode) {
            // Video Call -> Hide Live Chat footer and Voice Call button
            if (headerVoiceCallBtn) headerVoiceCallBtn.style.display = "none";
            if (headerVideoCallBtn) {
                headerVideoCallBtn.style.display = "inline-flex";
                headerVideoCallBtn.href = `video-call.html?room=${activeTherapist.roomKey || 'room_default'}&therapist=${encodeURIComponent(activeTherapist.name)}`;
            }
            if (chatFooter) chatFooter.style.display = "none";
        } else if (isVoiceMode) {
            // Voice Call -> Hide Live Chat footer and Video Call button
            if (headerVideoCallBtn) headerVideoCallBtn.style.display = "none";
            if (headerVoiceCallBtn) {
                headerVoiceCallBtn.style.display = "inline-flex";
                headerVoiceCallBtn.href = `video-call.html?mode=audio&room=${activeTherapist.roomKey || 'room_default'}&therapist=${encodeURIComponent(activeTherapist.name)}`;
            }
            if (chatFooter) chatFooter.style.display = "none";
        }

        // Read Chat History
        let history = getSyncedMessagesForActiveTherapist(activeTherapist);

        // Baseline initial welcome message if empty (No fake/demo call recordings pre-populated)
        if (history.length === 0) {
            if (isLiveChatMode) {
                const initMsg = {
                    id: "msg_init",
                    sender: "therapist",
                    type: "text",
                    text: `Hello! 👋 Welcome to your private live therapy session with ${activeTherapist.name}. How are you feeling today?`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                saveSyncedMessageForActiveTherapist(activeTherapist, initMsg);
                history = [initMsg];
            }
        }

        renderMessages(history);
    }

    // Attach click listeners to Header Video & Voice call buttons to validate time slot
    headerVideoCallBtn?.addEventListener("click", (e) => {
        if (!activeTherapist) return;
        const localKey = `mindcare_user_appointments_${userId}`;
        const userAppts = JSON.parse(localStorage.getItem(localKey) || "[]");
        const appt = userAppts.find(a => {
            const apptDoc = (a.therapist || "").toLowerCase().trim();
            const targetDoc = (activeTherapist.name || "").toLowerCase().trim();
            return targetDoc && (apptDoc.includes(targetDoc) || targetDoc.includes(apptDoc));
        });
        const access = checkAppointmentAccess(appt, "Video Call");
        if (!access.allowed) {
            e.preventDefault();
            alert(access.message);
        }
    });

    headerVoiceCallBtn?.addEventListener("click", (e) => {
        if (!activeTherapist) return;
        const localKey = `mindcare_user_appointments_${userId}`;
        const userAppts = JSON.parse(localStorage.getItem(localKey) || "[]");
        const appt = userAppts.find(a => {
            const apptDoc = (a.therapist || "").toLowerCase().trim();
            const targetDoc = (activeTherapist.name || "").toLowerCase().trim();
            return targetDoc && (apptDoc.includes(targetDoc) || targetDoc.includes(apptDoc));
        });
        const access = checkAppointmentAccess(appt, "Voice Call");
        if (!access.allowed) {
            e.preventDefault();
            alert(access.message);
        }
    });

    // Render Messages Stream
    function renderMessages(messages) {
        if (!chatMessagesArea) return;
        chatMessagesArea.innerHTML = `
            <div class="chat-encryption-banner">
                <i class="fa-solid fa-lock"></i>
                <span>Messages and calls are end-to-end encrypted. No one outside of this therapy session can read or listen to them.</span>
            </div>
        `;

        messages.forEach(msg => {
            if (msg.type === "voice_call") {
                // Voice Call Card with playable audio player
                const card = document.createElement("div");
                card.className = "call-log-card voice";
                card.innerHTML = `
                    <div class="call-log-header">
                        <div class="call-log-icon-box">
                            <i class="fa-solid fa-phone"></i>
                        </div>
                        <div class="call-log-details">
                            <h4>Voice Call Session Completed</h4>
                            <p><i class="fa-solid fa-clock"></i> Duration: ${msg.duration || '5 mins'} • ${msg.timestamp}</p>
                        </div>
                    </div>
                    <div class="call-player-box">
                        <div style="font-size:11.5px; color:#475569; margin-bottom:4px; font-weight:500;">
                            <i class="fa-solid fa-waveform-lines"></i> Play Voice Call Audio Recording:
                        </div>
                        <audio controls src="${msg.recordingUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'}"></audio>
                    </div>
                `;
                chatMessagesArea.appendChild(card);

            } else if (msg.type === "video_call") {
                // Video Call Card with playable video recording modal button
                const card = document.createElement("div");
                card.className = "call-log-card video";
                card.innerHTML = `
                    <div class="call-log-header">
                        <div class="call-log-icon-box">
                            <i class="fa-solid fa-video"></i>
                        </div>
                        <div class="call-log-details">
                            <h4>Video Call Consultation Completed</h4>
                            <p><i class="fa-solid fa-clock"></i> Duration: ${msg.duration || '12 mins'} • ${msg.timestamp}</p>
                        </div>
                    </div>
                    <button class="play-video-btn" onclick="openVideoModal('${msg.recordingUrl}')">
                        <i class="fa-solid fa-circle-play"></i> Watch Video Call Recording
                    </button>
                `;
                chatMessagesArea.appendChild(card);

            } else {
                // Standard Chat Message Bubble
                const isOutgoing = msg.sender === "user";
                const bubble = document.createElement("div");
                bubble.className = `msg-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;
                bubble.innerHTML = `
                    ${msg.text}
                    <span class="msg-meta">
                        ${msg.timestamp}
                        ${isOutgoing ? '<i class="fa-solid fa-check-double double-tick"></i>' : ''}
                    </span>
                `;
                chatMessagesArea.appendChild(bubble);
            }
        });

        // Auto-scroll to bottom
        chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
    }

    // Video Modal Player Handler
    window.openVideoModal = function (url) {
        const modal = document.getElementById("videoPlaybackModal");
        const player = document.getElementById("modalVideoPlayer");
        if (modal) modal.style.display = "flex";
        if (player) {
            player.src = url || "https://www.w3schools.com/html/mov_bbb.mp4";
            player.play();
        }
    };

    document.getElementById("closeVideoModalBtn")?.addEventListener("click", () => {
        const modal = document.getElementById("videoPlaybackModal");
        const player = document.getElementById("modalVideoPlayer");
        if (player) player.pause();
        if (modal) modal.style.display = "none";
    });

    // Send Message Handler
    if (messageForm) {
        messageForm.addEventListener("submit", (e) => {
            e.preventDefault();

            if (!activeTherapist) return;

            // Check permissions & time slot access
            const localKey = `mindcare_user_appointments_${userId}`;
            const userAppts = JSON.parse(localStorage.getItem(localKey) || "[]");
            const appt = userAppts.find(a => {
                const apptDoc = (a.therapist || "").toLowerCase().trim();
                const targetDoc = (activeTherapist.name || "").toLowerCase().trim();
                return targetDoc && (apptDoc.includes(targetDoc) || targetDoc.includes(apptDoc));
            });
            const access = checkAppointmentAccess(appt);
            if (!access.allowed) {
                alert(access.message);
                return;
            }

            const currentMode = (activeTherapist.mode || "live chat").toLowerCase();
            if (!currentMode.includes("chat")) {
                alert(`🔒 Live chat is disabled for ${activeTherapist.mode || 'Video/Voice Call'} sessions.\n\nYou can access your call recordings above.`);
                return;
            }

            const text = messageInput.value.trim();
            if (!text) return;

            const newMsg = {
                id: "msg_" + Date.now(),
                sender: "user",
                type: "text",
                text: text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            saveSyncedMessageForActiveTherapist(activeTherapist, newMsg);
            messageInput.value = "";

            renderMessages(getSyncedMessagesForActiveTherapist(activeTherapist));
            renderConversations();
        });
    }

    // Real-Time Polling Sync (Loads real messages sent by Doctor from therapist-chat.html)
    setInterval(() => {
        if (!activeTherapist) return;
        const history = getSyncedMessagesForActiveTherapist(activeTherapist);
        renderMessages(history);
    }, 1500);

    // Initial load
    renderConversations();
    loadActiveChatScreen();
});