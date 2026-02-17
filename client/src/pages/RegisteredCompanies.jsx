import React, { useEffect, useState } from 'react';
import API from '../api/axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const RegisteredCompanies = () => {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

   const BASE_URL = import.meta.env.MODE === "development" 
    ? "http://localhost:5000" 
    : "";

    const rawUser = localStorage.getItem('user');
    const user = rawUser ? JSON.parse(rawUser) : null;

    // HELPER: Get Correct Avatar URL
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
        const fetchCompanies = async () => {
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { 'x-auth-token': token } };
                // Fetch companies
                const res = await API.get('/companies', config);
                setCompanies(res.data);
            } catch (err) {
                console.error("Error fetching companies", err);
                toast.error("Failed to load companies");
            } finally {
                setLoading(false);
            }
        };
        fetchCompanies();
    }, []);

    // ✅ NEW: Delete Company Function
    const handleDeleteCompany = async (id) => {
        if (!window.confirm("Are you sure you want to delete this company?")) return;
        
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { 'x-auth-token': token } };
            
            await API.delete(`/companies/${id}`, config);
            
            // Remove the deleted company from the screen immediately
            setCompanies(companies.filter(company => company._id !== id));
            toast.success("Company Deleted Successfully!");
        } catch (err) {
            console.error("Delete Error:", err);
            toast.error("Failed to delete company.");
        }
    };

    const filteredCompanies = companies.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ✅ FIXED: Company Logo Helper (Now supports Cloudinary!)
    const CompanyLogo = ({ company, className }) => {
        let logoUrl = null;
        if (company.logo) {
            // Check if it's already a full Cloudinary URL
            if (company.logo.startsWith('http')) {
                logoUrl = company.logo;
            } else {
                // Fallback for old local uploads
                const filename = company.logo.split(/[/\\]/).pop();
                logoUrl = `${BASE_URL}/uploads/${filename}`;
            }
        }

        if (logoUrl) {
            return <img src={logoUrl} alt={`${company.name} logo`} className={`object-contain ${className}`} onError={(e) => {e.target.style.display='none';}} />;
        }
        return (
            <div className={`bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg ${className}`}>
                {company.name.charAt(0).toUpperCase()}
            </div>
        );
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-200 px-6 md:px-10 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">S</div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight cursor-pointer" onClick={() => navigate('/dashboard')}>SkillSync</h1>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-md transition text-sm flex items-center gap-2">Dashboard</button>
                    
                    <button onClick={() => navigate('/profile')} className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-indigo-200 overflow-hidden hover:ring-2 hover:ring-indigo-300 transition">
                         <img 
                            src={getAvatarUrl()} 
                            alt="Avatar" 
                            className="w-full h-full object-cover" 
                            onError={(e) => { e.target.onerror = null; e.target.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png"; }}
                        />
                    </button>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto p-6 md:p-10">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    {/* Search bar */}
                    <div className="relative w-full md:w-96 mx-auto">
                         <input 
                            type="text" 
                            placeholder="Search for company..." 
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
                    {/* "Add new company" button */}
                    <button onClick={() => navigate('/add-company')} className="bg-[#6366f1] text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-md transition text-sm">
                        Add new company
                    </button>
                </div>

                {/* Company Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase font-bold tracking-wider">
                                    <th className="px-6 py-4">Logo</th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Location</th>
                                    <th className="px-6 py-4">website</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredCompanies.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center py-12 text-slate-400 font-medium">No companies found.</td></tr>
                                ) : (
                                    filteredCompanies.map((company) => (
                                        <tr key={company._id} className="hover:bg-slate-50/80 transition group">
                                            {/* Logo */}
                                            <td className="px-6 py-4">
                                                <CompanyLogo company={company} className="w-10 h-10 rounded-lg border border-slate-100 bg-white shadow-sm" />
                                            </td>
                                            
                                            <td className="px-6 py-4 font-bold text-slate-900">{company.name}</td>
                                            <td className="px-6 py-4 text-slate-700 font-medium text-sm">{company.location}</td>
                                            <td className="px-6 py-4 text-slate-600 font-medium text-sm">
                                                {company.website ? (
                                                    <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 hover:underline">
                                                        {company.website}
                                                    </a>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 font-medium text-sm">
                                                {new Date(company.createdAt).toISOString().split('T')[0]}
                                            </td>
                                            
                                            {/* ✅ NEW: Action Buttons (View, Edit, Delete) */}
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2">
                                                    
                                                    {/* Edit */}
                                                    <button onClick={() => navigate(`/edit-company/${company._id}`)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200" title="Edit Company">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    {/* Delete */}
                                                    <button onClick={() => handleDeleteCompany(company._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200" title="Delete Company">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
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
                <div className="text-center mt-4 text-slate-400 text-sm">A list of your recent registered companies</div>
            </div>
        </div>
    );
};

export default RegisteredCompanies;