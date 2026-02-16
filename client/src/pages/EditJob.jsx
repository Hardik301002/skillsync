import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast'; // ✅ Added professional toast notifications

const EditJob = () => {
    const { id } = useParams(); 
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false); // ✅ Prevents double-clicking
    
    const [formData, setFormData] = useState({
        title: '', company: '', location: '', salary: '', description: '', requiredSkills: ''
    });

    const { title, company, location, salary, description, requiredSkills } = formData;

    useEffect(() => {
        const fetchJob = async () => {
            const token = localStorage.getItem('token');
            try {
                const config = { headers: { 'x-auth-token': token } };
                const res = await API.get(`/jobs/${id}`, config);
                
                setFormData({
                    ...res.data,
                    requiredSkills: res.data.requiredSkills ? res.data.requiredSkills.join(', ') : ''
                });
            } catch (err) {
                toast.error("Error fetching job details.");
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchJob();
    }, [id, navigate]);

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault(); 
        setIsSubmitting(true);
        
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { 'x-auth-token': token } };
            
            await API.put(`/jobs/${id}`, formData, config);
            
            toast.success('Job Updated Successfully!'); 
            navigate('/dashboard'); 
            
        } catch (err) {
            console.error("❌ Update Error:", err);
            const errorMessage = err.response?.data?.message || err.message;
            toast.error('Error saving job: ' + errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fcfc]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2c1e6d]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fcfc] font-sans text-gray-800 py-2 px-4 flex items-center justify-center">
            <div className="w-full max-w-3xl bg-white p-8 md:p-5 rounded-2xl shadow-xl border border-gray-100">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-3xl font-extrabold text-[#2c1e6d]">Edit Job</h2>
                    <button onClick={() => navigate('/dashboard')} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-md transition text-sm flex items-center gap-2">
                         Back
                    </button>
                </div>
                
                <form onSubmit={onSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Job Title</label>
                        <input type="text" name="title" value={title} onChange={onChange} required className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[#6366f1] focus:bg-white transition outline-none" placeholder="e.g. Senior React Developer" />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Company</label>
                        <input type="text" name="company" value={company} onChange={onChange} required className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[#6366f1] focus:bg-white transition outline-none" />
                    </div>
                    
                    {/* ✅ FIXED GRID: Location and Salary are now proper side-by-side columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                            <input type="text" name="location" value={location} onChange={onChange} required className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[#6366f1] focus:bg-white transition outline-none" placeholder="e.g. Remote, Bangalore" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Salary</label>
                            <input type="text" name="salary" value={salary} onChange={onChange} required className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[#6366f1] focus:bg-white transition outline-none" placeholder="e.g. 15LPA" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Required Skills</label>
                        <input type="text" name="requiredSkills" value={requiredSkills} onChange={onChange} required className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[#6366f1] focus:bg-white transition outline-none" placeholder="e.g. React, Node.js, MongoDB (comma separated)" />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                        <textarea name="description" value={description} onChange={onChange} required rows="5" className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-[#6366f1] focus:bg-white transition outline-none" placeholder="Describe the responsibilities and requirements..."></textarea>
                    </div>

                    {/* ✅ BUTTON: Disabled state while submitting */}
                    <button 
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg mt-4 transition-all flex justify-center items-center gap-2
                            ${isSubmitting 
                                ? 'bg-[#2c1e6d]/70 text-white cursor-not-allowed' 
                                : 'bg-[#2c1e6d] text-white hover:bg-[#1a1145] hover:-translate-y-0.5'
                            }`}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Saving Changes...
                            </>
                        ) : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EditJob;