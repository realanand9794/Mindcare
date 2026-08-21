const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

// Public Payment Gateway Order & UTR Verification Routes
router.post("/create-order", paymentController.createPaymentOrder);
router.post("/verify-utr", paymentController.verifyPaymentUTR);

// Real-Time Banking Server Webhook Endpoints
router.post("/webhook/razorpay", paymentController.handleRazorpayWebhook);
router.post("/webhook/phonepe", paymentController.handlePhonePeWebhook);

module.exports = router;
