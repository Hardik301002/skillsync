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
// 🚀 2. MIDDLEWARE (Allow Localhost)
// ---------------------------------------------------------
app.use(cors({
    origin: ["http://localhost:5173"], // ✅ Allow your local React app
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());

// ---------------------------------------------------------
// 🚀 3. SERVE IMAGES
// ---------------------------------------------------------
app.use('/uploads', express.static(uploadsPath));

// ---------------------------------------------------------
// 🚀 4. API ROUTES
// ---------------------------------------------------------
app.use('/api/v1', require('./routes/mainRoutes'));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Local Server running on http://localhost:${PORT}`));