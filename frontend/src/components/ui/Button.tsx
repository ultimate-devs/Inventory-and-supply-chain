import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'solid';
  children: ReactNode;
}

const variantClasses: Record<'ghost' | 'solid', string> = {
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
  solid: 'bg-primary-700 text-white hover:bg-primary-800',
};

const Button = ({ variant = 'solid', className = '', children, ...rest }: ButtonProps) => {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;
