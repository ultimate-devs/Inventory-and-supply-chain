import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { purchaseOrderService } from '../../services/purchaseOrderService';
import { getApiErrorMessage } from '../../lib/apiClient';
import type { PaginationMeta } from '../../types/api';
import type {
  CreatePurchaseOrderPayload,
  PurchaseOrder,
  PurchaseOrderListQuery,
  ReceiveGoodsPayload,
} from '../../types/purchaseOrder';

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface PurchaseOrdersState {
  purchaseOrders: PurchaseOrder[];
  purchaseOrdersMeta: PaginationMeta | null;
  purchaseOrdersStatus: AsyncStatus;
  purchaseOrdersError: string | null;

  selectedPurchaseOrder: PurchaseOrder | null;
  selectedPurchaseOrderStatus: AsyncStatus;
  selectedPurchaseOrderError: string | null;
}

const initialState: PurchaseOrdersState = {
  purchaseOrders: [],
  purchaseOrdersMeta: null,
  purchaseOrdersStatus: 'idle',
  purchaseOrdersError: null,

  selectedPurchaseOrder: null,
  selectedPurchaseOrderStatus: 'idle',
  selectedPurchaseOrderError: null,
};

export const fetchPurchaseOrders = createAsyncThunk(
  'purchaseOrders/fetchPurchaseOrders',
  async (query: PurchaseOrderListQuery = {}, { rejectWithValue }) => {
    try {
      return await purchaseOrderService.list(query);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to load purchase orders'));
    }
  },
);

export const fetchPurchaseOrderById = createAsyncThunk(
  'purchaseOrders/fetchPurchaseOrderById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await purchaseOrderService.getById(id);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to load purchase order'));
    }
  },
);

export const createPurchaseOrder = createAsyncThunk(
  'purchaseOrders/createPurchaseOrder',
  async (payload: CreatePurchaseOrderPayload, { rejectWithValue }) => {
    try {
      return await purchaseOrderService.create(payload);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to create purchase order'));
    }
  },
);

const makeTransitionThunk = <TArg extends { id: string; version: number }>(
  type: string,
  call: (arg: TArg) => Promise<PurchaseOrder>,
) =>
  createAsyncThunk(type, async (arg: TArg, { rejectWithValue }) => {
    try {
      return await call(arg);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to update purchase order'));
    }
  });

export const submitPurchaseOrder = makeTransitionThunk('purchaseOrders/submit', ({ id, version }) =>
  purchaseOrderService.submit(id, version),
);
export const approvePurchaseOrder = makeTransitionThunk<{ id: string; version: number; note?: string }>(
  'purchaseOrders/approve',
  ({ id, version, note }) => purchaseOrderService.approve(id, version, note),
);
export const rejectPurchaseOrder = makeTransitionThunk<{ id: string; version: number; note?: string }>(
  'purchaseOrders/reject',
  ({ id, version, note }) => purchaseOrderService.reject(id, version, note),
);
export const sendPurchaseOrder = makeTransitionThunk('purchaseOrders/send', ({ id, version }) =>
  purchaseOrderService.send(id, version),
);
export const shipPurchaseOrder = makeTransitionThunk('purchaseOrders/ship', ({ id, version }) =>
  purchaseOrderService.ship(id, version),
);
export const cancelPurchaseOrder = makeTransitionThunk<{ id: string; version: number; note?: string }>(
  'purchaseOrders/cancel',
  ({ id, version, note }) => purchaseOrderService.cancel(id, version, note),
);

export const deletePurchaseOrder = createAsyncThunk(
  'purchaseOrders/deletePurchaseOrder',
  async (id: string, { rejectWithValue }) => {
    try {
      await purchaseOrderService.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to delete purchase order'));
    }
  },
);

export const receiveGoods = createAsyncThunk(
  'purchaseOrders/receiveGoods',
  async ({ id, payload }: { id: string; payload: ReceiveGoodsPayload }, { rejectWithValue }) => {
    try {
      const result = await purchaseOrderService.receive(id, payload);
      return result.purchaseOrder;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to record goods receipt'));
    }
  },
);

const purchaseOrdersSlice = createSlice({
  name: 'purchaseOrders',
  initialState,
  reducers: {
    clearSelectedPurchaseOrder: (state) => {
      state.selectedPurchaseOrder = null;
      state.selectedPurchaseOrderStatus = 'idle';
      state.selectedPurchaseOrderError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPurchaseOrders.pending, (state) => {
        state.purchaseOrdersStatus = 'loading';
        state.purchaseOrdersError = null;
      })
      .addCase(fetchPurchaseOrders.fulfilled, (state, action) => {
        state.purchaseOrdersStatus = 'succeeded';
        state.purchaseOrders = action.payload.data;
        state.purchaseOrdersMeta = action.payload.meta ?? null;
      })
      .addCase(fetchPurchaseOrders.rejected, (state, action) => {
        state.purchaseOrdersStatus = 'failed';
        state.purchaseOrdersError = (action.payload as string) ?? 'Unable to load purchase orders';
      })

      .addCase(fetchPurchaseOrderById.pending, (state) => {
        state.selectedPurchaseOrderStatus = 'loading';
        state.selectedPurchaseOrderError = null;
      })
      .addCase(fetchPurchaseOrderById.fulfilled, (state, action) => {
        state.selectedPurchaseOrderStatus = 'succeeded';
        state.selectedPurchaseOrder = action.payload;
      })
      .addCase(fetchPurchaseOrderById.rejected, (state, action) => {
        state.selectedPurchaseOrderStatus = 'failed';
        state.selectedPurchaseOrderError = (action.payload as string) ?? 'Unable to load purchase order';
      })

      .addCase(createPurchaseOrder.fulfilled, (state, action) => {
        state.purchaseOrders.unshift(action.payload);
      })

      .addCase(deletePurchaseOrder.fulfilled, (state, action) => {
        state.purchaseOrders = state.purchaseOrders.filter((po) => po._id !== action.payload);
      });

    [
      submitPurchaseOrder,
      approvePurchaseOrder,
      rejectPurchaseOrder,
      sendPurchaseOrder,
      shipPurchaseOrder,
      cancelPurchaseOrder,
      receiveGoods,
    ].forEach((thunk) => {
      builder.addCase(thunk.fulfilled, (state, action) => {
        const idx = state.purchaseOrders.findIndex((po) => po._id === action.payload._id);
        if (idx !== -1) state.purchaseOrders[idx] = action.payload;
        if (state.selectedPurchaseOrder?._id === action.payload._id) state.selectedPurchaseOrder = action.payload;
      });
    });
  },
});

export const { clearSelectedPurchaseOrder } = purchaseOrdersSlice.actions;
export default purchaseOrdersSlice.reducer;
