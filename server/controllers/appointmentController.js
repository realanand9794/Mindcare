const Appointment = require("../models/Appointment");

// ================= Book Appointment =================
exports.bookAppointment = async (req, res) => {
    try {
        const {
            user,
            userId,
            fullName,
            email,
            phone,
            therapist,
            therapistId,
            therapistSpecialization,
            therapistImage,
            date,
            time,
            mode,
            age,
            concern,
            status,
            paymentStatus,
            amountPaid,
            roomKey
        } = req.body;

        const effectiveUser = (req.user && req.user.id) ? req.user.id : (user || userId || "guest");
        const effectiveTherapistId = therapistId || "default_therapist";
        const effectiveTherapist = therapist || "Dr. Sarah Wilson";

        const appointment = await Appointment.create({
            user: effectiveUser,
            therapistId: effectiveTherapistId,
            therapist: effectiveTherapist,
            therapistSpecialization: therapistSpecialization || "Certified Specialist",
            therapistImage: therapistImage || "",
            fullName: fullName || "Patient",
            email: email || "patient@gmail.com",
            phone: phone || "",
            date: date || new Date().toISOString().split("T")[0],
            time: time || "10:00 AM",
            mode: mode || "Video Call",
            age: age || 25,
            concern: concern || "General Counseling",
            status: status || "Confirmed",
            paymentStatus: paymentStatus || "Paid",
            amountPaid: amountPaid || 999,
            roomKey: roomKey || ("room_" + Math.floor(100000 + Math.random() * 900000)),
            attended: false
        });

        if (req.io) {
            req.io.emit("appointment-booked", appointment);
        }

        res.status(201).json({
            success: true,
            message: "Appointment Booked Successfully",
            appointment
        });

    } catch (error) {
        console.error("BOOK APPOINTMENT ERROR:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ================= Get All Appointments (for Therapist Dashboard & Sync) =================
exports.getAllAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find({}).sort({ createdAt: -1 });
        res.json({
            success: true,
            appointments
        });
    } catch (error) {
        console.error("GET ALL APPOINTMENTS ERROR:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ================= Get Therapist Scoped Appointments =================
exports.getTherapistAppointments = async (req, res) => {
    try {
        const { therapistId } = req.params;
        const appointments = await Appointment.find({
            $or: [
                { therapistId: therapistId },
                { therapist: { $regex: therapistId, $options: "i" } }
            ]
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            appointments
        });
    } catch (error) {
        console.error("GET THERAPIST APPOINTMENTS ERROR:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ================= Get My Appointments (Patient View) =================
exports.getAppointments = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;
        let query = {};
        if (userId) {
            query = { user: userId };
        } else {
            query = {};
        }

        const appointments = await Appointment.find(query).sort({ createdAt: -1 });
        res.json({
            success: true,
            appointments
        });
    } catch (error) {
        console.error("GET MY APPOINTMENTS ERROR:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ================= Complete Session =================
exports.completeAppointment = async (req, res) => {
    try {
        const id = req.params.id;
        let appointment = null;

        if (mongoose.Types.ObjectId.isValid(id)) {
            appointment = await Appointment.findById(id);
        }

        if (!appointment) {
            appointment = await Appointment.findOne({
                $or: [
                    { roomKey: id },
                    { txnId: id }
                ]
            });
        }

        if (!appointment) {
            await Appointment.updateMany(
                { $or: [{ roomKey: id }, { txnId: id }] },
                { $set: { attended: true, status: "Therapy Session Completed" } }
            );
            return res.status(200).json({
                success: true,
                message: "Therapy session marked as completed"
            });
        }

        appointment.attended = true;
        appointment.status = "Therapy Session Completed";
        await appointment.save();

        res.status(200).json({
            success: true,
            message: "Therapy session marked as completed",
            appointment
        });
    } catch (error) {
        console.error("COMPLETE APPOINTMENT ERROR:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ================= Cancel Appointment =================
exports.cancelAppointment = async (req, res) => {
    try {
        const id = req.params.id;
        let appointment = null;

        if (mongoose.Types.ObjectId.isValid(id)) {
            appointment = await Appointment.findById(id);
        }

        if (!appointment) {
            appointment = await Appointment.findOne({
                $or: [
                    { roomKey: id },
                    { txnId: id }
                ]
            });
        }

        if (!appointment) {
            await Appointment.updateMany(
                { $or: [{ roomKey: id }, { txnId: id }] },
                { $set: { status: "Cancelled" } }
            );
            return res.status(200).json({
                success: true,
                message: "Appointment Cancelled Successfully"
            });
        }

        appointment.status = "Cancelled";
        await appointment.save();

        res.status(200).json({
            success: true,
            message: "Appointment Cancelled Successfully",
            appointment
        });
    } catch (error) {
        console.error("CANCEL ERROR:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};