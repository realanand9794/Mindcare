const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const {
    bookAppointment,
    getAllAppointments,
    getTherapistAppointments,
    getAppointments,
    completeAppointment,
    cancelAppointment
} = require("../controllers/appointmentController");

const optionalAuth = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || "mindcare_secret");
            req.user = decoded;
        }
    } catch (e) {}
    next();
};

// ================= BOOK APPOINTMENT =================
router.post("/book", optionalAuth, bookAppointment);

// ================= GET ALL APPOINTMENTS (Therapist Sync) =================
router.get("/all", getAllAppointments);

// ================= GET THERAPIST SCOPED APPOINTMENTS =================
router.get("/therapist/:therapistId", getTherapistAppointments);

// ================= GET MY APPOINTMENTS =================
router.get("/my", optionalAuth, getAppointments);

// ================= COMPLETE APPOINTMENT =================
router.put("/complete/:id", optionalAuth, completeAppointment);

// ================= CANCEL APPOINTMENT =================
router.put("/cancel/:id", optionalAuth, cancelAppointment);

module.exports = router;