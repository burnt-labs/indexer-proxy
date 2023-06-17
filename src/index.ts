type Env = {
  API_KEY: string
}

const INDEXER_HOST_MAP = {
  'juno-1': 'juno-mainnet.indexer.zone',
  'uni-6': 'juno-testnet.indexer.zone',
  'osmosis-1': 'osmosis-mainnet.indexer.zone',
}

//! Entrypoint.
export default {
  async fetch(request: Request, { API_KEY }: Env): Promise<Response> {
    const url = new URL(request.url)

    // Get first path segment to match chain ID and get host.
    const chainId = url.pathname.split('/')[1]
    const host =
      chainId in INDEXER_HOST_MAP
        ? INDEXER_HOST_MAP[chainId as keyof typeof INDEXER_HOST_MAP]
        : null
    if (host === null) {
      return new Response('Invalid chain ID', { status: 400 })
    }

    url.protocol = 'https'
    url.host = host
    // Forward the rest of the path to the indexer.
    url.pathname = '/' + url.pathname.split('/').slice(2).join('/')

    // Get response and add CORS header to response.
    const response = await fetch(url.toString(), {
      headers: {
        'X-Api-Key': API_KEY,
      },
    })

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...response.headers,
        'Access-Control-Allow-Origin': '*',
      },
    })
  },
}
