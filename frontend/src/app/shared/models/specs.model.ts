export interface HardwareSpecs {
  gpu?: string;
  vram_mb?: number;
  cpu?: string;
  ram_gb?: number;
  tier?: string;
}

export interface SpecsParseResponse {
  specs: HardwareSpecs;
  raw_text: string;
  parse_method: string;
}
