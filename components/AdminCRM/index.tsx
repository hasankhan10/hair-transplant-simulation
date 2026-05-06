import React, { useState, useEffect } from 'react';
import AdminLogin from './AdminLogin';
import AdminLayout from './AdminLayout';

const AdminCRM: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if previously authenticated in this session
    const authStatus = sessionStorage.getItem('drpaul_admin_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem('drpaul_admin_auth', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('drpaul_admin_auth');
  };

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return <AdminLayout onLogout={handleLogout} />;
};

export default AdminCRM;
