import api from "../services/api";

export type ItemDto = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  type: string;
  categoryId: string | null;
  gameId: string | null;
  statusId?: string | null;
};

const basePath = "/item";

export type ItemListResponse = {
  totalCount: number;
  items: ItemDto[];
};

export async function getItems(): Promise<ItemListResponse> {
  const res = await api.get<ItemListResponse>(basePath);
  return res.data;
}

export async function getItem(id: string): Promise<ItemDto> {
  const res = await api.get<ItemDto>(`${basePath}/${id}`);
  return res.data;
}

export async function createItem(body: Omit<ItemDto, "id">): Promise<ItemDto> {
  const res = await api.post<ItemDto>(basePath, body);
  return res.data;
}

export async function updateItem(id: string, body: Omit<ItemDto, "id">): Promise<void> {
  await api.put(`${basePath}/${id}`, body);
}

export async function deleteItem(id: string): Promise<void> {
  await api.delete(`${basePath}/${id}`);
}

export default { getItems, getItem, createItem, updateItem, deleteItem };
