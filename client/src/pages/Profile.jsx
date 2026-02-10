import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../api/axios';

const Profile = () => {
    const navigate = useNavigate();
    
    // 1. Initialize from LocalStorage (Instant Load)
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    
    const [loading, setLoading] = useState(!user);

    useEffect(() => {
        const fetchProfileSync = async () => {
            try {
                // 2. Background Sync with Database
                const res = await API.get('/me');
                if (JSON.stringify(res.data) !== JSON.stringify(user)) {
                     setUser(res.data);
                     localStorage.setItem('user', JSON.stringify(res.data));
                }
            } catch (err) {
                console.error("Profile sync error", err);
                if (!user && !localStorage.getItem('user')) {
                    navigate('/login');
                }
            } finally {
                setLoading(false);
            }
        };

        // Always fetch fresh data to get the latest Cloudinary URL
        fetchProfileSync();
    }, [navigate]); 

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast.success("Logged out successfully");
        navigate('/login');
    };

    // ✅ SMART CLOUDINARY HELPER
    const getFileUrl = (path) => {
        if (!path) return null;
        // If it's a Cloudinary URL (starts with http), use it directly
        if (path.startsWith('http')) return path;
        
        // Fallback for old local files (Dev environment only)
        const filename = path.split(/[/\\]/).pop();
        const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5000" : "";
        return `${BASE_URL}/uploads/${filename}`;
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;
    if (!user) return null;

    // ✅ CANDIDATE CHECK (Anyone who is NOT a recruiter gets a Resume section)
    const isCandidate = user.role !== 'recruiter';

    // Role Badge Logic
    let roleLabel = 'User';
    let roleColorClass = 'bg-gray-100 text-gray-700';
    if (user.role === 'recruiter') {
        roleLabel = 'Recruiter';
        roleColorClass = 'bg-purple-100 text-purple-700';
    } else if (user.role === 'candidate' || user.role === 'user') {
        roleLabel = 'Candidate';
        roleColorClass = 'bg-green-100 text-green-700';
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-gray-800">
             <nav className="bg-white/80 backdrop-blur-md shadow-sm px-10 py-4 flex justify-between items-center sticky top-0 z-50 border-b border-gray-200">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
                     <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">S</div>
                     <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">SkillSync</h1>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-md transition text-sm">Dashboard</button>
                    <button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition text-sm border border-red-200">Logout</button>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto p-8">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="h-40 bg-gradient-to-r from-indigo-600 to-purple-600 relative"></div>
                    
                    <div className="px-8 pb-8">
                        <div className="relative flex justify-between items-end -mt-16 mb-6">
                            {/* ✅ AVATAR: Uses Background Image for perfect fit */}
                            <div 
                                className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-white bg-cover bg-center"
                                style={{ 
                                    backgroundImage: `url(${getFileUrl(user.avatar) || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'})` 
                                }}
                            ></div>
                            <button onClick={() => navigate('/edit-profile')} className="bg-white text-indigo-600 border border-indigo-200 px-6 py-2 rounded-lg font-bold hover:bg-indigo-50 transition shadow-sm">
                                Edit Profile
                            </button>
                        </div>

                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-extrabold text-[#2c1e6d]">{user.name}</h1>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider ${roleColorClass}`}>{roleLabel}</span>
                            </div>
                            <p className="text-slate-500 font-medium">{user.email}</p>
                            <p className="mt-4 text-gray-600 leading-relaxed max-w-2xl whitespace-pre-wrap">{user.bio || "No bio added yet."}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-100 pt-8">
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Skills</h3>
                                <div className="flex flex-wrap gap-2">
                                    {user.skills && user.skills.length > 0 ? (
                                        (Array.isArray(user.skills) ? user.skills : user.skills.split(',')).map((skill, index) => (
                                            <span key={index} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">{typeof skill === 'string' ? skill.trim() : skill}</span>
                                        ))
                                    ) : (
                                        <p className="text-gray-400 italic">No skills listed.</p>
                                    )}
                                </div>
                            </div>

                            {/* ✅ RESUME SECTION (Only for Candidates) */}
                            {isCandidate && (
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Resume</h3>
                                    {user.resume ? (
                                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-300 transition">
                                            <div className="text-3xl">📄</div>
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-700 mb-1">My Resume.pdf</p>
                                                {/* ✅ CLOUDINARY LINK */}
                                                <a 
                                                    href={getFileUrl(user.resume)} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-indigo-600 text-sm font-bold hover:underline flex items-center gap-1"
                                                >
                                                    View / Download ↗
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 border border-dashed border-gray-300 rounded-xl text-center text-gray-400">No resume uploaded.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;