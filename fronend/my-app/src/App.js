// Frontend/src/App.js

import './App.css'; 
import React, { useState, useEffect, useRef } from 'react'; // <--- useState, useEffect, useRef import kiya
import Navbar from '../src/Navbar';
import SplashScreen from '../src/SplashScreen';
import OrderForm from '../src/OrderForm';
import Reports from '../src/Reports';
import Profile from '../src/Profile';
import WahabOrderTable from '../src/WahabOrderTable'; // Wahab component import
import WahabLogin from '../src/WahabLogin'; // Wahab authentication
import ProfitCalculator from '../src/ProfitCalculator'; // Profit Calculator
import Dashboard from './Dashboard';
import LoadingPopup from './components/LoadingPopup';
import AutoDetect from '../src/AutoDetect';

function App() {
    // Splash screen state
    const [showSplash, setShowSplash] = useState(true);
    
    // App open hone par dashboard dikhana hai
    const [currentView, setCurrentView] = useState('dashboard');
    
    // Wahab authentication states
    const [showWahabLogin, setShowWahabLogin] = useState(false);
    const [wahabAuthenticated, setWahabAuthenticated] = useState(false);
    const [protectedTarget, setProtectedTarget] = useState(null);

    // Global page transition overlay
    const [transitioning, setTransitioning] = useState(false);
    const transTimer = useRef(null);

    const startTransition = () => {
        if (transTimer.current) clearTimeout(transTimer.current);
        setTransitioning(true);
        transTimer.current = setTimeout(() => setTransitioning(false), 600);
    };
    
    // No persistent authentication - always require login after refresh
    // Reset to dashboard if trying to access protected views without authentication
    useEffect(() => {
        const PROTECTED_VIEWS = ['wahabOrders', 'profile'];
        if (PROTECTED_VIEWS.includes(currentView) && !wahabAuthenticated) {
            setCurrentView('dashboard');
        }
    }, [currentView, wahabAuthenticated]);
    
    // Function jo view change karega
    const handleNavClick = (view) => {
        const PROTECTED_VIEWS = ['wahabOrders', 'profile'];
        if (PROTECTED_VIEWS.includes(view)) {
            if (wahabAuthenticated) {
                setCurrentView(view);
                startTransition();
            } else {
                setProtectedTarget(view);
                setShowWahabLogin(true);
            }
        } else {
            setCurrentView(view);
            startTransition();
        }
    };
    
    // Handle successful Wahab login
    const handleWahabLoginSuccess = () => {
        setWahabAuthenticated(true);
        setCurrentView(protectedTarget || 'wahabOrders');
        setProtectedTarget(null);
        setShowWahabLogin(false);
        startTransition();
    };
    
    // Handle login modal close
    const handleWahabLoginClose = () => {
        setShowWahabLogin(false);
    };
    
    // Function to handle splash screen end
    const handleSplashEnd = () => {
        setShowSplash(false);
    };

    // Cleanup transition timer on unmount
    useEffect(() => {
        return () => { if (transTimer.current) clearTimeout(transTimer.current); };
    }, []);

    // Show splash screen first
    if (showSplash) {
        return <SplashScreen onAnimationEnd={handleSplashEnd} />;
    }

    return (
        <div className="App">
            
            {/* 1. Navigation Bar: setCurrentView function pass kiya */}
            <Navbar onNavClick={handleNavClick} currentView={currentView} />

            {/* 2. Main Content */}
            <main className={currentView === 'dashboard' ? 'is-dashboard' : ''}>
                {currentView === 'dashboard' ? (
                    <Dashboard />
                ) : currentView === 'reports' ? (
                    <Reports />
                ) : currentView === 'profile' ? (
                    <Profile />
                ) : currentView === 'wahabOrders' ? (
                    <WahabOrderTable />
                ) : currentView === 'profitCalculator' ? (
                    <ProfitCalculator />
                ) : currentView === 'autoDetect' ? (
                    <AutoDetect />
                ) : (
                    <OrderForm onOrderAdded={() => {}} />
                )}
            </main>

            {/* Global page transition overlay */}
            <LoadingPopup open={transitioning} label="Loading" />
            
            {/* Wahab Authentication Modal */}
            {showWahabLogin && (
                <WahabLogin 
                    onLoginSuccess={handleWahabLoginSuccess}
                    onClose={handleWahabLoginClose}
                    targetView={protectedTarget}
                />
            )}
            
        </div>
    );
}

export default App;
