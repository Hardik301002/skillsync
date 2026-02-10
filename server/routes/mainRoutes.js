const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { storage } = require('../config/cloudinary'); // Cloudinary Storage

// Models
const User = require('../models/User'); // Import User Model
const Application = require('../models/Application');
const Company = require('../models/Company');
const Job = require('../models/Job');

// Controllers
const { registerUser, loginUser, updateUserProfile, getAllUsers, deleteUser } = require('../controllers/authController');
const { getRecommendedJobs, getMyApplications, getJobById, createJob, getJobApplications, updateApplicationStatus, deleteJob, deleteApplication, updateJob, getJobStats, getMyPostedJobs, toggleSavedJob, getSavedJobs, getAllJobsAdmin, getPublicJobs } = require('../controllers/jobController');

// Upload Middleware
const upload = multer({ storage: storage });
const cpUpload = upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'resume', maxCount: 1 }]);

// ==========================================
//  AUTH & PROFILE ROUTES
// ==========================================
router.post('/register', registerUser);
router.post('/login', loginUser);

// ✅ FIX: The /me Route (Debugged)
router.get('/me', auth, async (req, res) => {
    try {
        // Find user and explicitly select these fields
        const user = await User.findById(req.user.id).select('-password');
        
        // Debug Log: Check what the server actually sees
        console.log(`🔍 GET /me hit for: ${user?.email}`);
        console.log(`   -> Avatar in DB: ${user?.avatar}`);
        console.log(`   -> Resume in DB: ${user?.resume}`);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user);
    } catch (err) {
        console.error("❌ /me Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// Update Profile
router.put('/profile', auth, cpUpload, updateUserProfile);

// ==========================================
//  COMPANY ROUTES
// ==========================================
router.post('/companies', auth, upload.single('logo'), async (req, res) => {
    try {
        const { name, location, website, description } = req.body;
        const logo = req.file ? req.file.path : ''; 

        const newCompany = new Company({
            name, location, website, description, logo, createdBy: req.user.id
        });

        const company = await newCompany.save();
        res.json(company);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.get('/companies', auth, async (req, res) => {
    try {
        const companies = await Company.find().sort({ createdAt: -1 });
        res.json(companies);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// ==========================================
//  ADMIN ROUTES
// ==========================================
router.get('/admin/users', auth, admin, getAllUsers);     
router.delete('/admin/users/:id', auth, admin, deleteUser); 
router.get('/admin/jobs', auth, admin, getAllJobsAdmin);    

// ==========================================
//  JOB ROUTES
// ==========================================
router.get('/public-jobs', getPublicJobs);
router.get('/recommendations', auth, getRecommendedJobs);
router.get('/stats', auth, getJobStats);
router.get('/my-posted-jobs', auth, getMyPostedJobs);
router.get('/saved-jobs', auth, getSavedJobs);
router.put('/jobs/:id/save', auth, toggleSavedJob);
router.get('/jobs/:id', auth, getJobById);
router.post('/jobs', auth, createJob);
router.delete('/jobs/:id', auth, deleteJob);
router.put('/jobs/:id', auth, updateJob);

// ==========================================
//  APPLICATION ROUTES
// ==========================================
router.get('/applications', auth, getMyApplications);
router.get('/jobs/:jobId/applications', auth, getJobApplications);
router.put('/applications/:id/status', auth, updateApplicationStatus);
router.delete('/applications/:id', auth, deleteApplication);

router.post('/apply', auth, upload.single('resume'), async (req, res) => {
    try {
        const { jobId, jobTitle, company } = req.body;
        const userId = req.user.id;
        const resumePath = req.file ? req.file.path : null; 

        if (!resumePath) return res.status(400).json({ message: "Please upload a Resume (PDF)" });

        const existingApp = await Application.findOne({ user: userId, jobId: jobId });
        if (existingApp) return res.status(400).json({ message: "You have already applied for this job." });

        const newApplication = new Application({
            user: userId, jobId, jobTitle, company, status: 'Applied', resume: resumePath
        });

        await newApplication.save();
        res.json({ message: "Application Submitted Successfully!" });
    } catch (error) { 
        res.status(500).json({ message: "Server Error: " + error.message }); 
    }
});

module.exports = router;