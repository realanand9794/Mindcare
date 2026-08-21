const token = localStorage.getItem("token");
let user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) {
    alert("Please login first.");
    window.location.href = "login.html";
}

// Prefill Form
document.addEventListener("DOMContentLoaded", async () => {
    if (document.getElementById("email")) document.getElementById("email").value = user.email || "";
    if (document.getElementById("phone")) document.getElementById("phone").value = user.phone || "";
    if (document.getElementById("gender")) document.getElementById("gender").value = user.gender || "Other";

    // Fetch fresh user profile from backend
    try {
        const response = await fetch("https://mindcare-1-r9a5.onrender.com/api/auth/me", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        const data = await response.json();
        if (data.success && data.user) {
            user = data.user;
            if (document.getElementById("email")) document.getElementById("email").value = data.user.email || "";
            if (document.getElementById("phone")) document.getElementById("phone").value = data.user.phone || "";
            if (document.getElementById("gender")) document.getElementById("gender").value = data.user.gender || "Other";

            localStorage.setItem("user", JSON.stringify(data.user));
        }
    } catch (err) {
        console.warn("Could not fetch remote profile details:", err);
    }
});

// Update Account & Password Submit
document.getElementById("settingsForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const phone = document.getElementById("phone").value.trim();
    const gender = document.getElementById("gender").value;
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword) {
        if (newPassword.length < 6) {
            alert("New password must be at least 6 characters long.");
            return;
        }
        if (newPassword !== confirmPassword) {
            alert("New passwords do not match. Please re-check.");
            return;
        }
    }

    try {
        const response = await fetch("https://mindcare-1-r9a5.onrender.com/api/auth/profile", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                phone,
                gender,
                currentPassword: currentPassword || undefined,
                newPassword: newPassword || undefined
            })
        });

        const data = await response.json();

        if (data.success) {
            alert("✅ Account & Password updated successfully!");
            localStorage.setItem("user", JSON.stringify(data.user));
            window.location.href = "profile.html";
        } else {
            alert("❌ " + data.message);
        }
    } catch (err) {
        console.error("Account Update Error:", err);
        alert("❌ Server Error");
    }
});
