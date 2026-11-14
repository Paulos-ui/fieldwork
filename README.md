# Fieldwork

Fieldwork is a NEAR builder workspace for finding ecosystem opportunities and taking a release through five specialist agents. Builders can review a pitch, prepare a tester assignment, collect evidence, preview a reward and retest a fix from one campaign journal.

The console uses NEAR wallet access, a white opportunity feed, searchable categories, saved listings and a dedicated agent workspace. The public page includes the project vision, technical flow and user guide.

## Run locally

Use Node.js 22 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Set `FIELDWORK_SESSION_SECRET` in `.env.local` before connecting a wallet. Generate it with `openssl rand -hex 32` in WSL or Git Bash. Keep this file outside version control.

The production build bundles the NEAR wallet browser adapter before building Next.js.

```bash
npm run build
npm start
```

For the lightweight Node preview, build the wallet bundle first and load the environment explicitly.

```bash
npm run bundle:wallet
node --env-file=.env.local server.mjs
```

The preview normally opens at http://127.0.0.1:4173. On Ubuntu in WSL, the source folder is available at `/mnt/c/Users/MY PC/Desktop/filed work`. Use `PORT=4174 node --env-file=.env.local server.mjs` to select another port.

## NEAR wallet access

Choose Meteor Wallet or MyNearWallet and connect a NEAR mainnet account. Fieldwork requests a NEP-413 message signature to establish account ownership. The sign-in message does not authorize a transaction.

The server creates a short-lived random challenge, checks its origin and expiry, verifies the signature against an onchain full-access key and consumes the challenge once. Successful verification creates a signed HttpOnly session cookie with a 24-hour expiry. The server requires a session secret of at least 32 characters.

Campaign journals are stored in localStorage under the signed-in NEAR account. They remain on the same browser and origin. Connecting another account opens that account's journal. There is no cross-device campaign sync.

Email sign-in and Supabase configuration are no longer part of the access flow. The beta form still accepts an email address so a builder can request contact.

## Find NEAR opportunities

The Opportunities view contains official NEAR ecosystem sources, including the NEAR hackathon, NEARN, DevHub, Potlock, Meta Pool grants and NEAR Protocol Rewards. Search, filter by type and save entries to revisit them.

Some entries are directories or ongoing programs. Their linked pages provide the current listings, eligibility and application windows. A directory entry is labeled as a directory, and an unconfirmed funding round is labeled for source confirmation. The catalog is curated and does not claim to enumerate every live NEAR campaign.

A source link opens the official program. Bookmarks remain in the current account's browser journal.

## Use the five agents

| Agent | Work |
| --- | --- |
| Pitch Coach | Clarify a builder pitch into a repeatable action and visible pass condition |
| Scout | Check supplied tester profiles for the requested device coverage |
| Reviewer | Check build information, reproduction steps and observed evidence against the brief |
| Paymaster | Inspect a proposed USDC reward and request a Rhea quote when configured |
| Retest | Compare the new build's evidence with the original report and pass condition |

Open Agents to choose a specialist, or create a campaign to follow the five stages in sequence. Fill in its context, run the assessment and review the recommendation before recording your decision. Missing tester coverage stays visible. A request for more evidence keeps Reviewer open, and a failed retest keeps Retest open.

When `NEAR_AI_API_KEY` is configured, assessments use NEAR AI Cloud and identify their source as `near-ai`. Otherwise, the agents run deterministic evidence checks and identify their source as `rules`. Evidence checks report missing fields and review requirements. They do not claim a live model response. Provider failures remain visible and can be retried.

The agent's public identity is Fieldwork Agent AI. Its recommendations assist the builder's decision. They do not constitute a chain transaction, tester acceptance or independent verification of a software fix.

## Tester invitations and field records

At Scout, create a tester invitation and send its private link to a tester. The tester opens the link, enters the build and evidence, then submits. At Reviewer, load the report and record the review decision. Each invitation accepts a single report.

At Retest, enter the fixed build and create a new invitation for the original tester. Collect its evidence before deciding Fixed or Still failing. An incorrect reported build is flagged for review.

The tester and owner credentials provide separate access to the report. Keep invitation URLs private. Hosted invitations use Upstash Redis. Local development uses `.fieldwork-data`, or the folder selected through `FIELDWORK_DATA_DIR`.

The Tracker groups campaigns by their current stage. Select a card to resume work. Download field record exports the campaign pitch, stage and agent journal as JSON. Invitation credentials are excluded from this export.

## Rhea reward preview

Set `RHEA_ACCESS_TOKEN` to enable the NEAR USDC to Base USDC quote request. A signed-in builder must use their connected NEAR account as the sender. The destination address is a quote field and does not introduce an EVM wallet sign-in flow.

The integration checks the HTTP response, Rhea business status and returned route. A quote previews a proposed route. Transaction signing, token transfer, settlement and payout confirmation are not implemented. The UI must not represent a saved preview as a paid reward.

Rhea integration refers to the implemented API connection. It does not imply a partnership or sponsorship.

Official API reference  
https://github.com/rhea-finance/rhea-sdk-docs/blob/main/CrossChainDexAPI.md

## Environment variables

All variables below are server-side.

| Name | Purpose |
| --- | --- |
| `FIELDWORK_SESSION_SECRET` | Required for NEAR login, at least 32 random characters |
| `UPSTASH_REDIS_REST_URL` | Required on Vercel for challenge replay protection, beta requests and tester reports |
| `UPSTASH_REDIS_REST_TOKEN` | Read/write REST token for the same Upstash database |
| `NEAR_AI_API_KEY` | Optional, enables live Fieldwork agent recommendations through NEAR AI Cloud |
| `NEAR_AI_MODEL` | Optional, overrides the route's default model |
| `RHEA_ACCESS_TOKEN` | Optional, enables Rhea quote previews |
| `FIELDWORK_OPERATOR_TOKEN` | Optional, server credential for legacy operator API callers |
| `FIELDWORK_DATA_DIR` | Optional, local file-store directory for the Node preview |

NEAR wallet users authenticate through their verified session and do not enter the operator token. An existing authorized operator caller can continue to use its bearer token.

## Deploy on Vercel

1. Push the complete project source, including `app`, `public`, `scripts` and `package.json`, to the connected repository.
2. Choose Next.js as the framework and use the folder containing `package.json` as the root.
3. Use `npm run build` as the build command. It generates the browser wallet bundle and builds the API routes.
4. In Settings, Environment Variables, add `FIELDWORK_SESSION_SECRET`, `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for Production.
5. Add the optional NEAR AI and Rhea credentials for the integrations you want to enable.
6. Deploy the latest source. Redeploy after changing environment values.

Deploying only the public folder omits the wallet verification, agent, beta and invitation API routes. No Supabase variables are required for this NEAR wallet access flow.

After deployment, connect your own NEAR wallet and complete the signature prompt. Create a campaign, test an invitation in another browser profile and inspect a returned report. Test live NEAR AI and Rhea separately with your provider credentials.

## Checks and current scope

Run `npm test` for regression checks and `npm run build` for the production build.

Automated provider tests use mocked responses. Wallet tests exercise signature verification and replay rejection without asking a real user wallet to sign. A real wallet approval and live NEAR AI or Rhea credentials require deployment-level verification. Campaign journals remain device-local. Onchain rewards and automatic settlement are outside the implemented flow.
