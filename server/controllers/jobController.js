const Job = require('../models/Job');
const User = require('../models/User');
const Application = require('../models/Application');
const sendEmail = require('../utils/sendEmail');

// ---------------------------------------------------------
// 1. GET RECOMMENDED JOBS (Fixed: Returns Simple List)
// ---------------------------------------------------------
exports.getRecommendedJobs = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).lean();
        const { search } = req.query; 

        // 1. Check if DB is empty & Auto-Seed (Just in case)
        const totalJobs = await Job.countDocuments();
        if (totalJobs === 0) {
            await exports.seedRealJobs(req, res); // Call seeder if empty
            return; // The seeder sends the response
        }

        let query = {};
        if (search) {
            query = {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { company: { $regex: search, $options: 'i' } },
                    { location: { $regex: search, $options: 'i' } },
                    { requiredSkills: { $regex: search, $options: 'i' } }
                ]
            };
        }

        // 2. Fetch Jobs (Newest First)
        // We removed the complex pagination object to match your Homepage logic
        const jobs = await Job.find(query)
            .sort({ postedAt: -1 }) 
            .limit(20) // Show top 20 relevant jobs
            .lean();

        // 3. Calculate Match Percentage (Optional Visual)
        const userSkills = user && user.skills ? user.skills.map(s => s.toLowerCase().trim()) : [];

        let recommendations = jobs.map(job => {
            const jobSkills = (job.requiredSkills || []).map(s => s.toLowerCase().trim());
            
            // Avoid division by zero
            if (jobSkills.length === 0) return { ...job, matchPercentage: 0 };

            const matchingSkills = jobSkills.filter(skill => 
                userSkills.some(userSkill => userSkill.includes(skill) || skill.includes(userSkill))
            );
            
            const matchPercentage = Math.round((matchingSkills.length / jobSkills.length) * 100);

            return { ...job, matchPercentage };
        });

        // 4. Return SIMPLE ARRAY (Fixes "No Jobs Found")
        res.json(recommendations); 

    } catch (err) {
        console.error("Recommendation Error:", err.message);
        res.status(500).send('Server Error');
    }
};

// ---------------------------------------------------------
// 2. GET JOB BY ID
// ---------------------------------------------------------
exports.getJobById = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id).populate('postedBy', 'name email').lean();
        if (!job) return res.status(404).json({ message: 'Job not found' });
        res.json(job);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// ---------------------------------------------------------
// 3. POST NEW JOB
// ---------------------------------------------------------
exports.createJob = async (req, res) => {
    const { title, company, location, salary, description, requiredSkills } = req.body;
    try {
        const newJob = new Job({
            title,
            company,
            location,
            salary,
            description,
            requiredSkills: requiredSkills ? requiredSkills.split(',').map(s => s.trim()) : [],
            postedBy: req.user.id
        });
        const job = await newJob.save();
        res.json(job);
    } catch (err) {
        console.error("Create Job Error:", err.message);
        res.status(500).send('Server Error');
    }
};

// ---------------------------------------------------------
// 4. DELETE JOB
// ---------------------------------------------------------
exports.deleteJob = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        if (job.postedBy.toString() !== req.user.id) {
            const user = await User.findById(req.user.id);
            if (user.role !== 'admin') {
                return res.status(401).json({ message: 'User not authorized' });
            }
        }
        await job.deleteOne();
        res.json({ message: 'Job removed' });
    } catch (err) {
        console.error("Delete Job Error:", err.message);
        res.status(500).send('Server Error');
    }
};

// ---------------------------------------------------------
// 5. UPDATE JOB (✅ NUCLEAR FIX)
// ---------------------------------------------------------
exports.updateJob = async (req, res) => {
    console.log("📝 Update Job Request Received for ID:", req.params.id);

    try {
        let job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        // Security Check: Ensure only the Recruiter who posted it can edit it
        if (job.postedBy.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized to edit this job' });
        }

        const { title, company, location, salary, description, requiredSkills } = req.body;

        // 1. Build the update object cleanly
        const updateFields = {};
        if (title) updateFields.title = title;
        if (company) updateFields.company = company;
        if (location) updateFields.location = location;
        if (salary) updateFields.salary = salary;
        if (description) updateFields.description = description;

        // 2. Handle Skills Safely (whether it comes as an array or a comma-separated string)
        if (requiredSkills) {
            updateFields.requiredSkills = Array.isArray(requiredSkills) 
                ? requiredSkills 
                : requiredSkills.split(',').map(s => s.trim());
        }

        // 3. 🔥 FORCE DATABASE UPDATE (Atomic Update)
        // { new: true } guarantees it sends the freshly updated data back to the frontend
        const updatedJob = await Job.findByIdAndUpdate(
            req.params.id,
            { $set: updateFields },
            { new: true, runValidators: true } 
        );

        console.log("✅ Job Updated in Database:", updatedJob.title);
        res.json(updatedJob);

    } catch (err) {
        console.error("❌ Update Job Error:", err.message);
        res.status(500).json({ message: 'Server Error: ' + err.message });
    }
};

// ---------------------------------------------------------
// 6. GET APPLICATIONS FOR JOB
// ---------------------------------------------------------
exports.getJobApplications = async (req, res) => {
    try {
        const applications = await Application.find({ jobId: req.params.jobId })
            .populate('user', 'name email skills')
            .lean();
        res.json(applications);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// ---------------------------------------------------------
// 7. UPDATE APPLICATION STATUS
// ---------------------------------------------------------
exports.updateApplicationStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const application = await Application.findById(req.params.id).populate('user');
        
        if (!application) return res.status(404).json({ message: 'Application not found' });

        application.status = status;
        await application.save();

        if (application.user && application.user.email) {
            const candidateEmail = application.user.email;
            let subject = `Update: ${application.jobTitle}`;
            let message = '';

            if (status === 'Accepted') {
                subject = `🎉 Offer: ${application.jobTitle} at ${application.company}`;
                message = `<h1 style="color: green;">Congratulations! 🎉</h1><p>You have been accepted for <strong>${application.jobTitle}</strong>.</p>`;
            } else if (status === 'Rejected') {
                subject = `Update: ${application.jobTitle}`;
                message = `<p>Thank you for your interest in <strong>${application.jobTitle}</strong>. We have moved forward with other candidates.</p>`;
            }

            if (message) {
                try {
                    await sendEmail({ email: candidateEmail, subject, message });
                } catch (err) { console.error("Email failed:", err.message); }
            }
        }

        res.json(application);
    } catch (err) {
        console.error("App Status Error:", err.message);
        res.status(500).send('Server Error');
    }
};

// ---------------------------------------------------------
// 8. GET MY APPLICATIONS
// ---------------------------------------------------------
exports.getMyApplications = async (req, res) => {
    try {
        const applications = await Application.find({ user: req.user.id })
            .populate('jobId', 'location salary') 
            .sort({ appliedAt: -1 })
            .lean();

        res.json(applications);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// ---------------------------------------------------------
// 9. DELETE APPLICATION
// ---------------------------------------------------------
exports.deleteApplication = async (req, res) => {
    try {
        await Application.findByIdAndDelete(req.params.id);
        res.json({ message: "Application Withdrawn" });
    } catch (err) {
        res.status(500).send('Server Error');
    }
};

// ---------------------------------------------------------
// 10. GET STATS
// ---------------------------------------------------------
exports.getJobStats = async (req, res) => {
    try {
        const totalJobs = await Job.countDocuments();
        const myApps = await Application.countDocuments({ user: req.user.id });
        const acceptedApps = await Application.countDocuments({ user: req.user.id, status: 'Accepted' });

        res.json({ totalJobs, myApps, acceptedApps });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// ---------------------------------------------------------
// 11. GET MY POSTED JOBS
// ---------------------------------------------------------
exports.getMyPostedJobs = async (req, res) => {
    try {
        const jobs = await Job.find({ postedBy: req.user.id }).sort({ postedAt: -1 }).lean();
        
        const jobsWithStats = await Promise.all(jobs.map(async (job) => {
            const applicationCount = await Application.countDocuments({ jobId: job._id });
            return { ...job, totalApplied: applicationCount };
        }));
        
        res.json(jobsWithStats);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// ---------------------------------------------------------
// 12. TOGGLE SAVED JOB
// ---------------------------------------------------------
exports.toggleSavedJob = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const jobId = req.params.id;

        if (user.savedJobs.includes(jobId)) {
            user.savedJobs = user.savedJobs.filter(id => id.toString() !== jobId);
            await user.save();
            return res.json({ message: 'Job removed', saved: false });
        } else {
            user.savedJobs.push(jobId);
            await user.save();
            return res.json({ message: 'Job saved', saved: true });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// ---------------------------------------------------------
// 13. GET SAVED JOBS
// ---------------------------------------------------------
exports.getSavedJobs = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('savedJobs').lean();
        res.json(user.savedJobs || []);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// ---------------------------------------------------------
// 14. GET PUBLIC JOBS
// ---------------------------------------------------------
exports.getPublicJobs = async (req, res) => {
    try {
        const totalJobs = await Job.countDocuments();
        
        if (totalJobs === 0) {
            // Auto Seed if empty
            await exports.seedRealJobs(req, res);
            return;
        }

        const { search } = req.query;
        let query = {};
        
        if (search) {
            query = {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { company: { $regex: search, $options: 'i' } },
                    { location: { $regex: search, $options: 'i' } },
                    { requiredSkills: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const limit = search ? 12 : 6;
        const jobs = await Job.find(query)
            .select('title company location salary requiredSkills postedAt description')
            .sort({ postedAt: -1 }) 
            .limit(limit)
            .lean();
            
        res.json(jobs);
        
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// ---------------------------------------------------------
// 15. SEED REAL JOBS
// ---------------------------------------------------------
exports.seedRealJobs = async (req, res) => {
    try {
        // Find ANY user to assign these jobs to (so they aren't orphaned)
        const admin = await User.findOne({ role: 'admin' }) || await User.findOne({});
        
        if (!admin) {
             // If NO users exist, return empty array to prevent crash
             console.log("⚠️ No users found. Cannot seed jobs.");
             return res.json([]); 
        }

        const realJobs = [
            { title: "Software Engineer III", company: "Google", location: "Bangalore", salary: "₹35L - ₹50L", description: "Google Cloud infra.", requiredSkills: ["Go", "Kubernetes", "Distributed Systems"] },
            { title: "Frontend Developer", company: "Netflix", location: "Remote", salary: "₹45L", description: "Netflix TV UI.", requiredSkills: ["React", "JavaScript", "Performance"] },
            { title: "SDE-2 (Backend)", company: "Amazon", location: "Hyderabad", salary: "₹38L", description: "Amazon Pay systems.", requiredSkills: ["Java", "DynamoDB", "AWS"] },
            { title: "Product Designer", company: "Airbnb", location: "Remote", salary: "₹25L", description: "Design experiences.", requiredSkills: ["Figma", "UI/UX"] },
            { title: "Full Stack Engineer", company: "Zomato", location: "Gurugram", salary: "₹22L", description: "Order systems.", requiredSkills: ["Node.js", "React", "MongoDB"] },
            { title: "Data Scientist", company: "Microsoft", location: "Bangalore", salary: "₹40L", description: "Azure AI.", requiredSkills: ["Python", "PyTorch", "Azure"] }
        ];

        const jobsWithUser = realJobs.map(job => ({ ...job, postedBy: admin._id }));
        await Job.insertMany(jobsWithUser);
        console.log("✅ Jobs Auto-Seeded!");
        
        // Return the jobs immediately so the user sees them
        res.json(jobsWithUser);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// ---------------------------------------------------------
// 16. ADMIN: GET ALL JOBS
// ---------------------------------------------------------
exports.getAllJobsAdmin = async (req, res) => {
    try {
        const jobs = await Job.find().populate('postedBy', 'name email').sort({ postedAt: -1 }).lean();
        res.json(jobs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};