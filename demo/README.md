# Demos

Everything here is deployed and reachable. Each entry says where it runs, and whether it reads the
question library live rather than from a file that can go stale.

| Demo | Link | Hosting | Reads the library live |
| --- | --- | --- | --- |
| **Backend dashboard** | <https://d14n29hsrte7u8.cloudfront.net> | S3 + CloudFront | Yes — catalogue and app registrations |
| **Question-type review** | <https://d284xy6sbvs9mb.cloudfront.net> | S3 + CloudFront | Yes — types, spectra and served items |
| **CogAT prep site** | <https://scunwsuf4i.us-east-1.awsapprunner.com/about-the-test> | App Runner (container) | No — it is an explainer, not a screener |
| **Bramblebrook game** | <https://d14xlnxxtsczg9.cloudfront.net> | S3 + CloudFront | Yes — serving and scoring |
| GT screener (example assessment) | not deployed | — | pending |

The platform behind them all: `https://0yz8m5z48k.execute-api.us-east-1.amazonaws.com`, account
`056956104102`, region `us-east-1`.

## What is in this folder

| Folder | What it is |
| --- | --- |
| `platform-dashboard/` | The backend dashboard. Static page; infrastructure from a deploy-time snapshot, library data fetched live. |
| `question-type-review/` | The 36-type review UI, moved here from `archive/research/exam-question-types`. |
| `gt-screener/` | A pointer. The app is a Next.js workspace package and cannot be relocated without breaking the monorepo. |
| `cogat-prep/` | A pointer. The app lives on a different branch. |

## Why two of them are pointers rather than folders

The review UI is a static page, so moving it here cost nothing. The other two are Next.js
applications that are workspace packages in their own repositories — moving their source would break
their build paths, their `pnpm-workspace` membership and their Dockerfiles, all to satisfy a
directory layout. Each pointer records where the source actually is and how it was deployed.

## Running them locally

```bash
# dashboard
cd platform-dashboard && python3 -m http.server 8455

# review UI
cd question-type-review && python3 serve-review.py 8420
```

Both need a `platform-config.json` (or `dashboard-config.json`) carrying the API base URL and an app
key. Copy the `.example.json` beside it. Those files are gitignored because they hold a live key.
Both `localhost` ports are already in the API's CORS allow-list.

## One piece of drift worth fixing

The CORS allow-list on the API was updated directly on the live API rather than through the CDK app
that owns it, because that app belongs to another workstream. **The next `cdk deploy` of the API
stack reverts it.** These origins need to reach that stack's `-c origins=` to survive:

```
https://d284xy6sbvs9mb.cloudfront.net
https://d14n29hsrte7u8.cloudfront.net
http://localhost:8420   http://127.0.0.1:8420
http://localhost:8455   http://127.0.0.1:8455
http://localhost:3100   http://127.0.0.1:3100
```
