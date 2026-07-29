import { Category } from '../models/Category.js';
import { Item } from '../models/Item.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';

export const listCategories = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = query.search ? { name: { $regex: query.search, $options: 'i' } } : {};

  const [categories, total] = await Promise.all([
    Category.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Category.countDocuments(filter),
  ]);

  return { categories, meta: buildMeta({ page, limit, total }) };
};

export const getCategoryById = async (id) => {
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound('Category not found');
  return category;
};

export const createCategory = (data) => Category.create(data);

export const updateCategory = async (id, data) => {
  const category = await getCategoryById(id);
  if (data.name !== undefined) category.name = data.name;
  if (data.description !== undefined) category.description = data.description;
  await category.save();
  return category;
};

export const deleteCategory = async (id) => {
  const category = await getCategoryById(id);
  const activeItemCount = await Item.countDocuments({ category: category._id });
  if (activeItemCount > 0) {
    throw ApiError.conflict('Cannot delete a category that still has items assigned to it');
  }
  category.isDeleted = true;
  category.deletedAt = new Date();
  await category.save();
};
