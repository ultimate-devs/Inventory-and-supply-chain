import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'solid';
  children: ReactNode;
}

const variantClasses: Record<'ghost' | 'solid', string> = {
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
  solid:
    'bg-gradient-to-r from-primary-600 to-fuchsia-600 text-white shadow-md shadow-primary-600/25 hover:shadow-lg hover:shadow-primary-600/30 hover:brightness-110',
};

const Button = ({ variant = 'solid', className = '', children, ...rest }: ButtonProps) => {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;
