type Env = {
  API_KEY: string
}

const INDEXER_HOST_MAP = {
  'juno-1': 'juno-mainnet.indexer.daodao.zone',
  'uni-6': 'juno-testnet.indexer.daodao.zone',
  'osmosis-1': 'osmosis-mainnet.indexer.daodao.zone',
  'osmo-test-5': 'osmosis-testnet.indexer.daodao.zone',
  'stargaze-1': 'stargaze-mainnet.indexer.daodao.zone',
  'elgafar-1': 'stargaze-testnet.indexer.daodao.zone',
  'neutron-1': 'neutron-mainnet.indexer.daodao.zone',
  'pion-1': 'neutron-testnet.indexer.daodao.zone',
  'migaloo-1': 'migaloo-mainnet.indexer.daodao.zone',
  'narwhal-2': 'migaloo-testnet.indexer.daodao.zone',
  Oraichain: 'oraichain-mainnet.indexer.daodao.zone',
  'phoenix-1': 'terra-mainnet.indexer.daodao.zone',
  'kaiyo-1': 'kujira-mainnet.indexer.daodao.zone',
  'harpoon-4': 'kujira-testnet.indexer.daodao.zone',
  'columbus-5': 'terraClassic-mainnet.indexer.daodao.zone',
  'bitsong-2b': 'bitsong-mainnet.indexer.daodao.zone',
  bobnet: 'bitsong-testnet.indexer.daodao.zone',
  'omniflixhub-1': 'omniflix-mainnet.indexer.daodao.zone',
  'flixnet-4': 'omniflix-testnet.indexer.daodao.zone',
  provider: 'cosmosHubProvider-testnet.indexer.daodao.zone',
  'theta-testnet-001': 'cosmosHubTheta-testnet.indexer.daodao.zone',
  'cosmoshub-4': 'cosmosHub-mainnet.indexer.daodao.zone',
}

const queryIndexer = async ({ API_KEY }: Env, url: URL) => {
  // Get first path segment to match chain ID and get host.
  const chainId = url.pathname.split('/')[1]
  const host =
    chainId in INDEXER_HOST_MAP
      ? INDEXER_HOST_MAP[chainId as keyof typeof INDEXER_HOST_MAP]
      : null
  if (host === null) {
    throw new Response('Invalid chain ID', { status: 400 })
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

  return {
    status: response.status,
    body: await response.text(),
    headers: response.headers,
  }
}

//! Entrypoint.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const method = request.method.toUpperCase()
    const url = new URL(request.url)

    // Respond to OPTIONS requests.
    if (method === 'OPTIONS') {
      const origin = request.headers.get('Origin') || ''
      const corsRequestHeaders = request.headers.get(
        'Access-Control-Request-Headers'
      )

      if (
        origin &&
        request.headers.get('Access-Control-Request-Method') !== null &&
        corsRequestHeaders
      ) {
        // Handle CORS preflight requests.
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
            'Access-Control-Max-Age': '86400',
            'Access-Control-Allow-Headers': corsRequestHeaders,
          },
        })
      } else {
        // Handle standard OPTIONS request.
        return new Response(null, {
          headers: {
            Allow: 'GET, HEAD, POST, OPTIONS',
          },
        })
      }
    } else if (method === 'GET') {
      // Proxy one request.
      try {
        const response = await queryIndexer(env, new URL(request.url))
        const contentType = response.headers.get('Content-Type')
        return new Response(response.body, {
          status: response.status,
          headers: {
            ...(contentType && {
              'Content-Type': contentType,
            }),
            'Access-Control-Allow-Origin': '*',
          },
        })
      } catch (err) {
        console.error(err)

        if (err instanceof Response) {
          return err
        }

        throw new Response(
          `Unexpected server error: ${
            err instanceof Error ? err.message : err
          }`,
          { status: 500 }
        )
      }
    } else if (
      method === 'POST' &&
      url.pathname.split('/')[1] === 'batch' &&
      url.pathname.split('/').length <= 3
    ) {
      // Batch requests.
      const paths = await request.json()
      if (!Array.isArray(paths)) {
        return new Response('Invalid request', { status: 400 })
      }

      try {
        const responses = await Promise.all(
          paths.map(async (path) => {
            const url = new URL(request.url)
            url.pathname = path.split('?')[0]
            url.search = path.split('?')[1]
            try {
              return await queryIndexer(env, url)
            } catch (err) {
              return {
                status: 400,
                body:
                  err instanceof Error
                    ? err.message
                    : 'unknown error querying indexer',
              }
            }
          })
        )

        return new Response(JSON.stringify(responses), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        })
      } catch (err) {
        console.error(err)

        if (err instanceof Response) {
          return err
        }

        throw new Response(
          `Unexpected server error: ${
            err instanceof Error ? err.message : err
          }`,
          { status: 500 }
        )
      }
    }

    return new Response('Not found', { status: 404 })
  },
}
