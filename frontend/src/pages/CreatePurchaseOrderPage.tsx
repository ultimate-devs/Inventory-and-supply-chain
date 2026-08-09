import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Plus, Trash2, Award } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchItems } from '../store/slices/inventorySlice';
import { fetchSuppliers, fetchRecommendation, clearRecommendation } from '../store/slices/suppliersSlice';
import { createPurchaseOrder } from '../store/slices/purchaseOrdersSlice';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import type { CreatePurchaseOrderLinePayload } from '../types/purchaseOrder';

interface DraftLine {
  item: string;
  quantity: string;
  unitPrice: string;
}

const emptyLine: DraftLine = { item: '', quantity: '', unitPrice: '' };

const CreatePurchaseOrderPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((state) => state.inventory);
  const { suppliers, recommendation, recommendationStatus } = useAppSelector((state) => state.suppliers);

  const [supplierId, setSupplierId] = useState('');
  const [usedRecommendation, setUsedRecommendation] = useState(false);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([{ ...emptyLine }]);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const approvedSuppliers = suppliers.filter((s) => s.status === 'approved');

  useEffect(() => {
    dispatch(fetchItems({ limit: 100 }));
    dispatch(fetchSuppliers({ status: 'approved', limit: 100 }));
    return () => {
      dispatch(clearRecommendation());
    };
  }, [dispatch]);

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }]);
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index));

  const handleRecommend = () => {
    const firstItem = lines[0]?.item;
    if (!firstItem) {
      setFormError('Pick an item on the first line before requesting a recommendation');
      return;
    }
    setFormError('');
    dispatch(fetchRecommendation(firstItem));
  };

  const applyRecommendation = () => {
    if (!recommendation?.recommended) return;
    setSupplierId(recommendation.recommended.supplierId);
    setUsedRecommendation(true);
    if (lines[0]) {
      updateLine(0, { unitPrice: String(recommendation.recommended.unitPrice) });
    }
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!supplierId) {
      setFormError('Select a supplier');
      return;
    }
    const parsedLines: CreatePurchaseOrderLinePayload[] = [];
    for (const line of lines) {
      if (!line.item || !line.quantity || !line.unitPrice) {
        setFormError('Every line requires an item, quantity, and unit price');
        return;
      }
      parsedLines.push({ item: line.item, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice) });
    }

    setIsSubmitting(true);
    const result = await dispatch(
      createPurchaseOrder({
        supplier: supplierId,
        lines: parsedLines,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        recommendedSupplier: usedRecommendation,
      }),
    );
    setIsSubmitting(false);

    if (createPurchaseOrder.fulfilled.match(result)) {
      navigate(`/purchase-orders/${result.payload._id}`);
    } else {
      setFormError((result.payload as string) || 'Unable to create purchase order');
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <button
        onClick={() => navigate('/purchase-orders')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Purchase Orders
      </button>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">New Purchase Order</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Pick line items, choose a supplier, and submit.</p>
      </div>

      {formError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Line Items</h2>
          <Button variant="ghost" onClick={addLine} className="inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            Add Line
          </Button>
        </div>
        {lines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-12 items-end gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="col-span-6">
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Item</label>
              <select
                value={line.item}
                onChange={(e) => updateLine(idx, { item: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="" disabled>
                  Select an item
                </option>
                {items.map((i) => (
                  <option key={i._id} value={i._id}>
                    {i.name} ({i.sku})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <Input
                id={`qty-${idx}`}
                label="Quantity"
                icon={null}
                type="number"
                value={line.quantity}
                onChange={(e) => updateLine(idx, { quantity: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Input
                id={`price-${idx}`}
                label="Unit Price"
                icon={null}
                type="number"
                step="0.01"
                value={line.unitPrice}
                onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
              />
            </div>
            <div className="col-span-1 flex justify-center pb-2">
              {lines.length > 1 && (
                <button
                  onClick={() => removeLine(idx)}
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                  aria-label="Remove line"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Supplier</h2>
          <Button
            variant="ghost"
            onClick={handleRecommend}
            disabled={recommendationStatus === 'loading'}
            className="inline-flex items-center gap-1.5"
          >
            <Award className="h-4 w-4" />
            {recommendationStatus === 'loading' ? 'Finding best supplier...' : 'Recommend Supplier'}
          </Button>
        </div>

        {recommendation && (
          <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
            {recommendation.recommended ? (
              <div className="flex items-center justify-between">
                <span>
                  Recommended: <strong>{recommendation.recommended.supplierName}</strong> - price{' '}
                  {recommendation.recommended.unitPrice}, lead time {recommendation.recommended.leadTimeDays}d, score{' '}
                  {Math.round(recommendation.recommended.compositeScore)}
                </span>
                <Button onClick={applyRecommendation} className="ml-3">
                  Use This Supplier
                </Button>
              </div>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">
                No approved supplier stocks this item yet - add a catalogue entry first.
              </span>
            )}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Supplier</label>
          <select
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              setUsedRecommendation(e.target.value === recommendation?.recommended?.supplierId);
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="" disabled>
              Select a supplier
            </option>
            {approvedSuppliers.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} (score {Math.round(s.performanceScore)})
              </option>
            ))}
          </select>
        </div>

        <Input
          id="expectedDeliveryDate"
          label="Expected Delivery Date (optional)"
          icon={null}
          type="date"
          value={expectedDeliveryDate}
          onChange={(e) => setExpectedDeliveryDate(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => navigate('/purchase-orders')}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Purchase Order'}
        </Button>
      </div>
    </div>
  );
};

export default CreatePurchaseOrderPage;
