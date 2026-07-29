import { api } from '../lib/apiClient';
import type { ApiEnvelope } from '../types/api';
import type {
  Category,
  CreateItemPayload,
  Item,
  ItemListQuery,
  StockMovement,
  StockMovementPayload,
  UpdateItemPayload,
} from '../types/inventory';

export const categoryService = {
  async list(search?: string): Promise<Category[]> {
    const { data } = await api.get<ApiEnvelope<Category[]>>('/categories', {
      params: { limit: 100, ...(search ? { search } : {}) },
    });
    return data.data;
  },

  async create(payload: { name: string; description?: string }): Promise<Category> {
    const { data } = await api.post<ApiEnvelope<Category>>('/categories', payload);
    return data.data;
  },

  async update(id: string, payload: { name?: string; description?: string }): Promise<Category> {
    const { data } = await api.put<ApiEnvelope<Category>>(`/categories/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/categories/${id}`);
  },
};

export const itemService = {
  async list(query: ItemListQuery = {}): Promise<ApiEnvelope<Item[]>> {
    const { data } = await api.get<ApiEnvelope<Item[]>>('/items', { params: query });
    return data;
  },

  async getById(id: string): Promise<Item> {
    const { data } = await api.get<ApiEnvelope<Item>>(`/items/${id}`);
    return data.data;
  },

  async create(payload: CreateItemPayload): Promise<Item> {
    const { data } = await api.post<ApiEnvelope<Item>>('/items', payload);
    return data.data;
  },

  async update(id: string, payload: UpdateItemPayload): Promise<Item> {
    const { data } = await api.put<ApiEnvelope<Item>>(`/items/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/items/${id}`);
  },

  async listMovements(id: string): Promise<StockMovement[]> {
    const { data } = await api.get<ApiEnvelope<StockMovement[]>>(`/items/${id}/movements`);
    return data.data;
  },

  async addMovement(id: string, payload: StockMovementPayload): Promise<{ item: Item; movement: StockMovement }> {
    const { data } = await api.post<ApiEnvelope<{ item: Item; movement: StockMovement }>>(
      `/items/${id}/movements`,
      payload,
    );
    return data.data;
  },
};
