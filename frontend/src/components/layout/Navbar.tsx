import { useNavigate } from 'react-router-dom';
import { Boxes } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import Button from '../ui/Button';

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-700 text-white">
            <Boxes className="h-4 w-4" />
          </span>
          SupplyChain Pro
        </button>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" onClick={() => navigate('/login')}>
            Login
          </Button>
          <Button variant="solid" onClick={() => navigate('/signup')}>
            Sign Up
          </Button>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
