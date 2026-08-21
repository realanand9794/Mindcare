const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/User");

const therapists = [
    {
        fullName: "Dr. Sarah Wilson",
        email: "sarah@mindcare.com",
        password: "Sarah@123",
        phone: "9000000001",
        gender: "Female",
        age: 35,
        profileImage: "https://randomuser.me/api/portraits/women/44.jpg"
    },

    {
        fullName: "Dr. David Smith",
        email: "david@mindcare.com",
        password: "David@123",
        phone: "9000000002",
        gender: "Male",
        age: 40,
        profileImage: "https://randomuser.me/api/portraits/men/32.jpg"
    },

    {
        fullName: "Dr. Emily Johnson",
        email: "emily@mindcare.com",
        password: "Emily@123",
        phone: "9000000003",
        gender: "Female",
        age: 33,
        profileImage: "https://randomuser.me/api/portraits/women/68.jpg"
    },

    {
        fullName: "Dr. Michael Brown",
        email: "michael@mindcare.com",
        password: "Michael@123",
        phone: "9000000004",
        gender: "Male",
        age: 45,
        profileImage: "https://randomuser.me/api/portraits/men/45.jpg"
    }
];


const seedTherapists = async () => {

    try {

        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB Connected");


        for (const therapist of therapists) {

            const existing =
                await User.findOne({
                    email: therapist.email
                });


            if (existing) {

                console.log(
                    `${therapist.fullName} already exists`
                );

                continue;

            }


            const user = await User.create({

                fullName: therapist.fullName,

                email: therapist.email,

                password: therapist.password,

                phone: therapist.phone,

                gender: therapist.gender,

                age: therapist.age,

                role: "therapist",

                profileImage: therapist.profileImage

            });


            console.log(
                `Created: ${user.fullName}`
            );

            console.log(
                `Therapist ID: ${user._id}`
            );

        }


        console.log(
            "Therapist seeding completed."
        );

        process.exit(0);

    } catch (error) {

        console.error(
            "Seed Error:",
            error
        );

        process.exit(1);

    }

};


seedTherapists();