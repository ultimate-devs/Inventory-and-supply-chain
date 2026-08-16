import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, AlertCircle } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/ui/Input';
import { useAppDispatch } from '../store/hooks';
import { changePassword } from '../store/slices/authSlice';

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!currentPassword) {
      nextErrors.currentPassword = 'Current password is required';
    }

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
    const result = await dispatch(changePassword({ currentPassword, newPassword }));
    setIsSubmitting(false);

    if (changePassword.fulfilled.match(result)) {
      navigate('/dashboard', { replace: true });
    } else {
      setFormError((result.payload as string) || 'Unable to change password');
    }
  };

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="You're signing in with a temporary password - choose a new one to continue"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <Input
          id="currentPassword"
          label="Temporary password"
          type="password"
          icon={<Lock className="h-4 w-4" />}
          placeholder="Enter the password you were emailed"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          error={errors.currentPassword}
        />

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
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default ChangePasswordPage;
