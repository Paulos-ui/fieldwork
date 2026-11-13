# Fieldwork

Open public/fieldwork.html to try the offline prototype, or install Node 22+, run npm install and npm run dev, then open http://localhost:3000. For production run npm run build and npm start. For Vercel choose Next.js and the package.json directory as the root.

Set RHEA_ACCESS_TOKEN in .env.local or private hosting environment variables to enable the quote route. The endpoint requests USDC on Base from USDC on NEAR, with the specified sender and recipient. Rhea selects the route. No signing or settlement is implemented. API reference: https://github.com/rhea-finance/rhea-sdk-docs/blob/main/CrossChainDexAPI.md

In Workspace create a campaign, approve the test action and expected outcome, choose a target device, record evidence, prepare a reward and retest the fix. Use Profile to change your tester name and device. Request evidence and Still failing keep the relevant stage open. Reload to recover your campaign on the same browser origin.

The prototype uses local rules and sample profiles, with browser-local persistence. Hosted authentication, multi-user storage, onchain policy enforcement and wallet settlement remain future work. BuilderOS on GOAT inspired beta tester connect. No prior contract is represented as a new NEAR deployment.

## NEAR AI agents

Optional local setup: add NEAR_AI_API_KEY to .env.local, restart the server, fill in the evidence, and choose Ask on the relevant stage. NEAR_AI_MODEL overrides the default model. Recommendations are saved when you record the decision. The browser-only demo works with manual review. Keep this prototype on localhost when server credentials are enabled until user authentication and rate limits are added.

## Start immediately from Git Bash

Extract the ZIP onto your Desktop. From the filed work folder, run node server.mjs and open http://127.0.0.1:4173. The local server uses Node 22+ and needs no npm packages. For configured integrations, set the environment variables in your terminal or run node --env-file=.env.local server.mjs. Run node --test to verify the campaign workflow. For the Next.js deployment use npm install and npm run build.

## Beta Tester Connect

At Scout, create a private tester invitation. Open it in a second browser profile, enter a build and evidence, and submit. In Reviewer, choose Load tester evidence. Each invitation accepts one report. A localhost link works on the same computer. For remote testers, host the server at a reachable origin and use persistent storage (FIELDWORK_DATA_DIR). Invitations and evidence survive server restarts. A default serverless filesystem is unsuitable for durable reports. The owner and tester links act as separate access credentials. Keep them private.

Rebuild the release archive with node scripts/zip.mjs from the project folder. The archive includes source and tests. Credentials, dependency caches and tester submissions stay outside it.

## Retest a release

Enter the fixed build in Retest and create an invitation. Send it to the original tester. The invitation carries the original report and expected build. Load the tester's evidence, then record Fixed or Still failing. A failed retest leaves the issue open for a new invitation.

## Run from Ubuntu on WSL

From Ubuntu, run the following with Node.js 22 or newer:

```bash
cd '/mnt/c/Users/MY PC/Desktop/filed work'
node --test tests/*.test.mjs
PORT=4174 node server.mjs
```

Open http://localhost:4174 in Windows. The Node launcher needs no package installation and can use the same source folder as Windows.

## Hosted invitations on Vercel

Create an Upstash Redis database and set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel. The REST token must allow writes. Invitations and tester submissions use Redis when both variables are present. On Vercel missing storage returns HTTP 503. On localhost the file store needs no credentials. Builder profiles and the campaign journal are still browser-local.

The server-only variables in .env.example also enable NEAR AI recommendations and Rhea quotes. NEAR_AI_MODEL is optional. A quote is a preview; the current app does not sign transactions. Before a public release with paid provider keys, add authentication and usage limits.

On Vercel set FIELDWORK_OPERATOR_TOKEN to a long random secret. Hosted AI and quote calls require it. The operator enters it when prompted. Tester invitations do not require this operator credential.

## Beta access and sign-in

Join beta stores a request using the same local disk or hosted Upstash configuration as tester invitations. Returning requests for the same email are deduplicated. On Vercel set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.

For email sign-in set SUPABASE_URL and SUPABASE_ANON_KEY on the server, enable the Supabase email provider, and include {{ .Token }} in the confirmation and magic link email templates. Configure email delivery in Supabase. Verification opens a per-account browser journal. Campaigns are device-local. The device demo opens the existing local journal and requires no provider credentials. Operator-protected remote actions still require FIELDWORK_OPERATOR_TOKEN.

Restart the preview server after changing API routes or environment settings.
