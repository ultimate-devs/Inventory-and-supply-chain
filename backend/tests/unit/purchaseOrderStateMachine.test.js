import { PO_STATUS } from '../../src/models/PurchaseOrder.js';
import {
  PO_TRANSITIONS,
  TERMINAL_STATUSES,
  canTransition,
  statusesLeadingTo,
} from '../../src/services/purchaseOrderStateMachine.js';

const ALL_STATUSES = Object.values(PO_STATUS);

describe('purchase order state machine', () => {
  describe('valid transitions', () => {
    it.each([
      [PO_STATUS.DRAFT, PO_STATUS.SUBMITTED],
      [PO_STATUS.DRAFT, PO_STATUS.CANCELLED],
      [PO_STATUS.SUBMITTED, PO_STATUS.APPROVED],
      [PO_STATUS.SUBMITTED, PO_STATUS.REJECTED],
      [PO_STATUS.SUBMITTED, PO_STATUS.CANCELLED],
      [PO_STATUS.APPROVED, PO_STATUS.SENT],
      [PO_STATUS.APPROVED, PO_STATUS.CANCELLED],
      [PO_STATUS.SENT, PO_STATUS.SHIPPED],
      [PO_STATUS.SENT, PO_STATUS.CANCELLED],
      [PO_STATUS.SENT, PO_STATUS.PARTIALLY_RECEIVED],
      [PO_STATUS.SENT, PO_STATUS.RECEIVED],
      [PO_STATUS.SHIPPED, PO_STATUS.CANCELLED],
      [PO_STATUS.SHIPPED, PO_STATUS.PARTIALLY_RECEIVED],
      [PO_STATUS.SHIPPED, PO_STATUS.RECEIVED],
      [PO_STATUS.PARTIALLY_RECEIVED, PO_STATUS.PARTIALLY_RECEIVED],
      [PO_STATUS.PARTIALLY_RECEIVED, PO_STATUS.RECEIVED],
    ])('allows %s -> %s', (from, to) => {
      expect(canTransition(from, to)).toBe(true);
    });
  });

  describe('invalid transitions', () => {
    it.each([
      [PO_STATUS.DRAFT, PO_STATUS.APPROVED],
      [PO_STATUS.DRAFT, PO_STATUS.SENT],
      [PO_STATUS.DRAFT, PO_STATUS.RECEIVED],
      [PO_STATUS.SUBMITTED, PO_STATUS.SENT],
      [PO_STATUS.SUBMITTED, PO_STATUS.DRAFT],
      [PO_STATUS.SUBMITTED, PO_STATUS.RECEIVED],
      [PO_STATUS.APPROVED, PO_STATUS.SUBMITTED],
      [PO_STATUS.APPROVED, PO_STATUS.SHIPPED],
      [PO_STATUS.APPROVED, PO_STATUS.RECEIVED],
      [PO_STATUS.SENT, PO_STATUS.APPROVED],
      [PO_STATUS.SENT, PO_STATUS.DRAFT],
      [PO_STATUS.SHIPPED, PO_STATUS.SENT],
      [PO_STATUS.SHIPPED, PO_STATUS.APPROVED],
      [PO_STATUS.PARTIALLY_RECEIVED, PO_STATUS.CANCELLED],
      [PO_STATUS.PARTIALLY_RECEIVED, PO_STATUS.SHIPPED],
      [PO_STATUS.PARTIALLY_RECEIVED, PO_STATUS.SUBMITTED],
      [PO_STATUS.RECEIVED, PO_STATUS.CANCELLED],
      [PO_STATUS.RECEIVED, PO_STATUS.PARTIALLY_RECEIVED],
      [PO_STATUS.REJECTED, PO_STATUS.SUBMITTED],
      [PO_STATUS.REJECTED, PO_STATUS.APPROVED],
      [PO_STATUS.CANCELLED, PO_STATUS.DRAFT],
      [PO_STATUS.CANCELLED, PO_STATUS.SUBMITTED],
    ])('rejects %s -> %s', (from, to) => {
      expect(canTransition(from, to)).toBe(false);
    });

    it('rejects an unknown source status', () => {
      expect(canTransition('not_a_real_status', PO_STATUS.SUBMITTED)).toBe(false);
    });

    it('rejects an unknown target status', () => {
      expect(canTransition(PO_STATUS.DRAFT, 'not_a_real_status')).toBe(false);
    });
  });

  describe('terminal statuses', () => {
    it('received, rejected, and cancelled have no outgoing transitions', () => {
      expect([...TERMINAL_STATUSES].sort()).toEqual(
        [PO_STATUS.RECEIVED, PO_STATUS.REJECTED, PO_STATUS.CANCELLED].sort(),
      );
    });

    it.each(TERMINAL_STATUSES)('%s cannot transition to any other status', (status) => {
      const others = ALL_STATUSES.filter((s) => s !== status);
      others.forEach((to) => expect(canTransition(status, to)).toBe(false));
    });
  });

  describe('every status has a defined (possibly empty) transition list', () => {
    it.each(ALL_STATUSES)('%s is present in the transition table', (status) => {
      expect(PO_TRANSITIONS[status]).toBeDefined();
      expect(Array.isArray(PO_TRANSITIONS[status])).toBe(true);
    });
  });

  describe('statusesLeadingTo', () => {
    it('finds every source status for a given target', () => {
      expect(statusesLeadingTo(PO_STATUS.CANCELLED).sort()).toEqual(
        [PO_STATUS.DRAFT, PO_STATUS.SUBMITTED, PO_STATUS.APPROVED, PO_STATUS.SENT, PO_STATUS.SHIPPED].sort(),
      );
      expect(statusesLeadingTo(PO_STATUS.SUBMITTED)).toEqual([PO_STATUS.DRAFT]);
      expect(statusesLeadingTo(PO_STATUS.RECEIVED).sort()).toEqual(
        [PO_STATUS.SENT, PO_STATUS.SHIPPED, PO_STATUS.PARTIALLY_RECEIVED].sort(),
      );
    });

    it('returns an empty list for a status nothing transitions into', () => {
      expect(statusesLeadingTo(PO_STATUS.DRAFT)).toEqual([]);
    });
  });
});
