# Access and Ownership Transfer

Last verified: 2026-08-15 against Superbuilders sandbox account `056956104102`,
region `us-east-1`.

This file is intentionally safe to commit. It records resource identifiers,
access procedures and ownership tasks, but no AWS credentials, app keys, token
secrets or private configuration.

## Security rule

Do not put any of these in Git:

- AWS access keys or broker refresh tokens
- `gtk_...` application keys
- `platform-config.json` or `dashboard-config.json`
- `product/screener/.env.local`
- `product/screener/data/sanctuary/platform-app*.json`
- Secrets Manager values or DynamoDB API-key hashes

Browser app keys identify an application rather than a person, but they still
belong in deployment configuration rather than source control. Mint fresh keys
under GT ownership instead of transferring hidden local files.

## Engineer access

The supported interactive access path is the Superbuilders credential broker.

1. Install `sb-aws-creds`.
2. Run `sb-aws-creds login` and approve the browser prompt.
3. For raw AWS CLI use, run `sb-aws-creds install-profiles`.
4. Verify the target account:

```bash
AWS_PROFILE=sbsandbox aws sts get-caller-identity
# Account must be 056956104102
```

The MCP-only path can use the `sb-aws` server without writing AWS profiles.
Interns receive sandbox-only access. `sbproduction` is admin-gated and is not
required to inspect or maintain the current sandbox deployment.

Never use the human credential broker for CI/CD or service-to-service access.
Those require workload IAM roles and OIDC.

## CloudFormation-owned platform

All three stacks were `UPDATE_COMPLETE` when verified:

| Stack | Owns |
|---|---|
| `GtQuestionPlatformData` | Main table, answer-key table, persona table, snapshot bucket, KMS key, queues |
| `GtQuestionPlatformApi` | HTTP API, authorizer, catalogue, serve, score, admin and rescore functions |
| `GtQuestionPlatformWeb` | Bramblebrook bucket, CloudFront distribution and bundle deployment |

Current stack tags:

```text
Project=gt-question-platform
Environment=ephemeral
ManagedBy=cdk
repo=aai-gt-selection
Owner=aadi.takle@alphaaiengineering.com
```

When GT accepts ownership, update the `Owner` tag through the CDK/stack
deployment process. Do not hand-edit CloudFormation-owned resources and then
expect the change to survive the next deployment.

### Stack outputs and data resources

| Resource | Identifier |
|---|---|
| API | `https://0yz8m5z48k.execute-api.us-east-1.amazonaws.com` |
| Main table | `GtQuestionPlatformData-PlatformTable5198EBA1-12660HI1VJNVV` |
| Answer-key table | `GtQuestionPlatformData-AnswerKeyTable354C1E80-19LYC66BIS17N` |
| Persona table | `GtQuestionPlatformData-PersonaTable3E72C0D6-1NKAYX7L6OFTD` |
| Snapshot bucket | `gtquestionplatformdata-snapshotbucketb2bf31d3-scallbwway1r` |
| Bramblebrook bucket | `gtquestionplatformweb-gamebucketa1b37ea9-0nwexjv2nvoi` |
| Rescore queue | `GtQuestionPlatformData-RescoreQueue0301C092-SQOQGIm0orWp` |

The answer-key table is intentionally isolated from the serving Lambda's IAM
role. Preserve that boundary when changing permissions.

## CloudFront and static applications

| Surface | Distribution | Origin bucket |
|---|---|---|
| Bramblebrook | `E3LAY2ZROGPRPB` | `gtquestionplatformweb-gamebucketa1b37ea9-0nwexjv2nvoi` |
| Question-type review | `E3VCI457TMLIXD` | `gt-question-review-1786603835` |
| Platform dashboard | `E1GHL02R5R6FQ0` | `gt-platform-dashboard-1786607553` |

Bramblebrook is CDK-owned. The review UI and dashboard were deployed manually.
Their runtime configuration files are gitignored because they carry app keys.
Do not run a blind `aws s3 sync` from a clean clone: doing so can remove or
replace the deployed runtime config.

## App Runner and ECR

| Service | Status | Image | Auto deploy |
|---|---|---|---|
| `gt-screener-2` | Running | `056956104102.dkr.ecr.us-east-1.amazonaws.com/gt-screener:bind-fix` | disabled |
| `gt-cogat-prep-2` | Running | `056956104102.dkr.ecr.us-east-1.amazonaws.com/gt-cogat-prep:bind-fix` | disabled |

Both use 1 vCPU, 2 GB memory and port 3000. Their public demo configuration
uses placeholder Supabase values and must not be treated as a child-data
environment.

Relevant ECR repositories:

- `056956104102.dkr.ecr.us-east-1.amazonaws.com/gt-screener`
- `056956104102.dkr.ecr.us-east-1.amazonaws.com/gt-cogat-prep`
- `056956104102.dkr.ecr.us-east-1.amazonaws.com/gt-web`

App Runner instances bill while provisioned. GT should explicitly choose
whether to keep, pause or retire each demo after handoff.

## Platform app registrations

The following non-secret app records were present:

| App id | Name | Status |
|---|---|---|
| `app-bramblebrook` | Bramblebrook | active |
| `app-9060b38c-d1c2-4ded-8e13-15ed3bd69366` | GT Question-Type Review | active |
| `app-b157b58d-32ec-4349-81e5-3036f981bb4f` | GT Screener (CogAT) | active |

The database stores only key hashes. Plaintext keys cannot be recovered from the
table. Bramblebrook provisioning can mint another key for `app-bramblebrook`.
For another browser app, create a replacement app registration through the
IAM-authorized admin route, reproduce its type approvals, update the deployed
runtime config, and verify it before retiring the old configuration.

The current API has no general key-revocation or key-rotation HTTP route. Treat
that as an operational limitation rather than placing working keys in this file.

## CORS configuration that must survive deployment

The live API currently allows:

```text
https://d14xlnxxtsczg9.cloudfront.net
http://localhost:5230
http://127.0.0.1:5230
http://localhost:8420
http://127.0.0.1:8420
http://localhost:3100
http://127.0.0.1:3100
https://d284xy6sbvs9mb.cloudfront.net
http://localhost:8455
http://127.0.0.1:8455
https://d14n29hsrte7u8.cloudfront.net
```

The exact deployment command is maintained in:

- `product/docs/gt/operations-and-change-control.md`
- `product/docs/gt/testing-and-demos.md`

Do not deploy the API stack without the complete `origins` context. The CDK
default contains only the local Bramblebrook origins and would otherwise break
the three deployed browser clients.

## Read-only acceptance checks

```bash
AWS_PROFILE=sbsandbox aws cloudformation describe-stacks \
  --region us-east-1 \
  --stack-name GtQuestionPlatformApi

AWS_PROFILE=sbsandbox aws apprunner list-services --region us-east-1

curl -sS -o /dev/null -w '%{http_code}\n' \
  https://0yz8m5z48k.execute-api.us-east-1.amazonaws.com/v1/catalog/types
# expected without a key: 401
```

Then verify all live URLs in `product/docs/gt/testing-and-demos.md`.

## Ownership acceptance checklist

- [ ] GT engineer can authenticate through the credential broker.
- [ ] `sts get-caller-identity` returns account `056956104102`.
- [ ] GT engineer can read all three CloudFormation stacks.
- [ ] GT engineer can inspect CloudFront, S3, App Runner, ECR and API Gateway.
- [ ] GT engineer can run the complete live-site smoke list.
- [ ] GT engineer can synthesize CDK with the preserved CORS origins.
- [ ] GT chooses a new `Owner` tag value.
- [ ] Fresh app/deployment configuration is transferred through an approved secure channel or reminted.
- [ ] GT decides whether the two billed App Runner demos remain running.
- [ ] GT acknowledges that this is sandbox, not production.

Production requires separate `sbproduction` approval, CDK bootstrap, keys,
origins and an explicit promotion plan. Nothing in this sandbox inventory grants
production access.
