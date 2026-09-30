import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { mongoSignIn } from '@laundelle/api-client';

interface AdminLoginPageProps {
  onAdminLoginSuccess: (email: string, name: string, role?: string) => void;
  onNavigateToCustomer: () => void;
  onNavigateToManagerLogin?: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onAdminLoginSuccess,
  onNavigateToCustomer,
  onNavigateToManagerLogin,
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
      if (role !== 'admin' && role !== 'super_admin') {
        if (role === 'manager') {
          setError('Access denied: Plant managers must sign in via the Plant Manager Portal.');
        } else {
          setError('Access denied: Unauthorized role for Administrator Portal.');
        }
        return;
      }

      onAdminLoginSuccess(res.user.email, res.user.name, role);
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'A network error occurred.');
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl space-y-6 relative border border-[#03045E]/30">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-[#03045E] text-[#48CAE4] rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Shield className="w-7 h-7 text-[#48CAE4]" />
          </div>
          <h1 className="text-2xl font-heading font-black text-[#03045E]">Administrator Portal</h1>
          <p className="text-xs text-gray-500">Restricted authentication for system administrators and directors.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-xl text-center font-semibold border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Administrator Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@laundelle.co.uk"
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
            className="w-full bg-[#03045E] hover:bg-[#023E8A] text-white py-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Authenticate Admin Session'}</span>
            <ArrowRight className="w-4 h-4 text-[#48CAE4]" />
          </button>
        </form>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold">
          <button
            onClick={onNavigateToCustomer}
            className="text-gray-500 hover:text-[#03045E] flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Customer Site
          </button>
          {onNavigateToManagerLogin && (
            <button
              onClick={onNavigateToManagerLogin}
              className="text-[#0077B6] hover:underline cursor-pointer"
            >
              Manager Portal →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
