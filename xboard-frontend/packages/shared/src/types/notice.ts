/**
 * Notice Types
 * Defines system notice data structures
 */

export interface Notice {
  id: number;
  title: string;
  content: string;
  img_url: string | null;
  show: number;
  sort: number;
  created_at: string;
  updated_at: string;
}
