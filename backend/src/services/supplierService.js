import { Supplier, SUPPLIER_STATUS } from '../models/Supplier.js';
import { Item } from '../models/Item.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import { selectSupplierForItem } from './algorithms/supplierSelection.js';

const EDITABLE_FIELDS = ['name', 'contactName', 'contactEmail', 'contactPhone', 'address'];

export const listSuppliers = async (query) => {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20 });
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.search) filter.name = { $regex: query.search, $options: 'i' };

  const sortField = query.sortBy === 'performanceScore' ? 'performanceScore' : 'name';
  const sortOrder = sortField === 'performanceScore' ? -1 : 1;

  const [suppliers, total] = await Promise.all([
    Supplier.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate('itemsCatalogue.item', 'name sku'),
    Supplier.countDocuments(filter),
  ]);

  return { suppliers, meta: buildMeta({ page, limit, total }) };
};

export const listRankedSuppliers = async () =>
  Supplier.find({ status: SUPPLIER_STATUS.APPROVED }).sort({ performanceScore: -1 });

export const getSupplierById = async (id) => {
  const supplier = await Supplier.findById(id).populate('itemsCatalogue.item', 'name sku currentStock');
  if (!supplier) throw ApiError.notFound('Supplier not found');
  return supplier;
};

export const createSupplier = (data) => {
  const payload = {};
  EDITABLE_FIELDS.forEach((field) => {
    if (data[field] !== undefined) payload[field] = data[field];
  });
  return Supplier.create(payload);
};

export const updateSupplier = async (id, data) => {
  const supplier = await getSupplierById(id);
  EDITABLE_FIELDS.forEach((field) => {
    if (data[field] !== undefined) supplier[field] = data[field];
  });
  await supplier.save();
  return supplier;
};

export const deleteSupplier = async (id) => {
  const supplier = await getSupplierById(id);
  supplier.isDeleted = true;
  supplier.deletedAt = new Date();
  await supplier.save();
};

export const setSupplierStatus = async (id, status, userId) => {
  if (!Object.values(SUPPLIER_STATUS).includes(status)) {
    throw ApiError.badRequest('Invalid supplier status');
  }
  const supplier = await getSupplierById(id);
  supplier.status = status;
  supplier.isActive = status !== SUPPLIER_STATUS.SUSPENDED;
  supplier.statusChangedBy = userId;
  supplier.statusChangedAt = new Date();
  await supplier.save();
  return supplier;
};

// These two mutate itemsCatalogue by comparing raw ObjectIds, so they fetch
// the supplier directly (not via getSupplierById, which populates
// itemsCatalogue.item - comparing a populated document with `.toString()`
// against a plain id string would never match).
export const upsertCatalogueEntry = async (supplierId, { item, supplierSku, unitPrice, leadTimeDays }) => {
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) throw ApiError.notFound('Supplier not found');
  const itemDoc = await Item.findById(item);
  if (!itemDoc) throw ApiError.badRequest('Item does not exist');

  const existing = supplier.itemsCatalogue.find((entry) => entry.item.toString() === item);
  if (existing) {
    existing.supplierSku = supplierSku;
    existing.unitPrice = unitPrice;
    existing.leadTimeDays = leadTimeDays;
  } else {
    supplier.itemsCatalogue.push({ item, supplierSku, unitPrice, leadTimeDays });
  }
  await supplier.save();
  return getSupplierById(supplierId);
};

export const removeCatalogueEntry = async (supplierId, itemId) => {
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) throw ApiError.notFound('Supplier not found');
  supplier.itemsCatalogue = supplier.itemsCatalogue.filter((entry) => entry.item.toString() !== itemId);
  await supplier.save();
  return getSupplierById(supplierId);
};

/**
 * Greedy supplier recommendation for one item: gathers every supplier that
 * stocks it, ranks them (price/lead time/performance), and returns the full
 * ranking with the top pick flagged so the Create PO page can show both the
 * recommendation and a manual-override list.
 */
export const recommendSuppliersForItem = async (itemId) => {
  const suppliers = await Supplier.find({ 'itemsCatalogue.item': itemId });

  const candidates = suppliers.map((supplier) => {
    const entry = supplier.itemsCatalogue.find((e) => e.item.toString() === itemId);
    return {
      supplierId: supplier._id.toString(),
      supplierName: supplier.name,
      unitPrice: entry.unitPrice,
      leadTimeDays: entry.leadTimeDays,
      performanceScore: supplier.performanceScore,
      status: supplier.status,
    };
  });

  return selectSupplierForItem(candidates);
};
