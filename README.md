# indexer-proxy

Proxy requests to the indexer using an API key.

Deployed at https://indexer.daodao.zone

## Development

### Run locally

```sh
npm run dev
# OR
wrangler dev --local --persist
```

### Configuration

1. Copy `wrangler.toml.example` to `wrangler.toml`.

2. Configure secret:

```sh
echo <VALUE> | npx wrangler secret put API_KEY
```

## Deploy

```sh
wrangler publish
# OR
npm run deploy
```

## API

### `GET /:chainId/...:route`

Passes the route through to the indexer with the API key attached.

Example: `/juno-1/contract/junoDaoAddress/daoCore/dumpState`
