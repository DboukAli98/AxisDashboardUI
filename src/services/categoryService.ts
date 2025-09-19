import api from "./api";

export type CategoryDto = {
  id: string;
  name: string;
};

export type CategoryListResponse = {
  totalCount: number;
  items: CategoryDto[];
};

export async function getCategories(page = 1, pageSize = 10): Promise<CategoryListResponse> {
  const res = await api.get<CategoryListResponse>(`/category?Page=${page}&PageSize=${pageSize}`);
  return res.data;
}

export default { getCategories };
