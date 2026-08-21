const User = require("../models/User");

// Get all therapists
exports.getTherapists = async (req, res) => {
    try {
        const therapists = await User.find({ role: "therapist" }).select("-password");
        res.json({
            success: true,
            therapists
        });
    } catch (error) {
        console.error("Get Therapists Error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get therapist details by ID
exports.getTherapistById = async (req, res) => {
    try {
        const therapist = await User.findOne({ _id: req.params.id, role: "therapist" }).select("-password");
        if (!therapist) {
            return res.status(404).json({
                success: false,
                message: "Therapist not found"
            });
        }
        res.json({
            success: true,
            therapist
        });
    } catch (error) {
        console.error("Get Therapist By ID Error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
