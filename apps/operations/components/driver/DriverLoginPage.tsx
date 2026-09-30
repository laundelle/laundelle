import React, { useState } from 'react';
import { Truck, Lock, Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { mongoSignIn } from '@laundelle/api-client';

interface DriverLoginPageProps {
    onDriverLoginSuccess: (email: string, name: string, role?: string) => void;
    onNavigateToCustomer: () => void;
}

export const DriverLoginPage: React.FC<DriverLoginPageProps> = ({
    onDriverLoginSuccess,
    onNavigateToCustomer,
}) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await mongoSignIn(email.trim(), password);
            setLoading(false);

            if (res.error || !res.user) {
                setError(res.error || 'Authentication failed.');
                return;
            }

            const role = res.user.role;
            if (role !== 'driver') {
                setError('Access denied: This portal is for Drivers only. Use the Staff portal for other roles.');
                return;
            }

            onDriverLoginSuccess(res.user.email, res.user.name, role);
        } catch (err: any) {
            setLoading(false);
            setError(err?.message || 'A network error occurred.');
        }
    };

    return (
        <div className="w-full min-h-screen bg-[#03045E] flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl space-y-6">
                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-[#03045E] text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                        <Truck className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-[#03045E]">Driver Portal</h1>
                        <p className="text-xs text-gray-500 mt-1">Sign in with your driver credentials to view and manage your assigned jobs.</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-xl text-center text-xs font-semibold border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Driver Email</label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="driver@laundelle.co.uk"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-xs focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-xs focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#03045E] hover:bg-[#023E8A] text-white py-3.5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-50"
                    >
                        <span>{loading ? 'Signing in...' : 'Sign In to Driver Portal'}</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </form>

                <div className="pt-4 border-t border-gray-100 text-center">
                    <button
                        onClick={onNavigateToCustomer}
                        className="text-xs font-bold text-gray-500 hover:text-[#03045E] flex items-center justify-center gap-1 mx-auto cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Customer Site
                    </button>
                </div>
            </div>
        </div>
    );
};
