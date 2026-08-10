import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { procurementClient } from '../apiClient.js';

const recommendSupplierTool = new FunctionTool({
  name: 'recommend_supplier',
  description:
    'Finds the best-ranked approved supplier for a given item, weighing price, lead time, and performance score. ' +
    'A null "recommended" field means no approved supplier currently carries the item - this is a normal, expected ' +
    'outcome to report, not an error to retry.',
  parameters: z.object({ itemId: z.string().describe('The item id to find a supplier for') }),
  execute: async ({ itemId }) => {
    const result = await procurementClient.get(`/suppliers/recommend?item=${itemId}`);
    return { status: result.recommended ? 'success' : 'no_supplier_available', ...result };
  },
});

const createDraftPoTool = new FunctionTool({
  name: 'create_draft_po',
  description:
    'Creates a DRAFT purchase order for a supplier and item lines. It stays in draft status until a human submits it, ' +
    'and then requires two different human approvers before anything is ordered. This tool never submits or approves a PO.',
  parameters: z.object({
    supplierId: z.string(),
    lines: z
      .array(z.object({ item: z.string(), quantity: z.number().min(1), unitPrice: z.number().min(0) }))
      .min(1),
  }),
  execute: async ({ supplierId, lines }) => {
    const po = await procurementClient.post('/purchase-orders', { supplier: supplierId, lines });
    return { status: 'success', purchaseOrderId: po._id, poNumber: po.poNumber, poStatus: po.status };
  },
});

const submitPoTool = new FunctionTool({
  name: 'submit_po',
  description:
    'Submits a draft purchase order to start the two-level human approval process. This does NOT approve the order - ' +
    'it only makes it visible for a human to review. Requires the version returned by create_draft_po (starts at 0).',
  parameters: z.object({ purchaseOrderId: z.string(), version: z.number().int().min(0) }),
  execute: async ({ purchaseOrderId, version }) => {
    const po = await procurementClient.post(`/purchase-orders/${purchaseOrderId}/submit`, { version });
    return { status: 'success', purchaseOrderId: po._id, poStatus: po.status };
  },
});

export const procurementTools = [recommendSupplierTool, createDraftPoTool, submitPoTool];
