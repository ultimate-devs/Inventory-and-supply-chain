import { PO_STATUS } from '../models/PurchaseOrder.js';

// Pure transition table for the PurchaseOrder lifecycle:
// draft -> submitted -> approved -> sent -> shipped -> partially_received -> received
// with cancel available up to shipped, and reject available from submitted.
// `partially_received` self-loops because a single PO can be received in
// several separate deliveries before it's fully received.
// No DB/IO - every status-changing write in purchaseOrderService.js and
// grnService.js consults this instead of hardcoding its own from/to rules,
// so the full set of legal moves lives in exactly one place.
export const PO_TRANSITIONS = Object.freeze({
  [PO_STATUS.DRAFT]: Object.freeze([PO_STATUS.SUBMITTED, PO_STATUS.CANCELLED]),
  [PO_STATUS.SUBMITTED]: Object.freeze([PO_STATUS.APPROVED, PO_STATUS.REJECTED, PO_STATUS.CANCELLED]),
  [PO_STATUS.APPROVED]: Object.freeze([PO_STATUS.SENT, PO_STATUS.CANCELLED]),
  [PO_STATUS.SENT]: Object.freeze([
    PO_STATUS.SHIPPED,
    PO_STATUS.CANCELLED,
    PO_STATUS.PARTIALLY_RECEIVED,
    PO_STATUS.RECEIVED,
  ]),
  [PO_STATUS.SHIPPED]: Object.freeze([PO_STATUS.CANCELLED, PO_STATUS.PARTIALLY_RECEIVED, PO_STATUS.RECEIVED]),
  [PO_STATUS.PARTIALLY_RECEIVED]: Object.freeze([PO_STATUS.PARTIALLY_RECEIVED, PO_STATUS.RECEIVED]),
  [PO_STATUS.RECEIVED]: Object.freeze([]),
  [PO_STATUS.REJECTED]: Object.freeze([]),
  [PO_STATUS.CANCELLED]: Object.freeze([]),
});

// Statuses with no outgoing transitions - once reached, a PO stays there.
export const TERMINAL_STATUSES = Object.freeze(
  Object.entries(PO_TRANSITIONS)
    .filter(([, targets]) => targets.length === 0)
    .map(([status]) => status),
);

export const canTransition = (from, to) => Boolean(PO_TRANSITIONS[from]?.includes(to));

// Every status a PO could currently be in for `to` to be a legal next move -
// callers use this to build the optimistic-locking query's `status: {$in}`
// clause instead of hardcoding it per call site.
export const statusesLeadingTo = (to) =>
  Object.keys(PO_TRANSITIONS).filter((from) => canTransition(from, to));
