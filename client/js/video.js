const urlParams = new URLSearchParams(window.location.search);
const isAudioMode = urlParams.get("mode") === "audio" || urlParams.get("audio") === "true";
const therapistParam = urlParams.get("therapist") || urlParams.get("therapistName");
const roleParam = urlParams.get("role") || "patient";
const patientParam = urlParams.get("patient") || "Patient";
const roomKeyParam = urlParams.get("room") || "room_default";

// UI Elements
const micBtn = document.getElementById("micBtn");
const cameraBtn = document.getElementById("cameraBtn");
const endBtn = document.getElementById("endBtn");
const doctorNameHeader = document.getElementById("doctorNameHeader");
const doctorAvatar = document.getElementById("doctorAvatar");
const callStatusBadge = document.getElementById("callStatusBadge");
const patientVideoBox = document.getElementById("patientVideoBox");

let localStream = null;
let micState = true;
let cameraState = true;

const defaultImages = {
    "dr. sarah wilson": "https://randomuser.me/api/portraits/women/44.jpg",
    "dr. david smith": "https://randomuser.me/api/portraits/men/32.jpg",
    "dr. emily johnson": "https://randomuser.me/api/portraits/women/68.jpg",
    "dr. michael brown": "https://randomuser.me/api/portraits/men/45.jpg"
};

// Set Display Info based on Role (Doctor vs Patient)
if (roleParam === "therapist") {
    const cleanPatient = decodeURIComponent(patientParam);
    if (doctorNameHeader) doctorNameHeader.innerText = `Patient: ${cleanPatient}`;
    if (doctorAvatar) doctorAvatar.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
} else if (therapistParam) {
    const cleanName = decodeURIComponent(therapistParam);
    if (doctorNameHeader) doctorNameHeader.innerText = cleanName;
    const nameKey = cleanName.toLowerCase().trim();
    if (doctorAvatar && defaultImages[nameKey]) {
        doctorAvatar.src = defaultImages[nameKey];
    }
}

// Call Timer Setup
const timer = document.createElement("div");
timer.className = "call-timer";
timer.innerHTML = "00:00";
document.querySelector(".video-area").appendChild(timer);

let seconds = 0;
setInterval(() => {
    seconds++;
    const min = String(Math.floor(seconds / 60)).padStart(2, "0");
    const sec = String(seconds % 60).padStart(2, "0");
    timer.innerHTML = `${min}:${sec}`;
}, 1000);

// ================================
// Mode Initialization
// ================================

function markCurrentCallAttended() {
    try {
        const userObj = JSON.parse(localStorage.getItem("user") || "null");
        const userId = userObj ? (userObj.id || userObj._id || userObj.email) : "default";

        const localKey = `mindcare_user_appointments_${userId}`;
        let userAppts = JSON.parse(localStorage.getItem(localKey) || "[]");

        const doctorName = therapistParam ? decodeURIComponent(therapistParam).toLowerCase().trim() : "";

        userAppts = userAppts.map(a => {
            const apptDoc = (a.therapist || "").toLowerCase().trim();
            if (a.roomKey === roomKeyParam || (doctorName && (apptDoc.includes(doctorName) || doctorName.includes(apptDoc)))) {
                return { ...a, attended: true, status: "Therapy Session Completed" };
            }
            return a;
        });

        localStorage.setItem(localKey, JSON.stringify(userAppts));

        let globalAppts = JSON.parse(localStorage.getItem("mindcare_all_global_appointments") || "[]");
        globalAppts = globalAppts.map(a => {
            const apptDoc = (a.therapist || "").toLowerCase().trim();
            if (a.roomKey === roomKeyParam || (doctorName && (apptDoc.includes(doctorName) || doctorName.includes(apptDoc)))) {
                return { ...a, attended: true, status: "Therapy Session Completed" };
            }
            return a;
        });
        localStorage.setItem("mindcare_all_global_appointments", JSON.stringify(globalAppts));
    } catch (e) {
        console.warn("Failed to auto mark attendance:", e);
    }
}

function checkAndValidateAccess() {
    try {
        let appt = null;
        let isTherapistRole = roleParam === "therapist";
        let redirectTarget = isTherapistRole ? "therapist-dashboard.html" : "appointments.html";

        if (isTherapistRole) {
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
            const cleanPatientName = patientParam ? decodeURIComponent(patientParam).toLowerCase().trim() : "";

            appt = combined.find(a => {
                const apptPatient = (a.fullName || "").toLowerCase().trim();
                return a.roomKey === roomKeyParam || (cleanPatientName && (apptPatient.includes(cleanPatientName) || cleanPatientName.includes(apptPatient)));
            });
        } else {
            const userObj = JSON.parse(localStorage.getItem("user") || "null");
            const userId = userObj ? (userObj.id || userObj._id || userObj.email) : "default";
            const localKey = `mindcare_user_appointments_${userId}`;
            const userAppts = JSON.parse(localStorage.getItem(localKey) || "[]");
            const doctorName = therapistParam ? decodeURIComponent(therapistParam).toLowerCase().trim() : "";

            appt = userAppts.find(a => {
                const apptDoc = (a.therapist || "").toLowerCase().trim();
                return a.roomKey === roomKeyParam || (doctorName && (apptDoc.includes(doctorName) || doctorName.includes(apptDoc)));
            });
        }

        if (appt) {
            const rawStatus = (appt.status || "").toLowerCase().trim();
            if (rawStatus === "cancelled") {
                alert("❌ This appointment was cancelled. Consultation is unavailable.");
                window.location.href = redirectTarget;
                return false;
            }

            let isPast = false;
            let isNotStarted = false;
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
                    isNotStarted = true;
                }
                if (now > apptEndTime && !appt.attended) {
                    isPast = true;
                }
            }

            if (isNotStarted) {
                alert(`⏰ Call is not available yet. Scheduled for ${appt.date} at ${appt.time}. You can join during the appointment time slot.`);
                window.location.href = redirectTarget;
                return false;
            }

            if (isPast) {
                alert("⚠️ Appointment time has expired (Missing). Session is closed.");
                window.location.href = redirectTarget;
                return false;
            }

            if (appt.attended === true || rawStatus === "completed" || rawStatus === "therapy session completed") {
                alert("🔒 Therapy session is completed. Re-joining is not allowed.");
                window.location.href = redirectTarget;
                return false;
            }
        }
    } catch (e) {
        console.warn("Access validation error:", e);
    }
    return true;
}

async function initCall() {
    if (!checkAndValidateAccess()) return;
    markCurrentCallAttended();
    if (isAudioMode) {
        // Voice Call Setup
        document.title = "MindCare Voice Consultation";
        if (callStatusBadge) {
            callStatusBadge.innerHTML = '● Voice Call Active';
            callStatusBadge.style.background = "#059669";
        }

        // Hide Camera button & Patient Video box for pure audio experience
        if (cameraBtn) cameraBtn.style.display = "none";
        if (patientVideoBox) patientVideoBox.style.display = "none";

        // Request Audio-only WebRTC Stream
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        } catch (err) {
            console.warn("Microphone access denied or unavailable:", err.message);
        }

        setTimeout(() => {
            alert(`📞 Connected on Voice Call with ${doctorNameHeader ? doctorNameHeader.innerText : "Therapist"}`);
        }, 600);

    } else {
        // Video Call Setup
        document.title = "MindCare Video Consultation";
        if (callStatusBadge) {
            callStatusBadge.innerHTML = '● Live Video Call';
        }

        // Request Video + Audio WebRTC Stream
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const videoElem = document.getElementById("localVideo");
            const imgElem = document.getElementById("patientImg");
            if (videoElem) {
                videoElem.srcObject = localStream;
                videoElem.style.display = "block";
                if (imgElem) imgElem.style.display = "none";
            }
        } catch (err) {
            console.warn("Camera/Mic access denied or unavailable:", err.message);
        }

        setTimeout(() => {
            alert(`📹 Connected on Video Call with ${doctorNameHeader ? doctorNameHeader.innerText : "Therapist"}`);
        }, 600);
    }
}

// Mic Mute Toggle
if (micBtn) {
    micBtn.addEventListener("click", () => {
        micState = !micState;
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = micState);
        }
        if (micState) {
            micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            micBtn.style.background = "#374151";
        } else {
            micBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
            micBtn.style.background = "#ef4444";
        }
    });
}

// Camera Toggle (Video Call Only)
if (cameraBtn) {
    cameraBtn.addEventListener("click", () => {
        cameraState = !cameraState;
        if (localStream) {
            localStream.getVideoTracks().forEach(track => track.enabled = cameraState);
        }
        if (cameraState) {
            cameraBtn.innerHTML = '<i class="fas fa-video"></i>';
            cameraBtn.style.background = "#374151";
        } else {
            cameraBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
            cameraBtn.style.background = "#ef4444";
        }
    });
}

// End Call Handler
if (endBtn) {
    endBtn.addEventListener("click", () => {
        const doctorName = doctorNameHeader ? doctorNameHeader.innerText : "Therapist";
        if (confirm(`Do you want to end this consultation with ${doctorName}?`)) {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }

            // Save Call Log & Recording to Specific Session Room Storage
            const urlParams = new URLSearchParams(window.location.search);
            const roomKey = urlParams.get("room");
            const userObj = JSON.parse(localStorage.getItem("user") || "null");
            const userId = userObj ? (userObj.id || userObj._id || userObj.email) : "default";
            const storageKey = roomKey ? `mindcare_chat_room_${roomKey}` : `mindcare_chat_${userId}_${encodeURIComponent(doctorName)}`;

            const min = Math.floor(seconds / 60);
            const sec = seconds % 60;
            const durationStr = min > 0 ? `${min} min ${sec} sec` : `${sec} sec`;

            let chatHistory = JSON.parse(localStorage.getItem(storageKey) || "[]");
            const callLogMessage = {
                id: "msg_" + Date.now(),
                sender: "system",
                type: isAudioMode ? "voice_call" : "video_call",
                title: isAudioMode ? "Voice Call" : "Video Call",
                duration: durationStr,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                recordingUrl: isAudioMode
                    ? "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
                    : "https://www.w3schools.com/html/mov_bbb.mp4"
            };

            chatHistory.push(callLogMessage);
            localStorage.setItem(storageKey, JSON.stringify(chatHistory));

            const isTherapistRole = (urlParams.get("role") || "").toLowerCase() === "therapist";
            if (isTherapistRole) {
                alert(`🎉 Consultation Ended!\nCall duration: ${durationStr}\n\nCall log & recording saved.`);
                window.location.href = "therapist-dashboard.html";
            } else {
                alert(`🎉 Consultation Ended!\nCall duration: ${durationStr}\n\nCall log & recording saved to your chat with ${doctorName}.`);
                window.location.href = `live-chat.html?therapist=${encodeURIComponent(doctorName)}`;
            }
        }
    });
}

// Run Initialization
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCall);
} else {
    initCall();
}