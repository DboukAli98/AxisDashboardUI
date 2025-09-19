import api from './api';

export type SettingAttribute = {
  id: string;
  name: string;
  attributeValue: string;
  settingsId: string;
};

export type GameSettingDto = {
  id: string;
  name: string;
  type: string;
  gameId: string;
  gameName?: string;
  attributes: SettingAttribute[];
  values: unknown[];
};

export type PagedSettingsResponse = {
  totalCount: number;
  items: GameSettingDto[];
  pageNumber?: number;
  pageSize?: number;
};

export async function getSettings(page = 1, pageSize = 10): Promise<PagedSettingsResponse> {
  const res = await api.get<PagedSettingsResponse>(`/setting?Page=${page}&PageSize=${pageSize}`);
  return res.data;
}
export type CreateSettingRequest = {
  name: string;
  type: string;
  gameId: string;
};

export async function createSetting(body: CreateSettingRequest) {
  const res = await api.post<GameSettingDto>('/setting', body);
  return res.data as GameSettingDto;
}

export async function updateSetting(id: string, body: CreateSettingRequest) {
  const res = await api.put<GameSettingDto>(`/setting/${id}`, body);
  return res.data as GameSettingDto;
}

export async function deleteSetting(id: string) {
  const res = await api.delete<void>(`/setting/${id}`);
  return res.data;
}

export default { getSettings, createSetting, updateSetting, deleteSetting };

