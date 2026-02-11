import React, { useEffect, useState } from 'react';
import API from '../api/axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import RecruiterDashboard from './RecruiterDashboard';
import CompanyLogo from '../components/CompanyLogo';
import Footer from '../components/Footer';

const Dashboard = () => {
    const navigate = useNavigate();
    const BASE_URL = import.meta.env.MODE === "development" 
    ? "http://localhost:5000" 
    : "";

    // Role Check
    let user = null;
    const rawUser = localStorage.getItem('user');
    try { user = rawUser ? JSON.parse(rawUser) : null; } catch (e) { localStorage.clear(); }
    const isRecruiter = user?.role === 'recruiter';

    // Candidate State
    const [jobs, setJobs] = useState([]);
    const [savedJobIds, setSavedJobIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const rawToken = localStorage.getItem('token');

    // ✅ HELPER: Get Correct Image URL
    const getAvatarUrl = () => {
        if (user && user.avatar) {
            if (user.avatar.startsWith('http')) {
              return user.avatar;
           }
           return `${BASE_URL}/${user.avatar}`;
        }
        return "https://cdn-icons-png.flaticon.com/512/149/149071.png";
    };

    useEffect(() => {
        const fetchUserData = async () => {
            if (!rawToken) return window.location.href = '/login';
            try {
                const config = { headers: { 'x-auth-token': rawToken } };
                const savedRes = await API.get('/saved-jobs', config);
                setSavedJobIds(savedRes.data.map(job => job._id));
            } catch (err) { console.error(err); }
        };
        fetchUserData();
    }, [rawToken]);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                if (!searchTerm) setLoading(true);
                const config = { headers: { 'x-auth-token': rawToken } };
                const { data } = await API.get(`/recommendations?search=${searchTerm}&limit=20`, config);
                // Handle both Array response and Object response
                setJobs(Array.isArray(data) ? data : (data.jobs || []));
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        const delay = setTimeout(() => { fetchJobs(); }, 500);
        return () => clearTimeout(delay);
    }, [rawToken, searchTerm]);

    const handleToggleSave = async (jobId) => {
        try {
            const config = { headers: { 'x-auth-token': rawToken } };
            const res = await API.put(`/jobs/${jobId}/save`, {}, config);
            if (res.data.saved) {
                setSavedJobIds([...savedJobIds, jobId]);
                toast.success("Job Saved! ");
            } else {
                setSavedJobIds(savedJobIds.filter(id => id !== jobId));
                toast.success("Job Removed.");
            }
        } catch (err) { toast.error("Error saving job"); }
    };

    // Render Recruiter Dashboard if applicable
    if (isRecruiter) return <RecruiterDashboard />;

    if (loading && !jobs.length) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-200 px-6 md:px-10 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
                     <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">S</div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">SkillSync</h1>
                </div>
                <div className="flex items-center gap-6 text-sm font-medium">
                    <button onClick={() => navigate('/saved-jobs')} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-md transition text-sm flex items-center gap-2">Saved</button>
                    <button onClick={() => navigate('/applications')} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-md transition text-sm flex items-center gap-2">My Applications</button>
                    
                    {/* ✅ FIXED AVATAR DISPLAY */}
                    <button onClick={() => navigate('/profile')} className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden hover:ring-2 hover:ring-indigo-200 transition">
                         <img 
                            src={getAvatarUrl()} 
                            alt="Avatar" 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                                e.target.onerror = null; 
                                e.target.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
                            }}
                        />
                    </button>
                    <button onClick={() => { localStorage.clear(); window.location.href = '/login'; }} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition text-sm border border-red-200">Logout</button>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto p-6 md:p-8">
                {/* Header */}
                
                <div className="relative w-full md:w-96 mx-auto">
                       <input 
                          type="text" 
                          placeholder="Search roles..." 
                          value={searchTerm} 
                          onChange={(e) => setSearchTerm(e.target.value)} 
                          className="w-full pl-12 pr-4 py-3.5 rounded-full border-0 bg-white text-slate-800 shadow-lg shadow-indigo-500/10 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 transition-all hover:shadow-indigo-500/20" 
                        />
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div> 
                <br/>
                
                {jobs.length === 0 ? <div className="text-center py-20 text-slate-400 font-medium">No jobs found matching your criteria.</div> : (
                    
                    /* Modern Grid Layout */
                    <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {jobs.map(job => (
                            <div key={job._id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-100 transition-all duration-300 flex flex-col relative group">
                                
                                {/* Save Heart */}
                                <button 
                                    onClick={(e) => {e.stopPropagation(); handleToggleSave(job._id);}} 
                                    className="absolute top-5 right-5 z-10 p-1.5 rounded-full bg-white/80 hover:bg-slate-50 transition text-lg text-slate-300 hover:text-red-500"
                                >
                                    {savedJobIds.includes(job._id) ? '❤️' : '🤍'}
                                </button>

                                {/* Card Header */}
                                <div className="flex items-start gap-4 mb-4">
                                    <CompanyLogo company={job.company} className="w-14 h-14 rounded-lg shadow-sm border border-slate-100" />
                                    <div>
                                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition">{job.company}</h3>
                                        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium mt-1">
                                             {job.location || 'Remote'}
                                        </div>
                                    </div>
                                </div>

                                <h2 className="text-lg font-bold text-slate-900 mb-2 line-clamp-1">{job.title}</h2>
                                
                                <p className="text-slate-500 text-sm mb-5 line-clamp-2 leading-relaxed h-10">
                                    {job.description || "Join our team to solve interesting problems..."}
                                </p>

                                {/* Tags */}
                                <div className="flex gap-2 mb-6 mt-auto">
                                    <span className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">Full Time</span>
                                    <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">{job.salary}</span>
                                </div>

                                <button 
                                    onClick={() => navigate(`/jobs/${job._id}`)}
                                    className="w-full py-2.5 rounded-lg bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
                                >
                                    View Details
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
};

export default Dashboard;