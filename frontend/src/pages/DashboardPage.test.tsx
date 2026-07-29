import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { dashboardService } from '../services/dashboardService';
import DashboardPage from './DashboardPage';

jest.mock('../services/dashboardService');

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );

describe('DashboardPage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows an error state when the dashboard request fails', async () => {
    (dashboardService.get as jest.Mock).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Unable to load dashboard data' } },
    });

    renderDashboard();
    await waitFor(() => expect(screen.getByText(/unable to load dashboard data/i)).toBeInTheDocument());
  });

  it('renders KPI totals and a critical-stock banner once data loads', async () => {
    (dashboardService.get as jest.Mock).mockResolvedValue({
      kpis: { totalItems: 42, totalInventoryValue: 1234.5, criticalItemCount: 3, lowItemCount: 1, excessItemCount: 0, pendingOrders: 0 },
      stockVsReorderByCategory: [{ categoryId: 'c1', categoryName: 'Outdoors', totalStock: 100, totalReorderPoint: 40, itemCount: 5 }],
      criticalItems: [],
      recentActivity: [],
    });

    renderDashboard();

    await waitFor(() => expect(screen.getByText('42')).toBeInTheDocument());
    expect(screen.getByText(/3 items at or below safety stock/i)).toBeInTheDocument();
  });

  it('renders an empty state for the chart when there are no categories yet', async () => {
    (dashboardService.get as jest.Mock).mockResolvedValue({
      kpis: { totalItems: 0, totalInventoryValue: 0, criticalItemCount: 0, lowItemCount: 0, excessItemCount: 0, pendingOrders: 0 },
      stockVsReorderByCategory: [],
      criticalItems: [],
      recentActivity: [],
    });

    renderDashboard();
    await waitFor(() => expect(screen.getByText(/no categories yet/i)).toBeInTheDocument());
  });
});
