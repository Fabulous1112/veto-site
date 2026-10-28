# VETO web app

Static site, no build step. Vercel serves it as is (Framework preset: Other, no build command).

## Turn on live vaults

Live vaults switch on when a `deployments.json` file sits next to `index.html`.
After deploying the contracts to Robinhood Chain testnet (see the agent kit's `contracts/README.md`):

```bash
cp contracts/deployments/46630.json veto-site/deployments.json
git -C veto-site add deployments.json && git -C veto-site commit -m "Turn on testnet vaults" && git -C veto-site push
```

Vercel redeploys in about a minute. Without that file, the Vault tab says live vaults are opening soon,
and the Home, Agent and Rules tabs run as a demo.

Your AI trades. VETO says no.
