import api from "../services/api";

export type GameDto = {
  id: string;
  name: string;
  type: string;
  createdOn: string;
  modifiedOn: string | null;
};

const basePath = "/game";

export async function getGames(): Promise<GameDto[]> {
  const res = await api.get<GameDto[]>(basePath);
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
