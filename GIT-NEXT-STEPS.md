# Getting this committed

Everything below runs on your machine — I can read and write files there, but I
cannot run `git`, so these are for you to paste. Git Bash or PowerShell both
work.

## Where things stand

    last commit on this repo   4 Aug   refactor(i18n): preserve static generation…
    agent portal written      16 Aug   never committed
    team management written   16 Aug   never committed
    orders + security          today   never committed

The whole agent portal has been sitting in the working tree, uncommitted, on a
branch called `feature/article-content-system` — a branch about blog articles.
Nothing is lost yet, but nothing is safe either: one bad `git checkout`, one
`npm` script that cleans, and three weeks of work is gone with no way back.

**Do this before anything else.**

## One commit, not five

`COMMIT-MESSAGES.txt` has five prepared messages from the session that built the
portal. They cannot be used as five commits, and it is worth knowing why before
you try.

Those five commits were made in a scratch clone that no longer exists — the
hashes in that file (`e52fc82`, `53a3c99`, …) are not objects in this repository;
`git cat-file -t e52fc82` will tell you the same. What arrived here was the
finished working tree, not the history. And every file involved is *untracked*:
from git's point of view there is no "portal commit" and then "orders commit",
just one large addition. Splitting it would mean hand-reconstructing intermediate
file states that were never on this disk, and every intermediate would be a
commit that does not build.

So: one commit, with a message that says what is in it. The five prepared
messages stay in `COMMIT-MESSAGES.txt` as the detailed record of how it was
built — worth keeping, worth reading in review.

## The commands

```bash
cd ~/Projects/ezorders-web

# 1. Look before you leap. This should list the portal files as untracked,
#    and nothing you don't recognise.
git status --short

# 2. A branch of its own. The work has nothing to do with blog articles.
git checkout -b feature/agent-portal

# 3. Everything except the two build artefacts.
git add -A
git reset -- agent-portal.patch tsconfig.tsbuildinfo

# 4. Check what you are about to commit — especially that .env.local is NOT in
#    the list. It holds the service-role key.
git status --short
git diff --cached --stat | tail -5

# 5. Commit.
git commit -F COMMIT-MESSAGE-agent-portal.txt

# 6. Push.
git push -u origin feature/agent-portal
```

## Two things to check at step 4

**`.env.local` must not appear.** `.gitignore` should already cover it — confirm
with `git check-ignore -v .env.local`, which should print the matching rule. If
it prints nothing, stop and add it before committing: the file contains
`SUPABASE_SERVICE_ROLE_KEY`, which bypasses every row-level security policy in
the database and cannot be un-leaked once pushed.

**`agent-portal.patch` is 10 MB** and is a copy of work now in the tree. Step 3
un-stages it. Delete it once the commit is in — `git clean` will not, since it is
excluded rather than ignored.

## Then: Vercel

The portal is dormant without configuration — `/he/agent/login` renders a
"not configured" notice rather than a form that cannot work, which is why the
marketing site has been fine all along. To wake it, set these in
**Vercel → Project Settings → Environment Variables**, for Production *and*
Preview:

    NEXT_PUBLIC_SUPABASE_URL         https://mhfzhxojqauxbsteajje.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY    (Supabase → Settings → API → anon/public)
    SUPABASE_SERVICE_ROLE_KEY        (same page → service_role — server-only)
    NEXT_PUBLIC_SITE_URL             https://ezorders.com

`NEXT_PUBLIC_SITE_URL` is the origin used to build the customer's link inside
emails and WhatsApp messages. Without it the code falls back to the request's own
origin, which is right on Vercel and wrong behind anything that rewrites the
host.

Set them on Preview too, or preview deploys will show the not-configured notice
and you will think something is broken.

## The database is already done

Migrations 0003 through 0007 are applied to the `ezorders-portal` project, and
the nightly expiry job is scheduled. The files in `supabase/migrations/` are the
record of what ran, so a fresh environment can be rebuilt from them — you do not
need to run anything.
