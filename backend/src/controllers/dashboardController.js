import { getDashboardData } from '../services/dashboardService.js';
import { asyncHandler, sendResponse } from '../utils/sendResponse.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const data = await getDashboardData();
  sendResponse(res, 200, { data, message: 'Dashboard data retrieved' });
});
