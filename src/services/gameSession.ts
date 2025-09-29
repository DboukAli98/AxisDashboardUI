import api from './api';

export type CreateGameSessionRequest = {
  gameId: string;
  gameSettingId: string;
  hours: number;
  status: string; // status id
};

export async function createGameSession(body: CreateGameSessionRequest) {
  // POST request with params in query string as requested by the backend
  const res = await api.post('/transactions/CreateGameSession', null, {
    params: {
      gameId: body.gameId,
      gameSettingId: body.gameSettingId,
      hours: body.hours,
      status: body.status,
    }
  });
  return res.data;
}

export default { createGameSession };
