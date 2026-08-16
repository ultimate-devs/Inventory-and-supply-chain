import { useNavigate } from 'react-router-dom';
import { Package, ClipboardList, Star, BarChart3 } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const FEATURES = [
  {
    icon: <Package className="h-5 w-5" />,
    title: 'Inventory Tracking',
    description: 'Live stock levels per item and category, with reorder-point and low-stock alerts.',
  },
  {
    icon: <ClipboardList className="h-5 w-5" />,
    title: 'Procurement & POs',
    description: 'Create, approve, and track purchase orders from a single workflow.',
  },
  {
    icon: <Star className="h-5 w-5" />,
    title: 'Supplier Scoring',
    description: 'Rank suppliers on delivery time, quality, and cost to compare sourcing options.',
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: 'Reorder Analytics',
    description: 'ROP/EOQ calculations and allocation algorithms surfaced on one dashboard.',
  },
];

const LandingPage = () => {
  const navigate = useNavigate();

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <Navbar />

      <section className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-4xl flex-col items-start px-6 py-20 text-left sm:py-28">
          <span className="mb-5 inline-flex items-center rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Inventory &amp; Supply Chain Management
          </span>

          <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
            Run inventory, procurement, and supplier decisions from one system.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            Track stock levels, raise and approve purchase orders, and compare suppliers on
            delivery, quality, and cost - in one place.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button variant="solid" className="px-6 py-3 text-base" onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button variant="ghost" className="px-6 py-3 text-base" onClick={scrollToFeatures}>
              See Features
            </Button>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need, in one place
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-400">
            Purpose-built tools that replace the spreadsheets and scattered tools slowing your
            team down.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Card
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-lg bg-primary-800 px-8 py-14 text-center text-white sm:px-16">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to get started?</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-100">
            Sign in with your account to start tracking inventory and managing purchase orders.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => navigate('/login')}
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary-800 transition-colors hover:bg-primary-50"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
