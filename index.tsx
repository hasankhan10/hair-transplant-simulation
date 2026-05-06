
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AdminCRM from './components/AdminCRM';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const isAdminRoute = window.location.pathname.startsWith('/admin');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isAdminRoute ? <AdminCRM /> : <App />}
  </React.StrictMode>
);
