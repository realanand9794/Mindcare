// Redirect logged-in users away from login page to home page (index.html)
(function checkLoggedIn() {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (token && user) {
        window.location.replace("index.html");
    }
})();

const form = document.getElementById("loginForm");

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetch("https://mindcare-1-r9a5.onrender.com/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));

                alert("Login Successful!");
                // Replace login.html in browser history with index.html
                window.location.replace("index.html");
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.log(error);
            alert("Server Error. Please try again later.");
        }
    });
}
