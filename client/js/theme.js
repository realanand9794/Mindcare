// Global Theme Manager for MindCare
(function applyThemeImmediately() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
        if (document.body) {
            document.body.classList.add("dark");
        }
    }
})();

function initThemeToggle() {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark";

    if (isDark) {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");
    } else {
        document.documentElement.classList.remove("dark");
        document.body.classList.remove("dark");
    }

    const darkBtn = document.getElementById("darkBtn");
    if (darkBtn) {
        updateDarkBtnIcon(darkBtn, document.body.classList.contains("dark"));

        // Remove old click listeners by cloning
        const newDarkBtn = darkBtn.cloneNode(true);
        darkBtn.parentNode.replaceChild(newDarkBtn, darkBtn);

        newDarkBtn.addEventListener("click", () => {
            document.body.classList.toggle("dark");
            document.documentElement.classList.toggle("dark");

            const activeDark = document.body.classList.contains("dark");
            localStorage.setItem("theme", activeDark ? "dark" : "light");
            updateDarkBtnIcon(newDarkBtn, activeDark);
        });
    }
}

function updateDarkBtnIcon(btn, isDark) {
    const icon = btn.querySelector("i");
    if (icon) {
        if (isDark) {
            icon.className = "fa-solid fa-sun";
            btn.title = "Switch to Light Mode";
        } else {
            icon.className = "fa-solid fa-moon";
            btn.title = "Switch to Dark Mode";
        }
    }
}

document.addEventListener("DOMContentLoaded", initThemeToggle);
