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
// 🚀 1. SETUP LOCAL UPLOADS FOLDER
// ---------------------------------------------------------
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log(`✅ Local uploads folder created at: ${uploadsPath}`);
}

// ---------------------------------------------------------
// 🚀 2. MIDDLEWARE
// ---------------------------------------------------------
app.use(cors({
    origin: [
        "http://localhost:5173",                 // Local React
        "https://skillsync-z8ru.onrender.com"    // Live Render App
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());

// ---------------------------------------------------------
// 🚀 3. SERVE IMAGES & FRONTEND
// ---------------------------------------------------------
// Serve Uploaded Images
app.use('/uploads', express.static(uploadsPath));

// Serve React Frontend (dist folder)
// This is the specific line that fixes "Cannot GET /"
app.use(express.static(path.join(__dirname, 'dist')));

// ---------------------------------------------------------
// 🚀 4. API ROUTES
// ---------------------------------------------------------
app.use('/api/v1', require('./routes/mainRoutes'));

// ---------------------------------------------------------
// 🚀 5. CATCH-ALL ROUTE (For React Routing)
// ---------------------------------------------------------
// If the request is not an API call or image, send the React App
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));