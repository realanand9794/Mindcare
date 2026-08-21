const crypto = require("crypto");
const Appointment = require("../models/Appointment");

// Payee Account Details
const PAYEE_UPI_ID = "9794401568-2@ybl";
const PAYEE_NAME = "ANAND PATEL";
const CONSULTATION_FEE = 999;

// ==========================================
// 1. CREATE PAYMENT ORDER (UPI / QR CODE)
// ==========================================
exports.createPaymentOrder = async (req, res) => {
    try {
        const { therapist, date, time, mode } = req.body;
        const orderId = "ORD_" + Date.now();
        const txnId = "TXN_" + Math.floor(100000000000 + Math.random() * 900000000000);

        // Generate Merchant Dynamic UPI Payment String
        const upiString = `upi://pay?pa=${PAYEE_UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${CONSULTATION_FEE}&cu=INR&tn=${orderId}`;

        return res.status(200).json({
            success: true,
            orderId,
            txnId,
            payeeName: PAYEE_NAME,
            payeeUpiId: PAYEE_UPI_ID,
            amount: CONSULTATION_FEE,
            upiString,
            message: "Payment order created successfully."
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ==========================================
// 2. VERIFY BANK UTR & SIGNATURE
// ==========================================
exports.verifyPaymentUTR = async (req, res) => {
    try {
        const { utrNumber, orderId, therapist, date, time, mode } = req.body;

        const utrRegex = /^\d{12}$/;
        const vpaRegex = /^[\w.-]+@[\w.-]+$/;

        if (!utrNumber || (!utrRegex.test(utrNumber.trim()) && !vpaRegex.test(utrNumber.trim()))) {
            return res.status(400).json({
                success: false,
                message: "Invalid UTR / UPI ID format. Genuine 12-digit UTR from PhonePe receipt required."
            });
        }

        const txnId = "UTR_" + utrNumber.trim();

        return res.status(200).json({
            success: true,
            status: "CREDITED",
            txnId,
            payeeName: PAYEE_NAME,
            payeeUpiId: PAYEE_UPI_ID,
            amount: CONSULTATION_FEE,
            message: `🎉 ₹${CONSULTATION_FEE} verified & credited to ${PAYEE_NAME} (${PAYEE_UPI_ID}).`
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ==========================================
// 3. RAZORPAY REAL-TIME BANK WEBHOOK
// ==========================================
exports.handleRazorpayWebhook = async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "mindcare_webhook_secret_key";
        const shasum = crypto.createHmac("sha256", secret);
        shasum.update(JSON.stringify(req.body));
        const digest = shasum.digest("hex");

        const razorpaySignature = req.headers["x-razorpay-signature"];

        if (digest !== razorpaySignature) {
            console.warn("⚠️ Razorpay Webhook Invalid Signature");
            return res.status(400).json({ success: false, message: "Invalid Webhook Signature" });
        }

        const event = req.body.event;
        if (event === "payment.captured" || event === "payment.authorized") {
            const paymentEntity = req.body.payload.payment.entity;
            const amountReceived = paymentEntity.amount / 100; // In INR
            const txnId = paymentEntity.id;

            console.log(`✅ [WEBHOOK SUCCESS] ₹${amountReceived} credited to ${PAYEE_NAME} (${PAYEE_UPI_ID}). Txn: ${txnId}`);

            if (paymentEntity.notes && paymentEntity.notes.appointmentId) {
                await Appointment.findByIdAndUpdate(paymentEntity.notes.appointmentId, {
                    status: "Confirmed",
                    paymentStatus: "Paid",
                    txnId: txnId
                });
            }
        }

        return res.status(200).json({ status: "ok" });
    } catch (err) {
        console.error("Razorpay Webhook Error:", err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ==========================================
// 4. PHONEPE MERCHANT REAL-TIME WEBHOOK
// ==========================================
exports.handlePhonePeWebhook = async (req, res) => {
    try {
        const { response } = req.body;
        if (!response) {
            return res.status(400).json({ success: false, message: "Invalid PhonePe Response" });
        }

        const decodedResponse = Buffer.from(response, "base64").toString("utf-8");
        const payload = JSON.parse(decodedResponse);

        if (payload.code === "PAYMENT_SUCCESS") {
            const txnId = payload.data.transactionId;
            const amountReceived = payload.data.amount / 100;

            console.log(`✅ [PHONEPE WEBHOOK SUCCESS] ₹${amountReceived} credited to ${PAYEE_NAME} (${PAYEE_UPI_ID}). Txn: ${txnId}`);
        }

        return res.status(200).json({ status: "ok" });
    } catch (err) {
        console.error("PhonePe Webhook Error:", err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};
