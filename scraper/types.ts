export type Category = "album" | "reissue";

export interface Album {
  id: string;
  category: Category;
  artist: string;
  title: string;
  url: string;
  pubDate: string; // ISO timestamp of the review
  year: number; // review publish year (UTC)
  genres: string[];
  score: number | null;
}

export interface DataFile {
  scrapedAt: string;
  albums: Album[];
}
