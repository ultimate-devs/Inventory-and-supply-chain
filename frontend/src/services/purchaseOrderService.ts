import { api } from '../lib/apiClient';
import type { ApiEnvelope } from '../types/api';
import type {
  CreatePurchaseOrderPayload,
  PurchaseOrder,
  PurchaseOrderListQuery,
  ReceiveGoodsPayload,
  ReceiveGoodsResult,
} from '../types/purchaseOrder';

const withVersion = (version: number) => ({ version });

export const purchaseOrderService = {
  async list(query: PurchaseOrderListQuery = {}): Promise<ApiEnvelope<PurchaseOrder[]>> {
    const { data } = await api.get<ApiEnvelope<PurchaseOrder[]>>('/purchase-orders', { params: query });
    return data;
  },

  async getById(id: string): Promise<PurchaseOrder> {
    const { data } = await api.get<ApiEnvelope<PurchaseOrder>>(`/purchase-orders/${id}`);
    return data.data;
  },

  async create(payload: CreatePurchaseOrderPayload): Promise<PurchaseOrder> {
    const { data } = await api.post<ApiEnvelope<PurchaseOrder>>('/purchase-orders', payload);
    return data.data;
  },

  async updateDraft(
    id: string,
    payload: { lines?: CreatePurchaseOrderPayload['lines']; expectedDeliveryDate?: string },
  ): Promise<PurchaseOrder> {
    const { data } = await api.put<ApiEnvelope<PurchaseOrder>>(`/purchase-orders/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/purchase-orders/${id}`);
  },

  async submit(id: string, version: number): Promise<PurchaseOrder> {
    const { data } = await api.post<ApiEnvelope<PurchaseOrder>>(`/purchase-orders/${id}/submit`, withVersion(version));
    return data.data;
  },

  async approve(id: string, version: number, note?: string): Promise<PurchaseOrder> {
    const { data } = await api.post<ApiEnvelope<PurchaseOrder>>(`/purchase-orders/${id}/approve`, {
      ...withVersion(version),
      note,
    });
    return data.data;
  },

  async reject(id: string, version: number, note?: string): Promise<PurchaseOrder> {
    const { data } = await api.post<ApiEnvelope<PurchaseOrder>>(`/purchase-orders/${id}/reject`, {
      ...withVersion(version),
      note,
    });
    return data.data;
  },

  async send(id: string, version: number): Promise<PurchaseOrder> {
    const { data } = await api.post<ApiEnvelope<PurchaseOrder>>(`/purchase-orders/${id}/send`, withVersion(version));
    return data.data;
  },

  async ship(id: string, version: number): Promise<PurchaseOrder> {
    const { data } = await api.post<ApiEnvelope<PurchaseOrder>>(`/purchase-orders/${id}/ship`, withVersion(version));
    return data.data;
  },

  async cancel(id: string, version: number, note?: string): Promise<PurchaseOrder> {
    const { data } = await api.post<ApiEnvelope<PurchaseOrder>>(`/purchase-orders/${id}/cancel`, {
      ...withVersion(version),
      note,
    });
    return data.data;
  },

  async receive(id: string, payload: ReceiveGoodsPayload): Promise<ReceiveGoodsResult> {
    const { data } = await api.post<ApiEnvelope<ReceiveGoodsResult>>(`/purchase-orders/${id}/receive`, payload);
    return data.data;
  },
};
