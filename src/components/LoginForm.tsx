import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/db';

export function LoginForm() {
  const navigate = useNavigate();
  const [sentEmail, setSentEmail] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await db.auth.sendMagicCode({ email });
      setSentEmail(email);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send code';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await db.auth.signInWithMagicCode({ email: sentEmail, code });
      navigate('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid code';
      setError(message);
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  if (!sentEmail) {
    return (
      <form onSubmit={handleSendCode} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="you@pagu.app"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send magic code'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyCode} className="space-y-4">
      <p className="text-sm text-gray-500">
        A 6-digit code was sent to <strong>{sentEmail}</strong>.
      </p>
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-gray-700">
          Verification code
        </label>
        <input
          id="code"
          type="text"
          inputMode="numeric"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="123456"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Verifying…' : 'Sign in'}
      </button>
      <button
        type="button"
        onClick={() => { setSentEmail(''); setCode(''); setError(''); }}
        className="w-full text-sm text-gray-500 hover:text-gray-700"
      >
        Use a different email
      </button>
    </form>
  );
}
