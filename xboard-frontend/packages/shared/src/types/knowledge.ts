/**
 * Knowledge Types
 * Defines knowledge base article data structures
 */

export interface Knowledge {
  id: number;
  category: string;
  title: string;
  body: string;
  sort: number;
  show: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeCategory {
  name: string;
  articles: Knowledge[];
}
