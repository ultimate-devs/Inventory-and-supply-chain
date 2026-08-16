import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/ui/Input';
import { useAppDispatch } from '../store/hooks';
import { login } from '../store/slices/authSlice';

interface FormErrors {
  email?: string;
  password?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email)) {
      nextErrors.email = 'Enter a valid email address';
    }
    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    const result = await dispatch(login({ email, password }));
    setIsSubmitting(false);

    if (login.fulfilled.match(result)) {
      navigate('/dashboard');
    } else {
      setFormError((result.payload as string) || 'Unable to sign in');
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to access your dashboard">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <Input
          id="email"
          label="Email address"
          type="email"
          icon={<Mail className="h-4 w-4" />}
          placeholder="you@company.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />

        <Input
          id="password"
          label="Password"
          type="password"
          icon={<Lock className="h-4 w-4" />}
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500/40 dark:border-slate-600 dark:bg-slate-800"
            />
            Remember me
          </label>
          <Link
            to="/forgot-password"
            className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
