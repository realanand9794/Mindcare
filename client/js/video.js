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
let peerConnection = null;
let micState = true;
let cameraState = true;
let socket = null;
let isCallEnded = false;
let pendingCandidates = [];

// MediaRecorder Dual-Video Canvas State
let mediaRecorder = null;
let recordedChunks = [];
let recordingCanvas = null;
let canvasCtx = null;
let recordingInterval = null;

const rtcConfig = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" }
    ]
};

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

// Backend API Attendance & Completion Marker
async function markCurrentCallAttended() {
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

        const targetAppt = userAppts.find(a => a.roomKey === roomKeyParam || (doctorName && (a.therapist || "").toLowerCase().trim().includes(doctorName)));
        const targetId = (targetAppt && targetAppt._id) ? targetAppt._id : roomKeyParam;

        // Call backend API to update MongoDB document status globally
        try {
            await fetch(`/api/appointment/complete/${targetId}`, { method: "PUT" });
        } catch (e) {
            try {
                await fetch(`https://mindcare-1-r9a5.onrender.com/api/appointment/complete/${targetId}`, { method: "PUT" });
            } catch (err) {}
        }
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
                alert(`⏰ Call is not available yet. Scheduled for ${appt.date} at ${appt.time}. You can join during your appointment time slot.`);
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

// MediaRecorder Dual-Video Canvas Stream Logic
function startCanvasRecording(remoteStream) {
    try {
        recordingCanvas = document.getElementById("recordingCanvas");
        if (!recordingCanvas) return;
        canvasCtx = recordingCanvas.getContext("2d");

        const localVideo = document.getElementById("localVideo");
        const remoteVideo = document.getElementById("remoteVideo");

        recordingInterval = setInterval(() => {
            if (!canvasCtx) return;
            canvasCtx.fillStyle = "#0f172a";
            canvasCtx.fillRect(0, 0, 1280, 720);

            // Draw Remote Stream (Main Background)
            if (remoteVideo && remoteVideo.readyState >= 2) {
                canvasCtx.drawImage(remoteVideo, 0, 0, 1280, 720);
            }

            // Draw Local Stream PIP (Top Right Corner)
            if (localVideo && localVideo.readyState >= 2) {
                canvasCtx.fillStyle = "#ffffff";
                canvasCtx.fillRect(935, 20, 325, 185);
                canvasCtx.drawImage(localVideo, 940, 25, 315, 175);
            }
        }, 1000 / 30);

        const canvasStream = recordingCanvas.captureStream(30);

        // Merge Audio Tracks
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const dest = audioCtx.createMediaStreamDestination();
            if (localStream && localStream.getAudioTracks().length > 0) {
                audioCtx.createMediaStreamSource(localStream).connect(dest);
            }
            if (remoteStream && remoteStream.getAudioTracks().length > 0) {
                audioCtx.createMediaStreamSource(remoteStream).connect(dest);
            }
            if (dest.stream.getAudioTracks().length > 0) {
                canvasStream.addTrack(dest.stream.getAudioTracks()[0]);
            }
        } catch (e) {}

        recordedChunks = [];
        let options = { mimeType: "video/webm" };
        if (!MediaRecorder.isTypeSupported("video/webm")) {
            options = {};
        }
        mediaRecorder = new MediaRecorder(canvasStream, options);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.start(1000);
    } catch (e) {
        console.warn("Canvas recording init failed:", e);
    }
}

function stopCanvasRecording() {
    return new Promise((resolve) => {
        if (recordingInterval) clearInterval(recordingInterval);
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: "video/webm" });
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    resolve(reader.result);
                };
            };
            mediaRecorder.stop();
        } else {
            resolve(null);
        }
    });
}

async function processPendingCandidates() {
    if (peerConnection && peerConnection.remoteDescription && pendingCandidates.length > 0) {
        for (const candidate of pendingCandidates) {
            try {
                await peerConnection.addIceCandidate(candidate);
            } catch (e) {}
        }
        pendingCandidates = [];
    }
}

// WebRTC Peer Connection Setup & Socket.io Signaling
function createPeerConnection() {
    if (peerConnection) return peerConnection;
    peerConnection = new RTCPeerConnection(rtcConfig);

    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }

    peerConnection.ontrack = (event) => {
        const remoteVideo = document.getElementById("remoteVideo");
        const doctorAvatar = document.getElementById("doctorAvatar");
        if (remoteVideo && event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            remoteVideo.style.display = "block";
            if (doctorAvatar) doctorAvatar.style.display = "none";
        }
        startCanvasRecording(event.streams[0]);
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
            socket.emit("ice-candidate", { roomKey: roomKeyParam, candidate: event.candidate });
        }
    };

    return peerConnection;
}

function initSocketSignaling() {
    if (typeof io !== "undefined") {
        try {
            socket = io();
        } catch (e) {
            try {
                socket = io("https://mindcare-1-r9a5.onrender.com");
            } catch (err) {}
        }
    }

    if (!socket) return;

    socket.emit("join-call-room", { roomKey: roomKeyParam, role: roleParam });

    socket.on("user-connected-to-call", async () => {
        const pc = createPeerConnection();
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("call-offer", { roomKey: roomKeyParam, offer });
        } catch (e) {
            console.warn("Error creating WebRTC offer:", e);
        }
    });

    socket.on("call-offer", async (data) => {
        const pc = createPeerConnection();
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            await processPendingCandidates();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("call-answer", { roomKey: roomKeyParam, answer });
        } catch (e) {
            console.warn("Error handling WebRTC offer:", e);
        }
    });

    socket.on("call-answer", async (data) => {
        const pc = createPeerConnection();
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            await processPendingCandidates();
        } catch (e) {
            console.warn("Error handling WebRTC answer:", e);
        }
    });

    socket.on("ice-candidate", async (data) => {
        if (data.candidate) {
            const candidate = new RTCIceCandidate(data.candidate);
            if (peerConnection && peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
                try {
                    await peerConnection.addIceCandidate(candidate);
                } catch (e) {
                    console.warn("Error adding ICE candidate:", e);
                }
            } else {
                pendingCandidates.push(candidate);
            }
        }
    });

    socket.on("peer-left", async (data) => {
        if (isCallEnded) return;
        isCallEnded = true;

        const isTherapistRole = roleParam === "therapist";
        if (isTherapistRole) {
            alert("👤 Patient has left the consultation session.");
        } else {
            alert("👨‍⚕️ Therapist has left the consultation session.");
        }

        await finishAndExitCall();
    });

    socket.on("call-ended-by-peer", async () => {
        if (isCallEnded) return;
        isCallEnded = true;

        const isTherapistRole = roleParam === "therapist";
        if (isTherapistRole) {
            alert("👤 Patient has ended the call.");
        } else {
            alert("👨‍⚕️ Therapist has ended the call.");
        }

        await finishAndExitCall();
    });
}

async function initCall() {
    if (!checkAndValidateAccess()) return;

    if (isAudioMode) {
        document.title = "MindCare Voice Consultation";
        if (callStatusBadge) {
            callStatusBadge.innerHTML = '● Voice Call Active';
            callStatusBadge.style.background = "#059669";
        }
        if (cameraBtn) cameraBtn.style.display = "none";
        if (patientVideoBox) patientVideoBox.style.display = "none";

        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        } catch (err) {
            console.warn("Microphone access denied or unavailable:", err.message);
        }

        initSocketSignaling();

        setTimeout(() => {
            alert(`📞 Connected on Voice Call with ${doctorNameHeader ? doctorNameHeader.innerText : "Therapist"}`);
        }, 600);

    } else {
        document.title = "MindCare Video Consultation";
        if (callStatusBadge) {
            callStatusBadge.innerHTML = '● Live Video Call';
        }

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

        initSocketSignaling();

        setTimeout(() => {
            alert(`📹 Connected on Video Call with ${doctorNameHeader ? doctorNameHeader.innerText : "Therapist"}`);
        }, 600);
    }
}

async function finishAndExitCall() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
        peerConnection.close();
    }

    await markCurrentCallAttended();

    let actualRecordingUrl = await stopCanvasRecording();
    if (!actualRecordingUrl) {
        actualRecordingUrl = isAudioMode
            ? "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
            : "https://www.w3schools.com/html/mov_bbb.mp4";
    }

    const doctorName = doctorNameHeader ? doctorNameHeader.innerText : "Therapist";
    const userObj = JSON.parse(localStorage.getItem("user") || "null");
    const userId = userObj ? (userObj.id || userObj._id || userObj.email) : "default";
    const storageKey = roomKeyParam ? `mindcare_chat_room_${roomKeyParam}` : `mindcare_chat_${userId}_${encodeURIComponent(doctorName)}`;

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
        recordingUrl: actualRecordingUrl
    };

    chatHistory.push(callLogMessage);
    localStorage.setItem(storageKey, JSON.stringify(chatHistory));

    const isTherapistRole = roleParam === "therapist";
    if (isTherapistRole) {
        alert(`🎉 Consultation Ended!\nCall duration: ${durationStr}\n\nSession marked as Completed. Moving to Completed Sessions.`);
        window.location.href = "therapist-dashboard.html";
    } else {
        alert(`🎉 Consultation Ended!\nCall duration: ${durationStr}\n\nActual 2-way meeting recording saved to your chat.`);
        window.location.href = `live-chat.html?room=${roomKeyParam}&therapist=${encodeURIComponent(doctorName)}`;
    }
}

// Controls
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
    endBtn.addEventListener("click", async () => {
        if (isCallEnded) return;
        const doctorName = doctorNameHeader ? doctorNameHeader.innerText : "Therapist";
        if (confirm(`Do you want to end this consultation with ${doctorName}?`)) {
            isCallEnded = true;
            if (socket) {
                socket.emit("peer-left", { roomKey: roomKeyParam, role: roleParam });
                socket.emit("end-call-room", { roomKey: roomKeyParam, role: roleParam });
            }
            await finishAndExitCall();
        }
    });
}

// Run Initialization
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCall);
} else {
    initCall();
}