import React, { useState } from 'react';
import { User } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../ui/Toast';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (user: User) => void;
  onClose: () => void;
}

export function AuthModal({ isOpen, onSuccess, onClose }: AuthModalProps) {
  const { error, success } = useToast();
  const [authTab, setAuthTab] = useState<'password' | 'pin'>('password');
  const [email, setEmail] = useState('manager@demo.local');
  const [password, setPassword] = useState('DemoPass123!');
  const [pin, setPin] = useState('1234');
  const [selectedCashierId, setSelectedCashierId] = useState('c-1');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      let res;
      if (authTab === 'password') {
        res = await api.auth.login(email, password);
      } else {
        res = await api.auth.pinLogin(selectedCashierId, pin);
      }

      if (res && res.accessToken) {
        localStorage.setItem('pos_access_token', res.accessToken);
        localStorage.setItem('pos_refresh_token', res.refreshToken);
        success(`Signed in as ${res.user.fullName} (${(res.user.role || 'manager').toUpperCase()})`);
        onSuccess(res.user);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(13, 37, 61, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 2000,
      }}
    >
      <div
        className="auth-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: 14,
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          width: 'min(420px, 92vw)',
          padding: '30px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#13283b' }}>
            pesa<span style={{ color: '#147c70' }}>POS</span> Sign In
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: '#778899' }}>
            Choose manager credentials or cashier PIN
          </p>
        </div>

        <div className="auth-nav" style={{ display: 'flex', borderBottom: '1px solid #edf2f5', marginBottom: 20 }}>
          <button
            type="button"
            className={authTab === 'password' ? 'active' : ''}
            onClick={() => setAuthTab('password')}
            style={{
              flex: 1,
              padding: 10,
              border: 0,
              background: 'transparent',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              color: authTab === 'password' ? '#147c70' : '#8898a6',
              borderBottom: authTab === 'password' ? '2px solid #147c70' : '2px solid transparent',
            }}
          >
            Manager Email
          </button>
          <button
            type="button"
            className={authTab === 'pin' ? 'active' : ''}
            onClick={() => setAuthTab('pin')}
            style={{
              flex: 1,
              padding: 10,
              border: 0,
              background: 'transparent',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              color: authTab === 'pin' ? '#147c70' : '#8898a6',
              borderBottom: authTab === 'pin' ? '2px solid #147c70' : '2px solid transparent',
            }}
          >
            Cashier PIN
          </button>
        </div>

        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {authTab === 'password' ? (
            <>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
                Email Address
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', marginTop: 6, padding: '10px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 13 }}
                />
              </label>

              <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
                Password
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', marginTop: 6, padding: '10px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 13 }}
                />
              </label>
            </>
          ) : (
            <>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
                Select Cashier Account
                <select
                  value={selectedCashierId}
                  onChange={(e) => setSelectedCashierId(e.target.value)}
                  style={{ width: '100%', marginTop: 6, padding: '10px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 13 }}
                >
                  <option value="c-1">Cashier One</option>
                  <option value="c-2">Cashier Two</option>
                </select>
              </label>

              <label style={{ fontSize: 12, fontWeight: 700, color: '#334455' }}>
                4-Digit Security PIN
                <input
                  required
                  type="password"
                  maxLength={6}
                  placeholder="e.g. 1234"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  style={{ width: '100%', marginTop: 6, padding: '10px 12px', border: '1px solid #dce4e8', borderRadius: 7, fontSize: 16, letterSpacing: 4 }}
                />
              </label>
            </>
          )}

          <div style={{ marginTop: 4 }}>
            <span style={{ fontSize: 11, color: '#778899', display: 'block', marginBottom: 6 }}>
              Quick demo account:
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span
                onClick={() => {
                  setAuthTab('password');
                  setEmail('manager@demo.local');
                  setPassword('DemoPass123!');
                }}
                style={{
                  background: '#f1f5f8',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#147c70',
                  border: '1px dashed #c0d3e0',
                }}
              >
                Manager: manager@demo.local
              </span>
              <span
                onClick={() => {
                  setAuthTab('pin');
                  setPin('1234');
                }}
                style={{
                  background: '#f1f5f8',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#147c70',
                  border: '1px dashed #c0d3e0',
                }}
              >
                Cashier PIN: 1234
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="primary"
            disabled={loading}
            style={{ width: '100%', padding: 12, marginTop: 10, fontSize: 14 }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
