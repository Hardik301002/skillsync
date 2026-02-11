import React, { useEffect, useState } from 'react';
import API from '../api/axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import CompanyLogo from '../components/CompanyLogo';

const RecruiterDashboard = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    
    const BASE_URL = import.meta.env.MODE === "development" 
    ? "http://localhost:5000" 
    : "";
    const rawUser = localStorage.getItem('user');
    const user = rawUser ? JSON.parse(rawUser) : null;

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
        const fetchJobs = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return navigate('/login');
                
                const config = { headers: { 'x-auth-token': token } };
                const res = await API.get('/my-posted-jobs', config);
                setJobs(res.data);
            } catch (err) {
                console.error("Error fetching jobs", err);
                toast.error("Failed to load jobs");
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, [navigate]);

    const handleDeleteJob = async (id) => {
        if (!window.confirm("Are you sure you want to delete this job?")) return;
        try {
            const token = localStorage.getItem('token');
            await API.delete(`/jobs/${id}`, { headers: { 'x-auth-token': token } });
            setJobs(jobs.filter(job => job._id !== id));
            toast.success("Job Deleted Successfully");
        } catch (err) {
            toast.error("Delete Failed");
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
        toast.success("Logged out successfully");
    };

    const filteredJobs = jobs.filter(job => 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        job.company.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-200 px-6 md:px-10 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">S</div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight cursor-pointer" onClick={() => navigate('/dashboard')}>SkillSync</h1>
                </div>
                <div className="flex items-center gap-4 md:gap-6">
                    
                    {/* BUTTON: Companies */}
                    <button 
                        onClick={() => navigate('/registered-companies')} 
                        className="bg-red-500 text-white px-5 py-2 rounded-lg font-bold hover:bg-red-600 shadow-md transition text-sm"
                    >
                        Companies
                    </button>
                    
                    <button onClick={() => navigate('/post-job')} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-md transition text-sm flex items-center gap-2">
                        <span>+</span> Post Job
                    </button>

                    {/* ✅ FIXED AVATAR */}
                    <button onClick={() => navigate('/profile')} className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden hover:ring-2 hover:ring-indigo-200 transition" title="View Profile">
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

                    <button 
                        onClick={handleLogout} 
                        className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition text-sm border border-red-200"
                    >
                        Logout
                    </button>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto p-6 md:p-8">
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="relative w-full md:w-96 mx-auto">
                        <input 
                            type="text" 
                            placeholder="Search role or company..." 
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
                </div>

                {/* Modern Data Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-bold tracking-wider">
                                    <th className="px-6 py-4">Logo</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Company</th>
                                    <th className="px-6 py-4">Salary</th>
                                    <th className="px-6 py-4">Location</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4 text-center">Applicants</th>
                                    <th className="px-6 py-4">Posted Date</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredJobs.length === 0 ? (
                                    <tr><td colSpan="9" className="text-center py-12 text-slate-400 font-medium">No jobs posted yet.</td></tr>
                                ) : (
                                    filteredJobs.map((job) => (
                                        <tr key={job._id} className="hover:bg-slate-50/80 transition group even:bg-slate-50/30">
                                            {/* Logo */}
                                            <td className="px-6 py-4">
                                                <CompanyLogo company={job.company} className="w-10 h-10 rounded-lg border border-slate-100" />
                                            </td>
                                            
                                            <td className="px-6 py-4 font-bold text-slate-900">{job.title}</td>
                                            <td className="px-6 py-4 text-slate-600 font-medium text-sm">{job.company}</td>
                                            <td className="px-6 py-4 text-slate-600 text-sm font-mono">{job.salary}</td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">{job.location}</td>
                                            
                                            <td className="px-6 py-4">
                                                <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full border border-emerald-100 font-bold">FullTime</span>
                                            </td>
                                            
                                            {/* Applicants Count Link */}
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => navigate(`/manage-job/${job._id}`)}
                                                    className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-md font-bold text-sm hover:bg-indigo-100 transition min-w-[2rem]"
                                                >
                                                    {job.totalApplied || 0}
                                                </button>
                                            </td>
                                            
                                            <td className="px-6 py-4 text-slate-400 text-xs font-mono">
                                                {new Date(job.postedAt).toISOString().split('T')[0]}
                                            </td>
                                            
                                            {/* Action Buttons */}
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-3">
                                                    <button onClick={() => navigate(`/manage-job/${job._id}`)} className="text-gray-400 hover:text-green-600 transition" title="View">
                                                        👁️
                                                    </button>
                                                    <button onClick={() => navigate(`/edit-job/${job._id}`)} className="text-gray-400 hover:text-blue-600 transition" title="Edit">
                                                        ✎
                                                    </button>
                                                    <button onClick={() => handleDeleteJob(job._id)} className="text-gray-400 hover:text-red-500 transition" title="Delete">
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecruiterDashboard;