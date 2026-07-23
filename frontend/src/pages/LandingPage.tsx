import { useNavigate } from 'react-router-dom';
import { Package, ClipboardList, Star, BarChart3, Sparkles } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const FEATURES = [
  {
    icon: <Package className="h-5 w-5" />,
    title: 'Inventory Tracking',
    description: 'Real-time stock levels across every warehouse, with automated low-stock alerts.',
  },
  {
    icon: <ClipboardList className="h-5 w-5" />,
    title: 'Procurement & POs',
    description: 'Create, approve, and track purchase orders from a single streamlined workflow.',
  },
  {
    icon: <Star className="h-5 w-5" />,
    title: 'Supplier Scoring',
    description: 'Rank suppliers on delivery time, quality, and cost to make smarter sourcing calls.',
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: 'Real-Time Analytics',
    description: 'Dashboards that surface trends and bottlenecks across your supply chain.',
  },
];

const STATS = [
  { value: '2.4M+', label: 'SKUs tracked' },
  { value: '99.9%', label: 'Platform uptime' },
  { value: '500+', label: 'Operations teams' },
];

const LandingPage = () => {
  const navigate = useNavigate();

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary-400/20 blur-3xl dark:bg-primary-500/10" />
        <div className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full bg-fuchsia-400/20 blur-3xl dark:bg-fuchsia-500/10" />

        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center sm:py-32">
          <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 dark:border-primary-800 dark:bg-primary-950/50 dark:text-primary-300">
            <Sparkles className="h-3.5 w-3.5" />
            Built for modern operations teams
          </span>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Run your supply chain
            <br className="hidden sm:block" />{' '}
            <span className="bg-gradient-to-r from-primary-600 to-fuchsia-600 bg-clip-text text-transparent">
              on one platform
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            Track inventory, manage procurement, and score suppliers in real time - all in one
            system built for growing operations.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button variant="solid" className="px-6 py-3 text-base" onClick={() => navigate('/signup')}>
              Get Started
            </Button>
            <Button variant="ghost" className="px-6 py-3 text-base" onClick={scrollToFeatures}>
              Live Demo
            </Button>
          </div>

          <dl className="mt-16 grid w-full max-w-2xl grid-cols-3 gap-6 border-t border-slate-200 pt-10 dark:border-slate-800">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <dt className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
                  {stat.value}
                </dt>
                <dd className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                  {stat.label}
                </dd>
              </div>
            ))}
          </dl>
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
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-fuchsia-600 px-8 py-14 text-center text-white sm:px-16">
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <h2 className="relative text-2xl font-bold sm:text-3xl">
            Ready to simplify your supply chain?
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-primary-100">
            Create your free account and get your team up and running in minutes.
          </p>
          <div className="relative mt-8 flex justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow-lg transition-transform duration-200 hover:scale-105"
            >
              Create free account
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
