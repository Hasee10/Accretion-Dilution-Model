import axios from 'axios'
import { apiUrl } from '@/lib/api'

export type NewsSentiment = 'bullish' | 'bearish' | 'neutral' | null

export type NewsArticle = {
  id: string
  title: string
  summary: string
  url: string
  source: string
  published_at: string
  thumbnail_url: string | null
  provider?: string
  sentiment: NewsSentiment
  category: string
}

export type YouTubeVideo = {
  id: string
  title: string
  channel: string
  channel_id: string
  published_at: string
  thumbnail_url: string
  youtube_url: string
  embed_url: string
  description: string
}

export type NewsFeedResponse = {
  articles: NewsArticle[]
  total: number
  page: number
  categories: string[]
  tickers: string[]
  cached_at: string
  is_stale?: boolean
  last_live_fetch_minutes_ago?: number
}

export type NewsVideosResponse = {
  videos: YouTubeVideo[]
  cached_at: string
  hidden_due_to_quota?: boolean
}

export type NewsPreferences = {
  user_id: string
  categories: string[]
  followed_tickers: string[]
  followed_channels: string[]
  excluded_sources: string[]
  feed_layout: 'grid' | 'list' | 'magazine'
  show_sentiment: boolean
  updated_at?: string
}

export async function fetchNewsFeed(params: {
  categories?: string[]
  tickers?: string[]
  search?: string
  page?: number
  pageSize?: number
}) {
  const response = await axios.get(apiUrl('/api/v1/news/feed'), {
    params: {
      categories: (params.categories ?? []).join(','),
      tickers: (params.tickers ?? []).join(','),
      search: params.search ?? '',
      page: params.page ?? 1,
      page_size: params.pageSize ?? 20,
    },
  })
  return response.data as NewsFeedResponse
}

export async function fetchNewsVideos(params?: {
  query?: string
  channelIds?: string[]
  maxResults?: number
}) {
  const response = await axios.get(apiUrl('/api/v1/news/videos'), {
    params: {
      query: params?.query ?? 'financial markets analysis',
      channel_ids: (params?.channelIds ?? []).join(','),
      max_results: params?.maxResults ?? 12,
    },
  })
  return response.data as NewsVideosResponse
}

export async function fetchTickerNews(ticker: string) {
  const response = await axios.get(apiUrl(`/api/v1/news/ticker/${ticker}`))
  return response.data as { ticker: string; articles: NewsArticle[]; cached_at: string; is_stale?: boolean }
}

export async function fetchHeadlineSentiment(headlines: string[]) {
  const response = await axios.post(apiUrl('/api/v1/news/sentiment'), headlines)
  return response.data as { sentiments: Array<'bullish' | 'bearish' | 'neutral'> }
}

export async function fetchNewsPreferences(userId: string) {
  const response = await axios.get(apiUrl('/api/v1/news/preferences'), {
    params: { user_id: userId },
  })
  return response.data as NewsPreferences
}

export async function updateNewsPreferences(preferences: NewsPreferences) {
  const response = await axios.put(apiUrl('/api/v1/news/preferences'), preferences)
  return response.data as { status: string; preferences: NewsPreferences }
}
