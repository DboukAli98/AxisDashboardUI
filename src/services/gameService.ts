import api from './api';

export type GameDto = {
  id: string;
  name: string;
  type: string;
  createdOn: string;
  modifiedOn: string | null;
};

const basePath = "/game";

export type GameListResponse = {
  totalCount: number;
  items: GameDto[];
};

export async function getGames(): Promise<GameListResponse> {
  const res = await api.get<GameListResponse>(basePath);
  return res.data;
}

export async function createGame(body: { name: string; type: string }): Promise<GameDto> {
  const res = await api.post<GameDto>(basePath, body);
  return res.data;
}

export async function deleteGame(id: string): Promise<void> {
  await api.delete(`${basePath}/${id}`);
}

export default { getGames, createGame };
