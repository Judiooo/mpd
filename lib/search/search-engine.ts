import { JackettRelease } from '@/lib/jackett'

export interface SearchEngineOptions {
  baseUrl: string
  apiKey: string
  timeout?: number
}

async function searchIndexer(
  baseUrl: string,
  apiKey: string,
  query: string,
  indexer: string,
  timeout = 10000,
): Promise<JackettRelease[]> {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}/api/v2.0/indexers/${indexer}/results`)

  url.searchParams.set('apikey', apiKey)
  url.searchParams.set('Query', query)

  const controller = new AbortController()

  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    console.log(`🔍 ${indexer} → ${query}`)

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!res.ok) {
      console.warn(`${indexer}: HTTP ${res.status}`)
      return []
    }

    const data = (await res.json()) as {
      Results?: JackettRelease[]
    }

    console.log(`${indexer}: ${data.Results?.length ?? 0} результатов`)

    return data.Results ?? []
  } catch (err) {
    console.warn(`${indexer}: ошибка`, err)

    return []
  } finally {
    clearTimeout(timer)
  }
}

export async function searchAllIndexers(
  options: SearchEngineOptions,
  indexers: string[],
  queries: string[],
): Promise<JackettRelease[]> {
  const tasks: Promise<JackettRelease[]>[] = []

  for (const indexer of indexers) {
    for (const query of queries) {
      tasks.push(
        searchIndexer(
          options.baseUrl,
          options.apiKey,
          query,
          indexer,
          options.timeout,
        ),
      )
    }
  }

  const settled = await Promise.allSettled(tasks)

  const releases: JackettRelease[] = []

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      releases.push(...result.value)
    }
  }

  return releases
}