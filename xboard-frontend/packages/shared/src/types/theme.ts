/**
 * Theme Type Definitions
 */

export interface Theme {
  id: number;
  name: string;
  description?: string;
  version?: string;
  author?: string;
  preview_url?: string;
  config?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ThemeConfig {
  [key: string]: any;
}

export interface UploadThemeData {
  file: File;
}
