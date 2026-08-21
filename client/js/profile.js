const token = localStorage.getItem("token");
let user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) {
    window.location.href = "login.html";
}

const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

// Dynamic Age Calculation from DOB
function calculateAgeFromDOB(dobString) {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age >= 0 ? age : 0;
}

function renderProfile(data) {
    if (!data) return;
    document.getElementById("fullName").textContent = data.fullName || "User";
    document.getElementById("email").textContent = data.email || "";
    document.getElementById("userId").textContent = data._id || data.id || "";
    
    // Format DOB
    let dobText = "Not set";
    if (data.dob) {
        const dateObj = new Date(data.dob);
        if (!isNaN(dateObj.getTime())) {
            dobText = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } else {
            dobText = data.dob;
        }
    }
    document.getElementById("dob").textContent = dobText;

    // Calculate Age dynamically from DOB if available, or fallback to data.age
    let computedAge = calculateAgeFromDOB(data.dob);
    if (computedAge === null || computedAge === undefined) {
        computedAge = data.age || "Not set";
    }
    document.getElementById("age").textContent = computedAge !== "Not set" ? `${computedAge} Years` : "Not set";

    document.getElementById("phone").textContent = data.phone || "Not set";
    document.getElementById("gender").textContent = data.gender || "Not set";
    document.getElementById("role").textContent = data.role || "User";

    const avatarElem = document.getElementById("profileAvatar");
    if (avatarElem) {
        avatarElem.src = data.profileImage || defaultAvatar;
    }
}

// Render local first
renderProfile(user);

// Fetch fresh profile from API
async function fetchFreshProfile() {
    try {
        const response = await fetch("https://mindcare-1-r9a5.onrender.com/api/auth/me", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        const res = await response.json();
        if (res.success && res.user) {
            user = res.user;
            renderProfile(res.user);
            localStorage.setItem("user", JSON.stringify(res.user));
        }
    } catch (err) {
        console.warn("Could not fetch remote profile:", err);
    }
}

fetchFreshProfile();

// ================= EDIT PROFILE MODAL & FILE PICKER LOGIC =================
const editModal = document.getElementById("editModal");
const openEditModalBtn = document.getElementById("openEditModalBtn");
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
const editProfileForm = document.getElementById("editProfileForm");

const editPhotoFileInput = document.getElementById("editPhotoFile");
const editPhotoPreview = document.getElementById("editPhotoPreview");
const editNameInput = document.getElementById("editName");
const editDobInput = document.getElementById("editDob");

let uploadedImageData = "";

// Device Image Picker Change Event
if (editPhotoFileInput) {
    editPhotoFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                uploadedImageData = event.target.result;
                if (editPhotoPreview) {
                    editPhotoPreview.src = uploadedImageData;
                    editPhotoPreview.style.display = "block";
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

if (openEditModalBtn && editModal) {
    openEditModalBtn.addEventListener("click", () => {
        uploadedImageData = user.profileImage || "";
        editNameInput.value = user.fullName || "";
        editDobInput.value = user.dob || "";

        if (uploadedImageData && editPhotoPreview) {
            editPhotoPreview.src = uploadedImageData;
            editPhotoPreview.style.display = "block";
        } else if (editPhotoPreview) {
            editPhotoPreview.style.display = "none";
        }

        editModal.style.display = "flex";
    });
}

if (closeEditModalBtn && editModal) {
    closeEditModalBtn.addEventListener("click", () => {
        editModal.style.display = "none";
    });
}

if (editProfileForm) {
    editProfileForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const profileImage = uploadedImageData || user.profileImage || "";
        const fullName = editNameInput.value.trim();
        const dob = editDobInput.value;
        const calculatedAge = calculateAgeFromDOB(dob);

        const updatePayload = {
            profileImage,
            fullName,
            dob
        };
        if (calculatedAge !== null) {
            updatePayload.age = calculatedAge;
        }

        try {
            const res = await fetch("https://mindcare-1-r9a5.onrender.com/api/auth/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(updatePayload)
            });

            const data = await res.json();
            if (data.success) {
                alert("✅ Profile updated successfully!");
                user = data.user;
                localStorage.setItem("user", JSON.stringify(data.user));
                renderProfile(data.user);
                editModal.style.display = "none";
            } else {
                alert("❌ " + data.message);
            }
        } catch (err) {
            console.error("Update Profile Error:", err);
            alert("❌ Server Error");
        }
    });
}

function logout() {
    if (confirm("Are you sure you want to log out?")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "login.html";
    }
}