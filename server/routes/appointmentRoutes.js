const express = require("express");

const router = express.Router();

const {
    bookAppointment,
    getAppointments,
    cancelAppointment
} = require("../controllers/appointmentController");

const auth = require("../middleware/auth");


// ================= BOOK APPOINTMENT =================

router.post(
    "/book",
    auth,
    bookAppointment
);


// ================= GET MY APPOINTMENTS =================

router.get(
    "/my",
    auth,
    getAppointments
);


// ================= CANCEL APPOINTMENT =================

router.put(
    "/cancel/:id",
    auth,
    cancelAppointment
);


module.exports = router;