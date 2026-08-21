// =====================================
// MindCare Therapist Details JS
// =====================================

// Welcome Message
window.addEventListener("load", () => {
    console.log("Therapist Details Page Loaded");
});

// =====================================
// Slot Selection
// =====================================

const slotButtons = document.querySelectorAll(".slots button");

slotButtons.forEach(button => {

    button.addEventListener("click", () => {

        // Remove active class from all buttons
        slotButtons.forEach(btn => {
            btn.classList.remove("active-slot");
            btn.style.background = "#4f46e5";
        });

        // Highlight selected slot
        button.classList.add("active-slot");
        button.style.background = "#16a34a";

        const selectedSlot = button.innerText.trim();
        localStorage.setItem("selectedTimeSlot", selectedSlot);
        alert("Selected Slot: " + selectedSlot);

    });

});

// =====================================
// Smooth Scroll
// =====================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {

    anchor.addEventListener("click", function(e) {

        e.preventDefault();

        const target = document.querySelector(this.getAttribute("href"));

        if(target){

            target.scrollIntoView({
                behavior:"smooth"
            });

        }

    });

});

// =====================================
// Review Animation
// =====================================

const reviews = document.querySelectorAll(".review-card");

const reviewObserver = new IntersectionObserver(entries => {

    entries.forEach(entry => {

        if(entry.isIntersecting){

            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
        }

    });

});

reviews.forEach(review => {

    review.style.opacity = "0";
    review.style.transform = "translateY(40px)";
    review.style.transition = "0.6s";

    reviewObserver.observe(review);

});

// =====================================
// Similar Therapist Hover Effect
// =====================================

const cards = document.querySelectorAll(".similar-card");

cards.forEach(card => {

    card.addEventListener("mouseenter", () => {

        card.style.boxShadow = "0 15px 30px rgba(79,70,229,.25)";

    });

    card.addEventListener("mouseleave", () => {

        card.style.boxShadow = "0 8px 20px rgba(0,0,0,.08)";

    });

});

// =====================================
// Book Appointment Button
// =====================================

const bookBtn = document.querySelector(".book-btn");

if(bookBtn){

    bookBtn.addEventListener("click", () => {

        localStorage.setItem("selectedTherapist", "Dr. Sarah Wilson");
        localStorage.setItem("selectedFee", "799");

        console.log("Therapist Selected");

    });

}

// =====================================
// Availability Status Demo
// =====================================

const status = document.createElement("div");

status.innerHTML = "🟢 Available for Consultation";

status.style.background = "#dcfce7";
status.style.color = "#166534";
status.style.padding = "10px";
status.style.marginTop = "20px";
status.style.borderRadius = "8px";
status.style.fontWeight = "600";

const info = document.querySelector(".doctor-info");

if(info){

    info.appendChild(status);

}

// =====================================
// Console Message
// =====================================

console.log("MindCare Therapist Details JS Loaded Successfully");