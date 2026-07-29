import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { categoryService, itemService } from '../../services/inventoryService';
import { getApiErrorMessage } from '../../lib/apiClient';
import type { PaginationMeta } from '../../types/api';
import type {
  Category,
  CreateItemPayload,
  Item,
  ItemListQuery,
  StockMovementPayload,
  UpdateItemPayload,
} from '../../types/inventory';

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

interface InventoryState {
  categories: Category[];
  categoriesStatus: AsyncStatus;
  categoriesError: string | null;

  items: Item[];
  itemsMeta: PaginationMeta | null;
  itemsStatus: AsyncStatus;
  itemsError: string | null;

  selectedItem: Item | null;
  selectedItemStatus: AsyncStatus;
  selectedItemError: string | null;
}

const initialState: InventoryState = {
  categories: [],
  categoriesStatus: 'idle',
  categoriesError: null,

  items: [],
  itemsMeta: null,
  itemsStatus: 'idle',
  itemsError: null,

  selectedItem: null,
  selectedItemStatus: 'idle',
  selectedItemError: null,
};

export const fetchCategories = createAsyncThunk('inventory/fetchCategories', async (_, { rejectWithValue }) => {
  try {
    return await categoryService.list();
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Unable to load categories'));
  }
});

export const createCategory = createAsyncThunk(
  'inventory/createCategory',
  async (payload: { name: string; description?: string }, { rejectWithValue }) => {
    try {
      return await categoryService.create(payload);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to create category'));
    }
  },
);

export const updateCategory = createAsyncThunk(
  'inventory/updateCategory',
  async ({ id, payload }: { id: string; payload: { name?: string; description?: string } }, { rejectWithValue }) => {
    try {
      return await categoryService.update(id, payload);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to update category'));
    }
  },
);

export const deleteCategory = createAsyncThunk(
  'inventory/deleteCategory',
  async (id: string, { rejectWithValue }) => {
    try {
      await categoryService.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to delete category'));
    }
  },
);

export const fetchItems = createAsyncThunk(
  'inventory/fetchItems',
  async (query: ItemListQuery = {}, { rejectWithValue }) => {
    try {
      return await itemService.list(query);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to load items'));
    }
  },
);

export const fetchItemById = createAsyncThunk(
  'inventory/fetchItemById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await itemService.getById(id);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to load item'));
    }
  },
);

export const createItem = createAsyncThunk(
  'inventory/createItem',
  async (payload: CreateItemPayload, { rejectWithValue }) => {
    try {
      return await itemService.create(payload);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to create item'));
    }
  },
);

export const updateItem = createAsyncThunk(
  'inventory/updateItem',
  async ({ id, payload }: { id: string; payload: UpdateItemPayload }, { rejectWithValue }) => {
    try {
      return await itemService.update(id, payload);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to update item'));
    }
  },
);

export const deleteItem = createAsyncThunk('inventory/deleteItem', async (id: string, { rejectWithValue }) => {
  try {
    await itemService.remove(id);
    return id;
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Unable to delete item'));
  }
});

export const addStockMovement = createAsyncThunk(
  'inventory/addStockMovement',
  async ({ id, payload }: { id: string; payload: StockMovementPayload }, { rejectWithValue }) => {
    try {
      return await itemService.addMovement(id, payload);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to record stock movement'));
    }
  },
);

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    clearSelectedItem: (state) => {
      state.selectedItem = null;
      state.selectedItemStatus = 'idle';
      state.selectedItemError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.categoriesStatus = 'loading';
        state.categoriesError = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categoriesStatus = 'succeeded';
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.categoriesStatus = 'failed';
        state.categoriesError = (action.payload as string) ?? 'Unable to load categories';
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.categories.push(action.payload);
        state.categories.sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        const idx = state.categories.findIndex((c) => c._id === action.payload._id);
        if (idx !== -1) state.categories[idx] = action.payload;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.categories = state.categories.filter((c) => c._id !== action.payload);
      })

      .addCase(fetchItems.pending, (state) => {
        state.itemsStatus = 'loading';
        state.itemsError = null;
      })
      .addCase(fetchItems.fulfilled, (state, action) => {
        state.itemsStatus = 'succeeded';
        state.items = action.payload.data;
        state.itemsMeta = action.payload.meta ?? null;
      })
      .addCase(fetchItems.rejected, (state, action) => {
        state.itemsStatus = 'failed';
        state.itemsError = (action.payload as string) ?? 'Unable to load items';
      })

      .addCase(fetchItemById.pending, (state) => {
        state.selectedItemStatus = 'loading';
        state.selectedItemError = null;
      })
      .addCase(fetchItemById.fulfilled, (state, action) => {
        state.selectedItemStatus = 'succeeded';
        state.selectedItem = action.payload;
      })
      .addCase(fetchItemById.rejected, (state, action) => {
        state.selectedItemStatus = 'failed';
        state.selectedItemError = (action.payload as string) ?? 'Unable to load item';
      })

      .addCase(createItem.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateItem.fulfilled, (state, action) => {
        const idx = state.items.findIndex((i) => i._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.selectedItem?._id === action.payload._id) state.selectedItem = action.payload;
      })
      .addCase(deleteItem.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => i._id !== action.payload);
      })
      .addCase(addStockMovement.fulfilled, (state, action) => {
        const idx = state.items.findIndex((i) => i._id === action.payload.item._id);
        if (idx !== -1) state.items[idx] = action.payload.item;
        if (state.selectedItem?._id === action.payload.item._id) state.selectedItem = action.payload.item;
      });
  },
});

export const { clearSelectedItem } = inventorySlice.actions;
export default inventorySlice.reducer;
