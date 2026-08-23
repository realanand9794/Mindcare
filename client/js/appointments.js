let currentLoadedAppointments = [];

// Helper function to push notification
function pushNotification(notif) {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user) return;
    const userId = user.id || user._id;
    const key = `mindcare_notifs_${userId}`;
    const list = JSON.parse(localStorage.getItem(key) || "[]");

    const newNotif = {
        id: "notif_" + Date.now(),
        type: notif.type || "system",
        title: notif.title,
        text: notif.text,
        link: notif.link || "appointments.html",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
        icon: notif.icon || "fa-calendar-check",
        color: notif.color || "#16a34a"
    };

    list.unshift(newNotif);
    if (list.length > 20) list.pop();
    localStorage.setItem(key, JSON.stringify(list));
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

function computeAppointmentStatus(appointment) {
    const rawStatus = (appointment.status || "").toLowerCase().trim();
    if (rawStatus === "cancelled") {
        return {
            statusText: "Cancelled",
            displayLabel: "Cancelled",
            badgeClass: "cancelled"
        };
    }

    if (appointment.attended === true || rawStatus === "completed" || rawStatus === "therapy session completed") {
        return {
            statusText: "therapy session completed",
            displayLabel: "Therapy Session Completed",
            badgeClass: "completed"
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
                badgeClass: "missing"
            };
        }
    }

    return {
        statusText: appointment.status || "Confirmed",
        displayLabel: appointment.status || "Confirmed",
        badgeClass: (appointment.status || "confirmed").toLowerCase()
    };
}

function getAppointmentRoomKey(appt) {
    if (!appt) return "room_default";
    if (appt.roomKey && appt.roomKey.toString().trim() !== "") {
        return appt.roomKey.toString().trim();
    }
    if (appt._id && appt._id.toString().trim() !== "") {
        return "room_" + appt._id.toString().trim();
    }
    if (appt.txnId && appt.txnId.toString().trim() !== "") {
        return "room_txn_" + appt.txnId.toString().trim();
    }
    const rawDoc = (appt.therapist || appt.doctorName || appt.therapistName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const rawPatient = (appt.fullName || appt.patientName || appt.user || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const rawDate = (appt.date || "").replace(/[^0-9]/g, "");
    const rawTime = (appt.time || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return `room_${rawDoc}_${rawPatient}_${rawDate}_${rawTime}`;
}

function handleSessionJoin(event, mode, dateStr, timeStr) {
    if (dateStr && timeStr) {
        try {
            const apptStartTime = parseAppointmentDateTime(dateStr, timeStr);
            if (apptStartTime) {
                const apptEndTime = new Date(apptStartTime.getTime() + 30 * 60 * 1000);
                const now = new Date();

                if (now < apptStartTime) {
                    if (event) event.preventDefault();
                    alert(`⏰ ${mode || 'Session'} is not available yet. Scheduled for ${dateStr} at ${timeStr}. You can only join during your appointment time slot.`);
                    return false;
                }

                if (now > apptEndTime) {
                    if (event) event.preventDefault();
                    alert(`⚠️ Appointment time has expired (Missed). ${mode || 'Session'} is closed.`);
                    return false;
                }
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

    let rawDoc = appt.therapist || appt.doctorName || appt.therapistName || appt.name || "";
    let doc = rawDoc.toLowerCase().replace(/^dr\.\s*/i, "").replace(/[^a-z0-9]/g, "");

    let rawDate = (appt.date || appt.appointmentDate || "").toString().trim();
    let dt = "";
    if (rawDate) {
        const dateParts = rawDate.split(/[-/.]/).map(p => p.trim());
        if (dateParts.length === 3) {
            let y, m, d;
            if (dateParts[0].length === 4) {
                y = dateParts[0]; m = dateParts[1].padStart(2, '0'); d = dateParts[2].padStart(2, '0');
            } else {
                d = dateParts[0].padStart(2, '0'); m = dateParts[1].padStart(2, '0'); y = dateParts[2];
            }
            dt = `${y}-${m}-${d}`;
        } else {
            dt = rawDate.replace(/[^0-9]/g, "");
        }
    }

    let rawTime = (appt.time || appt.timeSlot || appt.selectedSlot || "").toString().replace(/\s*\([^)]*\)/g, "").trim().toLowerCase();
    let tm = rawTime.replace(/^0/, "").replace(/\s+/g, "");

    if (doc && dt && tm) {
        return `fp_${doc}_${dt}_${tm}`;
    }
    if (doc && dt) {
        return `fp_${doc}_${dt}`;
    }
    if (appt.txnId) return "txn_" + appt.txnId;
    if (appt.roomKey) return "room_" + appt.roomKey;
    return appt._id ? appt._id.toString() : "";
}

// Function to load and render appointments
async function loadAppointments() {
    const listElem = document.getElementById("appointmentsList");
    if (!listElem) return;

    const token = localStorage.getItem("token") || localStorage.getItem("user");

    // Login Check
    if (!token) {
        alert("Please login to your account to view your appointments.");
        window.location.href = "login.html";
        return;
    }

    let apiAppts = [];

    // 1. Attempt API Fetch from Backend (Relative Path first, then Live Fallback)
    try {
        const resLocal = await fetch("/api/appointment/my", {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        const dataLocal = await resLocal.json();
        if (dataLocal.success && Array.isArray(dataLocal.appointments)) {
            apiAppts.push(...dataLocal.appointments);
        }
    } catch (e) {}

    if (apiAppts.length === 0) {
        try {
            const response = await fetch("https://mindcare-1-r9a5.onrender.com/api/appointment/my", {
                method: "GET",
                headers: token ? { "Authorization": `Bearer ${token}` } : {}
            });
            const data = await response.json();
            if (data.success && Array.isArray(data.appointments)) {
                apiAppts.push(...data.appointments);
            }
        } catch (err) {
            console.warn("Backend API offline or failed, loading local appointments fallback:", err);
        }
    }

    // 2. Read User-Isolated LocalStorage
    const userObj = JSON.parse(localStorage.getItem("user") || "null");
    const userId = userObj ? (userObj.id || userObj._id || userObj.email) : "default";
    const userEmail = (userObj && userObj.email) ? userObj.email.toLowerCase().trim() : "";
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

    if (apiAppts.length > 0) {
        localStorage.setItem(localKey, JSON.stringify(apiAppts));
        appointments = apiAppts;
    } else {
        appointments = Object.values(uniqueMap);
    }

    currentLoadedAppointments = appointments;

    // Filter ONLY active future upcoming appointments (exclude cancelled, completed, and missing)
    const activeAppointments = appointments.filter(a => {
        const info = computeAppointmentStatus(a);
        return info.badgeClass !== "cancelled" && info.badgeClass !== "completed" && info.badgeClass !== "missing";
    });

    // Render Empty State if no active/upcoming appointments
    if (!activeAppointments || activeAppointments.length === 0) {
        listElem.innerHTML = `
            <div class="empty">
                <i class="fa-solid fa-calendar-xmark"></i>
                <h3>No Upcoming Appointments</h3>
                <p>You have no active therapy sessions scheduled.</p>
            </div>
        `;
        return;
    }

    // Render Active Appointments List Cards
    listElem.innerHTML = "";

    activeAppointments.forEach(appointment => {
        const statusInfo = computeAppointmentStatus(appointment);
        const modeLower = (appointment.mode || "").toLowerCase();

        const roomKey = getAppointmentRoomKey(appointment);
        if (statusInfo.badgeClass === "completed") {
            sessionActionButton = `
                <button class="session-action-btn disabled-action" disabled style="background: #dcfce7; color: #15803d; cursor: not-allowed; opacity: 0.9; border: 1px solid #bbf7d0;">
                    <i class="fa-solid fa-circle-check"></i> Therapy Session Completed
                </button>
            `;
        } else if (statusInfo.badgeClass === "missing") {
            sessionActionButton = `
                <button class="session-action-btn disabled-action" disabled style="background: #fee2e2; color: #991b1b; cursor: not-allowed; opacity: 0.9; border: 1px solid #fca5a5;">
                    <i class="fa-solid fa-lock"></i> Session Missed (Expired)
                </button>
            `;
        } else if (modeLower.includes("chat") || modeLower.includes("live")) {
            sessionActionButton = `
                <a href="live-chat.html?room=${roomKey}&therapist=${encodeURIComponent(appointment.therapist)}" onclick="return handleSessionJoin(event, '${appointment.mode || 'Live Chat'}', '${appointment.date}', '${appointment.time}')" class="session-action-btn chat-action">
                    <i class="fa-solid fa-comments"></i> Start Live Chat
                </a>
            `;
        } else if (modeLower.includes("voice") || modeLower.includes("audio") || modeLower.includes("phone")) {
            sessionActionButton = `
                <a href="video-call.html?mode=audio&room=${roomKey}&therapist=${encodeURIComponent(appointment.therapist)}" onclick="return handleSessionJoin(event, '${appointment.mode || 'Voice Call'}', '${appointment.date}', '${appointment.time}')" class="session-action-btn voice-action">
                    <i class="fa-solid fa-phone"></i> Start Voice Call
                </a>
            `;
        } else {
            sessionActionButton = `
                <a href="video-call.html?room=${roomKey}&therapist=${encodeURIComponent(appointment.therapist)}" onclick="return handleSessionJoin(event, '${appointment.mode || 'Video Call'}', '${appointment.date}', '${appointment.time}')" class="session-action-btn video-action">
                    <i class="fa-solid fa-video"></i> Join Video Call
                </a>
            `;
        }

        const cancelButton = `
            <button class="cancel-btn" onclick="cancelAppointment('${appointment._id}')">
                <i class="fa-solid fa-xmark"></i> Cancel Appointment
            </button>
        `;

        const card = document.createElement("div");
        card.className = "appointment-card";
        card.innerHTML = `
            <div class="appointment-header">
                <h3>
                    <i class="fa-solid fa-user-doctor"></i>
                    ${appointment.therapist}
                </h3>
                <span class="status ${statusInfo.badgeClass}">
                    ${statusInfo.displayLabel}
                </span>
            </div>

            <div class="appointment-details">
                <div class="detail">
                    <span>
                        <i class="fa-solid fa-calendar"></i>
                        Date
                    </span>
                    <strong>
                        ${appointment.date}
                    </strong>
                </div>

                <div class="detail">
                    <span>
                        <i class="fa-solid fa-clock"></i>
                        Time
                    </span>
                    <strong>
                        ${appointment.time}
                    </strong>
                </div>

                <div class="detail">
                    <span>
                        <i class="fa-solid fa-video"></i>
                        Session Mode
                    </span>
                    <strong>
                        ${appointment.mode || "Video Call"}
                    </strong>
                </div>

                <div class="detail">
                    <span>
                        <i class="fa-solid fa-calendar-check"></i>
                        Status
                    </span>
                    <strong>
                        ${statusInfo.displayLabel}
                    </strong>
                </div>
            </div>

            <div class="appointment-actions">
                ${sessionActionButton}
                ${cancelButton}
            </div>
        `;

        listElem.appendChild(card);
    });
}

// Cancel Appointment Handler
async function cancelAppointment(id) {
    if (!confirm("Are you sure you want to cancel this appointment?")) {
        return;
    }

    const appt = currentLoadedAppointments.find(a => a._id === id || a.roomKey === id || (a.txnId && a.txnId === id));
    const targetId = (appt && appt._id) ? appt._id : id;

    if (appt) {
        appt.status = "Cancelled";
        if (appt.roomKey) {
            localStorage.removeItem(`mindcare_chat_room_${appt.roomKey}`);
        }
        if (appt._id) {
            localStorage.removeItem(`mindcare_chat_room_${appt._id}`);
        }
    }

    // Try Relative Backend API first, then Live Fallback
    const token = localStorage.getItem("token") || localStorage.getItem("user");
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};

    let cancelledOnBackend = false;
    try {
        const resLocal = await fetch(`/api/appointment/cancel/${targetId}`, { method: "PUT", headers });
        const dataLocal = await resLocal.json();
        if (dataLocal.success) cancelledOnBackend = true;
    } catch (e) {}

    if (!cancelledOnBackend) {
        try {
            await fetch(`https://mindcare-1-r9a5.onrender.com/api/appointment/cancel/${targetId}`, {
                method: "PUT",
                headers
            });
        } catch (e) {
            console.warn("Cancel API offline, updating locally");
        }
    }

    // Save to User LocalStorage
    const userObj = JSON.parse(localStorage.getItem("user") || "null");
    const userId = userObj ? (userObj.id || userObj._id || userObj.email) : "default";
    const localKey = `mindcare_user_appointments_${userId}`;

    let userAppts = JSON.parse(localStorage.getItem(localKey) || "[]");
    userAppts = userAppts.map(a => {
        const fp = getAppointmentFingerprint(a);
        if (a._id === id || a.roomKey === id || (targetFp && fp === targetFp)) {
            return { ...a, status: "Cancelled" };
        }
        return a;
    });
    localStorage.setItem(localKey, JSON.stringify(userAppts));

    // Update global appointments store for therapist portal sync
    let globalAppts = JSON.parse(localStorage.getItem("mindcare_all_global_appointments") || "[]");
    globalAppts = globalAppts.map(a => {
        const fp = getAppointmentFingerprint(a);
        if (a._id === id || a.roomKey === id || (targetFp && fp === targetFp)) {
            return { ...a, status: "Cancelled" };
        }
        return a;
    });
    localStorage.setItem("mindcare_all_global_appointments", JSON.stringify(globalAppts));

    alert("✅ Appointment Cancelled Successfully");
    loadAppointments();
}

// Automatic Initialization
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadAppointments);
} else {
    loadAppointments();
}