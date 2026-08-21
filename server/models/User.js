const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({

    fullName:{
        type:String,
        required:true,
        trim:true
    },

    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true
    },

    password:{
        type:String,
        required:true,
        minlength:6
    },

    phone:{
        type:String,
        required:true
    },

    gender:{
        type:String,
        enum:["Male","Female","Other"],
        default:"Other"
    },

    age:{
        type:Number,
        default:18,
        min:1,
    },

    dob:{
        type:String,
        default:""
    },

    role:{
        type:String,
        enum:["user","therapist","admin"],
        default:"user"
    },

    profileImage:{
        type:String,
        default:""
    },

    isVerified:{
        type:Boolean,
        default:false
    },

    createdAt:{
        type:Date,
        default:Date.now
    }

});

// Hash Password Before Saving

userSchema.pre("save", async function () {

    if (!this.isModified("password")) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

});

// Compare Password

userSchema.methods.comparePassword = async function(password){

    return await bcrypt.compare(password, this.password);

};

module.exports = mongoose.model("User", userSchema);