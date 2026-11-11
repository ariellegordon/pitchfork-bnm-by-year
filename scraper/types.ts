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
  reviewers: string[]; // review byline(s); empty when the listing has none
}

export interface DataFile {
  scrapedAt: string;
  albums: Album[];
}
