import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Building2, Loader2, AlertCircle, Check } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/ui/Input';
import { useAppDispatch } from '../store/hooks';
import { register, login } from '../store/slices/authSlice';

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getPasswordStrength = (password: string) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { label: 'Weak', percent: 25, color: 'bg-red-500' };
  if (score <= 3) return { label: 'Fair', percent: 55, color: 'bg-amber-500' };
  if (score === 4) return { label: 'Good', percent: 80, color: 'bg-emerald-500' };
  return { label: 'Strong', percent: 100, color: 'bg-emerald-500' };
};

const SignupPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!fullName.trim()) {
      nextErrors.fullName = 'Full name is required';
    }

    if (!email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email)) {
      nextErrors.email = 'Enter a valid email address';
    }

    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password';
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    if (!agreedToTerms) {
      nextErrors.terms = 'You must accept the terms to continue';
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

    const registerResult = await dispatch(register({ name: fullName, email, password }));
    if (!register.fulfilled.match(registerResult)) {
      setIsSubmitting(false);
      setFormError((registerResult.payload as string) || 'Unable to create account');
      return;
    }

    // Registration does not log the user in - sign them in immediately after.
    const loginResult = await dispatch(login({ email, password }));
    setIsSubmitting(false);

    if (login.fulfilled.match(loginResult)) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start managing your supply chain in minutes">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <Input
          id="fullName"
          label="Full name"
          type="text"
          icon={<User className="h-4 w-4" />}
          placeholder="Jane Cooper"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
        />

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
          id="company"
          label="Company (optional)"
          type="text"
          icon={<Building2 className="h-4 w-4" />}
          placeholder="Acme Logistics"
          autoComplete="organization"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />

        <div>
          <Input
            id="password"
            label="Password"
            type="password"
            icon={<Lock className="h-4 w-4" />}
            placeholder="Create a strong password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          {password && (
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                  style={{ width: `${strength.percent}%` }}
                />
              </div>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                Password strength: {strength.label}
              </p>
            </div>
          )}
        </div>

        <Input
          id="confirmPassword"
          label="Confirm password"
          type="password"
          icon={<Lock className="h-4 w-4" />}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
        />

        <div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400">
            <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="peer h-4 w-4 appearance-none rounded border border-slate-300 bg-white checked:border-primary-500 checked:bg-primary-500 dark:border-slate-600 dark:bg-slate-800"
              />
              <Check className="pointer-events-none absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100" />
            </span>
            <span>
              I agree to the{' '}
              <Link
                to="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                to="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                Privacy Policy
              </Link>
            </span>
          </label>
          {errors.terms && <p className="mt-1.5 text-xs font-medium text-red-500">{errors.terms}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-600/25 transition-all duration-200 hover:shadow-lg hover:shadow-primary-600/30 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>

        <p className="pt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default SignupPage;
