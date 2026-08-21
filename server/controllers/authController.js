const User = require("../models/User");
const jwt = require("jsonwebtoken");

// ================= Register =================

exports.register = async (req, res) => {
    console.log("Register API Called");
    console.log(req.body);

    try {

        const { fullName, email, password, phone, gender, age } = req.body;

        if (!fullName || !email || !password || !phone) {

            return res.status(400).json({
                success: false,
                message: "All required fields are mandatory."
            });

        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {

            return res.status(400).json({
                success: false,
                message: "Email already exists."
            });

        }

        const user = await User.create({
            fullName,
            email,
            password,
            phone,
            gender,
            age
        });

        res.status(201).json({
            success: true,
            message: "Registration Successful",
            user
        });

    } catch (error) {

        console.error("========== ERROR ==========");
        console.error(error);
        console.error(error.stack);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

// ================= Login =================

exports.login = async (req, res) => {
    console.log("LOGIN API CALLED");
    console.log(req.body);


    try {

        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {

            return res.status(401).json({
                success: false,
                message: "Invalid Password"
            });

        }

        const token = jwt.sign(

            {
                id: user._id,
                role: user.role
            },

            process.env.JWT_SECRET,

            {
                expiresIn: "7d"
            }

        );
        console.log("Login Success");
        console.log(token);
        console.log(user.fullName);

        res.status(200).json({

            success: true,

            message: "Login Successful",

            token,

            user: {

                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role

            }

        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ================= Get Profile =================

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ================= Update Profile & Password =================

exports.updateProfile = async (req, res) => {
    try {
        const { fullName, phone, gender, age, dob, profileImage, currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // If changing password, verify current password
        if (newPassword) {
            if (newPassword.length < 6) {
                return res.status(400).json({ success: false, message: "New password must be at least 6 characters." });
            }
            if (currentPassword) {
                const isMatch = await user.comparePassword(currentPassword);
                if (!isMatch) {
                    return res.status(400).json({ success: false, message: "Current password is incorrect." });
                }
            }
            user.password = newPassword;
        }

        if (fullName) user.fullName = fullName;
        if (phone) user.phone = phone;
        if (gender) user.gender = gender;
        if (age) user.age = age;
        if (dob !== undefined) user.dob = dob;
        if (profileImage !== undefined) user.profileImage = profileImage;

        await user.save();

        res.json({
            success: true,
            message: "Profile updated successfully",
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                gender: user.gender,
                age: user.age,
                dob: user.dob,
                profileImage: user.profileImage,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


