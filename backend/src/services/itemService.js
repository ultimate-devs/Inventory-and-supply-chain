import { Item } from '../models/Item.js';
import { Category } from '../models/Category.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';

export const listItems = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.category) filter.category = query.category;
  if (query.stockStatus) filter.stockStatus = query.stockStatus;
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { sku: { $regex: query.search, $options: 'i' } },
    ];
  }

  const sortField = ['name', 'currentStock', 'stockStatus', 'createdAt'].includes(query.sortBy)
    ? query.sortBy
    : 'name';
  const sortOrder = query.sortOrder === 'desc' ? -1 : 1;

  const [items, total] = await Promise.all([
    Item.find(filter)
      .populate('category', 'name')
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit),
    Item.countDocuments(filter),
  ]);

  return { items, meta: buildMeta({ page, limit, total }) };
};

export const getItemById = async (id) => {
  const item = await Item.findById(id).populate('category', 'name');
  if (!item) throw ApiError.notFound('Item not found');
  return item;
};

export const createItem = async (data) => {
  const category = await Category.findById(data.category);
  if (!category) throw ApiError.badRequest('Category does not exist');

  const existingSku = await Item.findOne({ sku: data.sku?.toUpperCase() });
  if (existingSku) throw ApiError.conflict('An item with this SKU already exists');

  return Item.create(data);
};

const EDITABLE_FIELDS = [
  'name',
  'sku',
  'description',
  'category',
  'unitCost',
  'leadTimeDays',
  'orderingCost',
  'holdingCostPerUnit',
  'safetyStock',
  'serviceLevel',
];

export const updateItem = async (id, data) => {
  const item = await Item.findById(id);
  if (!item) throw ApiError.notFound('Item not found');

  if (data.category) {
    const category = await Category.findById(data.category);
    if (!category) throw ApiError.badRequest('Category does not exist');
  }

  EDITABLE_FIELDS.forEach((field) => {
    if (data[field] !== undefined) item[field] = data[field];
  });

  await item.save();
  return item;
};

export const deleteItem = async (id) => {
  const item = await Item.findById(id);
  if (!item) throw ApiError.notFound('Item not found');
  item.isDeleted = true;
  item.deletedAt = new Date();
  await item.save();
};
