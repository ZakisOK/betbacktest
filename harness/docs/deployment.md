# Deployment

## Where it runs

- **Cloudflare Pages**: connected through its GitHub integration. Every pull
  request gets a preview build, including the `functions/api/` endpoints.
  Server secrets are set in the Cloudflare dashboard, never in the repo.
- **GitHub Pages** (https://zakisok.github.io/betbacktest/): serves a static
  build from `/docs` on branch `claude/baccarat-strategy-dashboard-XhtbT`, not
  from `main`. Do not delete that branch.

## Known broken paths

- `.github/workflows/deploy.yml` fails on every push to `main`: the
  `github-pages` environment only allows its configured branch to deploy.
  Either point Pages at GitHub Actions and allow `main`, or delete the workflow.
- `npm run deploy` publishes `dist/` to a `gh-pages` branch that Pages does not serve.

## Rollback

Promote the previous deployment in the Cloudflare Pages dashboard, or revert
the `/docs` commit on the GitHub Pages branch.

## Secrets

`.env` holds local values only and is gitignored; `.env.example` lists the
names. Never commit a real key. CI runs TruffleHog on every change.
