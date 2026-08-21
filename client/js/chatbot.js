// =====================================
// MindCare AI Chatbot Engine
// =====================================

const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const emojiBtn = document.getElementById("emojiBtn");
const chatMessages = document.getElementById("chatMessages");

// ===============================
// Send Message Function
// ===============================

function sendMessage() {
    const text = userInput.value.trim();
    if (text === "") return;

    appendUserMessage(text);
    userInput.value = "";

    triggerBotResponse(text);
}

function sendQuickMessage(text) {
    appendUserMessage(text);
    triggerBotResponse(text);
}

function appendUserMessage(text) {
    const userMsg = document.createElement("div");
    userMsg.className = "user-message";
    userMsg.textContent = text;
    chatMessages.appendChild(userMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function triggerBotResponse(userText) {
    // Show Typing Indicator
    const typingIndicator = document.createElement("div");
    typingIndicator.className = "typing-indicator";
    typingIndicator.id = "typingIndicator";
    typingIndicator.innerHTML = `<i class="fa-solid fa-robot"></i> MindCare AI is typing...`;
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Simulate Realistic Response Delay
    setTimeout(() => {
        const indicator = document.getElementById("typingIndicator");
        if (indicator) indicator.remove();

        const botMsg = document.createElement("div");
        botMsg.className = "bot-message";
        botMsg.innerHTML = getBotReply(userText);

        chatMessages.appendChild(botMsg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 700);
}

// ===============================
// Comprehensive Knowledge Engine
// ===============================

function getBotReply(message) {
    const msg = message.toLowerCase().trim();

    // 1. APPOINTMENTS & BOOKING
    if (msg.includes("book") || msg.includes("appointment") || msg.includes("schedule") || msg.includes("session")) {
        return `📅 <strong>How to Book an Appointment on MindCare:</strong><br><br>
1. Visit our <a href='therapists.html' style='color:#4f46e5;font-weight:600;'>Therapists Page</a>.<br>
2. Choose your doctor (e.g. Dr. Sarah Wilson, Dr. David Smith).<br>
3. Select your preferred date, time slot, and session mode (Video Call, Audio, or Chat).<br>
4. Confirm your booking!<br><br>
You can view all your active sessions on your <a href='dashboard.html' style='color:#4f46e5;font-weight:600;'>Dashboard</a>.`;
    }

    // 2. THERAPISTS & DOCTORS
    if (msg.includes("therapist") || msg.includes("doctor") || msg.includes("expert") || msg.includes("sarah") || msg.includes("david") || msg.includes("emily") || msg.includes("michael") || msg.includes("psychologist")) {
        return `👨‍⚕️ <strong>MindCare Certified Specialists:</strong><br><br>
• <strong>Dr. Sarah Wilson</strong> — Clinical Psychologist (CBT, Stress & Anxiety) • <em>₹799 / session</em><br>
• <strong>Dr. David Smith</strong> — Anxiety & Trauma Specialist (Panic, PTSD) • <em>₹999 / session</em><br>
• <strong>Dr. Emily Johnson</strong> — Relationship Counselor (Couples & Family) • <em>₹899 / session</em><br>
• <strong>Dr. Michael Brown</strong> — Depression & Youth Expert (Mood disorders) • <em>₹1099 / session</em><br><br>
👉 <a href='therapists.html' style='color:#4f46e5;font-weight:600;'>Click here to view full profiles & specialization</a>.`;
    }

    // 3. SERVICES
    if (msg.includes("service") || msg.includes("offer") || msg.includes("treatment")) {
        return `🧠 <strong>MindCare Core Services:</strong><br><br>
1. <strong>Anxiety Therapy</strong>: Proven techniques to control panic attacks & constant worry.<br>
2. <strong>Relationship Counseling</strong>: Rebuild communication, trust & intimacy.<br>
3. <strong>Depression Support</strong>: Compassionate 1-on-1 counseling for mood recovery.<br>
4. <strong>Career Guidance</strong>: Overcome workplace burnout & navigate career growth.<br><br>
Explore more on our <a href='index.html#services' style='color:#4f46e5;font-weight:600;'>Home Page Services</a>.`;
    }

    // 4. MESSAGING & LIVE CHAT
    if (msg.includes("chat") || msg.includes("message") || msg.includes("live chat") || msg.includes("talk to therapist")) {
        return `💬 <strong>Live Chat & Messaging Features:</strong><br><br>
• <strong>Live Chat</strong>: Connect instantly in our <a href='live-chat.html' style='color:#4f46e5;font-weight:600;'>Live Chat Room</a>.<br>
• <strong>Direct Messages</strong>: Message your assigned therapist anytime from the <a href='live-chat.html' style='color:#4f46e5;font-weight:600;'>Messages Page</a>.<br>
• All conversations are 100% encrypted & confidential!`;
    }

    // 5. VIDEO CALL
    if (msg.includes("video") || msg.includes("call") || msg.includes("hd call")) {
        return `📹 <strong>HD Video Call Sessions:</strong><br><br>
MindCare allows you to hold face-to-face video therapy sessions from the comfort of your home!<br>
Join your scheduled video call via <a href='video-call.html' style='color:#4f46e5;font-weight:600;'>Video Call Room</a> or your Dashboard.`;
    }

    // 6. DASHBOARD
    if (msg.includes("dashboard") || msg.includes("account") || msg.includes("my profile")) {
        return `📊 <strong>Your MindCare Dashboard:</strong><br><br>
On your <a href='dashboard.html' style='color:#4f46e5;font-weight:600;'>Dashboard</a>, you can:<br>
• Manage upcoming & past appointments<br>
• View real-time notifications<br>
• Access direct messaging & video rooms<br>
• Edit your profile & settings`;
    }

    // 7. DARK MODE
    if (msg.includes("dark mode") || msg.includes("dark theme") || msg.includes("night mode") || msg.includes("theme")) {
        return `🌙 <strong>Dark Theme Support:</strong><br><br>
MindCare features full Dark Mode for comfortable browsing! Click the Moon/Sun icon (🌙/☀️) in the top navbar on any page to toggle between Light & Dark theme.`;
    }

    // 8. CONTACT & EMERGENCY
    if (msg.includes("contact") || msg.includes("phone") || msg.includes("email") || msg.includes("support") || msg.includes("address") || msg.includes("emergency") || msg.includes("help")) {
        return `📞 <strong>MindCare Support & Contact Info:</strong><br><br>
• <strong>Email</strong>: mindcare9794@gmail.com<br>
• <strong>Phone</strong>: +91 9794401568<br>
• <strong>Location</strong>: New Delhi, India<br>
• <strong>Contact Page</strong>: <a href='contact.html' style='color:#4f46e5;font-weight:600;'>Get In Touch</a><br><br>
⚠️ <em>If you or someone you know is in immediate crisis, please contact emergency helpline 112 or national suicide helpline 9152987821 immediately.</em>`;
    }

    // 9. LOGIN / REGISTER
    if (msg.includes("login") || msg.includes("register") || msg.includes("sign in") || msg.includes("sign up") || msg.includes("create account")) {
        return `🔑 <strong>Account Access:</strong><br><br>
• <a href='login.html' style='color:#4f46e5;font-weight:600;'>Login to your MindCare Account</a><br>
• <a href='register.html' style='color:#4f46e5;font-weight:600;'>Register a New Account</a>`;
    }

    // 10. EMOTIONAL WELLNESS: STRESS
    if (msg.includes("stress") || msg.includes("burnout") || msg.includes("overwhelmed") || msg.includes("pressure")) {
        return `🌿 <strong>Tips for Managing Stress & Overwhelm:</strong><br><br>
1. <strong>4-7-8 Breathing</strong>: Inhale for 4s, hold for 7s, exhale slowly for 8s.<br>
2. <strong>Micro-Breaks</strong>: Step away from screens for 5-10 minutes.<br>
3. <strong>Brain Dump</strong>: Write down everything on your mind to declutter.<br><br>
If you'd like professional guidance, <strong>Dr. Sarah Wilson</strong> specializes in CBT & stress management.`;
    }

    // 11. EMOTIONAL WELLNESS: ANXIETY & PANIC
    if (msg.includes("anxiety") || msg.includes("panic") || msg.includes("scared") || msg.includes("anxious") || msg.includes("fear")) {
        return `🧘 <strong>5-4-3-2-1 Grounding Technique for Anxiety:</strong><br><br>
Take a deep breath and name:<br>
👁️ <strong>5 things</strong> you can see around you<br>
🖐️ <strong>4 things</strong> you can touch<br>
👂 <strong>3 things</strong> you can hear<br>
👃 <strong>2 things</strong> you can smell<br>
👅 <strong>1 thing</strong> you can taste<br><br>
You are safe. Our specialist <strong>Dr. David Smith</strong> is also available for anxiety therapy.`;
    }

    // 12. EMOTIONAL WELLNESS: DEPRESSION & SADNESS
    if (msg.includes("depression") || msg.includes("sad") || msg.includes("lonely") || msg.includes("crying") || msg.includes("hopeless") || msg.includes("low")) {
        return `💙 I hear you, and your feelings are completely valid. Please remember you don't have to go through this alone.<br><br>
• Try doing one small gentle thing for yourself (a warm tea, sunshine, or music).<br>
• Sharing your feelings with a professional brings great comfort.<br><br>
<strong>Dr. Michael Brown</strong> specializes in depression recovery. Would you like to check therapist availability on the <a href='therapists.html' style='color:#4f46e5;font-weight:600;'>Therapists Page</a>?`;
    }

    // 13. EMOTIONAL WELLNESS: SLEEP
    if (msg.includes("sleep") || msg.includes("insomnia") || msg.includes("tired") || msg.includes("can't sleep")) {
        return `😴 <strong>Better Sleep Hygiene Tips:</strong><br><br>
• Turn off screens 30–45 minutes before bedtime.<br>
• Keep your bedroom cool and dimly lit.<br>
• Avoid caffeine after 3 PM.<br>
• Try listening to soft ambient sounds or guided breathing.`;
    }

    // 14. RELATIONSHIP
    if (msg.includes("relationship") || msg.includes("partner") || msg.includes("couple") || msg.includes("marriage") || msg.includes("breakup")) {
        return `🤝 Communication and mutual empathy are the core of strong relationships.<br><br>Our relationship specialist <strong>Dr. Emily Johnson</strong> offers supportive couples and family counseling.`;
    }

    // 15. GREETINGS
    if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey") || msg.includes("good morning") || msg.includes("good evening") || msg.includes("namaste")) {
        return `👋 Hello! Welcome to <strong>MindCare AI Assistant</strong>! 😊<br><br>How can I support your mental wellness or guide you through our website today?`;
    }

    // 16. BOT IDENTITY & CAPABILITIES
    if (msg.includes("who are you") || msg.includes("what is your name") || msg.includes("what can you do") || msg.includes("bot")) {
        return `🤖 I am <strong>MindCare AI Assistant</strong>!<br><br>
Here is what I can help you with:<br>
• <strong>Website Navigation</strong>: Booking appointments, therapists list, video calls, live chat & dashboard.<br>
• <strong>Mental Health Support</strong>: Self-care exercises, grounding techniques for stress & anxiety.<br>
• <strong>FAQs</strong>: Contact info, fees, dark mode & services.`;
    }

    // 17. HOW ARE YOU
    if (msg.includes("how are you") || msg.includes("how r u")) {
        return `😊 I'm doing great and happy to help you! How are you feeling today?`;
    }

    // 18. THANK YOU
    if (msg.includes("thank") || msg.includes("thanks") || msg.includes("thx")) {
        return `🌟 You're very welcome! I'm always here whenever you need advice or assistance. Take care of yourself! ❤️`;
    }

    // 19. BYE
    if (msg.includes("bye") || msg.includes("goodbye") || msg.includes("see you")) {
        return `👋 Goodbye! Have a peaceful and joyful day ahead. MindCare is always here for you! ✨`;
    }

    // 20. JOKES / FUN
    if (msg.includes("joke") || msg.includes("laugh") || msg.includes("funny")) {
        return `😄 Here's a little mental health smile for you:<br><br><em>Why did the brain go to therapy? To get a peace of mind!</em> 🧠✨ Hope that brought a small smile to your face!`;
    }

    // DEFAULT FALLBACK
    return `I'm here for you! You can ask me about <strong>booking appointments</strong>, <strong>therapist profiles</strong>, <strong>MindCare services</strong>, <strong>live chat & video calls</strong>, or share how you're feeling for mental wellness tips. 😊`;
}

// ===============================
// Event Listeners
// ===============================

sendBtn.addEventListener("click", sendMessage);

userInput.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
    }
});

emojiBtn.addEventListener("click", () => {
    userInput.value += " 😊";
    userInput.focus();
});

clearBtn.addEventListener("click", () => {
    if (confirm("Clear all chat messages?")) {
        chatMessages.innerHTML = `
        <div class="bot-message">
            👋 Hello! I'm your <strong>MindCare AI Assistant</strong>.
        </div>
        <div class="bot-message">
            I can help you <strong>book appointments</strong>, <strong>find certified therapists</strong>, <strong>explain MindCare features</strong>, or talk through <strong>stress, anxiety, and self-care</strong>. How can I support you today?
        </div>`;
    }
});

window.addEventListener("load", () => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

console.log("MindCare AI Chatbot Engine Loaded Successfully");