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


// ================= BOOK APPOINTMENT =================

const form =
    document.getElementById("bookingForm");


form.addEventListener("submit", async (e) => {

    e.preventDefault();


    const fullName =
        document.getElementById("fullName").value;

    const email =
        document.getElementById("email").value;

    const phone =
        document.getElementById("phone").value;

    const therapist =
        document.getElementById("therapist").value;

    const date =
        document.getElementById("date").value;

    const time =
        document.getElementById("time").value;

    const mode =
        document.getElementById("mode").value;

    const age =
        document.getElementById("age").value;

    const concern =
        document.getElementById("concern").value;


    const token =
        localStorage.getItem("token");


    // ================= LOGIN CHECK =================

    if (!token) {

        alert("Please login first.");

        window.location.href =
            "login.html";

        return;

    }


    // ================= THERAPIST CHECK =================

    if (!therapistId) {

        alert("Therapist ID missing. Please select therapist again.");

        window.location.href =
            "therapists.html";

        return;

    }

    // Check time-slot conflict (1 slot = 1 appointment per therapist)
    const allGlobalAppointments = JSON.parse(localStorage.getItem("mindcare_all_global_appointments") || "[]");
    const isSlotOccupied = allGlobalAppointments.some(appt => 
        appt.therapist && appt.therapist.toLowerCase().trim() === therapist.toLowerCase().trim() &&
        appt.date === date &&
        appt.time === time &&
        (appt.status || "").toLowerCase() !== "cancelled"
    );

    if (isSlotOccupied) {
        alert(`⚠️ TIME SLOT CONFLICT!\n\n${therapist} is already booked on ${date} at ${time}.\n\nPlease select a different date or time slot.`);
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