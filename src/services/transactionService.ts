import { get, post } from './api';

export type TransactionItem = {
  id: string;
  roomId: string;
  room: string;
  gameTypeId: string;
  gameType: string;
  gameId: string;
  game: string;
  gameSettingId: string;
  gameSetting: string;
  hours: number;
  totalPrice: number;
  statusId: string;
  createdOn: string;
  modifiedOn?: string | null;
  createdBy?: string | null;
};

export type PagedResponse<T> = {
  totalCount: number;
  items: T[];
  pageNumber: number;
  pageSize: number;
};

export type TransactionQuery = {
  page?: number;
  pageSize?: number;
  categoryId?: string | null;
  search?: string | null;
  createdBy?: string | null;
};

export async function getTransactions(query: TransactionQuery = {}) {
  const { page = 1, pageSize = 10, categoryId, search, createdBy } = query;
  const params: Record<string, unknown> = { Page: page, PageSize: pageSize };
  if (categoryId) params.CategoryId = categoryId;
  if (search) params.Search = search;
  if (createdBy) params.CreatedBy = createdBy;

  const res = await get<PagedResponse<TransactionItem>>('/transactions', {
    params,
  });
  return res;
}

export type OrderItemRequest = { itemId: string; quantity: number };

export async function createCoffeeShopOrder(itemsRequest: OrderItemRequest[]) {
  // POST the array as JSON body
  const res = await post('/transactions/CreateCoffeeShopOrder', itemsRequest);
  return res;
}

export default { getTransactions, createCoffeeShopOrder };
