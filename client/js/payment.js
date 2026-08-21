// =====================================
// MindCare Payment JavaScript
// =====================================

// Coupon Elements
const couponInput = document.querySelector(".coupon input");
const couponBtn = document.querySelector(".coupon button");
const totalAmount = document.querySelector(".total strong");
const payBtn = document.getElementById("payBtn");

// Original Amount
let originalAmount = 1000;
let finalAmount = originalAmount;

// ===============================
// Apply Coupon
// ===============================

couponBtn.addEventListener("click", () => {

    const coupon = couponInput.value.trim().toUpperCase();

    if (coupon === "MINDCARE10") {

        finalAmount = originalAmount - 100;

        totalAmount.innerHTML = "₹" + finalAmount;

        alert("✅ Coupon Applied! ₹100 Discount");

    }

    else if (coupon === "WELCOME20") {

        finalAmount = originalAmount - 200;

        totalAmount.innerHTML = "₹" + finalAmount;

        alert("✅ Coupon Applied! ₹200 Discount");

    }

    else {

        alert("❌ Invalid Coupon Code");

    }

});

// ===============================
// Form Validation
// ===============================

payBtn.addEventListener("click", () => {

    const inputs = document.querySelectorAll("form input");

    let valid = true;

    inputs.forEach(input => {

        if (input.value.trim() === "") {

            valid = false;

            input.style.border = "2px solid red";

        } else {

            input.style.border = "1px solid #ddd";

        }

    });

    if (!valid) {

        alert("Please fill all required fields.");

        return;

    }

    // Save payment details
    localStorage.setItem("paymentAmount", finalAmount);
    localStorage.setItem("paymentStatus", "Success");

    // Loading Simulation
    payBtn.innerHTML = "Processing Payment...";
    payBtn.disabled = true;

    setTimeout(() => {

        alert("🎉 Payment Successful!");

        window.location.href = "payment-success.html";

    }, 2500);

});

// ===============================
// Auto Fill Amount (Optional)
// ===============================

window.addEventListener("load", () => {

    totalAmount.innerHTML = "₹" + finalAmount;

});

// ===============================
// Console Message
// ===============================

console.log("MindCare Payment Module Loaded Successfully");