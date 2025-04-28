# GitHub OAuth example in Next.js

Uses Postgres and Prisma. Rate limiting is implemented using JavaScript `Map`.

## Initialize project

Create a GitHub OAuth app with the redirect URI pointed to `/login/github/callback`.

```
http://localhost:3000/login/github/callback
```

Paste the client ID and secret to a `.env` file.

```bash
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET="
```

Init DB
```
bunx prisma db push
```

Run the application:

```
bun dev
```
Based on amazing template by lucia auth [here](https://github.com/lucia-auth/example-nextjs-github-oauth)