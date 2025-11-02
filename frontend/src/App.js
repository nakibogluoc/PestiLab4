import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import "@/App.css";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

// Components
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import CompoundsPage from "@/pages/CompoundsPage";
import WeighingPageEnhanced from "@/pages/WeighingPageEnhanced";
import RecordsPage from "@/pages/RecordsPage";
import Layout from "@/components/Layout";
import { LabelReprintProvider } from "@/components/LabelReprintProvider";
import LabelReprintDialog from "@/components/LabelReprintDialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Axios interceptor for token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            user ? <Navigate to="/" /> : <LoginPage onLogin={handleLogin} />
          } />
          
          <Route path="/" element={
            user ? <Layout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />
          }>
            <Route index element={<DashboardPage user={user} />} />
            <Route path="compounds" element={<CompoundsPage user={user} />} />
            <Route path="weighing" element={<WeighingPageEnhanced user={user} />} />
            <Route path="records" element={<RecordsPage user={user} />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
export { API };