const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.Mixed,
            default: "guest",
        },

        therapistId: {
            type: String,
            default: "",
        },

        therapist: {
            type: String,
            required: true,
        },

        therapistSpecialization: {
            type: String,
            default: "",
        },

        therapistImage: {
            type: String,
            default: "",
        },

        fullName: {
            type: String,
            required: true,
        },

        email: {
            type: String,
            required: true,
        },

        phone: {
            type: String,
            required: true,
        },

        date: {
            type: String,
            required: true,
        },

        time: {
            type: String,
            required: true,
        },

        mode: {
            type: String,
            default: "Video Call",
        },

        age: {
            type: mongoose.Schema.Types.Mixed,
            default: 25,
        },

        concern: {
            type: String,
            default: "",
        },

        status: {
            type: String,
            default: "Confirmed",
        },

        paymentStatus: {
            type: String,
            default: "Paid",
        },

        amountPaid: {
            type: Number,
            default: 999,
        },

        roomKey: {
            type: String,
            default: "",
        },

        attended: {
            type: Boolean,
            default: false,
        },
    },

    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Appointment", appointmentSchema);