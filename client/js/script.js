// ==========================
// Mobile Menu Toggle
// ==========================

const menuBtn = document.querySelector(".menu-btn");
const navLinks = document.querySelector(".nav-links");

if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", () => {
        navLinks.classList.toggle("active");
    });

    document.querySelectorAll(".nav-links a").forEach(link => {
        link.addEventListener("click", () => {
            navLinks.classList.remove("active");
        });
    });
}

// ==========================
// Sticky Navbar
// ==========================

const header = document.querySelector("header");

window.addEventListener("scroll", () => {
    if (header) {
        if (window.scrollY > 80) {
            header.style.boxShadow = "0 10px 25px rgba(0,0,0,0.1)";
            header.style.background = "#ffffff";
        } else {
            header.style.boxShadow = "0 3px 15px rgba(0,0,0,.08)";
            header.style.background = "rgba(255,255,255,.9)";
        }
    }
});

// ==========================
// Scroll Animation
// ==========================

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("fade-up");
        }
    });
}, {
    threshold: 0.2
});

document.querySelectorAll(
    ".service-card,.therapist-card,.review,.about-container,.stat"
).forEach(item => observer.observe(item));

// ==========================
// Counter Animation
// ==========================

const counters = document.querySelectorAll(".stat h2");

counters.forEach(counter => {

    const target = parseInt(counter.innerText);

    if (isNaN(target)) return;

    let count = 0;

    const speed = target / 100;

    const updateCounter = () => {

        if (count < target) {

            count += speed;

            counter.innerText = Math.ceil(count);

            requestAnimationFrame(updateCounter);

        } else {

            if (target === 20)
                counter.innerText = "20K+";
            else if (target === 150)
                counter.innerText = "150+";
            else if (target === 24)
                counter.innerText = "24/7";
            else if (target === 98)
                counter.innerText = "98%";
            else
                counter.innerText = target;

        }

    };

    updateCounter();

});

// ==========================
// Smooth Scroll
// ==========================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {

    anchor.addEventListener("click", function (e) {

        const target = document.querySelector(this.getAttribute("href"));

        if (target) {

            e.preventDefault();

            target.scrollIntoView({
                behavior: "smooth"
            });

        }

    });

});

// ==========================
// Auth State Check
// ==========================

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const therapistSession = JSON.parse(localStorage.getItem("mindcare_active_therapist_session") || "null");

    const authNav = document.getElementById("authNav");
    if (authNav) {
        if (therapistSession) {
            // Doctor is logged in -> Doctor Dashboard
            authNav.innerHTML = `<a href="therapist-dashboard.html" class="login-btn" style="background:#5b21b6; color:#ffffff;"><i class="fa-solid fa-user-doctor"></i> Doctor Dashboard</a>`;
        } else if (token || user) {
            // Customer is logged in -> Customer Dashboard
            authNav.innerHTML = `<a href="dashboard.html" class="login-btn" style="background:#16a34a; color:#ffffff;"><i class="fa-solid fa-columns"></i> Dashboard</a>`;
        } else {
            // No session active -> Default Login
            authNav.innerHTML = `<a href="login.html" class="login-btn">Login</a>`;
        }
    }

    // Hide Doctor Portal & Join as Therapist links when ANY customer or doctor is logged in
    const portalLinks = document.querySelectorAll(".portal-links, #therapistPortalLinks, a[href*='therapist-login.html'], a[href*='therapist-apply.html']");
    portalLinks.forEach(elem => {
        if (therapistSession || token || user) {
            elem.style.setProperty("display", "none", "important");
        } else {
            elem.style.display = "";
        }
    });

    const heroBookBtn = document.getElementById("heroBookBtn");
    if (heroBookBtn) {
        heroBookBtn.addEventListener("click", (e) => {
            if (!token) {
                e.preventDefault();
                alert("Please login to your account to book an appointment.");
                window.location.href = "login.html";
            }
        });
    }
});

// ==========================
// Appointment Buttons
// ==========================

document.querySelectorAll(".therapist-card button").forEach(btn => {
    btn.addEventListener("click", () => {
        window.location.href = "therapists.html";
    });
});

// ==========================
// CTA Buttons (Default HTML navigation handles href)
// ==========================


// ==========================
// Back To Top Button
// ==========================

const topBtn = document.createElement("button");

topBtn.innerHTML = "↑";

topBtn.style.position = "fixed";
topBtn.style.bottom = "25px";
topBtn.style.right = "25px";
topBtn.style.width = "50px";
topBtn.style.height = "50px";
topBtn.style.borderRadius = "50%";
topBtn.style.border = "none";
topBtn.style.background = "#4f46e5";
topBtn.style.color = "#fff";
topBtn.style.fontSize = "20px";
topBtn.style.cursor = "pointer";
topBtn.style.display = "none";
topBtn.style.zIndex = "999";

document.body.appendChild(topBtn);

window.addEventListener("scroll", () => {

    if (window.scrollY > 400) {

        topBtn.style.display = "block";

    } else {

        topBtn.style.display = "none";

    }

});

topBtn.addEventListener("click", () => {

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

});

// ==========================
// Dark Mode (Optional)
// ==========================

const darkBtn = document.getElementById("darkMode");

if (darkBtn) {

    darkBtn.addEventListener("click", () => {

        document.body.classList.toggle("dark");

    });

}

console.log("MindCare Frontend Loaded Successfully.");