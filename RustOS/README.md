# RustOS — Localhost + GitHub Pages + Render

RustOS is a small web app with a static frontend and a Node.js backend. It can
run entirely on your computer, or the frontend can be hosted on GitHub Pages
while the backend runs on Render.

## Features

- Selectable Rust and FG accounts on the login screen.
- Rust = editor: can upload and edit database files.
- FG = read only: can view files but cannot upload or edit.
- Desktop background selector with Blue and Black options.
- Background choice is saved in the browser.
- Localhost mode uses the same backend and frontend.
- Online mode uses the Render backend through an API URL in `config.js`.
- Production passwords are supplied through Render environment variables, not
  stored in the frontend.
- Uploaded files are stored on a Render persistent disk.

## Localhost

Install Node.js 20 LTS (Node 18+ also works).

From this folder:

```bash
npm start
```

Open:

```text
http://127.0.0.1:3000
```

For local development only, the default accounts are:

```text
Rust / God  -> Editor
FG / FG     -> Read only
```

Do not use those passwords for a public deployment.

## GitHub Pages + Render

The online layout is:

```text
Friend's browser
       |
       v
GitHub Pages (index.html + config.js)
       |
       | HTTPS API
       v
Render (server.js)
       |
       v
Persistent disk (/var/data/rustos)
```

### 1. Put the project on GitHub

Create a repository and upload the project files. GitHub Pages needs:

```text
index.html
config.js
```

Do not put passwords in `config.js`.

### 2. Deploy the backend on Render

Create a Render **Web Service** from the GitHub repository. The included
`render.yaml` is a Blueprint configuration and uses:

```text
Runtime: Node
Build command: npm install
Start command: npm start
Health check: /api/health
```

The Blueprint also creates a 1 GB persistent disk mounted at:

```text
/var/data
```

and sets `DATA_DIR=/var/data/rustos` so uploaded files survive normal service
restarts and redeploys.

**Important:** a persistent Render disk is not part of the free web-service
filesystem. The Blueprint therefore uses Render's paid Starter web service.
Check Render's current pricing before deploying.

### 3. Set Render environment variables

Set these values in the Render service:

```text
FRONTEND_ORIGIN=https://YOUR-USERNAME.github.io
RUST_PASSWORD=your-private-rust-password
FG_PASSWORD=your-private-fg-password
```

If your GitHub Pages URL is a project site such as:

```text
https://YOUR-USERNAME.github.io/RustOS/
```

the `FRONTEND_ORIGIN` value is still only:

```text
https://YOUR-USERNAME.github.io
```

Do not include the `/RustOS/` path in `FRONTEND_ORIGIN`.

### 4. Copy the Render backend URL

After deployment, Render will give the backend an HTTPS address similar to:

```text
https://rustos-backend.onrender.com
```

The exact hostname depends on your Render service name.

### 5. Connect GitHub Pages to Render

Edit `config.js`:

```js
window.RUSTOS_API_BASE = 'https://YOUR-BACKEND.onrender.com';
```

Commit and push the change to GitHub.

Then enable GitHub Pages for the repository. Your friends can open the GitHub
Pages URL and use RustOS without installing Node.js.

## Local vs online config

For localhost, leave `config.js` as:

```js
window.RUSTOS_API_BASE = '';
```

For GitHub Pages, set it to the Render backend URL.

The same `RustOS.html`/`index.html` frontend can be used in both modes.

## Data and accounts

The backend is authoritative for permissions. Hiding buttons in the frontend
is not the security boundary; the API rejects write requests from FG.

Sessions are held in backend memory, so a backend restart signs users out.

Files live under the configured `DATA_DIR` in:

```text
data/files/goku
data/files/sonic
```

locally, or under the Render persistent disk online.

## Security before sharing

- Set strong private Render passwords.
- Never commit `.env` files or passwords to GitHub.
- Keep the Render backend on HTTPS.
- The public frontend never receives the account passwords.
- The backend enforces Rust editor vs FG read-only access.

## Notes

The backend uses Node's built-in modules and does not require an external npm
package for its current implementation.
