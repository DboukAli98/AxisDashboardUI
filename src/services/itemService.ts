import api from "../services/api";

export type ItemDto = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  type: string;
  categoryId: number | null;
  gameId: string | null;
  statusId?: number | null;
  imagePath?: string | null;
};

const basePath = "/item";

export type ItemListResponse = {
  totalCount: number;
  data: ItemDto[];
};

export async function getItems(
  page = 1,
  pageSize = 10,
  categoryId?: number | null,
  search?: string | null
): Promise<ItemListResponse> {
  let url = `${basePath}?Page=${page}&PageSize=${pageSize}`;
  if (categoryId !== undefined && categoryId !== null)
    url += `&CategoryId=${encodeURIComponent(String(categoryId))}`;
  if (search) url += `&Search=${encodeURIComponent(search)}`;
  const res = await api.get<ItemListResponse>(url);
  return res.data;
}

export async function getItem(id: string): Promise<ItemDto> {
  const res = await api.get<ItemDto>(`${basePath}/${id}`);
  return res.data;
}

export async function createItem(
  body: Omit<ItemDto, "id"> & { image?: File | null }
): Promise<ItemDto> {
  type BodyWithImage = Omit<ItemDto, "id"> & { image?: File | null };
  const b = body as BodyWithImage;
  // if an image file is provided, use FormData (multipart)
  if (b.image) {
    const file = b.image as File;
    const form = new FormData();
    form.append("name", body.name);
    form.append("quantity", String(body.quantity));
    form.append("price", String(body.price));
    form.append("type", body.type);
    form.append("categoryId", String(body.categoryId ?? "0"));
    if (body.statusId !== undefined && body.statusId !== null)
      form.append("statusId", String(body.statusId));
    form.append("image", file);
    const res = await api.post<ItemDto>(basePath, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  }

  const res = await api.post<ItemDto>(
    basePath,
    body as unknown as Record<string, unknown>
  );
  return res.data;
}

export async function updateItem(
  id: string,
  body: Omit<ItemDto, "id"> & { image?: File | null }
): Promise<void> {
  type BodyWithImage = Omit<ItemDto, "id"> & { image?: File | null };
  const b = body as BodyWithImage;
  if (b.image) {
    const file = b.image as File;
    const form = new FormData();
    form.append("name", body.name);
    form.append("quantity", String(body.quantity));
    form.append("price", String(body.price));
    form.append("type", body.type);
    form.append("categoryId", String(body.categoryId ?? "0"));
    if (body.statusId !== undefined && body.statusId !== null)
      form.append("statusId", String(body.statusId));
    form.append("image", file);
    await api.put(`${basePath}/${id}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return;
  }

  await api.put(
    `${basePath}/${id}`,
    body as unknown as Record<string, unknown>
  );
}

export async function deleteItem(id: string): Promise<void> {
  await api.delete(`${basePath}/${id}`);
}

export default { getItems, getItem, createItem, updateItem, deleteItem };
