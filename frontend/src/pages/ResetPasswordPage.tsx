import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/ui/Input';
import { authService } from '../services/authService';
import { getApiErrorMessage } from '../lib/apiClient';

interface FormErrors {
  newPassword?: string;
  confirmPassword?: string;
}

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!newPassword) {
      nextErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      nextErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/\d/.test(newPassword)) {
      nextErrors.newPassword = 'Password must contain a number';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password';
    } else if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
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
    try {
      await authService.resetPassword({ token, newPassword });
      setSuccess(true);
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Unable to reset password'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Invalid reset link" subtitle="This password reset link is missing or malformed">
        <div className="space-y-5 text-center">
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-left text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>No reset token was found in this link. Please request a new one.</span>
          </div>
          <Link
            to="/forgot-password"
            className="inline-block font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Request a new reset link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout title="Password reset" subtitle="Your password has been updated">
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Your password has been reset. All previous sessions have been signed out for security - please sign in
            again with your new password.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-600/25 transition-all duration-200 hover:shadow-lg hover:shadow-primary-600/30"
          >
            Go to sign in
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Choose a new password for your account">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <Input
          id="newPassword"
          label="New password"
          type="password"
          icon={<Lock className="h-4 w-4" />}
          placeholder="Create a new password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={errors.newPassword}
        />

        <Input
          id="confirmPassword"
          label="Confirm new password"
          type="password"
          icon={<Lock className="h-4 w-4" />}
          placeholder="Re-enter your new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-600/25 transition-all duration-200 hover:shadow-lg hover:shadow-primary-600/30 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Resetting...' : 'Reset password'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
