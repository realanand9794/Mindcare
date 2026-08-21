// =====================================
// MindCare Therapist Login Script
// =====================================

document.addEventListener("DOMContentLoaded", () => {
    const therapistEmail = document.getElementById("therapistEmail");
    const therapistPassword = document.getElementById("therapistPassword");
    const form = document.getElementById("therapistLoginForm");
    const defaultDoctors = {
        "dr.sarah@mindcare.com": {
            name: "Dr. Sarah Wilson",
            email: "dr.sarah@mindcare.com",
            specialization: "Clinical Psychologist",
            experience: "8 Years",
            image: "https://randomuser.me/api/portraits/women/44.jpg"
        },
        "dr.david@mindcare.com": {
            name: "Dr. David Smith",
            email: "dr.david@mindcare.com",
            specialization: "Anxiety Specialist",
            experience: "10 Years",
            image: "https://randomuser.me/api/portraits/men/32.jpg"
        },
        "dr.emily@mindcare.com": {
            name: "Dr. Emily Johnson",
            email: "dr.emily@mindcare.com",
            specialization: "Relationship Counselor",
            experience: "7 Years",
            image: "https://randomuser.me/api/portraits/women/68.jpg"
        },
        "dr.michael@mindcare.com": {
            name: "Dr. Michael Brown",
            email: "dr.michael@mindcare.com",
            specialization: "Depression Expert",
            experience: "12 Years",
            image: "https://randomuser.me/api/portraits/men/45.jpg"
        }
    };

    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = therapistEmail.value.trim().toLowerCase();

            // Check core doctors or newly approved doctors
            let doctorProfile = defaultDoctors[email];

            if (!doctorProfile) {
                const approvedList = JSON.parse(localStorage.getItem("mindcare_approved_therapists") || "[]");
                const found = approvedList.find(d => (d.email || "").toLowerCase() === email);
                if (found) {
                    doctorProfile = {
                        name: found.name,
                        email: found.email,
                        specialization: found.specialization,
                        experience: found.experience,
                        image: found.image
                    };
                }
            }

            // Fallback for custom emails
            if (!doctorProfile) {
                const parts = email.split("@")[0].replace(".", " ");
                const formattedName = "Dr. " + parts.charAt(0).toUpperCase() + parts.slice(1);
                doctorProfile = {
                    name: formattedName,
                    email: email,
                    specialization: "Certified Specialist",
                    experience: "5 Years",
                    image: "https://randomuser.me/api/portraits/women/68.jpg"
                };
            }

            // Extract expected firstname@123 password
            let doctorFirstName = "";
            if (doctorProfile && doctorProfile.name) {
                const nameWithoutDr = doctorProfile.name.replace(/^Dr\.\s*/i, "").trim();
                doctorFirstName = nameWithoutDr.split(" ")[0].toLowerCase();
            } else {
                const emailPrefix = email.split("@")[0].replace(/^dr\./i, "");
                doctorFirstName = emailPrefix.split(".")[0].toLowerCase();
            }

            const expectedPassword = `${doctorFirstName}@123`;
            const enteredPassword = (therapistPassword ? therapistPassword.value : "").trim().toLowerCase();

            if (enteredPassword !== expectedPassword) {
                alert(`❌ Invalid Doctor Password!\n\nFor ${doctorProfile.name}, the password must be: ${expectedPassword}`);
                return;
            }

            // Save active therapist login session
            localStorage.setItem("mindcare_active_therapist_session", JSON.stringify(doctorProfile));

            alert(`🎉 Login Successful!\nWelcome to Doctor Portal, ${doctorProfile.name}.`);
            window.location.href = "therapist-dashboard.html";
        });
    }
});
