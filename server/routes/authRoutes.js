const express = require("express");
const router = express.Router();
const { register, login, getProfile, updateProfile } = require("../controllers/authController");
const auth = require("../middleware/auth");

// Register
router.post("/register", register);

// Login
router.post("/login", login);

// Get Profile
router.get("/me", auth, getProfile);

// Update Profile
router.put("/profile", auth, updateProfile);

module.exports = router;