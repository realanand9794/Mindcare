const defaultTherapists = [
    {
        _id: "6a78165a3a71597db20c7cf1",
        fullName: "Dr. Sarah Wilson",
        specialization: "Clinical Psychologist",
        experience: "8 Years",
        rating: "4.9",
        fee: "999",
        profileImage: "https://randomuser.me/api/portraits/women/44.jpg"
    },
    {
        _id: "6a78165a3a71597db20c7cf2",
        fullName: "Dr. David Smith",
        specialization: "Anxiety Specialist",
        experience: "10 Years",
        rating: "4.8",
        fee: "999",
        profileImage: "https://randomuser.me/api/portraits/men/32.jpg"
    },
    {
        _id: "6a78165a3a71597db20c7cf3",
        fullName: "Dr. Emily Johnson",
        specialization: "Relationship Counselor",
        experience: "7 Years",
        rating: "5.0",
        fee: "999",
        profileImage: "https://randomuser.me/api/portraits/women/68.jpg"
    },
    {
        _id: "6a78165b3a71597db20c7cf4",
        fullName: "Dr. Michael Brown",
        specialization: "Depression Expert",
        experience: "12 Years",
        rating: "4.7",
        fee: "999",
        profileImage: "https://randomuser.me/api/portraits/men/45.jpg"
    }
];

let allTherapists = [];

async function loadTherapists() {
    const container = document.getElementById("therapistContainer");
    if (!container) return;

    container.innerHTML = `<p style="text-align:center; padding: 20px;">Loading therapists...</p>`;

    try {
        const response = await fetch("https://mindcare-1-r9a5.onrender.com/api/therapists");
        const data = await response.json();

        if (data.success && data.therapists && data.therapists.length > 0) {
            allTherapists = data.therapists.map((t, idx) => ({
                _id: t._id,
                fullName: t.fullName,
                specialization: t.specialization || defaultTherapists[idx % defaultTherapists.length].specialization,
                experience: t.experience || defaultTherapists[idx % defaultTherapists.length].experience,
                rating: t.rating || defaultTherapists[idx % defaultTherapists.length].rating,
                fee: t.fee || defaultTherapists[idx % defaultTherapists.length].fee,
                profileImage: t.profileImage || defaultTherapists[idx % defaultTherapists.length].profileImage
            }));
        } else {
            allTherapists = [...defaultTherapists];
        }
    } catch (err) {
        console.warn("Using fallback therapists data due to server/offline:", err);
        allTherapists = [...defaultTherapists];
    }

    // Merge Admin-Approved newly hired therapists
    const approvedTherapists = JSON.parse(localStorage.getItem("mindcare_approved_therapists") || "[]");
    if (approvedTherapists.length > 0) {
        const approvedFormatted = approvedTherapists.map(t => ({
            _id: t._id,
            fullName: t.name,
            specialization: t.specialization,
            experience: t.experience,
            rating: t.rating || "5.0",
            fee: t.fee || "999",
            profileImage: t.image
        }));
        allTherapists = [...allTherapists, ...approvedFormatted];
    }

    renderTherapists(allTherapists);
}

function renderTherapists(list) {
    const container = document.getElementById("therapistContainer");
    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding: 20px;">No therapists match your filter.</p>`;
        return;
    }

    list.forEach(t => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <img src="${t.profileImage}" alt="${t.fullName}">
            <h2>${t.fullName}</h2>
            <p>${t.specialization}</p>
            <p>⭐ ${t.rating} | ${t.experience} Experience</p>
            <h3>₹${t.fee} / Session</h3>
            <button onclick="bookTherapist(
                '${t._id}',
                '${t.fullName}',
                '${t.specialization}',
                '${t.experience}',
                '${t.rating}',
                '${t.fee}',
                '${t.profileImage}'
            )">Book Now</button>
        `;
        container.appendChild(card);
    });
}

function bookTherapist(id, name, specialization, experience, rating, fee, image) {
    const token = localStorage.getItem("token") || localStorage.getItem("user");
    if (!token) {
        alert("Please login to your account to book an appointment.");
        window.location.href = "login.html";
        return;
    }

    localStorage.setItem("therapistId", id);
    localStorage.setItem("therapistName", name);
    localStorage.setItem("therapistSpecialization", specialization);
    localStorage.setItem("therapistExperience", experience);
    localStorage.setItem("therapistRating", rating);
    localStorage.setItem("therapistFee", fee);
    localStorage.setItem("therapistImage", image);

    window.location.href = "appointment.html";
}

// Search & Filter listeners
document.addEventListener("DOMContentLoaded", () => {
    loadTherapists();

    const searchInput = document.getElementById("searchInput");
    const specialization = document.getElementById("specialization");

    if (searchInput) {
        searchInput.addEventListener("keyup", () => {
            filterTherapists();
        });
    }

    if (specialization) {
        specialization.addEventListener("change", () => {
            filterTherapists();
        });
    }
});

function filterTherapists() {
    const searchVal = document.getElementById("searchInput")?.value.toLowerCase() || "";
    const specVal = document.getElementById("specialization")?.value.toLowerCase() || "all";

    const filtered = allTherapists.filter(t => {
        const matchesName = t.fullName.toLowerCase().includes(searchVal);
        const matchesSpec = specVal === "all" || t.specialization.toLowerCase().includes(specVal);
        return matchesName && matchesSpec;
    });

    renderTherapists(filtered);
}