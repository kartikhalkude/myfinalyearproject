// frontend/src/App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import InstallPWA from './components/InstallPWA';
import apiClient from './services/apiClient';

function PrivateRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={`/${user.role}-dashboard`} />;
  }
  
  return children;
}

function App() {
  // Pre-warm the backend on load to wake it up from Render sleep
  useEffect(() => {
    const wakeUpBackend = async () => {
      try {
        await apiClient.get('/health');
      } catch (err) {
        // Keep warnings silent
      }
    };
    wakeUpBackend();
  }, []);

  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/patient-dashboard"
            element={
              <PrivateRoute requiredRole="patient">
                <PatientDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/doctor-dashboard"
            element={
              <PrivateRoute requiredRole="doctor">
                <DoctorDashboard />
              </PrivateRoute>
            }
          />
        </Routes>
        <InstallPWA />
      </Router>
    </AuthProvider>
  );
}

export default App;