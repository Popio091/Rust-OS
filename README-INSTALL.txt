# RustOS complete update

Upload these files to the `main` branch of `Popio091/Rust-OS`, preserving paths:

- `index.html` — GitHub Pages entry point with Table/Stats editor buttons and Markdown-table preview.
- `RustOS.html` — matching page file for consistency.
- `server.js` — backend with editor-only automatic backfill endpoint.
- `.github/workflows/backfill-rustos-text.yml` — scheduled GitHub Actions workflow that checks the `rustos-data` branch every 6 hours and can be run manually.

The workflow only creates a `.txt` file when a folder under `RustOS/rustos-data` does not already contain any `.txt` file directly inside it. It never overwrites existing `.txt` files.

After uploading, open repository **Settings → Actions → General** and make sure the workflow permissions allow read and write access to repository contents. Then open **Actions → Backfill missing RustOS text files → Run workflow** to run it immediately.
