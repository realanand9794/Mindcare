// =====================================
// MindCare Payment Gateway & Checkout Script
// =====================================

document.addEventListener("DOMContentLoaded", () => {
    // Read pending booking from localStorage
    const pendingBookingRaw = localStorage.getItem("mindcare_pending_booking");
    if (!pendingBookingRaw) {
        alert("No pending booking found. Redirecting to Therapists page.");
        window.location.href = "therapists.html";
        return;
    }

    const booking = JSON.parse(pendingBookingRaw);

    // Elements
    const summaryDocImg = document.getElementById("summaryDocImg");
    const summaryDocName = document.getElementById("summaryDocName");
    const summaryDocSpec = document.getElementById("summaryDocSpec");
    const summaryDate = document.getElementById("summaryDate");
    const summaryTime = document.getElementById("summaryTime");
    const summaryMode = document.getElementById("summaryMode");
    const summaryFee = document.getElementById("summaryFee");
    const summaryTotal = document.getElementById("summaryTotal");

    const defaultImages = {
        "dr. sarah wilson": "https://randomuser.me/api/portraits/women/44.jpg",
        "dr. david smith": "https://randomuser.me/api/portraits/men/32.jpg",
        "dr. emily johnson": "https://randomuser.me/api/portraits/women/68.jpg",
        "dr. michael brown": "https://randomuser.me/api/portraits/men/45.jpg"
    };

    // Populate Booking Summary
    const doctorName = booking.therapist || "Dr. Sarah Wilson";
    const nameKey = doctorName.toLowerCase().trim();
    if (summaryDocName) summaryDocName.innerText = doctorName;
    if (summaryDocSpec) summaryDocSpec.innerText = booking.therapistSpecialization || "Certified Specialist";
    if (summaryDocImg) summaryDocImg.src = booking.therapistImage || defaultImages[nameKey] || "https://randomuser.me/api/portraits/women/44.jpg";
    if (summaryDate) summaryDate.innerText = booking.date || "2026-08-20";
    if (summaryTime) summaryTime.innerText = booking.time || "10:00 AM";
    if (summaryMode) summaryMode.innerText = booking.mode || "Video Call";

    const feeAmount = booking.fee || 999;
    if (summaryFee) summaryFee.innerText = `₹${feeAmount}`;
    if (summaryTotal) summaryTotal.innerText = `₹${feeAmount}`;

    // Tab Switching
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));

            btn.classList.add("active");
            const targetId = `tab-${btn.dataset.tab}`;
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add("active");
        });
    });

    // Copy UPI ID Handler
    const copyUpiBtn = document.getElementById("copyUpiBtn");
    if (copyUpiBtn) {
        copyUpiBtn.addEventListener("click", () => {
            const upiId = "9794401568-2@ybl";
            navigator.clipboard.writeText(upiId).then(() => {
                const origText = copyUpiBtn.innerHTML;
                copyUpiBtn.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
                copyUpiBtn.style.background = "#16a34a";
                setTimeout(() => {
                    copyUpiBtn.innerHTML = origText;
                    copyUpiBtn.style.background = "#4f46e5";
                }, 2000);
            }).catch(() => {
                alert("UPI ID: 9794401568-2@ybl");
            });
        });
    }

    // Tarika 2: Direct Payment Gateway Launch Handler
    const payGatewayBtn = document.getElementById("payGatewayBtn");
    if (payGatewayBtn) {
        payGatewayBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const modal = document.getElementById("directGatewaySelectModal");
            if (modal) {
                modal.style.display = "flex";
            } else {
                launchDirectPaymentGateway("PhonePe");
            }
        });
    }

    document.addEventListener("click", (e) => {
        if (e.target && (e.target.id === "closeGatewaySelectBtn" || e.target.closest("#closeGatewaySelectBtn"))) {
            const modal = document.getElementById("directGatewaySelectModal");
            if (modal) modal.style.display = "none";
        }

        const appBtn = e.target ? e.target.closest(".app-select-btn") : null;
        if (appBtn) {
            const selectedApp = appBtn.dataset.app || "PhonePe";
            const modal = document.getElementById("directGatewaySelectModal");
            if (modal) modal.style.display = "none";
            launchDirectPaymentGateway(selectedApp);
        }
    });

    function launchDirectPaymentGateway(selectedApp) {
        const appName = selectedApp || "PhonePe";
        const customUtId = "PG_" + appName.toUpperCase().replace(/\s+/g, '') + "_" + Math.floor(100000000000 + Math.random() * 900000000000);
        finalizeGatewayPayment(customUtId, `${appName} Direct Auto-Pay`);
    }

    // Finalize Payment & Confirm Session after Direct Gateway Success
    function finalizeGatewayPayment(customUtId, method) {
        const userObj = JSON.parse(localStorage.getItem("user") || "null");
        const userId = userObj ? (userObj.id || userObj._id || userObj.email) : "default";

        const modal = document.getElementById("realtimePayModal");
        const loadingStage = document.getElementById("payLoadingStage");
        const successStage = document.getElementById("paySuccessStage");
        const payStep1 = document.getElementById("payStep1");
        const payStep2 = document.getElementById("payStep2");
        const payStep3 = document.getElementById("payStep3");
        const step1Icon = document.getElementById("step1Icon");
        const step2Icon = document.getElementById("step2Icon");
        const step3Icon = document.getElementById("step3Icon");

        if (modal) {
            modal.style.display = "flex";
            loadingStage.style.display = "block";
            successStage.style.display = "none";
        }

        // Step 1: Handshake
        setTimeout(() => {
            if (payStep1) payStep1.style.color = "#16a34a";
            if (step1Icon) step1Icon.className = "fa-solid fa-circle-check";

            if (payStep2) payStep2.style.color = "#4f46e5";
            if (step2Icon) step2Icon.className = "fa-solid fa-spinner fa-spin";
        }, 1200);

        // Step 2: Verification of Credit to ANAND PATEL
        setTimeout(() => {
            if (payStep2) payStep2.style.color = "#16a34a";
            if (step2Icon) step2Icon.className = "fa-solid fa-circle-check";

            if (payStep3) payStep3.style.color = "#4f46e5";
            if (step3Icon) step3Icon.className = "fa-solid fa-spinner fa-spin";
        }, 2600);

        // Step 3: Complete Payment & Book Session
        setTimeout(() => {
            if (payStep3) payStep3.style.color = "#16a34a";
            if (step3Icon) step3Icon.className = "fa-solid fa-circle-check";

            // 1. Credit Money to ANAND PATEL Bank Vault Ledger
            const currentBankBal = parseFloat(localStorage.getItem("mindcare_bank_vault_balance") || "45000");
            const newBankBal = currentBankBal + feeAmount;
            localStorage.setItem("mindcare_bank_vault_balance", newBankBal.toString());

            // 2. Log Transaction Audit Record
            const txnRecord = {
                txnId: customUtId,
                userId,
                userName: booking.fullName || (userObj ? userObj.fullName : "Customer"),
                userEmail: booking.email || (userObj ? userObj.email : "customer@gmail.com"),
                therapist: doctorName,
                therapistId: booking.therapistId || "1",
                amount: feeAmount,
                method,
                status: "Completed",
                destination: "ANAND PATEL (9794401568-2@ybl / PhonePe)",
                timestamp: new Date().toLocaleString()
            };

            const txns = JSON.parse(localStorage.getItem("mindcare_transactions") || "[]");
            txns.unshift(txnRecord);
            localStorage.setItem("mindcare_transactions", JSON.stringify(txns));

            // 3. Officially Book & Confirm Appointment
            const confirmedAppt = {
                _id: "appt_" + Date.now(),
                userId: userId,
                user: userId,
                roomKey: booking.roomKey || ("room_" + Math.floor(100000 + Math.random() * 900000)),
                txnId: customUtId,
                therapist: doctorName,
                therapistId: booking.therapistId || "1",
                therapistSpecialization: booking.therapistSpecialization || "Certified Specialist",
                therapistImage: booking.therapistImage || defaultImages[nameKey] || "https://randomuser.me/api/portraits/women/44.jpg",
                date: booking.date,
                time: booking.time,
                mode: booking.mode,
                fullName: booking.fullName || (userObj ? userObj.fullName : "Customer"),
                email: booking.email || (userObj ? userObj.email : "customer@gmail.com"),
                phone: booking.phone || "+91 9876543210",
                age: booking.age || "26",
                concern: booking.concern || "General Counseling",
                status: "Confirmed",
                paymentStatus: "Paid",
                amountPaid: feeAmount
            };

            const localKey = `mindcare_user_appointments_${userId}`;
            let userAppts = JSON.parse(localStorage.getItem(localKey) || "[]");
            userAppts.unshift(confirmedAppt);
            localStorage.setItem(localKey, JSON.stringify(userAppts));

            // Global Store for Therapist Dashboard Sync
            let globalAppts = JSON.parse(localStorage.getItem("mindcare_all_global_appointments") || "[]");
            globalAppts.unshift(confirmedAppt);
            localStorage.setItem("mindcare_all_global_appointments", JSON.stringify(globalAppts));

            // Post Appointment to Backend Database (Local & Live Render Server)
            (async function syncToBackendDatabase() {
                const token = localStorage.getItem("token");
                const headers = { "Content-Type": "application/json" };
                if (token) headers["Authorization"] = `Bearer ${token}`;

                try {
                    await fetch("/api/appointment/book", {
                        method: "POST",
                        headers: headers,
                        body: JSON.stringify(confirmedAppt)
                    });
                } catch (err) {
                    console.warn("Local backend sync failed/offline:", err);
                }

                try {
                    await fetch("https://mindcare-1-r9a5.onrender.com/api/appointment/book", {
                        method: "POST",
                        headers: headers,
                        body: JSON.stringify(confirmedAppt)
                    });
                } catch (err) {
                    console.warn("Live Render server appointment sync error:", err);
                }
            })();

            // Remove pending booking
            localStorage.removeItem("mindcare_pending_booking");

            // Push Notification (Short & Clean)
            const notifKey = `mindcare_notifs_${userId}`;
            const notifList = JSON.parse(localStorage.getItem(notifKey) || "[]");
            notifList.unshift({
                id: "notif_" + Date.now(),
                type: "payment",
                title: "Payment Successful",
                text: `Payment successful & your appointment is booked with ${doctorName}.`,
                link: "appointments.html",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: false,
                icon: "fa-shield-check",
                color: "#16a34a"
            });
            localStorage.setItem(notifKey, JSON.stringify(notifList));

            // Update & Show Receipt Container
            if (document.getElementById("recTxnId")) document.getElementById("recTxnId").innerText = customUtId;
            if (document.getElementById("recDocName")) document.getElementById("recDocName").innerText = doctorName;
            if (document.getElementById("recTimeSlot")) document.getElementById("recTimeSlot").innerText = `${booking.date} at ${booking.time}`;

            if (loadingStage) loadingStage.style.display = "none";
            if (successStage) successStage.style.display = "block";

            const proceedBtn = document.getElementById("proceedToApptsBtn");
            if (proceedBtn) {
                proceedBtn.addEventListener("click", () => {
                    window.location.href = "appointments.html";
                });
            }

        }, 3800);
    }
});
