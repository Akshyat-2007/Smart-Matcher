import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import LandingHero from './components/LandingHero.jsx';
import AuthPage from './pages/AuthPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import HubPage from './pages/HubPage.jsx';
import DiscoveryPage from './pages/DiscoveryPage.jsx';
import DemoSimulationPage from './pages/DemoSimulationPage.jsx';
import { api, setToken } from './services/api.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('landing'); // Default to full landing experience
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const data = await api.getMe();
          if (data.user) {
            setUser(data.user);
          }
        } catch {
          setToken(null);
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setActiveTab(loggedInUser.status === 'matched' ? 'hub' : 'onboarding');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setActiveTab('landing');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      <Navbar
        user={user}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="flex-1">
        {activeTab === 'landing' && (
          <LandingHero
            onStartOnboarding={() => setActiveTab('onboarding')}
            onOpenDemo={() => setActiveTab('demo')}
          />
        )}

        {activeTab === 'auth' && (
          <div className="pt-24">
            <AuthPage onLoginSuccess={handleLoginSuccess} />
          </div>
        )}

        {activeTab === 'onboarding' && (
          <div className="pt-24">
            <OnboardingPage
              user={user}
              onComplete={async () => {
                try {
                  const me = await api.getMe();
                  if (me.user) setUser(me.user);
                } catch {}
                setActiveTab('hub');
              }}
            />
          </div>
        )}

        {activeTab === 'hub' && (
          <div className="pt-24">
            {user ? (
              <HubPage
                user={user}
                onNavigateToOnboarding={() => setActiveTab('onboarding')}
              />
            ) : (
              <AuthPage onLoginSuccess={handleLoginSuccess} />
            )}
          </div>
        )}

        {activeTab === 'discovery' && (
          <div className="pt-24">
            <DiscoveryPage
              user={user}
              onNavigateToHub={() => setActiveTab('hub')}
              onNavigateToOnboarding={() => setActiveTab('onboarding')}
            />
          </div>
        )}

        {activeTab === 'demo' && (
          <div className="pt-24">
            <DemoSimulationPage />
          </div>
        )}
      </main>
    </div>
  );
}
