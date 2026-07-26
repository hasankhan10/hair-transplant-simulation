import React, { useState } from 'react';

interface AdminLoginProps {
  onLogin: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check against Environment Variables
    const expectedUser = import.meta.env.VITE_ADMIN_USER?.trim();
    const expectedPass = import.meta.env.VITE_ADMIN_PASS?.trim();

    if (!expectedUser || !expectedPass) {
      setError('Admin access unavailable. Please contact system administrator.');
      return;
    }

    if (username.trim() === expectedUser && password.trim() === expectedPass) {
      setError('');
      onLogin();
    } else {
      setError('Incorrect username or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
        <div className="bg-primary p-6 text-center">
          <h1 className="text-2xl font-bold text-white font-poppins">Dr. Paul's Clinic</h1>
          <p className="text-white/80 text-sm mt-1">Admin Portal Access</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-6">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                placeholder="Enter admin username"
                required
              />
            </div>
            
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                  placeholder="Enter admin password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-xl transition duration-200 shadow-lg shadow-primary/30"
            >
              Secure Login
            </button>
          </div>
        </form>
        
        <div className="bg-slate-900/50 p-4 border-t border-slate-700 text-center">
          <p className="text-slate-500 text-xs">Unauthorized access is strictly prohibited.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
