// =====================================
// MindCare Therapist Dashboard Script
// =====================================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Session Check
    const activeDoctorRaw = localStorage.getItem("mindcare_active_therapist_session");
    if (!activeDoctorRaw) {
        alert("Please log in to your Doctor Portal first.");
        window.location.href = "therapist-login.html";
        return;
    }

    const activeDoctor = JSON.parse(activeDoctorRaw);

    // 2. Populate Sidebar Profile Info
    const doctorAvatar = document.getElementById("doctorAvatar");
    const doctorNameDisplay = document.getElementById("doctorNameDisplay");
    const doctorSpecDisplay = document.getElementById("doctorSpecDisplay");

    if (doctorAvatar) doctorAvatar.src = activeDoctor.image || "https://randomuser.me/api/portraits/women/44.jpg";
    if (doctorNameDisplay) doctorNameDisplay.innerText = activeDoctor.name || "Dr. Therapist";
    if (doctorSpecDisplay) doctorSpecDisplay.innerText = activeDoctor.specialization || "Certified Specialist";

    // Logout
    const logoutBtn = document.getElementById("therapistLogoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (confirm("Logout from Doctor Portal?")) {
                localStorage.removeItem("mindcare_active_therapist_session");
                window.location.href = "therapist-login.html";
            }
        });
    }

    // 3. Load Scoped Patient Appointments
    loadDoctorPatientAppointments(activeDoctor);
});

function loadDoctorPatientAppointments(activeDoctor) {
    const tbodyActive = document.getElementById("therapistPatientTableBody");
    const tbodyCompleted = document.getElementById("therapistCompletedTableBody");
    const totalPatientsElem = document.getElementById("totalPatientsCount");
    const upcomingTodayElem = document.getElementById("upcomingTodayCount");
    const completedSessionsElem = document.getElementById("completedSessionsCount");

    if (!tbodyActive) return;

    // Fetch all global appointments & user appointment stores
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

    // Deduplicate by appointment ID (ensuring Cancelled status takes priority if present)
    const uniqueMap = {};
    combined.forEach(a => {
        if (a._id) {
            const currentStatus = (a.status || "").toLowerCase().trim();
            const existing = uniqueMap[a._id];
            if (!existing || currentStatus === "cancelled") {
                uniqueMap[a._id] = a;
            }
        }
    });

    const allAppts = Object.values(uniqueMap);

    // Filter strictly for the logged-in doctor (exclude cancelled appointments)
    const doctorNameKey = (activeDoctor.name || "").toLowerCase().trim();
    const myPatientBookings = allAppts.filter(a => {
        const docNameInAppt = (a.therapist || "").toLowerCase().trim();
        const rawStatus = (a.status || "").toLowerCase().trim();
        return (docNameInAppt === doctorNameKey || docNameInAppt.includes(doctorNameKey) || doctorNameKey.includes(docNameInAppt)) && rawStatus !== "cancelled";
    });



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

    function isApptCompleted(appt) {
        if (!appt) return false;
        const rawStatus = (appt.status || "").toLowerCase().trim();
        const isFlaggedCompleted = appt.attended === true || rawStatus === "completed" || rawStatus === "therapy session completed";
        if (!isFlaggedCompleted) return false;

        // Future appointment guard: Future sessions cannot be completed yet
        const apptStartTime = parseAppointmentDateTime(appt.date, appt.time);
        if (apptStartTime && new Date() < apptStartTime) {
            appt.attended = false;
            if (rawStatus === "completed" || rawStatus === "therapy session completed") {
                appt.status = "Confirmed";
            }
            // Self-heal storage
            try {
                let allGlobal = JSON.parse(localStorage.getItem("mindcare_all_global_appointments") || "[]");
                allGlobal = allGlobal.map(g => (g._id === appt._id || (g.roomKey && g.roomKey === appt.roomKey)) ? { ...g, attended: false, status: "Confirmed" } : g);
                localStorage.setItem("mindcare_all_global_appointments", JSON.stringify(allGlobal));

                Object.keys(localStorage).forEach(k => {
                    if (k.startsWith("mindcare_user_appointments_")) {
                        let list = JSON.parse(localStorage.getItem(k) || "[]");
                        list = list.map(u => (u._id === appt._id || (u.roomKey && u.roomKey === appt.roomKey)) ? { ...u, attended: false, status: "Confirmed" } : u);
                        localStorage.setItem(k, JSON.stringify(list));
                    }
                });
            } catch (e) {}

            return false;
        }
        return true;
    }

    function isApptMissingOrExpired(appt) {
        if (!appt) return false;
        const rawStatus = (appt.status || "").toLowerCase().trim();
        if (rawStatus === "cancelled") return false;
        if (isApptCompleted(appt)) return false;

        const apptStartTime = parseAppointmentDateTime(appt.date, appt.time);
        if (apptStartTime) {
            const apptEndTime = new Date(apptStartTime.getTime() + 30 * 60 * 1000);
            return new Date() > apptEndTime;
        }
        return false;
    }

    const activeBookings = myPatientBookings.filter(a => !isApptCompleted(a) && !isApptMissingOrExpired(a));
    const allCompletedBookings = myPatientBookings.filter(a => isApptCompleted(a));
    const top5CompletedBookings = allCompletedBookings.slice().reverse().slice(0, 5);

    // Stats Computation
    if (totalPatientsElem) totalPatientsElem.innerText = myPatientBookings.length;
    if (upcomingTodayElem) upcomingTodayElem.innerText = activeBookings.length;
    if (completedSessionsElem) completedSessionsElem.innerText = allCompletedBookings.length;

    // Render Active Sessions Table
    tbodyActive.innerHTML = "";
    if (activeBookings.length === 0) {
        tbodyActive.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding: 35px 20px; color: #94a3b8;">
                    <i class="fa-solid fa-calendar-check" style="font-size: 28px; color: #818cf8; margin-bottom: 8px;"></i>
                    <p style="font-size: 14px; font-weight: 500;">No active or upcoming patient sessions at the moment.</p>
                </td>
            </tr>
        `;
    } else {
        activeBookings.forEach(appt => {
            const roomKey = appt.roomKey || ("room_" + appt._id);
            const modeLower = (appt.mode || "").toLowerCase();
            let joinBtn = "";

            if (modeLower.includes("voice") || modeLower.includes("audio") || modeLower.includes("phone")) {
                joinBtn = `
                    <a href="video-call.html?mode=audio&room=${roomKey}&therapist=${encodeURIComponent(activeDoctor.name)}&patient=${encodeURIComponent(appt.fullName)}&role=therapist" onclick="return handleTherapistSessionJoin(event, '${appt.mode || 'Voice Call'}', '${appt.date}', '${appt.time}')" class="join-action-btn voice" title="Start Voice Call with Patient">
                        <i class="fa-solid fa-phone"></i> Voice Call
                    </a>
                `;
            } else if (modeLower.includes("chat") || modeLower.includes("message") || modeLower.includes("live")) {
                joinBtn = `
                    <a href="therapist-chat.html?room=${roomKey}&therapist=${encodeURIComponent(activeDoctor.name)}&patient=${encodeURIComponent(appt.fullName)}&role=therapist" onclick="return handleTherapistSessionJoin(event, '${appt.mode || 'Live Chat'}', '${appt.date}', '${appt.time}')" class="join-action-btn chat" title="Open Doctor Live Chat with Patient">
                        <i class="fa-solid fa-comments"></i> Live Chat
                    </a>
                `;
            } else {
                joinBtn = `
                    <a href="video-call.html?room=${roomKey}&therapist=${encodeURIComponent(activeDoctor.name)}&patient=${encodeURIComponent(appt.fullName)}&role=therapist" onclick="return handleTherapistSessionJoin(event, '${appt.mode || 'Video Call'}', '${appt.date}', '${appt.time}')" class="join-action-btn video" title="Join Video Session with Patient">
                        <i class="fa-solid fa-video"></i> Video Call
                    </a>
                `;
            }

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <strong>${appt.fullName || 'Patient'}</strong>
                    <div style="font-size: 11.5px; color: #94a3b8;">${appt.email || 'patient@gmail.com'}</div>
                </td>
                <td>${appt.age || '25'} Yrs / ${appt.gender || 'Patient'}</td>
                <td><span style="background: #1e1b4b; color: #a5b4fc; padding: 3px 8px; border-radius: 6px; font-size: 12px;">${appt.concern || 'Counseling'}</span></td>
                <td>
                    <strong>${appt.date || 'Today'}</strong>
                    <div style="font-size: 12px; color: #34d399;">${appt.time || '10:00 AM'}</div>
                </td>
                <td><strong>${appt.mode || 'Consultation'}</strong></td>
                <td><span style="background: #064e3b; color: #34d399; padding: 2px 8px; border-radius: 10px; font-size: 11.5px; font-weight: 600;">Confirmed</span></td>
                <td style="text-align: right;">
                    <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center;">
                        ${joinBtn}
                        <button onclick="markTherapistSessionCompleted('${appt._id}')" class="mark-complete-btn" title="Mark Session as Completed">
                            <i class="fa-solid fa-circle-check"></i> Complete
                        </button>
                    </div>
                </td>
            `;
            tbodyActive.appendChild(tr);
        });
    }

    // Render Completed & Missed Sessions Table (Top 5 Recent Only)
    if (tbodyCompleted) {
        tbodyCompleted.innerHTML = "";
        if (top5CompletedBookings.length === 0) {
            tbodyCompleted.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding: 30px; color: #64748b;">
                        <p style="font-size: 13.5px;">No completed or missed past sessions yet.</p>
                    </td>
                </tr>
            `;
        } else {
            top5CompletedBookings.forEach(appt => {
                const completed = isApptCompleted(appt);
                let statusBadge = "";
                let actionBadge = "";

                if (completed) {
                    statusBadge = `<span style="background: #064e3b; color: #34d399; padding: 2px 8px; border-radius: 10px; font-size: 11.5px; font-weight: 600;">Session Completed</span>`;
                    actionBadge = `
                        <span style="background: #064e3b; color: #34d399; border: 1px solid #059669; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                            <i class="fa-solid fa-circle-check"></i> Completed
                        </span>
                    `;
                } else {
                    statusBadge = `<span style="background: #7f1d1d; color: #fca5a5; padding: 2px 8px; border-radius: 10px; font-size: 11.5px; font-weight: 600;">Session Missed</span>`;
                    actionBadge = `
                        <span style="background: #451a03; color: #fdba74; border: 1px solid #d97706; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                            <i class="fa-solid fa-clock-rotate-left"></i> Missed
                        </span>
                    `;
                }

                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>
                        <strong>${appt.fullName || 'Patient'}</strong>
                        <div style="font-size: 11.5px; color: #94a3b8;">${appt.email || 'patient@gmail.com'}</div>
                    </td>
                    <td>${appt.age || '25'} Yrs / ${appt.gender || 'Patient'}</td>
                    <td><span style="background: #1e1b4b; color: #a5b4fc; padding: 3px 8px; border-radius: 6px; font-size: 12px;">${appt.concern || 'Counseling'}</span></td>
                    <td>
                        <strong>${appt.date || 'Today'}</strong>
                        <div style="font-size: 12px; color: #94a3b8;">${appt.time || '10:00 AM'}</div>
                    </td>
                    <td><strong>${appt.mode || 'Consultation'}</strong></td>
                    <td>${statusBadge}</td>
                    <td style="text-align: right;">
                        ${actionBadge}
                    </td>
                `;
                tbodyCompleted.appendChild(tr);
            });
        }
    }
}

function handleTherapistSessionJoin(event, mode, dateStr, timeStr) {
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
                alert(`⏰ ${mode || 'Session'} is not available yet. Scheduled for ${dateStr} at ${timeStr}. You can only join during the appointment time slot.`);
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

window.markTherapistSessionCompleted = function(apptId) {
    if (!apptId) return;

    if (!confirm("Are you sure you want to mark this therapy session as completed?")) return;

    // Update global appointments
    let allGlobal = JSON.parse(localStorage.getItem("mindcare_all_global_appointments") || "[]");
    allGlobal = allGlobal.map(a => {
        if (a._id === apptId || a.roomKey === apptId) {
            return { ...a, attended: true, status: "Therapy Session Completed" };
        }
        return a;
    });
    localStorage.setItem("mindcare_all_global_appointments", JSON.stringify(allGlobal));

    // Update all user keys in localStorage
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith("mindcare_user_appointments_")) {
            try {
                let userAppts = JSON.parse(localStorage.getItem(key) || "[]");
                userAppts = userAppts.map(a => {
                    if (a._id === apptId || a.roomKey === apptId) {
                        return { ...a, attended: true, status: "Therapy Session Completed" };
                    }
                    return a;
                });
                localStorage.setItem(key, JSON.stringify(userAppts));
            } catch (e) {}
        }
    });

    const activeDoctorRaw = localStorage.getItem("mindcare_active_therapist_session");
    if (activeDoctorRaw) {
        loadDoctorPatientAppointments(JSON.parse(activeDoctorRaw));
    }

    alert("✅ Therapy session marked as Completed! Moved to Completed Sessions.");
};
