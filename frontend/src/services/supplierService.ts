import { api } from '../lib/apiClient';
import type { ApiEnvelope } from '../types/api';
import type {
  CatalogueEntryPayload,
  CreateSupplierPayload,
  Supplier,
  SupplierListQuery,
  SupplierRecommendation,
  UpdateSupplierPayload,
} from '../types/supplier';

export const supplierService = {
  async list(query: SupplierListQuery = {}): Promise<ApiEnvelope<Supplier[]>> {
    const { data } = await api.get<ApiEnvelope<Supplier[]>>('/suppliers', { params: query });
    return data;
  },

  async ranked(): Promise<Supplier[]> {
    const { data } = await api.get<ApiEnvelope<Supplier[]>>('/suppliers/ranked');
    return data.data;
  },

  async recommend(itemId: string): Promise<SupplierRecommendation> {
    const { data } = await api.get<ApiEnvelope<SupplierRecommendation>>('/suppliers/recommend', {
      params: { item: itemId },
    });
    return data.data;
  },

  async getById(id: string): Promise<Supplier> {
    const { data } = await api.get<ApiEnvelope<Supplier>>(`/suppliers/${id}`);
    return data.data;
  },

  async create(payload: CreateSupplierPayload): Promise<Supplier> {
    const { data } = await api.post<ApiEnvelope<Supplier>>('/suppliers', payload);
    return data.data;
  },

  async update(id: string, payload: UpdateSupplierPayload): Promise<Supplier> {
    const { data } = await api.put<ApiEnvelope<Supplier>>(`/suppliers/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/suppliers/${id}`);
  },

  async setStatus(id: string, status: 'pending' | 'approved' | 'suspended'): Promise<Supplier> {
    const { data } = await api.patch<ApiEnvelope<Supplier>>(`/suppliers/${id}/status`, { status });
    return data.data;
  },

  async upsertCatalogueEntry(id: string, payload: CatalogueEntryPayload): Promise<Supplier> {
    const { data } = await api.post<ApiEnvelope<Supplier>>(`/suppliers/${id}/catalogue`, payload);
    return data.data;
  },

  async removeCatalogueEntry(id: string, itemId: string): Promise<Supplier> {
    const { data } = await api.delete<ApiEnvelope<Supplier>>(`/suppliers/${id}/catalogue/${itemId}`);
    return data.data;
  },
};
