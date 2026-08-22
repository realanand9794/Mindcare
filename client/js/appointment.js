const therapistName =
    localStorage.getItem("therapistName");

const therapistId =
    localStorage.getItem("therapistId");

const therapistFee =
    localStorage.getItem("therapistFee");

const therapistImage =
    localStorage.getItem("therapistImage");

const therapistSpecialization =
    localStorage.getItem("therapistSpecialization");

const therapistExperience =
    localStorage.getItem("therapistExperience");

const therapistRating =
    localStorage.getItem("therapistRating");


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

// ================= AUTH CHECK =================
const userToken = localStorage.getItem("token") || localStorage.getItem("user");
if (!userToken) {
    alert("Please login to your account to book an appointment.");
    window.location.href = "login.html";
}

// ================= CHECK THERAPIST =================

if (!therapistName || !therapistId) {

    alert("Please select a therapist first.");

    window.location.href = "therapists.html";

}


// ================= SHOW THERAPIST =================

if (therapistName) {

    document.getElementById("therapist").value =
        therapistName;

    document.getElementById("doctorName").innerHTML =
        therapistName;

    document.getElementById("doctorImage").src =
        therapistImage;

    document.getElementById("doctorSpecialization").innerHTML =
        therapistSpecialization;

    document.getElementById("doctorExperience").innerHTML =
        therapistExperience;

    document.getElementById("doctorRating").innerHTML =
        therapistRating;

    document.getElementById("fee").innerHTML =
        "₹" + therapistFee;

    const savedSlot = localStorage.getItem("selectedTimeSlot");
    if (savedSlot) {
        const timeSelect = document.getElementById("time");
        if (timeSelect) {
            for (let opt of timeSelect.options) {
                if (opt.value === savedSlot || opt.text === savedSlot) {
                    timeSelect.value = savedSlot;
                    break;
                }
            }
        }
    }
}


async function updateAvailableTimeSlots() {
    const timeSelect = document.getElementById("time");
    const dateInput = document.getElementById("date");
    const therapistInput = document.getElementById("therapist");

    if (!timeSelect || !dateInput || !therapistInput) return;

    const selectedTherapist = (therapistInput.value || "").toLowerCase().trim();
    const selectedDate = dateInput.value;

    if (!selectedTherapist || !selectedDate) return;

    // 1. Fetch live active appointments from backend API and local stores
    let apiAppts = [];
    try {
        const resLocal = await fetch("/api/appointment/all");
        const dataLocal = await resLocal.json();
        if (dataLocal.success && Array.isArray(dataLocal.appointments)) {
            apiAppts.push(...dataLocal.appointments);
        }
    } catch (e) {}

    if (apiAppts.length === 0) {
        try {
            const resLive = await fetch("https://mindcare-1-r9a5.onrender.com/api/appointment/all");
            const dataLive = await resLive.json();
            if (dataLive.success && Array.isArray(dataLive.appointments)) {
                apiAppts.push(...dataLive.appointments);
            }
        } catch (e) {}
    }

    const allGlobal = JSON.parse(localStorage.getItem("mindcare_all_global_appointments") || "[]");
    const extraUserAppts = [];
    Object.keys(localStorage).forEach(k => {
        if (k.startsWith("mindcare_user_appointments_")) {
            try {
                const list = JSON.parse(localStorage.getItem(k) || "[]");
                if (Array.isArray(list)) extraUserAppts.push(...list);
            } catch (e) {}
        }
    });

    const combined = [...apiAppts, ...allGlobal, ...extraUserAppts];

    // Filter occupied slots ONLY for selectedTherapist on selectedDate
    const bookedTimeSlots = new Set();
    combined.forEach(a => {
        if (!a) return;
        const apptTherapist = (a.therapist || a.doctorName || a.therapistName || "").toLowerCase().trim();
        const apptDate = (a.date || "").trim();
        const apptTime = (a.time || "").trim();
        const apptStatus = (a.status || "").toLowerCase().trim();

        if (apptTherapist === selectedTherapist && apptDate === selectedDate && apptStatus !== "cancelled" && apptTime) {
            const cleanTimeStr = apptTime.replace(/\s*\([^)]*\)/g, "").trim().toUpperCase();
            bookedTimeSlots.add(cleanTimeStr);
        }
    });

    // 2. Iterate through time select options
    let firstAvailableValue = null;
    let isCurrentSelectedBooked = false;

    for (let opt of timeSelect.options) {
        const rawTimeStr = (opt.value || opt.text).replace(/\s*\([^)]*\)/g, "").trim();
        const normalizedKey = rawTimeStr.toUpperCase();

        if (bookedTimeSlots.has(normalizedKey)) {
            opt.disabled = true;
            opt.textContent = `${rawTimeStr} (Booked 🚫)`;
            opt.style.color = "#dc2626";
            if (timeSelect.value === rawTimeStr || timeSelect.value === opt.value) {
                isCurrentSelectedBooked = true;
            }
        } else {
            opt.disabled = false;
            opt.textContent = rawTimeStr;
            opt.style.color = "";
            if (!firstAvailableValue) {
                firstAvailableValue = rawTimeStr;
            }
        }
    }

    // If currently selected option is booked, switch to first available unbooked option
    if (isCurrentSelectedBooked && firstAvailableValue) {
        timeSelect.value = firstAvailableValue;
    }
}

// Attach date picker constraint & change listener
document.addEventListener("DOMContentLoaded", () => {
    const dateInput = document.getElementById("date");
    if (dateInput) {
        const todayStr = new Date().toISOString().split("T")[0];
        dateInput.min = todayStr;
        if (!dateInput.value) {
            dateInput.value = todayStr;
        }

        dateInput.addEventListener("change", updateAvailableTimeSlots);
    }

    updateAvailableTimeSlots();
});

// ================= BOOK APPOINTMENT =================

const form = document.getElementById("bookingForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = document.getElementById("fullName").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    const therapist = document.getElementById("therapist").value;
    const date = document.getElementById("date").value;
    const timeRaw = document.getElementById("time").value;
    const time = timeRaw.replace(/\s*\([^)]*\)/g, "").trim();
    const mode = document.getElementById("mode").value;
    const age = document.getElementById("age").value;
    const concern = document.getElementById("concern").value;

    const token = localStorage.getItem("token");

    // ================= LOGIN CHECK =================
    if (!token) {
        alert("Please login first.");
        window.location.href = "login.html";
        return;
    }

    // ================= THERAPIST CHECK =================
    if (!therapistId) {
        alert("Therapist ID missing. Please select therapist again.");
        window.location.href = "therapists.html";
        return;
    }

    // Check time-slot conflict (1 slot = 1 appointment per therapist)
    let apiAppts = [];
    try {
        const res = await fetch("/api/appointment/all");
        const data = await res.json();
        if (data.success && Array.isArray(data.appointments)) apiAppts.push(...data.appointments);
    } catch (e) {}

    const allGlobalAppointments = JSON.parse(localStorage.getItem("mindcare_all_global_appointments") || "[]");
    const combinedAppts = [...apiAppts, ...allGlobalAppointments];

    const isSlotOccupied = combinedAppts.some(appt => {
        if (!appt) return false;
        const apptTherapist = (appt.therapist || appt.doctorName || appt.therapistName || "").toLowerCase().trim();
        const apptDate = (appt.date || "").trim();
        const apptTime = (appt.time || "").replace(/\s*\([^)]*\)/g, "").trim().toUpperCase();
        const apptStatus = (appt.status || "").toLowerCase().trim();

        return apptTherapist === therapist.toLowerCase().trim() &&
               apptDate === date &&
               apptTime === time.toUpperCase() &&
               apptStatus !== "cancelled";
    });

    if (isSlotOccupied) {
        alert(`⚠️ TIME SLOT CONFLICT!\n\n${therapist} is already booked on ${date} at ${time}.\n\nPlease select a different date or time slot.`);
        updateAvailableTimeSlots();
        return;
    }

    const roomKey = "room_" + Math.floor(100000 + Math.random() * 900000);

    // Save pending booking and redirect to Payment Gateway (checkout.html)
    const pendingBooking = {
        roomKey,
        fullName,
        email,
        phone,
        therapist,
        therapistId,
        therapistSpecialization,
        therapistImage,
        date,
        time,
        mode,
        age,
        concern,
        fee: therapistFee || 999
    };

    localStorage.setItem("mindcare_pending_booking", JSON.stringify(pendingBooking));
    window.location.href = "checkout.html";
});