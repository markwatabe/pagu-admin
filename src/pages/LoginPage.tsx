import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { LoginForm } from '../components/LoginForm';
import { Spinner } from '../components/Spinner';

export function LoginPage() {
  const { isLoading, user } = db.useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/', { replace: true });
    }
  }, [isLoading, user, navigate]);

  if (isLoading) return <Spinner />;
  if (user) return null; // redirect in progress

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-indigo-600">Pagu</h1>
          <p className="mt-2 text-sm text-gray-500">Admin panel — sign in to continue</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
