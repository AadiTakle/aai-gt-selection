# The review UI on the deployed question platform

This page no longer reads anything from disk that can go stale. The list of types, their counts and
their difficulty spectra come from the deployed library, and pressing **Serve a real item** opens a
real session and takes what the engine serves.

## Where it runs

| | |
| --- | --- |
| Deployed UI | <https://d284xy6sbvs9mb.cloudfront.net> |
| Platform API | `https://0yz8m5z48k.execute-api.us-east-1.amazonaws.com` |
| App id | `app-9060b38c-d1c2-4ded-8e13-15ed3bd69366` ("GT Question-Type Review") |
| Bucket | `gt-question-review-1786603835` (private; CloudFront reads it through an OAC) |
| Distribution | `E3VCI457TMLIXD` |

Locally: `python3 serve-review.py 8420`, then <http://127.0.0.1:8420/review.html>. Both origins are
in the API's CORS allow-list.

## What it talks to

| Route | Used for |
| --- | --- |
| `GET /v1/catalog/types` | the sidebar, filtered to `approvedForThisApp` |
| `GET /v1/catalog/types/{code}` | the difficulty histogram and the item counts |
| `POST /api/bank/sessions` | a session restricted to the one type being reviewed |
| `GET /api/bank/sessions/{id}/next` | the real item pushed into the demo iframe |
| `POST /api/bank/sessions/{id}/answer` | resolving an item so the engine will serve another |

`platform-config.json` carries the API base URL and the app key. It is gitignored; copy
`platform-config.example.json` and mint a key with `POST /v1/admin/apps` (IAM-signed) if you need
your own.

## Which types appear, and why the list got shorter

36, down from 70. Two kinds of entry were dropped, and both used to look identical to a reviewer
until they clicked and got nothing:

- **17 specced but absent.** They exist in `review-data.json` as a design and have no bank in the
  library at all.
- **17 present but unscorable.** They have items and nothing markable, so no question can ever be
  served from one.

Four types went the other way and are visible here for the first time — `FLU-OPCHAIN-01`,
`QUANT-GLYPHNUM-01`, `SPA-XFORM-01` and `VER-MORPHO-01` had real banks and were missing from the
static file.

The filter is the platform's `approvedForThisApp`, not a list in this page. Changing what a reviewer
sees is an approval change on the platform.

## Two deliberate behaviour changes

**No answer key panel.** The old page fetched whole bank records — keys included — and deleted the
key in JavaScript before handing the item to the demo. That is a key that reached the browser. The
platform strips keys server-side and cannot return one, which is also what makes this page safe to
host somewhere other than localhost.

**The difficulty slider is gone.** `/v1/catalog/types/{code}` returns a difficulty distribution and
no items on purpose, so there is no way to ask for "the item at 14.5". The age-band chips are the
real control, because `ageBand` is a session field the platform honours, and the served difficulty is
reported back as a readout.

## One piece of drift to fix

The CORS allow-list was updated on the live API directly, because the CDK app that owns it belongs to
another workstream. **The next `cdk deploy` of the API stack will revert it.** These origins need to
go into that stack's `-c origins=` to survive:

```
https://d284xy6sbvs9mb.cloudfront.net
http://localhost:8420
http://127.0.0.1:8420
```
