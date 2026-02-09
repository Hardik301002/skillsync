const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
// ✅ IMPORT CLOUDINARY STORAGE
const { storage } = require('../config/cloudinary');

// Models
const Application = require('../models/Application');
const Company = require('../models/Company'); // Added for inline company routes
const Job = require('../models/Job'); // Added for job checks

// Controllers
const { registerUser, loginUser, updateUserProfile, getAllUsers, deleteUser } = require('../controllers/authController');
const { getRecommendedJobs, getMyApplications, getJobById, createJob, getJobApplications, updateApplicationStatus, deleteJob, deleteApplication, updateJob, getJobStats, getMyPostedJobs, toggleSavedJob, getSavedJobs, getAllJobsAdmin, getPublicJobs } = require('../controllers/jobController');

// ---------------------------------------------------------
// ☁️ CLOUDINARY STORAGE CONFIG
// ---------------------------------------------------------
// We removed 'diskStorage' and replaced it with the Cloudinary 'storage'
const upload = multer({ storage: storage });

// Fields for Profile Update (Avatar + Resume)
const cpUpload = upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'resume', maxCount: 1 }]);

// ==========================================
//  AUTH & PROFILE ROUTES
// ==========================================
router.post('/register', registerUser);
router.post('/login', loginUser);

// Update Profile (Uses Cloudinary for Avatar/Resume)
// Note: Ensure your updateUserProfile controller uses req.files['avatar'][0].path
router.put('/profile', auth, cpUpload, updateUserProfile);

// ==========================================
//  COMPANY ROUTES (Integrated with Cloudinary)
// ==========================================
// We handle companies here to ensure they use the correct Cloudinary 'upload' middleware
router.post('/companies', auth, upload.single('logo'), async (req, res) => {
    try {
        const { name, location, website, description } = req.body;
        // Cloudinary automatically puts the URL in req.file.path
        const logo = req.file ? req.file.path : ''; 

        const newCompany = new Company({
            name,
            location,
            website,
            description,
            logo,
            createdBy: req.user.id
        });

        const company = await newCompany.save();
        res.json(company);
    } catch (err) {
        console.error("Create Company Error:", err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/companies', auth, async (req, res) => {
    try {
        const companies = await Company.find().sort({ createdAt: -1 });
        res.json(companies);
    } catch (err) {
        console.error(err.message);
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

// Apply for Job (Resume Upload to Cloudinary)
router.post('/apply', auth, upload.single('resume'), async (req, res) => {
    try {
        const { jobId, jobTitle, company } = req.body;
        const userId = req.user.id;
        
        // Cloudinary returns the PDF URL in .path
        const resumePath = req.file ? req.file.path : null; 

        if (!resumePath) return res.status(400).json({ message: "Please upload a Resume (PDF)" });

        const existingApp = await Application.findOne({ user: userId, jobId: jobId });
        if (existingApp) return res.status(400).json({ message: "You have already applied for this job." });

        const newApplication = new Application({
            user: userId,
            jobId,
            jobTitle,
            company,
            status: 'Applied',
            resume: resumePath // Saves the Cloudinary URL
        });

        await newApplication.save();
        res.json({ message: "Application Submitted Successfully!" });
    } catch (error) { 
        console.error("Apply Error:", error); 
        res.status(500).json({ message: "Server Error: " + error.message }); 
    }
});

module.exports = router;