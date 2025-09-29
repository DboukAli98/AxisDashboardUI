import { get } from './api';

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

export async function getTransactions(page = 1, pageSize = 10) {
  const res = await get<PagedResponse<TransactionItem>>('/transactions', {
    params: { Page: page, PageSize: pageSize },
  });
  return res;
}

export default { getTransactions };
