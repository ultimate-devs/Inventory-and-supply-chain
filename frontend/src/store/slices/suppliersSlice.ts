import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { supplierService } from '../../services/supplierService';
import { getApiErrorMessage } from '../../lib/apiClient';
import type { PaginationMeta } from '../../types/api';
import type {
  CatalogueEntryPayload,
  CreateSupplierPayload,
  Supplier,
  SupplierListQuery,
  SupplierRecommendation,
  UpdateSupplierPayload,
} from '../../types/supplier';

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface SuppliersState {
  suppliers: Supplier[];
  suppliersMeta: PaginationMeta | null;
  suppliersStatus: AsyncStatus;
  suppliersError: string | null;

  selectedSupplier: Supplier | null;
  selectedSupplierStatus: AsyncStatus;
  selectedSupplierError: string | null;

  recommendation: SupplierRecommendation | null;
  recommendationStatus: AsyncStatus;
}

const initialState: SuppliersState = {
  suppliers: [],
  suppliersMeta: null,
  suppliersStatus: 'idle',
  suppliersError: null,

  selectedSupplier: null,
  selectedSupplierStatus: 'idle',
  selectedSupplierError: null,

  recommendation: null,
  recommendationStatus: 'idle',
};

export const fetchSuppliers = createAsyncThunk(
  'suppliers/fetchSuppliers',
  async (query: SupplierListQuery = {}, { rejectWithValue }) => {
    try {
      return await supplierService.list(query);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to load suppliers'));
    }
  },
);

export const fetchSupplierById = createAsyncThunk(
  'suppliers/fetchSupplierById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await supplierService.getById(id);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to load supplier'));
    }
  },
);

export const createSupplier = createAsyncThunk(
  'suppliers/createSupplier',
  async (payload: CreateSupplierPayload, { rejectWithValue }) => {
    try {
      return await supplierService.create(payload);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to create supplier'));
    }
  },
);

export const updateSupplier = createAsyncThunk(
  'suppliers/updateSupplier',
  async ({ id, payload }: { id: string; payload: UpdateSupplierPayload }, { rejectWithValue }) => {
    try {
      return await supplierService.update(id, payload);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to update supplier'));
    }
  },
);

export const deleteSupplier = createAsyncThunk(
  'suppliers/deleteSupplier',
  async (id: string, { rejectWithValue }) => {
    try {
      await supplierService.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to delete supplier'));
    }
  },
);

export const setSupplierStatus = createAsyncThunk(
  'suppliers/setSupplierStatus',
  async ({ id, status }: { id: string; status: 'pending' | 'approved' | 'suspended' }, { rejectWithValue }) => {
    try {
      return await supplierService.setStatus(id, status);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to update supplier status'));
    }
  },
);

export const upsertCatalogueEntry = createAsyncThunk(
  'suppliers/upsertCatalogueEntry',
  async ({ id, payload }: { id: string; payload: CatalogueEntryPayload }, { rejectWithValue }) => {
    try {
      return await supplierService.upsertCatalogueEntry(id, payload);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to save catalogue entry'));
    }
  },
);

export const removeCatalogueEntry = createAsyncThunk(
  'suppliers/removeCatalogueEntry',
  async ({ id, itemId }: { id: string; itemId: string }, { rejectWithValue }) => {
    try {
      return await supplierService.removeCatalogueEntry(id, itemId);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to remove catalogue entry'));
    }
  },
);

export const fetchRecommendation = createAsyncThunk(
  'suppliers/fetchRecommendation',
  async (itemId: string, { rejectWithValue }) => {
    try {
      return await supplierService.recommend(itemId);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to compute supplier recommendation'));
    }
  },
);

const suppliersSlice = createSlice({
  name: 'suppliers',
  initialState,
  reducers: {
    clearSelectedSupplier: (state) => {
      state.selectedSupplier = null;
      state.selectedSupplierStatus = 'idle';
      state.selectedSupplierError = null;
    },
    clearRecommendation: (state) => {
      state.recommendation = null;
      state.recommendationStatus = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSuppliers.pending, (state) => {
        state.suppliersStatus = 'loading';
        state.suppliersError = null;
      })
      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.suppliersStatus = 'succeeded';
        state.suppliers = action.payload.data;
        state.suppliersMeta = action.payload.meta ?? null;
      })
      .addCase(fetchSuppliers.rejected, (state, action) => {
        state.suppliersStatus = 'failed';
        state.suppliersError = (action.payload as string) ?? 'Unable to load suppliers';
      })

      .addCase(fetchSupplierById.pending, (state) => {
        state.selectedSupplierStatus = 'loading';
        state.selectedSupplierError = null;
      })
      .addCase(fetchSupplierById.fulfilled, (state, action) => {
        state.selectedSupplierStatus = 'succeeded';
        state.selectedSupplier = action.payload;
      })
      .addCase(fetchSupplierById.rejected, (state, action) => {
        state.selectedSupplierStatus = 'failed';
        state.selectedSupplierError = (action.payload as string) ?? 'Unable to load supplier';
      })

      .addCase(createSupplier.fulfilled, (state, action) => {
        state.suppliers.unshift(action.payload);
      })

      .addCase(deleteSupplier.fulfilled, (state, action) => {
        state.suppliers = state.suppliers.filter((s) => s._id !== action.payload);
      });

    [updateSupplier, setSupplierStatus, upsertCatalogueEntry, removeCatalogueEntry].forEach((thunk) => {
      builder.addCase(thunk.fulfilled, (state, action) => {
        const idx = state.suppliers.findIndex((s) => s._id === action.payload._id);
        if (idx !== -1) state.suppliers[idx] = action.payload;
        if (state.selectedSupplier?._id === action.payload._id) state.selectedSupplier = action.payload;
      });
    });

    builder
      .addCase(fetchRecommendation.pending, (state) => {
        state.recommendationStatus = 'loading';
      })
      .addCase(fetchRecommendation.fulfilled, (state, action) => {
        state.recommendationStatus = 'succeeded';
        state.recommendation = action.payload;
      })
      .addCase(fetchRecommendation.rejected, (state) => {
        state.recommendationStatus = 'failed';
        state.recommendation = null;
      });
  },
});

export const { clearSelectedSupplier, clearRecommendation } = suppliersSlice.actions;
export default suppliersSlice.reducer;
