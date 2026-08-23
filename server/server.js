require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const Message = require("./models/Message");

const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from client directory with no-cache headers for instant mobile updates
app.use(express.static(path.join(__dirname, "../client"), {
    etag: false,
    maxAge: 0,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html") || filePath.endsWith(".css") || filePath.endsWith(".js")) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
        }
    }
}));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mindcare")
    .then(() => {
        console.log("MongoDB Connected Successfully");
    })
    .catch(err => {
        console.error("MongoDB Connection Error:", err);
    });

const SYSTEM_BUILD_VERSION = "12.0.0";

// API Health Check Route
app.get("/api/health", (req, res) => {
    res.json({ success: true, message: "MindCare Backend API Running", buildVersion: SYSTEM_BUILD_VERSION });
});

app.get("/api/build-info", (req, res) => {
    res.json({ success: true, buildVersion: SYSTEM_BUILD_VERSION, timestamp: new Date().toISOString() });
});

// ================= SOCKET.IO REAL-TIME CHAT =================

io.on("connection", (socket) => {
    console.log("User Connected:", socket.id);

    // User room join
    socket.on("joinUser", (userId) => {
        if (!userId) return;
        socket.join(userId);
        console.log("User joined room:", userId);
    });

    // WebRTC Real-Time Call Signaling
    socket.on("join-call-room", (data) => {
        const { roomKey, role } = data || {};
        if (roomKey) {
            socket.join(roomKey);
            console.log(`Socket ${socket.id} joined call room: ${roomKey} as ${role || 'participant'}`);
            socket.to(roomKey).emit("user-connected-to-call", { role, socketId: socket.id });
        }
    });

    socket.on("call-offer", (data) => {
        const { roomKey, offer } = data || {};
        if (roomKey) {
            socket.to(roomKey).emit("call-offer", { offer, socketId: socket.id });
        }
    });

    socket.on("call-answer", (data) => {
        const { roomKey, answer } = data || {};
        if (roomKey) {
            socket.to(roomKey).emit("call-answer", { answer, socketId: socket.id });
        }
    });

    socket.on("ice-candidate", (data) => {
        const { roomKey, candidate } = data || {};
        if (roomKey) {
            socket.to(roomKey).emit("ice-candidate", { candidate, socketId: socket.id });
        }
    });

    socket.on("end-call-room", (data) => {
        const { roomKey } = data || {};
        if (roomKey) {
            socket.to(roomKey).emit("call-ended-by-peer");
        }
    });

    // Private message handling & persistence
    socket.on("privateMessage", async (data) => {
        const { senderId, receiverId, message } = data;

        if (!receiverId || !message) {
            return;
        }

        try {
            if (senderId && mongoose.Types.ObjectId.isValid(senderId) && mongoose.Types.ObjectId.isValid(receiverId)) {
                await Message.create({
                    sender: senderId,
                    receiver: receiverId,
                    message: message
                });
            }
        } catch (err) {
            console.error("Socket Message Save Error:", err.message);
        }

        // Emit to receiver room
        io.to(receiverId).emit("privateMessage", {
            senderId,
            receiverId,
            message: message,
            timestamp: new Date()
        });

        // Check if receiver room has active listeners
        const receiverRoom = io.sockets.adapter.rooms.get(receiverId);
        const isReceiverOnline = receiverRoom && receiverRoom.size > 0;

        // Auto-reply simulation if therapist is offline
        if (!isReceiverOnline && senderId) {
            setTimeout(async () => {
                let replyText = "Thank you for your message. I am reviewing your notes and am here to support you!";
                const lower = message.toLowerCase();

                if (lower.includes("hi") || lower.includes("hello") || lower.includes("hey")) {
                    replyText = "Hello! 👋 Thank you for messaging me. How can I assist you with your mental wellness today?";
                } else if (lower.includes("stress") || lower.includes("anxious") || lower.includes("anxiety") || lower.includes("help")) {
                    replyText = "I understand that you're going through a stressful moment. Try taking slow deep breaths. We will address this in our consultation!";
                } else if (lower.includes("appointment") || lower.includes("session") || lower.includes("time")) {
                    replyText = "I'm looking forward to our scheduled session! Feel free to leave any details you'd like us to focus on.";
                } else if (lower.includes("thank")) {
                    replyText = "You're very welcome! Take care of yourself and speak to you soon.";
                }

                try {
                    if (mongoose.Types.ObjectId.isValid(senderId) && mongoose.Types.ObjectId.isValid(receiverId)) {
                        await Message.create({
                            sender: receiverId,
                            receiver: senderId,
                            message: replyText
                        });
                    }
                } catch (e) {
                    console.error("Auto-reply save error:", e.message);
                }

                io.to(senderId).emit("privateMessage", {
                    senderId: receiverId,
                    receiverId: senderId,
                    message: replyText,
                    timestamp: new Date()
                });
            }, 1200);
        }
    });

    socket.on("disconnect", () => {
        console.log("User Disconnected:", socket.id);
    });

});

// Routes
const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const therapistRoutes = require("./routes/therapistRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/appointment", appointmentRoutes);
app.use("/api/therapists", therapistRoutes);
app.use("/api/payment", paymentRoutes);

// Client Route Fallback
app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
        return res.status(404).json({ success: false, message: "API endpoint not found" });
    }
    res.sendFile(path.join(__dirname, "../client/index.html"));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("===== EXPRESS ERROR =====");
    console.error(err.stack);

    res.status(500).json({
        success: false,
        message: err.message
    });
});

// Start Server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server Running on Port ${PORT}`);
});
// Render deployment trigger v1.3.0