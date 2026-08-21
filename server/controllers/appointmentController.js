const Appointment = require("../models/Appointment");

// ================= Book Appointment =================

exports.bookAppointment = async (req, res) => {
    try {
        const {
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
            concern
        } = req.body;

        if (!therapistId) {
            return res.status(400).json({
                success: false,
                message: "Therapist ID is required"
            });
        }

        const appointment = await Appointment.create({
            user: req.user.id,
            therapistId,
            therapist,
            therapistSpecialization: therapistSpecialization || "",
            therapistImage: therapistImage || "",
            fullName,
            email,
            phone,
            date,
            time,
            mode,
            age,
            concern
        });

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

// ================= Get My Appointments =================

exports.getAppointments = async (req, res) => {

    try {

        const appointments = await Appointment.find({

            user: req.user.id

        }).sort({

            createdAt: -1

        });


        res.json({

            success: true,

            appointments

        });


    } catch (error) {

        console.error("GET APPOINTMENTS ERROR:", error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};


// ================= Cancel Appointment =================

exports.cancelAppointment = async (req, res) => {

    try {

        console.log(
            "CANCEL APPOINTMENT ID:",
            req.params.id
        );


        const appointment =
            await Appointment.findById(
                req.params.id
            );


        if (!appointment) {

            return res.status(404).json({

                success: false,

                message: "Appointment not found"

            });

        }


        // Make sure user can cancel
        // only their own appointment

        if (
            appointment.user.toString() !==
            req.user.id.toString()
        ) {

            return res.status(403).json({

                success: false,

                message: "You are not allowed to cancel this appointment"

            });

        }


        appointment.status = "Cancelled";


        await appointment.save();


        console.log(
            "APPOINTMENT CANCELLED:",
            appointment._id
        );


        res.status(200).json({

            success: true,

            message: "Appointment Cancelled Successfully",

            appointment

        });


    } catch (error) {

        console.log(
            "CANCEL ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};