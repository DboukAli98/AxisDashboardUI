import api from './api';

export type GameDto = {
  id: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  statusId?: string | null;
  createdOn: string;
  modifiedOn: string | null;
};

const basePath = "/game";

export type GameListResponse = {
  totalCount: number;
  items: GameDto[];
  pageNumber?: number;
  pageSize?: number;
};

export async function getGames(page = 1, pageSize = 10): Promise<GameListResponse> {
  const res = await api.get<GameListResponse>(`${basePath}?Page=${page}&PageSize=${pageSize}`);
  return res.data;
}

export async function createGame(body: { name: string; categoryId: string; statusId?: string | null }): Promise<GameDto> {
  const res = await api.post<GameDto>(basePath, body);
  return res.data;
}

export async function deleteGame(id: string): Promise<void> {
  await api.delete(`${basePath}/${id}`);
}

export async function updateGame(id: string, body: { name: string; categoryId: string; statusId?: string | null }): Promise<GameDto> {
  const res = await api.put<GameDto>(`${basePath}/${id}`, body);
  return res.data;
}

export default { getGames, createGame };
