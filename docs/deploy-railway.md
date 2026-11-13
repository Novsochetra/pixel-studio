# Deploying to Railway

The studio runs on [Railway](https://railway.com) as one service built from the GitHub repo
`Novsochetra/pixel-studio`, beside a Railway Postgres database that keeps the accounts and their
saved work. The layers' pictures go to a private S3 bucket that only the server reads. The service
sends the page and the API from one address, `https://<name>.up.railway.app`. Every push to `main`
deploys again.

## How it works

- **Sign in.** Opened from the server, the studio asks for an email and a password before
  anything else. The password is kept as a scrypt hash (`server/src/accounts/passwords.js`); the
  browser holds a random session token in an HttpOnly cookie for 30 days. Sign out is in the
  Projects window, and in the More menu on a phone.
- **Saved work.** Every save goes to this browser first, then to the server (`syncedBackend` in
  `src/store/synced-backend.js`). A save the server does not take (no network, a deploy under way)
  waits in the browser and is sent when the server answers again; the toolbar says "Saved on this
  device: not yet sent to your account" until then. Another browser signed in to the same account
  opens the same projects.
- **Where it is kept.** Each saved document is a row of `documents` (user, key, JSON). A layer's
  picture is taken out of its row and put in the bucket at `users/<user id>/<key>.png`; the row
  keeps its `file_key`. With no bucket set, the picture stays in the row: it works, but the
  database grows with every picture.
- **Opened as a file** (`dist/index.html` with no server, or the old static host), the studio
  asks nobody to sign in and keeps work in the browser, as before.

## How a deploy runs

`.railway/railway.ts` holds the service's settings. Railway does not read it during a deploy:
`railway config apply` sends it (step 5), and again after any change to it. It leaves the variables
to the dashboard (`variables: { managed: false }`), so no password or key goes in the repo.

| Step       | What runs                                                                   | Why                                                                                                                                                                       |
| ---------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Builder    | `Dockerfile`                                                                | `build/build.py` needs Python as well as Node. The build stage (`node:22-bookworm`) has both; the image that runs (`node:22-bookworm-slim`) keeps the server and `dist/`. |
| Build      | `npm ci --ignore-scripts`, `python3 build/build.py`, `npm prune --omit=dev` | Exactly the lockfile; the page into `dist/`; then the test and lint tools go.                                                                                             |
| Pre-deploy | `node server/src/db/migrate-cli.js`                                         | Applies new migrations before the new server starts. If one fails, the deploy stops and the old server keeps serving.                                                     |
| Start      | `node server/src/main.js`                                                   | Node itself, not `npm start`, so it gets Railway's SIGTERM.                                                                                                               |
| Health     | `GET /api/health` must answer 200 within 120 s                              | It reads the users and documents tables, so a database that is down or never migrated keeps traffic on the old server.                                                    |
| Stop       | SIGTERM, then SIGKILL after 15 s                                            | The old server takes no new requests, finishes the saves under way, then closes the database pool.                                                                        |
| Region     | `asia-southeast1-eqsg3a` (Singapore), 1 copy                                | Closest to Cambodia. Keep one copy: the sign-in rate limit lives in the server's memory.                                                                                  |

On Railway (`RAILWAY_ENVIRONMENT_ID` is set) the server listens on `0.0.0.0`, trusts one proxy hop
(`TRUST_PROXY=1`) and sends the session cookie only over https (`SECURE_COOKIES=1`), unless you set
those variables. It refuses to start unless `DATABASE_URL` is a `postgres://` URL: without one it
would keep accounts in memory, and the next deploy would lose them. The message never shows the
value, which holds the password.

## Before you start

- This work merged into `main` on GitHub.
- A Railway account, and the [Railway CLI](https://docs.railway.com/cli) on your Mac:
  `brew install railway`.
- An AWS account, for the bucket.

## 1. Create the Railway project

1. railway.com → **New Project** → **Database** → **PostgreSQL**. Keep the service name `Postgres`.
2. In the project: **Create** → **GitHub Repo** → let Railway's GitHub app see `pixel-studio` →
   pick it. Name the service `pixel-studio`. A first deploy starts and fails until step 2 is done.
   That is fine.
3. Leave **Serverless** (app sleeping) off.

## 2. Set the variables

Open the `pixel-studio` service → **Variables** → **Raw Editor** and paste:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
PORT=8811
```

- `${{Postgres.DATABASE_URL}}` is the database's private address (no SSL needed). Paste it as it is,
  without quotes. If you renamed the database service, use its name.
- `PORT=8811` fixes the port, so the domain in step 3 can point at it before anything runs.
- Every variable: `.env.example`. The bucket's come in step 6.

## 3. Give it a public address

Service → **Settings** → **Networking** → **Generate Domain**. If it asks for a port, enter `8811`.
You get `https://<name>.up.railway.app`. A domain of your own can be added there later.

## 4. Install the repo's tools

In the repo folder on your Mac: `npm ci`. It brings the `railway` package the settings file imports.

## 5. Deploy

`plan` only shows the changes: it must list the Dockerfile builder, pre-deploy, start, health check
and draining, with nothing to destroy and `variables: unmanaged`.

```bash
railway login
railway link
railway config plan
railway config apply
```

Then click **Deploy** on the staged changes (or push a commit), and watch **Deployments** → the new one:

- Pre-deploy logs: `Migrating railway on postgres.railway.internal:5432`,
  `Applied 0001_accounts, 0002_documents` (later deploys: `Up to date.`).
- Deploy logs: `Pixel Studio running at http://localhost:8811/`,
  `Accounts and saved work in Postgres railway on postgres.railway.internal:5432` and, until step 6,
  `Layer pictures in Postgres (set S3_BUCKET to keep them in S3)`.
- It turns **Active** once `/api/health` answers. Open `https://<name>.up.railway.app/api/health`:
  `{"ok":true}`.

## 6. The bucket for the pictures (S3)

A private bucket that nobody but the server reads. It needs no CloudFront: the server sends each
picture only to its owner.

1. AWS Console → **S3** → **Create bucket**: `pixel-studio-files` (or any free name), region
   **Asia Pacific (Singapore) ap-southeast-1**. Keep **Block all public access** on. Turn
   **Bucket Versioning** on, so a picture overwritten by mistake can be brought back.
2. **IAM** → **Users** → **Create user** `pixel-studio-server`, without console access, and no
   permissions yet.
3. The user → **Permissions** → **Add permissions** → **Create inline policy** → **JSON**, paste
   this (with your bucket's name), and name it `pixel-studio-files`:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
         "Resource": "arn:aws:s3:::pixel-studio-files/*"
       }
     ]
   }
   ```

4. The user → **Security credentials** → **Create access key** → **Application running outside
   AWS**. Copy both values now: AWS shows the secret once.
5. Railway → the service → **Variables** → **Raw Editor**, add these and save (it deploys again):

   ```bash
   AWS_ACCESS_KEY_ID=<the access key ID>
   AWS_SECRET_ACCESS_KEY=<the secret access key>
   AWS_REGION=ap-southeast-1
   S3_BUCKET=pixel-studio-files
   ```

6. Check it with Railway's variables, from the linked repo folder: `railway run npm run storage:check`.
   It puts `checks/storage-check-<time>.txt` in the bucket, reads it back and removes it, and prints
   `S3 works: …`. The deploy logs now say `Layer pictures in S3 (pixel-studio-files)`.

Pictures saved before the bucket was set stay in their rows and are still read from there; each
moves to the bucket the next time its layer is saved.

## First deploy: what to check

- The address asks you to sign in. Create an account, open the example character, draw a stroke:
  the toolbar says "Saved to your account".
- In another browser (or a private window), sign in to the same account: the same project opens,
  stroke and all.
- Projects (the name, top left) shows "Signed in as" and Sign out.
- From another site the API refuses: in the browser console on any other page,
  `fetch('https://<name>.up.railway.app/api/account', { method: 'POST' })` fails.

## Looking after it

- **Backups.** Railway → Postgres → **Backups**: turn on daily backups. The bucket keeps old
  copies itself (versioning).
- **A bad deploy.** Railway → **Deployments** → the last good one → **Redeploy**. Migrations only
  add, so an older server runs on a newer database.
- **A forgotten password.** There is no email sending yet, so you give them a new one. The
  database is on Railway's private network, so run it inside the service, from the linked repo
  folder:

  ```bash
  railway ssh
  npm run account:password -- them@example.com
  ```

  It asks for the new password, sets it, and signs that account out everywhere. Tell them the new
  one.

- **Deleting an account.** `DELETE FROM users WHERE email = '…';` takes its sessions and documents
  with it. Its pictures stay in the bucket under `users/<id>/`: delete that folder in S3 too.

## The GitHub Pages copy

`.github/workflows/pages.yml` still publishes the page to https://novsochetra.github.io/pixel-studio/
on each push to `main`. There it has no server, so it asks nobody to sign in and keeps work in
that browser, as before; work there is not in any account. Once the Railway address works, you may
turn Pages off (the repo on github.com → **Settings** → **Pages** → **Source** → **None**) and
remove the workflow, so there is one studio.

## On your own machine

`npm run dev` builds the page and runs the server on http://localhost:8811/ with a Postgres in
memory (PGlite): accounts and work are gone when it stops. Set `DATABASE_URL` to a Postgres of your
own to keep them, after `npm run db:migrate`.
