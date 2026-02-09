const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load Environment Variables
dotenv.config();

// Initialize App
const app = express();

// Connect Database
connectDB();

// ---------------------------------------------------------
// 🔍 DEBUGGING: Check for Frontend Files
// ---------------------------------------------------------
const distPath = path.join(__dirname, 'dist');
console.log(`Checking frontend build at: ${distPath}`);
if (fs.existsSync(distPath)) {
    console.log("✅ 'dist' folder exists. Files found:", fs.readdirSync(distPath));
} else {
    console.error("❌ CRITICAL ERROR: 'dist' folder is MISSING. The website will not load.");
}

// ---------------------------------------------------------
// 🚀 1. MIDDLEWARE
// ---------------------------------------------------------
app.use(cors({
    origin: [
        "http://localhost:5173",                 // Local Development
        "https://skillsync-z8ru.onrender.com"    // Live Production
    ],
    credentials: true
}));

app.use(express.json());

// ---------------------------------------------------------
// 🚀 2. SERVE STATIC FILES (Frontend Only)
// ---------------------------------------------------------
// Note: We REMOVED the '/uploads' static route because 
// images are now served directly from Cloudinary URLs.

// Serve React Frontend (CSS/JS/Images from build)
app.use(express.static(distPath));

// ---------------------------------------------------------
// 🚀 3. API ROUTES
// ---------------------------------------------------------
app.use('/api/v1', require('./routes/mainRoutes'));

// ---------------------------------------------------------
// 🚀 4. FINAL CATCH-ALL (For React Routing)
// ---------------------------------------------------------
// This catches any request that isn't an API call.
app.use((req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send("<h1>404 Error</h1><p>Frontend build files not found. Check server logs.</p>");
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));