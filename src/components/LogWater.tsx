import { useState } from 'react';
import { saveWaterIntakeEntry } from '../hydrationRepo';

interface LogWaterProps {
  onSuccess?: () => void;
  userId?: string;
}

const DEMO_USER_ID = 'demo-user-123';
//chinal
export default function LogWater({ onSuccess, userId = DEMO_USER_ID }: LogWaterProps) {
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const presets = [250, 500, 750, 1000];

  const handleLogWater = async (amount: number) => {
    setLoading(true);
    setMessage('');
    try {
      await saveWaterIntakeEntry({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        amountMl: amount,
        source: 'manual',
      });
      setMessage(`Logged ${amount}ml`);
      setCustomAmount('');
      onSuccess?.();
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage('Failed to log water');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = () => {
    const amount = parseInt(customAmount);
    if (amount > 0) {
      handleLogWater(amount);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h1 style={{ color: '#1976D2', marginTop: 0, marginBottom: '30px' }}>Log Water Intake</h1>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Quick Add</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px' }}>
            {presets.map((amount) => (
              <button
                key={amount}
                onClick={() => handleLogWater(amount)}
                disabled={loading}
                style={{
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  backgroundColor: loading ? '#ccc' : '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#1976D2')}
                onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = '#2196F3')}
              >
                {amount}ml
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Custom Amount</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="number"
              placeholder="Enter amount in ml"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={handleCustomSubmit}
              disabled={loading || !customAmount}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                backgroundColor: loading || !customAmount ? '#ccc' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading || !customAmount ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => !loading && customAmount && (e.currentTarget.style.backgroundColor = '#059669')}
              onMouseOut={(e) => !loading && customAmount && (e.currentTarget.style.backgroundColor = '#10b981')}
            >
              Add
            </button>
          </div>
        </div>

        {message && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: message.includes('Failed') ? '#fee' : '#efe',
            color: message.includes('Failed') ? '#c33' : '#3c3',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
