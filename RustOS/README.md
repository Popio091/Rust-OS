# RustOS — Localhost + GitHub Pages + Free Node Backend

RustOS can run locally and can also be published as a normal website.

## What the online setup looks like

```text
Your friends
    |
    v
GitHub Pages
    |
    | HTTPS API requests
    v
Render free Node backend
    |
    v
RustOS accounts + files
```

GitHub Pages serves the frontend. Render runs `server.js` and handles login,
permissions, uploads, and file editing. Visitors do **not** need Node.js.

GitHub Pages is a static hosting service, so the backend must run separately.
Render currently offers free Node web services, but its free services can spin
down after inactivity and their local filesystem is ephemeral. That means the
free setup is good for testing/hobby use, but uploaded files can be lost after
a restart/redeploy. See the Render documentation before relying on it for
important data.

## Part 1 — Run RustOS locally

Install Node.js 18+ (Node 20 LTS is recommended).

From this folder:

```bash
npm start
```

Then open:

```text
http://127.0.0.1:3000
```

Default development accounts:

```text
Rust / God  -> Editor
FG / FG     -> Read only
```

Change these before putting the project online.

## Part 2 — Put the project on GitHub

Create a GitHub repository and upload the project files.

The important frontend files are:

```text
index.html
config.js
```

`index.html` is provided specifically so GitHub Pages can open RustOS at the
site root.

Do **not** put passwords in `config.js`.

## Part 3 — Deploy the backend for free on Render

1. Create a Render account.
2. Create a **Web Service** from your GitHub repository.
3. Render can use the included `render.yaml`, or enter these settings manually:

```text
Runtime: Node
Build command: npm install
Start command: npm start
Plan: Free
Health check: /api/health
```

4. Add these environment variables:

```text
FRONTEND_ORIGIN=https://YOUR-USERNAME.github.io
RUST_PASSWORD=your-private-rust-password
FG_PASSWORD=your-private-fg-password
```

If your GitHub Pages site is a project site such as
`https://YOUR-USERNAME.github.io/RustOS/`, the origin is still just:

```text
https://YOUR-USERNAME.github.io
```

5. Deploy the service.
6. Render will give the backend a URL similar to:

```text
https://rustos-backend.onrender.com
```

The exact URL depends on the name available in your Render account.

## Part 4 — Connect GitHub Pages to the backend

Open `config.js` and change:

```js
window.RUSTOS_API_BASE = '';
```

to your actual Render URL:

```js
window.RUSTOS_API_BASE = 'https://YOUR-BACKEND.onrender.com';
```

Commit/push that change to GitHub.

Then enable GitHub Pages for the repository. GitHub Pages will serve
`index.html`, and RustOS will send its API requests to the Render backend.

## Important free-host limitation

The free Render web service has an ephemeral filesystem. Files written to
`data/files/` can disappear when the service restarts, redeploys, or spins down.
The free service also spins down after 15 minutes without traffic and can take
about a minute to wake up on the next request.

For a real permanent online file database, the next upgrade should be a
persistent database/object-storage setup rather than relying on the backend's
local disk.

## Security

- The backend, not the HTML, enforces Rust's editor permission and FG's
  read-only permission.
- Use private passwords in the Render environment variables.
- Use HTTPS for the public backend (Render provides HTTPS).
- Never commit `.env` files or passwords to GitHub.
- Backend sessions are held in memory, so restarting the backend signs users
  out.
