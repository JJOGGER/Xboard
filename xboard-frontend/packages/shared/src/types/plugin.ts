/**
 * Plugin Type Definitions
 */

export interface Plugin {
  id: number;
  name: string;
  description?: string;
  version?: string;
  author?: string;
  type: 'payment' | 'notification' | 'other';
  config?: Record<string, any>;
  enabled: boolean;
  installed_at: string;
  updated_at: string;
}

export interface PluginConfig {
  [key: string]: any;
}

export interface UploadPluginData {
  file: File;
}

export interface UpdatePluginData {
  enabled?: boolean;
  config?: PluginConfig;
}
