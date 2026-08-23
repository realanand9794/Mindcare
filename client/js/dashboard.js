const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

// ================= LOGIN CHECK =================
if (!token || !user) {
    window.location.href = "login.html";
}

// Global data stores
let userAppointments = [];
let userMessages = [];

// ================= USER & INITIALIZATION =================
document.addEventListener("DOMContentLoaded", () => {
    const userNameElem = document.getElementById("userName");
    const topbarAvatar = document.getElementById("topbarAvatar");
    if (user) {
        if (userNameElem) userNameElem.innerText = user.fullName || "User";
        if (topbarAvatar && user.profileImage) topbarAvatar.src = user.profileImage;
    }

    // Bell notification dropdown toggle
    const notifBellBtn = document.getElementById("notifBellBtn");
    const notifDropdown = document.getElementById("notifDropdown");
    const markReadBtn = document.getElementById("markReadBtn");

    if (notifBellBtn && notifDropdown) {
        notifBellBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle("show");
        });

        document.addEventListener("click", (e) => {
            if (!notifDropdown.contains(e.target) && !notifBellBtn.contains(e.target)) {
                notifDropdown.classList.remove("show");
            }
        });
    }

    if (markReadBtn) {
        markReadBtn.addEventListener("click", () => {
            const userId = user ? (user.id || user._id) : "";
            const storedNotifsKey = `mindcare_notifs_${userId}`;
            let list = JSON.parse(localStorage.getItem(storedNotifsKey) || "[]");
            list = list.map(n => ({ ...n, read: true }));
            localStorage.setItem(storedNotifsKey, JSON.stringify(list));

            const badge = document.getElementById("notifBadge");
            if (badge) {
                badge.innerText = "0";
                badge.style.display = "none";
            }
            buildDynamicNotifications();
        });
    }

    // Start loading data
    initDashboard();
});

// ================= LOGOUT FUNCTION =================
function logout() {
    if (confirm("Are you sure you want to log out?")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "login.html";
    }
}

// ================= INIT DASHBOARD =================
async function initDashboard() {
    await loadAppointments();
    await loadMessagesStats();
    buildDynamicNotifications();
}

function parseAppointmentDateTime(dateStr, timeStr) {
    if (!dateStr) return null;
    try {
        let year, month, day;
        const str = dateStr.trim();
        if (str.includes("-")) {
            const parts = str.split("-").map(Number);
            if (parts[0] > 1000) {
                year = parts[0]; month = parts[1] - 1; day = parts[2];
            } else {
                day = parts[0]; month = parts[1] - 1; year = parts[2];
            }
        } else if (str.includes("/")) {
            const parts = str.split("/").map(Number);
            if (parts[0] > 1000) {
                year = parts[0]; month = parts[1] - 1; day = parts[2];
            } else {
                day = parts[0]; month = parts[1] - 1; year = parts[2];
            }
        } else {
            const parsed = new Date(str);
            if (!isNaN(parsed.getTime())) {
                year = parsed.getFullYear(); month = parsed.getMonth(); day = parsed.getDate();
            } else {
                return null;
            }
        }

        if (!timeStr) {
            return new Date(year, month, day, 23, 59, 59);
        }

        const cleanTime = timeStr.trim().toUpperCase();
        let hours = 0;
        let minutes = 0;

        const isPM = cleanTime.includes("PM");
        const isAM = cleanTime.includes("AM");

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

// Helper function to compute appointment status
function computeAppointmentStatus(appointment) {
    const rawStatus = (appointment.status || "").toLowerCase().trim();
    if (rawStatus === "cancelled") {
        return {
            statusText: "Cancelled",
            displayLabel: "Cancelled",
            badgeClass: "cancelled",
            badgeStyle: "background: #fef2f2; color: #dc2626;"
        };
    }

    if (appointment.attended === true || rawStatus === "completed" || rawStatus === "therapy session completed") {
        return {
            statusText: "therapy session completed",
            displayLabel: "Therapy Session Completed",
            badgeClass: "completed",
            badgeStyle: "background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;"
        };
    }

    const apptStartTime = parseAppointmentDateTime(appointment.date, appointment.time);
    if (apptStartTime) {
        const apptEndTime = new Date(apptStartTime.getTime() + 30 * 60 * 1000);
        const now = new Date();

        if (now > apptEndTime) {
            return {
                statusText: "missing",
                displayLabel: "Missed",
                badgeClass: "missing",
                badgeStyle: "background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5;"
            };
        }
    }

    return {
        statusText: appointment.status || "Confirmed",
        displayLabel: appointment.status || "Confirmed",
        badgeClass: "confirmed",
        badgeStyle: "background: #e0e7ff; color: #3730a3;"
    };
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

function markSessionAttended(id) {
    if (!id) return;
    const userObj = JSON.parse(localStorage.getItem("user") || "null");
    const userId = userObj ? (userObj.id || userObj._id || userObj.email) : "default";

    const localKey = `mindcare_user_appointments_${userId}`;
    let userAppts = JSON.parse(localStorage.getItem(localKey) || "[]");

    userAppts = userAppts.map(a => {
        if (a._id === id || a.roomKey === id) {
            return { ...a, attended: true, status: "Therapy Session Completed" };
        }
        return a;
    });

    localStorage.setItem(localKey, JSON.stringify(userAppts));

    let globalAppts = JSON.parse(localStorage.getItem("mindcare_all_global_appointments") || "[]");
    globalAppts = globalAppts.map(a => {
        if (a._id === id || a.roomKey === id) {
            return { ...a, attended: true, status: "Therapy Session Completed" };
        }
        return a;
    });
    localStorage.setItem("mindcare_all_global_appointments", JSON.stringify(globalAppts));
}

function getAppointmentFingerprint(appt) {
    if (!appt) return "";
    const doc = (appt.therapist || appt.doctorName || appt.therapistName || "").toLowerCase().replace(/^dr\.\s*/i, "").trim();
    const dt = (appt.date || "").trim();
    const rawTime = (appt.time || "").replace(/\s*\([^)]*\)/g, "").trim().toLowerCase();
    const tm = rawTime.replace(/^0/, "").replace(/\s+/g, "");
    if (doc && dt && tm) {
        return `fp_${doc}_${dt}_${tm}`;
    }
    if (appt.txnId) return "txn_" + appt.txnId;
    if (appt.roomKey) return "room_" + appt.roomKey;
    return appt._id ? appt._id.toString() : "";
}

// ================= LOAD APPOINTMENTS =================
async function loadAppointments() {
    let apiAppts = [];

    // 1. Try Relative Backend API first, then Live Fallback
    try {
        const responseLocal = await fetch("/api/appointment/my", {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        const dataLocal = await responseLocal.json();
        if (dataLocal.success && Array.isArray(dataLocal.appointments)) {
            apiAppts = dataLocal.appointments;
        }
    } catch (err) {}

    if (apiAppts.length === 0) {
        try {
            const response = await fetch("https://mindcare-1-r9a5.onrender.com/api/appointment/my", {
                method: "GET",
                headers: token ? { "Authorization": `Bearer ${token}` } : {}
            });
            const data = await response.json();
            if (data.success && Array.isArray(data.appointments)) {
                apiAppts = data.appointments;
            }
        } catch (err) {
            console.warn("Dashboard API fetch offline, using local storage fallback:", err);
        }
    }

    // 2. Read User-Isolated LocalStorage
    const userId = user ? (user.id || user._id || user.email) : "default";
    const userEmail = (user && user.email) ? user.email.toLowerCase().trim() : "";
    const localKey = `mindcare_user_appointments_${userId}`;
    const rawLocalAppts = JSON.parse(localStorage.getItem(localKey) || "[]");
    
    function isAppointmentBelongsToUser(a) {
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
    }

    // Strictly sanitize localAppts for current user ONLY
    const localAppts = rawLocalAppts.filter(isAppointmentBelongsToUser);

    if (localAppts.length !== rawLocalAppts.length) {
        localStorage.setItem(localKey, JSON.stringify(localAppts));
    }

    // Read global store BUT strictly filter by current user's ID or Email
    const globalAppts = JSON.parse(localStorage.getItem("mindcare_all_global_appointments") || "[]");
    const filteredGlobal = globalAppts.filter(isAppointmentBelongsToUser);

    const combined = [...apiAppts, ...localAppts, ...filteredGlobal];
    const uniqueMap = {};
    combined.forEach(a => {
        if (a) {
            const key = getAppointmentFingerprint(a);
            if (key) {
                const existing = uniqueMap[key];
                if (!existing) {
                    uniqueMap[key] = a;
                } else {
                    const existingStatus = (existing.status || "").toLowerCase().trim();
                    const newStatus = (a.status || "").toLowerCase().trim();
                    if (newStatus === "cancelled" || a.attended === true || (a._id && !existing._id)) {
                        uniqueMap[key] = a;
                    }
                }
            }
        }
    });

    userAppointments = Object.values(uniqueMap);

    // Self-heal & sync LocalStorage so legacy local duplicates are purged permanently
    if (userId) {
        const cleanUserAppts = userAppointments.filter(isAppointmentBelongsToUser);
        localStorage.setItem(localKey, JSON.stringify(cleanUserAppts));
    }
    localStorage.setItem("mindcare_all_global_appointments", JSON.stringify(userAppointments));

    const upcomingTable = document.getElementById("upcomingAppointmentTable");
    const cancelledTable = document.getElementById("cancelledAppointmentTable");

    updateCardStats();

    const defaultImages = {
        "dr. sarah wilson": "https://randomuser.me/api/portraits/women/44.jpg",
        "dr. david smith": "https://randomuser.me/api/portraits/men/32.jpg",
        "dr. emily johnson": "https://randomuser.me/api/portraits/women/68.jpg",
        "dr. michael brown": "https://randomuser.me/api/portraits/men/45.jpg"
    };

    // Filter ONLY active future upcoming appointments (exclude cancelled, completed, and missing)
    const upcoming = userAppointments.filter(a => {
        const info = computeAppointmentStatus(a);
        return info.badgeClass !== "cancelled" && info.badgeClass !== "completed" && info.badgeClass !== "missing";
    });

    // Filter Cancelled AND Missed/Expired appointments
    const cancelledAndMissedAll = userAppointments.filter(a => {
        const info = computeAppointmentStatus(a);
        const rawStatus = (a.status || "").toLowerCase().trim();
        return info.badgeClass === "cancelled" || info.badgeClass === "missing" || rawStatus === "cancelled" || rawStatus === "missing" || rawStatus === "expired" || rawStatus === "missed";
    });

    const top5CancelledAndMissed = cancelledAndMissedAll.slice(0, 5);

    // ---------------- UPCOMING TABLE ----------------
    if (upcomingTable) {
        upcomingTable.innerHTML = "";

        if (upcoming.length === 0) {
            upcomingTable.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding:45px 20px;">
                        <i class="fa-solid fa-calendar-xmark" style="font-size: 36px; color: #cbd5e1; margin-bottom: 10px;"></i>
                        <h3 style="font-size: 15px; color: #334155;">No Active Upcoming Appointments</h3>
                        <p style="font-size: 13px; color: #64748b; margin-top: 4px;">You haven't scheduled any upcoming therapy sessions.</p>
                    </td>
                </tr>
            `;
        } else {
            upcoming.forEach(appointment => {
                const statusInfo = computeAppointmentStatus(appointment);
                const nameKey = (appointment.therapist || "").toLowerCase().trim();
                const imageSrc = appointment.therapistImage || defaultImages[nameKey] || "https://randomuser.me/api/portraits/women/44.jpg";

                const modeLower = (appointment.mode || "").toLowerCase();
                let sessionBtn = "";
                let modeIcon = "fa-video";

                if (statusInfo.badgeClass === "completed") {
                    sessionBtn = `
                        <button class="action-btn disabled-btn" disabled style="background: #dcfce7; color: #15803d; cursor: not-allowed; opacity: 0.9; border: 1px solid #bbf7d0; padding: 6px 12px; border-radius: 8px;">
                            <i class="fa-solid fa-circle-check"></i> Completed
                        </button>
                    `;
                } else if (statusInfo.badgeClass === "missing") {
                    sessionBtn = `
                        <button class="action-btn disabled-btn" disabled style="background: #fee2e2; color: #991b1b; cursor: not-allowed; opacity: 0.9; border: 1px solid #fca5a5; padding: 6px 12px; border-radius: 8px;">
                            <i class="fa-solid fa-lock"></i> Missed
                        </button>
                    `;
                } else if (modeLower.includes("voice") || modeLower.includes("audio") || modeLower.includes("phone")) {
                    modeIcon = "fa-phone";
                    const roomKey = appointment.roomKey || ("room_" + appointment._id);
                    sessionBtn = `
                        <a href="video-call.html?mode=audio&room=${roomKey}&therapist=${encodeURIComponent(appointment.therapist)}" onclick="return handleSessionJoin(event, '${appointment.mode || 'Voice Call'}', '${appointment.date}', '${appointment.time}')" class="action-btn join-btn audio-session-btn" title="Start Voice Call">
                            <i class="fa-solid fa-phone"></i> Voice Call
                        </a>
                    `;
                } else if (modeLower.includes("chat") || modeLower.includes("message") || modeLower.includes("live")) {
                    modeIcon = "fa-comments";
                    const roomKey = appointment.roomKey || ("room_" + appointment._id);
                    sessionBtn = `
                        <a href="live-chat.html?room=${roomKey}&therapist=${encodeURIComponent(appointment.therapist)}" onclick="return handleSessionJoin(event, '${appointment.mode || 'Live Chat'}', '${appointment.date}', '${appointment.time}')" class="action-btn join-btn chat-session-btn" title="Start Live Chat">
                            <i class="fa-solid fa-comments"></i> Live Chat
                        </a>
                    `;
                } else {
                    modeIcon = "fa-video";
                    const roomKey = appointment.roomKey || ("room_" + appointment._id);
                    sessionBtn = `
                        <a href="video-call.html?room=${roomKey}&therapist=${encodeURIComponent(appointment.therapist)}" onclick="return handleSessionJoin(event, '${appointment.mode || 'Video Call'}', '${appointment.date}', '${appointment.time}')" class="action-btn join-btn video-session-btn" title="Join Video Session">
                            <i class="fa-solid fa-video"></i> Video Call
                        </a>
                    `;
                }

                upcomingTable.innerHTML += `
                    <tr>
                        <td>
                            <div class="therapist-cell">
                                <img src="${imageSrc}" alt="${appointment.therapist}" class="table-avatar">
                                <div>
                                    <strong>${appointment.therapist}</strong>
                                    <div class="sub-spec">${appointment.therapistSpecialization || "Certified Specialist"}</div>
                                </div>
                            </div>
                        </td>
                        <td><i class="fa-solid fa-calendar-day" style="color: #4f46e5; margin-right: 6px;"></i> ${appointment.date}</td>
                        <td><i class="fa-solid fa-clock" style="color: #0284c7; margin-right: 6px;"></i> ${appointment.time}</td>
                        <td>
                            <span class="mode-badge" style="margin-bottom: 4px; display: inline-block;"><i class="fa-solid ${modeIcon}"></i> ${appointment.mode || "Online"}</span><br>
                            <span style="font-size: 11.5px; font-weight: 600; padding: 2px 8px; border-radius: 12px; ${statusInfo.badgeStyle}">
                                ${statusInfo.displayLabel}
                            </span>
                        </td>
                        <td>
                            <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center;">
                                ${sessionBtn}
                                <button class="action-btn cancel-btn" onclick="cancelAppointment('${appointment._id}')" title="Cancel Appointment">
                                    <i class="fa-solid fa-xmark"></i> Cancel
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }
    }

    // ---------------- CANCELLED & MISSED TABLE ----------------
    if (cancelledTable) {
        cancelledTable.innerHTML = "";

        if (top5CancelledAndMissed.length === 0) {
            cancelledTable.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding:30px;">
                        <p style="color: #64748b; font-size: 13.5px;">No cancelled or missed appointments</p>
                    </td>
                </tr>
            `;
        } else {
            top5CancelledAndMissed.forEach(appointment => {
                const info = computeAppointmentStatus(appointment);
                const rawStatus = (appointment.status || "").toLowerCase().trim();
                const isMissed = info.badgeClass === "missing" || rawStatus === "missing" || rawStatus === "missed" || rawStatus === "expired";

                const nameKey = (appointment.therapist || "").toLowerCase().trim();
                const imageSrc = appointment.therapistImage || defaultImages[nameKey] || "https://randomuser.me/api/portraits/women/44.jpg";
                const modeLower = (appointment.mode || "").toLowerCase();
                let modeIcon = modeLower.includes("voice") ? "fa-phone" : (modeLower.includes("chat") ? "fa-comments" : "fa-video");

                let statusPill = "";
                if (isMissed) {
                    statusPill = `<span class="status-pill missed" style="background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 12px; font-size: 11.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-clock-rotate-left"></i> Missed</span>`;
                } else {
                    statusPill = `<span class="status-pill cancelled" style="background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 12px; font-size: 11.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-ban"></i> Cancelled</span>`;
                }

                cancelledTable.innerHTML += `
                    <tr>
                        <td>
                            <div class="therapist-cell">
                                <img src="${imageSrc}" alt="${appointment.therapist}" class="table-avatar">
                                <div>
                                    <strong>${appointment.therapist}</strong>
                                    <div class="sub-spec">${appointment.therapistSpecialization || "Certified Specialist"}</div>
                                </div>
                            </div>
                        </td>
                        <td><i class="fa-solid fa-calendar-day" style="color: #4f46e5; margin-right: 6px;"></i> ${appointment.date}</td>
                        <td><i class="fa-solid fa-clock" style="color: #0284c7; margin-right: 6px;"></i> ${appointment.time}</td>
                        <td><span class="mode-badge"><i class="fa-solid ${modeIcon}"></i> ${appointment.mode || "Online"}</span></td>
                        <td style="text-align: right;">${statusPill}</td>
                    </tr>
                `;
            });
        }
    }
}

// ================= LOAD MESSAGES STATS =================
async function loadMessagesStats() {
    try {
        const res = await fetch("https://mindcare-1-r9a5.onrender.com/api/messages/my", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        userMessages = data.messages || [];

        updateCardStats();
    } catch (e) {
        console.warn("Could not load message stats:", e);
    }
}

// ================= UPDATE CARD STATS =================
function updateCardStats() {
    const appointmentCount = document.getElementById("appointmentCount");
    const therapistCount = document.getElementById("therapistCount");
    const messageCount = document.getElementById("messageCount");
    const ratingCount = document.getElementById("ratingCount");

    if (appointmentCount) {
        const upcomingList = userAppointments.filter(a => {
            const info = computeAppointmentStatus(a);
            return info.badgeClass !== "cancelled" && info.badgeClass !== "completed" && info.badgeClass !== "missing";
        });
        appointmentCount.innerText = upcomingList.length;
    }

    if (therapistCount) {
        const uniqueTherapists = new Set(userAppointments.map(a => a.therapist).filter(Boolean));
        therapistCount.innerText = uniqueTherapists.size > 0 ? (uniqueTherapists.size < 10 ? '0' + uniqueTherapists.size : uniqueTherapists.size) : "00";
    }

    if (messageCount) {
        messageCount.innerText = userMessages.length;
    }

    if (ratingCount) {
        ratingCount.innerText = "4.9";
    }
}


// ================= DYNAMIC NOTIFICATION ENGINE =================
function buildDynamicNotifications() {
    const notificationsContainer = document.getElementById("notificationsContainer");
    const notifDropdownList = document.getElementById("notifDropdownList");
    const notifBadge = document.getElementById("notifBadge");

    let notifications = [];

    // 0. Live Stored Push Notifications (e.g. recent cancellations, bookings, messages)
    const userId = user ? (user.id || user._id) : "";
    const storedNotifsKey = `mindcare_notifs_${userId}`;
    const storedNotifs = JSON.parse(localStorage.getItem(storedNotifsKey) || "[]");
    
    if (storedNotifs.length > 0) {
        storedNotifs.forEach(sn => {
            notifications.push({
                type: sn.type || "system",
                icon: sn.icon || (sn.type === "cancel" ? "fa-calendar-xmark" : "fa-bell"),
                color: sn.color || (sn.type === "cancel" ? "#ef4444" : "#4f46e5"),
                title: sn.title || "Notification",
                text: sn.text,
                link: sn.link || "dashboard.html",
                time: sn.time || "Just now"
            });
        });
    }

    // 1. Recent Messages Notifications
    if (userMessages.length > 0) {
        const recentMsgMap = {};
        userMessages.forEach(m => {
            const senderObj = m.sender || {};
            const senderId = senderObj._id || senderObj;
            if (senderId !== (user.id || user._id)) {
                recentMsgMap[senderId] = {
                    senderName: senderObj.fullName || "Therapist",
                    senderId: senderId,
                    text: m.message,
                    time: m.createdAt
                };
            }
        });

        Object.values(recentMsgMap).forEach(msg => {
            notifications.push({
                type: "message",
                icon: "fa-comment-dots",
                color: "#2563eb",
                title: `Message from ${msg.senderName}`,
                text: `"${msg.text.length > 45 ? msg.text.substring(0, 45) + '...' : msg.text}"`,
                link: `live-chat.html?therapist=${encodeURIComponent(msg.senderName)}`,
                time: "Recently"
            });
        });
    }

    // 2. Appointment Notifications (Status Check)
    if (userAppointments.length > 0) {
        userAppointments.forEach(app => {
            const isCancelled = app.status === "Cancelled";
            notifications.push({
                type: "appointment",
                icon: isCancelled ? "fa-calendar-xmark" : "fa-calendar-check",
                color: isCancelled ? "#ef4444" : "#16a34a",
                title: isCancelled ? `❌ Appointment Cancelled` : `🗓️ Session ${app.status || 'Confirmed'}`,
                text: isCancelled 
                    ? `Your appointment with ${app.therapist} for ${app.date} has been cancelled.`
                    : `Session with ${app.therapist} scheduled for ${app.date} at ${app.time} (${app.mode}).`,
                link: "appointments.html",
                time: app.date
            });
        });
    }

    // 3. Welcome / System Notification if list is small
    if (notifications.length === 0) {
        notifications.push({
            type: "system",
            icon: "fa-sparkles",
            color: "#4f46e5",
            title: "Welcome to MindCare",
            text: `Hi ${user.fullName || 'User'}! Welcome to your mental health & therapy portal.`,
            link: "profile.html",
            time: "Always"
        });
    }


    // Update Badge Count (Only Unread)
    const unreadCount = storedNotifs.filter(sn => !sn.read).length;
    if (notifBadge) {
        if (unreadCount > 0) {
            notifBadge.innerText = unreadCount;
            notifBadge.style.display = "flex";
        } else {
            notifBadge.innerText = "0";
            notifBadge.style.display = "none";
        }
    }

    // Render Dashboard Section
    if (notificationsContainer) {
        notificationsContainer.innerHTML = "";
        notifications.forEach(n => {
            const notifItem = document.createElement("div");
            notifItem.className = "notification";
            notifItem.style.cursor = "pointer";
            notifItem.innerHTML = `
                <div style="display: flex; gap: 12px; align-items: center;">
                    <i class="fa-solid ${n.icon}" style="color: ${n.color}; font-size: 18px;"></i>
                    <div>
                        <strong>${n.title}</strong>
                        <p style="margin-top: 2px; font-size: 13px; color: #475569;">${n.text}</p>
                    </div>
                </div>
            `;
            notifItem.onclick = () => window.location.href = n.link;
            notificationsContainer.appendChild(notifItem);
        });
    }

    // Render Dropdown List
    if (notifDropdownList) {
        notifDropdownList.innerHTML = "";
        notifications.forEach(n => {
            const item = document.createElement("div");
            item.className = "notif-item";
            item.innerHTML = `
                <i class="fa-solid ${n.icon}" style="color: ${n.color};"></i>
                <div class="notif-item-text">
                    <strong>${n.title}</strong><br>
                    ${n.text}
                    <div class="notif-item-time">${n.time}</div>
                </div>
            `;
            item.onclick = () => {
                markNotificationAsRead(n.link);
                window.location.href = n.link;
            };
            notifDropdownList.appendChild(item);
        });
    }
}

function markNotificationAsRead(link) {
    const userId = user ? (user.id || user._id) : "";
    if (!userId) return;
    const key = `mindcare_notifs_${userId}`;
    let list = JSON.parse(localStorage.getItem(key) || "[]");

    list = list.map(sn => {
        if (sn.link === link || (sn.link && link && sn.link.includes(link))) {
            return { ...sn, read: true };
        }
        return sn;
    });

    localStorage.setItem(key, JSON.stringify(list));
}

function pushNotification(notif) {
    const userId = user ? (user.id || user._id) : "";
    if (!userId) return;
    const key = `mindcare_notifs_${userId}`;
    const list = JSON.parse(localStorage.getItem(key) || "[]");

    const newNotif = {
        id: "notif_" + Date.now(),
        type: notif.type || "system",
        title: notif.title,
        text: notif.text,
        link: notif.link || "dashboard.html",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
        icon: notif.icon || "fa-bell",
        color: notif.color || "#4f46e5"
    };

    list.unshift(newNotif);
    if (list.length > 20) list.pop();
    localStorage.setItem(key, JSON.stringify(list));

    showToastNotification(newNotif);
    buildDynamicNotifications();
}

function showToastNotification(notif) {
    let toastContainer = document.getElementById("toastContainer");
    if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = "toastContainer";
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement("div");
    toast.className = "toast-popup";
    toast.style.borderLeftColor = notif.color || "#4f46e5";

    toast.innerHTML = `
        <i class="fa-solid ${notif.icon || 'fa-bell'}" style="color: ${notif.color || '#4f46e5'};"></i>
        <div class="toast-content">
            <h4>${notif.title || 'Notification'}</h4>
            <p>${notif.text}</p>
        </div>
        <span class="toast-close">&times;</span>
    `;

    toast.onclick = (e) => {
        if (!e.target.classList.contains("toast-close")) {
            window.location.href = notif.link || "dashboard.html";
        }
    };

    const closeBtn = toast.querySelector(".toast-close");
    if (closeBtn) {
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            toast.style.animation = "toastFadeOut 0.3s ease forwards";
            setTimeout(() => toast.remove(), 300);
        };
    }

    toastContainer.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = "toastFadeOut 0.3s ease forwards";
            setTimeout(() => toast.remove(), 300);
        }
    }, 4500);
}

// ================= CANCEL APPOINTMENT =================
async function cancelAppointment(id) {
    const confirmCancel = confirm("Are you sure you want to cancel this appointment?");
    if (!confirmCancel) return;

    // Update in memory array
    const appt = userAppointments.find(a => a._id === id);
    if (appt) {
        appt.status = "Cancelled";
    }

    // Attempt API Call
    try {
        await fetch(`https://mindcare-1-r9a5.onrender.com/api/appointment/cancel/${id}`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` }
        });
    } catch (error) {
        console.warn("Cancel API call offline, updating LocalStorage fallback:", error);
    }

    // Save updated list to LocalStorage
    const userId = user ? (user.id || user._id || user.email) : "default";
    const localKey = `mindcare_user_appointments_${userId}`;
    localStorage.setItem(localKey, JSON.stringify(userAppointments));

    // Update global appointments store for therapist portal sync
    let globalAppts = JSON.parse(localStorage.getItem("mindcare_all_global_appointments") || "[]");
    globalAppts = globalAppts.map(a => {
        if (a._id === id || a.roomKey === id) {
            return { ...a, status: "Cancelled" };
        }
        return a;
    });
    localStorage.setItem("mindcare_all_global_appointments", JSON.stringify(globalAppts));

    const therapistName = appt ? appt.therapist : "Therapist";
    pushNotification({
        type: "cancel",
        title: "Appointment Cancelled",
        text: `❌ Your appointment with ${therapistName} on ${appt ? appt.date : 'selected date'} was cancelled.`,
        link: "appointments.html",
        icon: "fa-calendar-xmark",
        color: "#ef4444"
    });

    alert("✅ Appointment Cancelled Successfully");
    initDashboard();
}

// Auto Refresh Statuses Every 60 Seconds
setInterval(() => {
    try { initDashboard(); } catch (e) {}
}, 60000);