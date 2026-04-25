'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
      setSubmitting(false);
    }
  }

  if (isLoading || isAuthenticated) {
    return (
      <div className="login-page">
        <div className="login-spinner" />
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-header">
          <div className="login-logo">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="10" fill="rgba(34,211,238,0.15)" />
              <path
                d="M10 18c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8"
                stroke="#22d3ee"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="18" cy="18" r="3" fill="#22d3ee" />
            </svg>
          </div>
          <h1 className="login-title">DentalFlow</h1>
          <p className="login-subtitle">Sign in to your account</p>
        </div>

        {error && (
          <div className="login-error">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {error}
          </div>
        )}

        <div className="login-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@clinic.com"
            autoComplete="email"
            required
            disabled={submitting}
          />
        </div>

        <div className="login-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            disabled={submitting}
          />
        </div>

        <button type="submit" className="login-button" disabled={submitting || !email || !password}>
          {submitting ? (
            <span className="login-button-loading">
              <span className="login-button-spinner" />
              Signing in...
            </span>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--bg-deepest);
    padding: var(--space-md);
  }

  .login-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .login-card {
    width: 100%;
    max-width: 400px;
    background: var(--bg-glass);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    padding: var(--space-xl);
    box-shadow: var(--shadow-lg), var(--shadow-glow);
  }

  .login-header {
    text-align: center;
    margin-bottom: var(--space-lg);
  }

  .login-logo {
    display: flex;
    justify-content: center;
    margin-bottom: var(--space-md);
  }

  .login-title {
    font-family: var(--font-ui);
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 var(--space-xs);
    letter-spacing: -0.02em;
  }

  .login-subtitle {
    font-family: var(--font-ui);
    font-size: var(--text-base);
    color: var(--text-secondary);
    margin: 0;
  }

  .login-error {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--red-dim);
    color: var(--red);
    border: 1px solid rgba(248, 113, 113, 0.2);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    font-family: var(--font-ui);
    margin-bottom: var(--space-md);
  }

  .login-field {
    margin-bottom: var(--space-md);
  }

  .login-field label {
    display: block;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: var(--space-xs);
  }

  .login-field input {
    width: 100%;
    padding: 10px 14px;
    background: var(--bg-deep);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-ui);
    font-size: var(--text-base);
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
  }

  .login-field input::placeholder {
    color: var(--text-muted);
  }

  .login-field input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-dim);
  }

  .login-field input:disabled {
    opacity: 0.6;
  }

  .login-button {
    width: 100%;
    padding: 12px;
    margin-top: var(--space-sm);
    background: linear-gradient(135deg, var(--accent), var(--accent-hover));
    color: #0b0f1a;
    font-family: var(--font-ui);
    font-size: var(--text-base);
    font-weight: 600;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
  }

  .login-button:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .login-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .login-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .login-button-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
  }

  .login-button-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(11, 15, 26, 0.3);
    border-top-color: #0b0f1a;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
