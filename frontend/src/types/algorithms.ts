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
  // Set only when the ILP allocator fell back to Greedy (too many candidates).
  note?: string;
}

export interface AllocationDeltas {
  totalAllocated: number;
  unallocatedBudget: number;
  itemsFullyCovered: number;
  itemsPartiallyCovered: number;
  itemsUncovered: number;
  weightedUrgencyServed: number;
  ilp?: {
    vsGreedy: Omit<AllocationDeltas, 'ilp'>;
    vsProportional: Omit<AllocationDeltas, 'ilp'>;
  };
}

export interface GreedyRun {
  _id: string;
  runBy: { _id: string; name: string; email: string } | string;
  budget: number;
  itemsConsidered: CandidateItem[];
  greedyResult: AllocationResult;
  proportionalResult: AllocationResult;
  ilpResult?: AllocationResult;
  createdAt: string;
}

export interface AllocationRequestPayload {
  budget: number;
  items?: string[];
}
