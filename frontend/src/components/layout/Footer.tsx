import { Link } from 'react-router-dom';
import { Boxes } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-slate-200 px-6 py-10 dark:border-slate-800">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-700 text-white">
              <Boxes className="h-3.5 w-3.5" />
            </span>
            SupplyChain Pro
          </div>

          <nav className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
            <Link to="/terms" className="transition-colors hover:text-slate-900 dark:hover:text-slate-100">
              Terms of Service
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-slate-900 dark:hover:text-slate-100">
              Privacy Policy
            </Link>
          </nav>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <p>Built for the Inventory &amp; Supply Chain Management course project.</p>
          <p className="mt-1">&copy; {new Date().getFullYear()} SupplyChain Pro. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
