export interface CandidateItem {
  item: string;
  name: string;
  urgencyScore: number;
  quantityNeeded: number;
  unitCost: number;
  neededValue: number;
}

export interface AllocationEntry {
  item: string;
  name: string;
  urgencyScore: number;
  allocatedAmount: number;
  allocatedQuantity: number;
  fractionCovered: number;
}

export interface AllocationResult {
  allocations: AllocationEntry[];
  totalAllocated: number;
  unallocatedBudget: number;
  itemsFullyCovered: number;
  itemsPartiallyCovered: number;
  itemsUncovered: number;
  weightedUrgencyServed: number;
}

export interface AllocationDeltas {
  totalAllocated: number;
  unallocatedBudget: number;
  itemsFullyCovered: number;
  itemsPartiallyCovered: number;
  itemsUncovered: number;
  weightedUrgencyServed: number;
}

export interface GreedyRun {
  _id: string;
  runBy: { _id: string; name: string; email: string } | string;
  budget: number;
  itemsConsidered: CandidateItem[];
  greedyResult: AllocationResult;
  proportionalResult: AllocationResult;
  createdAt: string;
}

export interface AllocationRequestPayload {
  budget: number;
  items?: string[];
}
