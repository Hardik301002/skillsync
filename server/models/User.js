const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    skills: { type: [String], default: [] },
    bio: { type: String, default: '' },
    
    // ✅ FIX: This line allows 'candidate' and 'user' roles to be saved
    role: { 
        type: String, 
        enum: ['user', 'candidate', 'recruiter', 'admin'], 
        default: 'user' 
    },
    
    // ✅ FIX: These store the Cloudinary Links
    avatar: { type: String, default: '' },
    resume: { type: String, default: '' },
    
    savedJobs: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Job' 
    }],
    
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);