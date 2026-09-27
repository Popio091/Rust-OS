# RustOS online

RustOS uses a small Node backend for login/permissions. In production, file storage can use the GitHub Contents API instead of a paid Render persistent disk.

## Production storage setup

The backend stores RustOS database files in a separate Git branch named `rustos-data`. This keeps file commits from triggering the Render service's `main`-branch deploy. The branch is created automatically from `main` on the first startup if it does not exist.

GitHub's REST Contents API supports creating/updating repository files with a fine-grained personal access token that has **Contents: Read and write** permission for the selected repository. The Git reference API also allows the backend to create the storage branch with that permission. See the official GitHub documentation for the required permissions. 

### Render environment variables

Keep the existing variables:

- `FRONTEND_ORIGIN` = `https://YOUR-USERNAME.github.io`
- `RUST_PASSWORD` = your Host account password
- `FG_PASSWORD` = your User account password

Add:

- `GITHUB_TOKEN` = your fine-grained GitHub token (**put it only in Render; never put it in `config.js` or the website**)
- `GITHUB_OWNER` = `popio091`
- `GITHUB_REPO` = `Rust-OS`
- `GITHUB_BRANCH` = `rustos-data`
- `GITHUB_BASE_BRANCH` = `main`
- `GITHUB_PATH_PREFIX` = `RustOS/rustos-data`

The token should be limited to the Rust-OS repository and given only **Contents: Read and write**. Do not send the token to anyone or commit it to GitHub.

### What happens to files

- Host can upload files and edit text files.
- User can view files but cannot upload or edit them.
- Uploads and edits are committed to the `rustos-data` branch.
- Render's temporary filesystem is no longer used for production storage.
- The storage branch is separate from `main`, so normal file changes do not cause the Render service to redeploy.

### Important privacy note

If the GitHub repository is public, files stored in the repository are also public to people who can access that repository through GitHub. The RustOS login still controls the RustOS interface, but it does **not** make public GitHub repository data private.

## Database categories

The Database window opens to a list of category folders (currently Characters, Artifacts,
and Verses). Clicking one drills into its list of entries; all categories work identically —
same upload/save/autosave/formatting. Which category a folder shows up in depends only on
which array its entry is in.

## Adding an entry, or a whole new category

Entries are defined in two places that must stay in sync:

1. In `RustOS.html` (and its copy, `index.html`), add `{ key: 'yourkey', label: 'Display Name' }` to the relevant array (`CHARACTERS`, `ARTIFACTS`, or `VERSES`).
2. In `server.js`, add `'yourkey'` to the `ITEM_KEYS` array (this one flat list covers every category — storage doesn't care which section a key appears in on the frontend).

`yourkey` should be lowercase with no spaces (e.g. `pikachu`, `masteremerald`). After redeploying, the new folder appears in the right sidebar section automatically, sorted alphabetically; upload a text file and an image to it from the Host account.

To add an entirely new category (not just a new entry in an existing one), add another array like `VERSES` in `RustOS.html`/`index.html`, then add `{ id: 'yourcategory', label: 'Display Name', items: YOURARRAY }` to the `CATEGORIES` list right below it. No other HTML or JS changes are needed — the root folder list, sidebar, and empty/search states are all built from `CATEGORIES` automatically.

## Local development

Run:

```bash
npm install
npm start
```

Open `http://127.0.0.1:3000`.

Local development still uses the local `data/` directory and the default development passwords (`God` for Host, `User` for User) unless environment variables override them.
