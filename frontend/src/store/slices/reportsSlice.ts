import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { reportService } from '../../services/reportService';
import { getApiErrorMessage } from '../../lib/apiClient';
import type {
  StockTurnoverRow,
  StockStatusBreakdownData,
  AlgorithmComparisonRow,
  BudgetUtilisationPoint,
  SupplierPerformanceRow,
  PoPipelineData,
  CategorySpendRow,
} from '../../types/reports';

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface ReportsState {
  stockTurnover: StockTurnoverRow[];
  stockTurnoverStatus: AsyncStatus;
  stockTurnoverError: string | null;

  stockStatusBreakdown: StockStatusBreakdownData | null;
  stockStatusBreakdownStatus: AsyncStatus;

  algorithmComparison: AlgorithmComparisonRow[];
  algorithmComparisonStatus: AsyncStatus;

  budgetUtilisation: BudgetUtilisationPoint[];
  budgetUtilisationStatus: AsyncStatus;

  supplierPerformance: SupplierPerformanceRow[];
  supplierPerformanceStatus: AsyncStatus;

  purchaseOrderPipeline: PoPipelineData | null;
  purchaseOrderPipelineStatus: AsyncStatus;

  categorySpend: CategorySpendRow[];
  categorySpendStatus: AsyncStatus;
}

const initialState: ReportsState = {
  stockTurnover: [],
  stockTurnoverStatus: 'idle',
  stockTurnoverError: null,

  stockStatusBreakdown: null,
  stockStatusBreakdownStatus: 'idle',

  algorithmComparison: [],
  algorithmComparisonStatus: 'idle',

  budgetUtilisation: [],
  budgetUtilisationStatus: 'idle',

  supplierPerformance: [],
  supplierPerformanceStatus: 'idle',

  purchaseOrderPipeline: null,
  purchaseOrderPipelineStatus: 'idle',

  categorySpend: [],
  categorySpendStatus: 'idle',
};

export const fetchStockTurnover = createAsyncThunk(
  'reports/fetchStockTurnover',
  async (params: { category?: string; days?: number } = {}, { rejectWithValue }) => {
    try {
      return await reportService.stockTurnover(params);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to load the stock turnover report'));
    }
  },
);

export const fetchStockStatusBreakdown = createAsyncThunk(
  'reports/fetchStockStatusBreakdown',
  async (_, { rejectWithValue }) => {
    try {
      return await reportService.stockStatusBreakdown();
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to load the stock status breakdown report'));
    }
  },
);

export const fetchAlgorithmComparisonReport = createAsyncThunk(
  'reports/fetchAlgorithmComparisonReport',
  async (params: { limit?: number } = {}, { rejectWithValue }) => {
    try {
      return await reportService.algorithmComparison(params);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to load the algorithm comparison report'));
    }
  },
);

export const fetchBudgetUtilisation = createAsyncThunk(
  'reports/fetchBudgetUtilisation',
  async (params: { from?: string; to?: string } = {}, { rejectWithValue }) => {
    try {
      return await reportService.budgetUtilisation(params);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to load the budget utilisation report'));
    }
  },
);

export const fetchSupplierPerformance = createAsyncThunk(
  'reports/fetchSupplierPerformance',
  async (_, { rejectWithValue }) => {
    try {
      return await reportService.supplierPerformance();
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to load the supplier performance report'));
    }
  },
);

export const fetchPurchaseOrderPipeline = createAsyncThunk(
  'reports/fetchPurchaseOrderPipeline',
  async (_, { rejectWithValue }) => {
    try {
      return await reportService.purchaseOrderPipeline();
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to load the purchase order pipeline report'));
    }
  },
);

export const fetchCategorySpend = createAsyncThunk(
  'reports/fetchCategorySpend',
  async (params: { from?: string; to?: string } = {}, { rejectWithValue }) => {
    try {
      return await reportService.categorySpend(params);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to load the category spend report'));
    }
  },
);

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStockTurnover.pending, (state) => {
        state.stockTurnoverStatus = 'loading';
        state.stockTurnoverError = null;
      })
      .addCase(fetchStockTurnover.fulfilled, (state, action) => {
        state.stockTurnoverStatus = 'succeeded';
        state.stockTurnover = action.payload;
      })
      .addCase(fetchStockTurnover.rejected, (state, action) => {
        state.stockTurnoverStatus = 'failed';
        state.stockTurnoverError = (action.payload as string) ?? 'Unable to load the stock turnover report';
      })

      .addCase(fetchStockStatusBreakdown.pending, (state) => {
        state.stockStatusBreakdownStatus = 'loading';
      })
      .addCase(fetchStockStatusBreakdown.fulfilled, (state, action) => {
        state.stockStatusBreakdownStatus = 'succeeded';
        state.stockStatusBreakdown = action.payload;
      })
      .addCase(fetchStockStatusBreakdown.rejected, (state) => {
        state.stockStatusBreakdownStatus = 'failed';
      })

      .addCase(fetchAlgorithmComparisonReport.pending, (state) => {
        state.algorithmComparisonStatus = 'loading';
      })
      .addCase(fetchAlgorithmComparisonReport.fulfilled, (state, action) => {
        state.algorithmComparisonStatus = 'succeeded';
        state.algorithmComparison = action.payload;
      })
      .addCase(fetchAlgorithmComparisonReport.rejected, (state) => {
        state.algorithmComparisonStatus = 'failed';
      })

      .addCase(fetchBudgetUtilisation.pending, (state) => {
        state.budgetUtilisationStatus = 'loading';
      })
      .addCase(fetchBudgetUtilisation.fulfilled, (state, action) => {
        state.budgetUtilisationStatus = 'succeeded';
        state.budgetUtilisation = action.payload;
      })
      .addCase(fetchBudgetUtilisation.rejected, (state) => {
        state.budgetUtilisationStatus = 'failed';
      })

      .addCase(fetchSupplierPerformance.pending, (state) => {
        state.supplierPerformanceStatus = 'loading';
      })
      .addCase(fetchSupplierPerformance.fulfilled, (state, action) => {
        state.supplierPerformanceStatus = 'succeeded';
        state.supplierPerformance = action.payload;
      })
      .addCase(fetchSupplierPerformance.rejected, (state) => {
        state.supplierPerformanceStatus = 'failed';
      })

      .addCase(fetchPurchaseOrderPipeline.pending, (state) => {
        state.purchaseOrderPipelineStatus = 'loading';
      })
      .addCase(fetchPurchaseOrderPipeline.fulfilled, (state, action) => {
        state.purchaseOrderPipelineStatus = 'succeeded';
        state.purchaseOrderPipeline = action.payload;
      })
      .addCase(fetchPurchaseOrderPipeline.rejected, (state) => {
        state.purchaseOrderPipelineStatus = 'failed';
      })

      .addCase(fetchCategorySpend.pending, (state) => {
        state.categorySpendStatus = 'loading';
      })
      .addCase(fetchCategorySpend.fulfilled, (state, action) => {
        state.categorySpendStatus = 'succeeded';
        state.categorySpend = action.payload;
      })
      .addCase(fetchCategorySpend.rejected, (state) => {
        state.categorySpendStatus = 'failed';
      });
  },
});

export default reportsSlice.reducer;
