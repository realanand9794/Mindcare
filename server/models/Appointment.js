const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        therapistId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
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
            enum: [
                "Video Call",
                "Voice Call",
                "Live Chat"
            ],
            default: "Video Call",
        },

        age: {
            type: Number,
            required: true,
        },

        concern: {
            type: String,
            default: "",
        },

        status: {
            type: String,
            enum: [
                "Pending",
                "Confirmed",
                "Cancelled"
            ],
            default: "Pending",
        },
    },

    {
        timestamps: true,
    }
);

module.exports =
    mongoose.model(
        "Appointment",
        appointmentSchema
    );