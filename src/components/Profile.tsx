import { useState } from 'react';
import { saveUserProfile } from '../hydrationRepo';
import { calculateDailyWaterTarget } from '../services/hydrationCalculator';

interface ProfileProps {
  onComplete: () => void;
}

export default function Profile({ onComplete }: ProfileProps) {
  const [weight, setWeight] = useState('');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [sleepTime, setSleepTime] = useState('23:00');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'moderate' | 'high'>('moderate');
  const [climate, setClimate] = useState<'temperate' | 'hot'>('temperate');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const weightNum = parseFloat(weight);
    if (!weightNum || weightNum <= 0) {
      setError('Please enter a valid weight');
      return;
    }

    const dailyTarget = calculateDailyWaterTarget({
      weightKg: weightNum,
      gender: 'male',
      activityLevel,
      climate,
    });

    try {
      await saveUserProfile({
        id: 'demo-user-123',
        name: 'Demo User',
        age: 30,
        weight: weightNum,
        height: 170,
        activityLevel,
        dailyTargetMl: dailyTarget,
        wakeTime,
        sleepTime,
      });

      onComplete();
    } catch (err) {
      setError('Failed to save profile');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '500px', width: '100%', padding: '32px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h1 style={{ color: '#1976D2', marginTop: 0, marginBottom: '8px' }}>Welcome to Hydration Tracker</h1>
        <p style={{ color: '#666', marginBottom: '32px' }}>Let's set up your profile to calculate your daily water target</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              Weight (kg)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 70"
              required
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              Wake Up Time
            </label>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              Sleep Time
            </label>
            <input
              type="time"
              value={sleepTime}
              onChange={(e) => setSleepTime(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              Activity Level
            </label>
            <select
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value as 'sedentary' | 'moderate' | 'high')}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontFamily: 'inherit',
                backgroundColor: 'white',
                boxSizing: 'border-box',
              }}
            >
              <option value="sedentary">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              Climate
            </label>
            <select
              value={climate}
              onChange={(e) => setClimate(e.target.value as 'temperate' | 'hot')}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontFamily: 'inherit',
                backgroundColor: 'white',
                boxSizing: 'border-box',
              }}
            >
              <option value="temperate">Normal</option>
              <option value="hot">Hot</option>
            </select>
          </div>

          {error && (
            <div style={{ padding: '12px', backgroundColor: '#fee', color: '#c33', borderRadius: '8px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1976D2')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2196F3')}
          >
            Start Tracking
          </button>
        </form>
      </div>
    </div>
  );
}
