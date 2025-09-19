import api from './api';

export type CategoryDto = {
  id: string;
  name: string;
  type?: string;
};

export type PagedCategoryResponse = {
  totalCount: number;
  items: CategoryDto[];
  pageNumber?: number;
  pageSize?: number;
};

export type CategoryListResponse = {
  totalCount: number;
  items: CategoryDto[];
};

export async function getCategories(page = 1, pageSize = 10): Promise<CategoryListResponse> {
  const res = await api.get<CategoryListResponse>(`/category?Page=${page}&PageSize=${pageSize}`);
  return res.data;
}

export async function getCategoriesByType(type = 'game', page = 1, pageSize = 10): Promise<PagedCategoryResponse> {
  const res = await api.get<PagedCategoryResponse>(`/category/type/${encodeURIComponent(type)}?Page=${page}&PageSize=${pageSize}`);
  return res.data;
}

export default {
  getCategories,
  getCategoriesByType,
};
