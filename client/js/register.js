// Redirect logged-in users away from register page to home page (index.html)
(function checkLoggedIn() {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (token && user) {
        window.location.replace("index.html");
    }
})();

// Toggle password visibility
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");
if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", () => {
        const isPassword = passwordInput.type === "password";
        passwordInput.type = isPassword ? "text" : "password";
        togglePassword.innerHTML = isPassword 
            ? '<i class="fa-solid fa-eye-slash"></i>' 
            : '<i class="fa-solid fa-eye"></i>';
    });
}

// Toggle confirm password visibility
const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
if (toggleConfirmPassword && confirmPasswordInput) {
    toggleConfirmPassword.addEventListener("click", () => {
        const isPassword = confirmPasswordInput.type === "password";
        confirmPasswordInput.type = isPassword ? "text" : "password";
        toggleConfirmPassword.innerHTML = isPassword 
            ? '<i class="fa-solid fa-eye-slash"></i>' 
            : '<i class="fa-solid fa-eye"></i>';
    });
}

const form = document.getElementById("registerForm");

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const fullName = document.getElementById("fullName").value;
        const email = document.getElementById("email").value;
        const phone = document.getElementById("phone").value;
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword") ? document.getElementById("confirmPassword").value : "";
        const gender = document.getElementById("gender").value;
        const age = document.getElementById("age").value;

        if (confirmPassword && password !== confirmPassword) {
            alert("Passwords do not match. Please check and try again.");
            return;
        }

        try {
            const response = await fetch("https://mindcare-1-r9a5.onrender.com/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    fullName,
                    email,
                    phone,
                    password,
                    gender,
                    age
                })
            });

            const data = await response.json();

            if (data.success) {
                alert("Registration Successful! Please login.");
                window.location.replace("login.html");
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.log(error);
            alert("Server Error. Please try again later.");
        }
    });
}