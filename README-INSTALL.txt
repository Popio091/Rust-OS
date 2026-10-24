# RustOS complete update — all categories

Upload these files to the `main` branch of `Popio091/Rust-OS`, preserving paths:

- `index.html` — GitHub Pages entry point with Table/Stats editor buttons and Markdown-table preview.
- `RustOS.html` — matching page file for consistency.
- `server.js` — backend with the editor-only backfill endpoint.
- `.github/workflows/backfill-rustos-text.yml` — GitHub Actions workflow that reads every entry in `server.js`'s `ITEM_KEYS` list and checks it every six hours; it can also be run manually.

## All-category behavior

The workflow reads `ITEM_KEYS` from `server.js`, so it covers every RustOS database entry across Characters, Artifacts, Verses, and Transformations. If an entry does not already have a `.txt` file directly inside its folder on the `rustos-data` branch, it creates `<entry-key>.txt` with a stats-table template. It can also create the folder when it does not exist yet.

Existing `.txt` files are never overwritten. Adding another database entry to `ITEM_KEYS` automatically includes it in later workflow runs.

## Enable and run

1. Upload the files above to `main`, preserving the `.github/workflows/` path.
2. In repository **Settings → Actions → General**, ensure Actions are enabled and the workflow has read/write access to repository contents.
3. Open **Actions → Backfill missing RustOS text files → Run workflow** to run it immediately. Otherwise, it runs every six hours.

The workflow writes new stats files to the `rustos-data` branch. GitHub must permit the workflow's `GITHUB_TOKEN` to write repository contents.
