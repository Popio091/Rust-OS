# RustOS online

RustOS uses a small Node backend for login/permissions. In production, file storage can use the GitHub Contents API instead of a paid Render persistent disk.

## Production storage setup

The backend stores RustOS database files in a separate Git branch named `rustos-data`. This keeps file commits from triggering the Render service's `main`-branch deploy. The branch is created automatically from `main` on the first startup if it does not exist.

GitHub's REST Contents API supports creating/updating repository files with a fine-grained personal access token that has **Contents: Read and write** permission for the selected repository. The Git reference API also allows the backend to create the storage branch with that permission. See the official GitHub documentation for the required permissions. 

### Render environment variables

Keep the existing variables:

- `FRONTEND_ORIGIN` = `https://YOUR-USERNAME.github.io`
- `RUST_PASSWORD` = your Rust account password
- `FG_PASSWORD` = your FG account password

Add:

- `GITHUB_TOKEN` = your fine-grained GitHub token (**put it only in Render; never put it in `config.js` or the website**)
- `GITHUB_OWNER` = `popio091`
- `GITHUB_REPO` = `Rust-OS`
- `GITHUB_BRANCH` = `rustos-data`
- `GITHUB_BASE_BRANCH` = `main`
- `GITHUB_PATH_PREFIX` = `RustOS/rustos-data`

The token should be limited to the Rust-OS repository and given only **Contents: Read and write**. Do not send the token to anyone or commit it to GitHub.

### What happens to files

- Rust can upload files and edit text files.
- FG can view files but cannot upload or edit them.
- Uploads and edits are committed to the `rustos-data` branch.
- Render's temporary filesystem is no longer used for production storage.
- The storage branch is separate from `main`, so normal file changes do not cause the Render service to redeploy.

### Important privacy note

If the GitHub repository is public, files stored in the repository are also public to people who can access that repository through GitHub. The RustOS login still controls the RustOS interface, but it does **not** make public GitHub repository data private.

## Local development

Run:

```bash
npm install
npm start
```

Open `http://127.0.0.1:3000`.

Local development still uses the local `data/` directory and the default development passwords (`God` / `FG`) unless environment variables override them.
