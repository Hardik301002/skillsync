const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Generate Token
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

// 3. UPDATE USER PROFILE (THE FIX)
exports.updateUserProfile = async (req, res) => {
    console.log("🔥 Update Request Received"); // Debug Log

    try {
        const { name, skills, bio, role } = req.body;
        
        // Build the update object
        const updateFields = {};
        if (name) updateFields.name = name;
        if (bio) updateFields.bio = bio;
        if (role) updateFields.role = role;
        
        if (skills) {
            updateFields.skills = Array.isArray(skills) 
                ? skills 
                : skills.split(',').map(s => s.trim());
        }

        // Handle Cloudinary Files
        if (req.files) {
            console.log("📂 Files detected:", req.files); // Debug Log
            if (req.files['avatar']) {
                updateFields.avatar = req.files['avatar'][0].path;
            }
            if (req.files['resume']) {
                updateFields.resume = req.files['resume'][0].path;
            }
        }

        // FORCE DATABASE UPDATE
        // This command tells MongoDB: "Find this ID and force these fields to change"
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateFields },
            { new: true, runValidators: true } // Return the NEW data
        ).select('-password');

        console.log("✅ Database Updated:", updatedUser); // Debug Log

        res.json(updatedUser);

    } catch (err) {
        console.error("❌ Profile Update Error:", err.message);
        res.status(500).json({ message: 'Server Error: ' + err.message });
    }
};

// 4. GET ALL USERS (Admin)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

// 5. DELETE USER (Admin)
exports.deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User Deleted' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
};