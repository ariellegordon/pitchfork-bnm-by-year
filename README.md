# Pitchfork Best New Music by year

Scrapes every Pitchfork **Best New Album** and **Best New Reissue** and shows the counts per year
(by the year the review was published) in a small dashboard, broken down by category or genre.

## Usage

```sh
npm install
npm run scrape          # incremental: only fetches pages until it reaches already-cached reviews
npm run scrape -- --full  # re-scrape everything (~55 requests, about a minute)
npm run dev             # dashboard at http://localhost:5173
npm run build           # static site in dist/ (includes data/albums.json)
```

## How it works

- `scraper/` fetches `pitchfork.com/reviews/best/albums/?page=N` and `/reviews/best/reissues/?page=N`
  and reads the `window.__PRELOADED_STATE__` JSON embedded in each page (30 reviews per page).
  It stops at a 404 or once it has as many items as the listing's `totalResults`, and waits 1s between requests.
- Results are cached in `public/data/albums.json`, which is also the dashboard's data source.
- Membership comes from the listing itself; the per-item `isBestNewMusic` flag in Pitchfork's JSON is not reliable.
- In the genre view, a review tagged with several genres counts once in each. Genres past the top 7
  (and reviews with no genre) are grouped as "Other".
