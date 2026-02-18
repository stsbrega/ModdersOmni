export interface ModEntry {
  mod_id?: number;
  nexus_mod_id?: number;
  name: string;
  author?: string;
  summary?: string;
  reason?: string;
  load_order?: number;
  enabled: boolean;
  download_status: string;
}

export interface Modlist {
  id: string;
  game_id: number;
  playstyle_id: number;
  entries: ModEntry[];
  llm_provider?: string;
}

export interface DownloadStatus {
  mod_id: number;
  name: string;
  status: string;
  progress: number;
  error?: string;
}
