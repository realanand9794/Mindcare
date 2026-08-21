const Message = require("../models/Message");

// ================= SEND MESSAGE =================

exports.sendMessage = async (req, res) => {
    try {
        const { receiver, message } = req.body;

        if (!receiver || !message) {
            return res.status(400).json({
                success: false,
                message: "Receiver and message are required"
            });
        }

        const newMessage = await Message.create({
            sender: req.user.id,
            receiver,
            message
        });

        res.status(201).json({
            success: true,
            message: "Message Sent Successfully",
            data: newMessage
        });
    } catch (error) {
        console.error("Send Message Error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ================= GET MY MESSAGES =================

exports.getMessages = async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { sender: req.user.id },
                { receiver: req.user.id }
            ]
        })
            .populate("sender", "fullName email")
            .populate("receiver", "fullName email")
            .sort({ createdAt: 1 });

        res.json({
            success: true,
            messages
        });
    } catch (error) {
        console.error("Get Messages Error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ================= GET CONVERSATION WITH THERAPIST =================

exports.getConversation = async (req, res) => {
    try {
        const { therapistId } = req.params;
        const messages = await Message.find({
            $or: [
                { sender: req.user.id, receiver: therapistId },
                { sender: therapistId, receiver: req.user.id }
            ]
        })
            .populate("sender", "fullName email profileImage")
            .populate("receiver", "fullName email profileImage")
            .sort({ createdAt: 1 });

        res.json({
            success: true,
            messages
        });
    } catch (error) {
        console.error("Get Conversation Error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};