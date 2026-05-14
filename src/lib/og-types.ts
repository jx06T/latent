export interface ArticleMeta {
  author?: string;        // handle without @, e.g. "jx06t"
  publishedTime?: string; // ISO 8601
  modifiedTime?: string;
  section?: string;       // category label
  tags?: string[];
}
