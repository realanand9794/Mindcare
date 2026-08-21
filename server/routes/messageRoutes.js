const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const auth = require("../middleware/auth");

// ================= SEND MESSAGE =================
router.post("/send", auth, messageController.sendMessage);

// ================= GET MY MESSAGES =================
router.get("/my", auth, messageController.getMessages);

// ================= GET CONVERSATION =================
router.get("/conversation/:therapistId", auth, messageController.getConversation);

module.exports = router;