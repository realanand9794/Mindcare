// Redirect logged-in users away from register page to home page (index.html)
(function checkLoggedIn() {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (token && user) {
        window.location.replace("index.html");
    }
})();

const form = document.getElementById("registerForm");

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const fullName = document.getElementById("fullName").value;
        const email = document.getElementById("email").value;
        const phone = document.getElementById("phone").value;
        const password = document.getElementById("password").value;
        const gender = document.getElementById("gender").value;
        const age = document.getElementById("age").value;

        try {
            const response = await fetch("http://localhost:5000/api/auth/register", {
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