import { useState, useEffect } from 'react';
import { initializeLocalDB } from '../localDB';
import { getUserProfile } from '../hydrationRepo';
import Home from './Home';
import LogWater from './LogWater';
import Profile from './Profile';
import Schedule from './Schedule';

type Page = 'profile' | 'home' | 'logwater' | 'schedule';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        initializeLocalDB();
        const profile = await getUserProfile();
        setCurrentPage(profile ? 'home' : 'profile');
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setCurrentPage('profile');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const handleProfileComplete = () => {
    setCurrentPage('home');
  };

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
  };

  const handleBack = () => {
    setCurrentPage('home');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#666' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {currentPage === 'profile' && (
        <Profile onComplete={handleProfileComplete} />
      )}
      {currentPage === 'home' && (
        <>
          <Home
            onNavigateToLog={() => handleNavigate('logwater')}
            onNavigateToSchedule={() => handleNavigate('schedule')}
          />
          <div style={{ marginTop: '30px', paddingBottom: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => handleNavigate('logwater')}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#10b981')}
            >
              Log Water
            </button>
            <button
              onClick={() => handleNavigate('schedule')}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#4f46e5')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#6366f1')}
            >
              View Schedule
            </button>
          </div>
        </>
      )}
      {currentPage === 'logwater' && (
        <>
          <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <button
              onClick={handleBack}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                marginBottom: '20px',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#4b5563')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#6b7280')}
            >
              ← Back
            </button>
          </div>
          <LogWater onSuccess={() => handleBack()} />
        </>
      )}
      {currentPage === 'schedule' && (
        <>
          <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <button
              onClick={handleBack}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                marginBottom: '20px',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#4b5563')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#6b7280')}
            >
              ← Back
            </button>
          </div>
          <Schedule />
        </>
      )}
    </div>
  );
}
