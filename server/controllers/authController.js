const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail');

const generateToken = (id) => {
    return jwt.sign({ user: { id } }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// 1. REGISTER
exports.registerUser = async (req, res) => {
    const { name, email, password, skills, role } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            name,
            email,
            password: hashedPassword,
            skills: skills ? skills.split(',').map(s => s.trim()) : [],
            role: role || 'user'
        });

        await user.save();

        // Welcome Email
        try {
            await sendEmail({
                email: user.email,
                subject: 'Welcome to SkillSync! 🎉',
                message: `<h1>Welcome, ${user.name}!</h1><p>Your account is ready.</p>`
            });
        } catch (err) { console.error("Email Error:", err.message); }

        res.json({
            token: generateToken(user._id),
            user: { _id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// 2. LOGIN
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        res.json({
            token: generateToken(user._id),
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            skills: user.skills,
            bio: user.bio,
            avatar: user.avatar,
            resume: user.resume
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// 3. UPDATE USER PROFILE (✅ ATOMIC FIX)
exports.updateUserProfile = async (req, res) => {
    try {
        const { name, skills, bio, role } = req.body;
        
        // 1. Build the Update Object
        const updateData = {};
        
        if (name) updateData.name = name;
        if (bio) updateData.bio = bio;
        if (role) updateData.role = role;
        if (skills) {
            updateData.skills = Array.isArray(skills) 
                ? skills 
                : skills.split(',').map(s => s.trim());
        }

        // 2. Handle Cloudinary Files (Atomic Insert)
        if (req.files) {
            if (req.files['avatar']) {
                updateData.avatar = req.files['avatar'][0].path; // Cloudinary URL
            }
            if (req.files['resume']) {
                updateData.resume = req.files['resume'][0].path; // Cloudinary URL
            }
        }

        // 3. Perform Atomic Update
        // { new: true } returns the updated document immediately
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateData },
            { new: true } 
        ).select('-password'); // Exclude password from response

        // 4. Send Response
        res.json({
            token: req.header('x-auth-token'),
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            skills: updatedUser.skills,
            bio: updatedUser.bio,
            avatar: updatedUser.avatar,
            resume: updatedUser.resume
        });

    } catch (err) {
        console.error("Profile Update Error:", err.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

// 4. GET ALL USERS
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ date: -1 }).lean();
        res.json(users);
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

// 5. DELETE USER
exports.deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User Deleted' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
};