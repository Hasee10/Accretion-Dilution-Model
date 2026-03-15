from __future__ import annotations

import hashlib
import json
import os
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Body, HTTPException, Query
from groq import Groq

from app.services.supabase_service import supabase_headers, supabase_rest_url

router = APIRouter(prefix='/news', tags=['news'])

NEWS_API_KEY = os.getenv('NEWS_API_KEY')
GNEWS_API_KEY = os.getenv('GNEWS_API_KEY')
YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')

CATEGORY_QUERIES: Dict[str, str] = {
    'markets': 'stock market OR financial markets OR S&P 500 OR Fed OR interest rates',
    'mergers': 'merger acquisition M&A deal buyout takeover',
    'earnings': 'earnings report quarterly results EPS revenue guidance',
    'geopolitics': 'geopolitics trade war sanctions tariffs emerging markets',
    'fintech': 'fintech cryptocurrency blockchain DeFi digital assets',
    'ipo': 'IPO initial public offering listing SPAC',
    'privateequity': 'private equity PE fund LBO leveraged buyout',
    'macro': 'GDP inflation CPI unemployment Federal Reserve ECB',
}

DEFAULT_CHANNELS = [
    'UCrM7B7SL_g1edFOnmj-SDKg',
    'UCvJJ_dzjViJCoLf5uKUTwoA',
    'UCddiUEpeqJcYeBxX1IVBKvQ',
]

WHITELISTED_YOUTUBE_CHANNELS: Dict[str, str] = {
    'UCrM7B7SL_g1edFOnmj-SDKg': 'Bloomberg',
    'UCvJJ_dzjViJCoLf5uKUTwoA': 'CNBC',
    'UCddiUEpeqJcYeBxX1IVBKvQ': 'Patrick Boyle',
    'UC9-y-6csu5WGm29I7JiwpnA': 'Wendover Productions',
    'UCHnyfMqiRRG1u-2MsSQLbXA': 'Veritasium',
    'UCWX3yGbODI3HLCnBxQBHoHg': 'Goldman Sachs',
    'UCEAZeUIeJs0IjQiqTCdVSIg': 'Acquired Podcast',
}

DAILY_LIMITS = {'newsapi': 90, 'gnews': 90, 'youtube': 95}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso_now() -> str:
    return _utc_now().isoformat()


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        return None


async def _supabase_get(path: str) -> list[Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(f'{supabase_rest_url()}/{path}', headers=supabase_headers())
        response.raise_for_status()
        data = response.json()
        return data if isinstance(data, list) else [data]


async def _supabase_post(path: str, payload: Any, prefer: str | None = None) -> list[Dict[str, Any]]:
    headers = supabase_headers()
    if prefer:
        headers['Prefer'] = prefer
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(f'{supabase_rest_url()}/{path}', headers=headers, json=payload)
        response.raise_for_status()
        data = response.json() if response.content else []
        return data if isinstance(data, list) else [data]


async def _supabase_patch(path: str, payload: Any, prefer: str | None = None) -> list[Dict[str, Any]]:
    headers = supabase_headers()
    if prefer:
        headers['Prefer'] = prefer
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.patch(f'{supabase_rest_url()}/{path}', headers=headers, json=payload)
        response.raise_for_status()
        data = response.json() if response.content else []
        return data if isinstance(data, list) else [data]


async def check_news_cache(cache_key: str, ttl_minutes: int, allow_stale: bool = False) -> Dict[str, Any] | None:
    try:
        rows = await _supabase_get(
            f"news_cache?select=data,fetched_at&cache_key=eq.{quote(cache_key)}"
        )
        if not rows:
            return None
        row = rows[0]
        fetched_at = _parse_iso(row.get('fetched_at'))
        if allow_stale:
            return row.get('data')
        if fetched_at and _utc_now() - fetched_at < timedelta(minutes=ttl_minutes):
            return row.get('data')
    except Exception:
        return None
    return None


async def set_news_cache(cache_key: str, data: dict) -> None:
    try:
        await _supabase_post(
            'news_cache',
            {
                'cache_key': cache_key,
                'data': data,
                'fetched_at': _iso_now(),
            },
            prefer='resolution=merge-duplicates,return=representation',
        )
    except Exception:
        pass


async def check_and_increment_quota(api_name: str, daily_limit: int) -> bool:
    today = str(date.today())
    encoded_api = quote(api_name)
    try:
        rows = await _supabase_get(
            f'api_quota_log?select=*&api_name=eq.{encoded_api}&date=eq.{today}'
        )
        if rows:
            current = int(rows[0].get('calls_made') or 0)
            if current >= daily_limit:
                return False
            await _supabase_patch(
                f'api_quota_log?api_name=eq.{encoded_api}&date=eq.{today}',
                {'calls_made': current + 1},
                prefer='return=representation',
            )
            return True

        await _supabase_post(
            'api_quota_log',
            {'api_name': api_name, 'date': today, 'calls_made': 1},
            prefer='return=representation',
        )
        return True
    except Exception:
        return True


def detect_category(text: str) -> str:
    normalized = text.lower()
    if any(word in normalized for word in ['merger', 'acquisition', 'takeover', 'buyout', 'm&a', 'deal']):
        return 'mergers'
    if any(word in normalized for word in ['earnings', 'eps', 'quarterly', 'revenue', 'guidance']):
        return 'earnings'
    if any(word in normalized for word in ['geopolit', 'sanction', 'tariff', 'trade war', 'nato', 'conflict']):
        return 'geopolitics'
    if any(word in normalized for word in ['ipo', 'listing', 'spac', 'going public']):
        return 'ipo'
    if any(word in normalized for word in ['private equity', 'pe fund', 'lbo', 'blackstone', 'kkr', 'apollo']):
        return 'privateequity'
    if any(word in normalized for word in ['crypto', 'bitcoin', 'blockchain', 'defi', 'fintech']):
        return 'fintech'
    if any(word in normalized for word in ['fed', 'ecb', 'gdp', 'inflation', 'cpi', 'interest rate', 'macro']):
        return 'macro'
    return 'markets'


def _article_id(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()


def _category_query(category_list: list[str], ticker_list: list[str], search: str | None = None) -> str:
    if search:
        return search
    if ticker_list:
        return ' OR '.join(ticker_list)
    query_parts = [CATEGORY_QUERIES.get(category, category) for category in category_list]
    trimmed = query_parts[:3] if query_parts else [CATEGORY_QUERIES['markets']]
    return ' OR '.join(f'({part})' for part in trimmed)


async def _fetch_newsapi_articles(query: str, page: int, page_size: int) -> list[Dict[str, Any]]:
    if not NEWS_API_KEY or not await check_and_increment_quota('newsapi', DAILY_LIMITS['newsapi']):
        return []

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            'https://newsapi.org/v2/everything',
            params={
                'q': query,
                'language': 'en',
                'sortBy': 'publishedAt',
                'pageSize': page_size,
                'page': page,
                'apiKey': NEWS_API_KEY,
                'domains': (
                    'reuters.com,ft.com,wsj.com,bloomberg.com,cnbc.com,marketwatch.com,'
                    'seekingalpha.com,financialtimes.com,economist.com,forbes.com,businessinsider.com'
                ),
            },
        )
        if response.status_code != 200:
            return []
        payload = response.json()
        articles: list[Dict[str, Any]] = []
        for article in payload.get('articles', []):
            url = article.get('url')
            if not url:
                continue
            text = f"{article.get('title', '')} {article.get('description') or ''}"
            articles.append({
                'id': _article_id(url),
                'title': article.get('title'),
                'summary': article.get('description') or '',
                'url': url,
                'source': article.get('source', {}).get('name') or 'Unknown',
                'published_at': article.get('publishedAt'),
                'thumbnail_url': article.get('urlToImage'),
                'provider': 'newsapi',
                'sentiment': None,
                'category': detect_category(text),
            })
        return articles


async def _fetch_gnews_articles(query: str, page_size: int) -> list[Dict[str, Any]]:
    if not GNEWS_API_KEY or not await check_and_increment_quota('gnews', DAILY_LIMITS['gnews']):
        return []

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            'https://gnews.io/api/v4/search',
            params={
                'q': query[:100],
                'lang': 'en',
                'country': 'us',
                'max': min(page_size, 10),
                'apikey': GNEWS_API_KEY,
                'in': 'title,description',
            },
        )
        if response.status_code != 200:
            return []
        payload = response.json()
        articles: list[Dict[str, Any]] = []
        for article in payload.get('articles', []):
            url = article.get('url')
            if not url:
                continue
            text = f"{article.get('title', '')} {article.get('description') or ''}"
            articles.append({
                'id': _article_id(url),
                'title': article.get('title'),
                'summary': article.get('description') or '',
                'url': url,
                'source': article.get('source', {}).get('name') or 'Unknown',
                'published_at': article.get('publishedAt'),
                'thumbnail_url': article.get('image'),
                'provider': 'gnews',
                'sentiment': None,
                'category': detect_category(text),
            })
        return articles


def _dedupe_articles(articles: Iterable[Dict[str, Any]]) -> list[Dict[str, Any]]:
    deduped: dict[str, Dict[str, Any]] = {}
    for article in articles:
        url = article.get('url')
        if not url:
            continue
        deduped[url] = article
    return list(deduped.values())


@router.get('/feed')
async def get_news_feed(
    categories: str = Query(default='markets,mergers,earnings'),
    tickers: str = Query(default=''),
    search: str = Query(default=''),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=5, le=50),
):
    category_list = [item.strip() for item in categories.split(',') if item.strip()]
    ticker_list = [item.strip().upper() for item in tickers.split(',') if item.strip()]

    cache_key = f"feed_{'_'.join(sorted(category_list))}_{'_'.join(sorted(ticker_list))}_{search.strip().lower()}_p{page}_s{page_size}"
    cached = await check_news_cache(cache_key, ttl_minutes=5 if ticker_list else 15)
    if cached:
        return cached

    query = _category_query(category_list, ticker_list, search.strip() or None)

    articles = await _fetch_newsapi_articles(query, page, page_size)
    gnews_articles = await _fetch_gnews_articles(query, page_size)
    existing_urls = {article['url'] for article in articles}
    articles.extend(article for article in gnews_articles if article['url'] not in existing_urls)

    if not articles:
        stale = await check_news_cache(cache_key, ttl_minutes=15, allow_stale=True)
        if stale:
            stale['is_stale'] = True
            return stale

    deduped = _dedupe_articles(articles)
    deduped.sort(key=lambda article: article.get('published_at') or '', reverse=True)
    result = {
        'articles': deduped[:page_size],
        'total': len(deduped),
        'page': page,
        'categories': category_list,
        'tickers': ticker_list,
        'cached_at': _iso_now(),
        'is_stale': False,
        'last_live_fetch_minutes_ago': 0,
    }
    await set_news_cache(cache_key, result)
    return result


@router.get('/videos')
async def get_finance_videos(
    query: str = Query(default='financial markets analysis'),
    channel_ids: str = Query(default=''),
    max_results: int = Query(default=12, ge=4, le=20),
):
    cache_key = f"yt_{hashlib.md5((query + channel_ids).encode()).hexdigest()}"
    cached = await check_news_cache(cache_key, ttl_minutes=60)
    if cached:
        return cached

    if not YOUTUBE_API_KEY or not await check_and_increment_quota('youtube', DAILY_LIMITS['youtube']):
        return {'videos': [], 'cached_at': _iso_now(), 'hidden_due_to_quota': True}

    channel_list = [item.strip() for item in channel_ids.split(',') if item.strip()]
    target_channels = channel_list if channel_list else list(WHITELISTED_YOUTUBE_CHANNELS.keys())[:5]
    videos: list[Dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=12) as client:
        for channel_id in target_channels[:4]:
            try:
                response = await client.get(
                    'https://www.googleapis.com/youtube/v3/search',
                    params={
                        'part': 'snippet',
                        'channelId': channel_id,
                        'q': query,
                        'type': 'video',
                        'order': 'date',
                        'maxResults': 4,
                        'key': YOUTUBE_API_KEY,
                        'relevanceLanguage': 'en',
                        'videoDuration': 'medium',
                    },
                )
                if response.status_code != 200:
                    continue
                payload = response.json()
                for item in payload.get('items', []):
                    snippet = item.get('snippet', {})
                    video_id = item.get('id', {}).get('videoId')
                    if not video_id:
                        continue
                    videos.append({
                        'id': video_id,
                        'title': snippet.get('title'),
                        'channel': snippet.get('channelTitle'),
                        'channel_id': channel_id,
                        'published_at': snippet.get('publishedAt'),
                        'thumbnail_url': snippet.get('thumbnails', {}).get('medium', {}).get('url'),
                        'youtube_url': f'https://www.youtube.com/watch?v={video_id}',
                        'embed_url': f'https://www.youtube.com/embed/{video_id}',
                        'description': (snippet.get('description') or '')[:200],
                    })
            except Exception:
                continue

    videos.sort(key=lambda video: video.get('published_at') or '', reverse=True)
    result = {'videos': videos[:max_results], 'cached_at': _iso_now(), 'hidden_due_to_quota': False}
    await set_news_cache(cache_key, result)
    return result


@router.post('/sentiment')
async def batch_sentiment(headlines: List[str] = Body(default=[])):
    if not headlines:
        return {'sentiments': []}

    headlines = headlines[:20]
    groq_key = os.getenv('GROQ_API_KEY')
    if not groq_key:
        return {'sentiments': ['neutral'] * len(headlines)}

    numbered = '\n'.join(f'{index + 1}. {headline}' for index, headline in enumerate(headlines))
    prompt = (
        'You are a financial sentiment classifier. '
        'Classify each headline as exactly one of: bullish, bearish, or neutral. '
        'Respond ONLY with a JSON array of strings in the same order.\n\n'
        f'Headlines:\n{numbered}'
    )

    try:
        client = Groq(api_key=groq_key)
        response = client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[{'role': 'user', 'content': prompt}],
            max_tokens=100,
            temperature=0.1,
        )
        raw = (response.choices[0].message.content or '').strip()
        start = raw.find('[')
        end = raw.rfind(']')
        if start != -1 and end != -1 and end > start:
            sentiments = json.loads(raw[start : end + 1])
            valid = {'bullish', 'bearish', 'neutral'}
            normalized = [sentiment if sentiment in valid else 'neutral' for sentiment in sentiments]
            return {'sentiments': normalized[: len(headlines)]}
    except Exception:
        pass

    return {'sentiments': ['neutral'] * len(headlines)}


@router.get('/ticker/{ticker}')
async def get_ticker_news(ticker: str):
    symbol = ticker.upper()
    cache_key = f'ticker_news_{symbol}'
    cached = await check_news_cache(cache_key, ttl_minutes=5)
    if cached:
        return cached

    articles: list[Dict[str, Any]] = []
    if NEWS_API_KEY and await check_and_increment_quota('newsapi', DAILY_LIMITS['newsapi']):
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                response = await client.get(
                    'https://newsapi.org/v2/everything',
                    params={
                        'q': f'"{symbol}" OR "{symbol} stock" OR "{symbol} earnings"',
                        'language': 'en',
                        'sortBy': 'publishedAt',
                        'pageSize': 8,
                        'apiKey': NEWS_API_KEY,
                    },
                )
                if response.status_code == 200:
                    for article in response.json().get('articles', []):
                        url = article.get('url')
                        if not url:
                            continue
                        articles.append({
                            'id': _article_id(url),
                            'title': article.get('title'),
                            'summary': article.get('description') or '',
                            'url': url,
                            'source': article.get('source', {}).get('name') or 'Unknown',
                            'published_at': article.get('publishedAt'),
                            'thumbnail_url': article.get('urlToImage'),
                            'sentiment': None,
                            'category': detect_category(article.get('title') or ''),
                        })
            except Exception:
                pass

    result = {'ticker': symbol, 'articles': articles[:8], 'cached_at': _iso_now(), 'is_stale': False}
    if not articles:
        stale = await check_news_cache(cache_key, ttl_minutes=5, allow_stale=True)
        if stale:
            stale['is_stale'] = True
            return stale
    await set_news_cache(cache_key, result)
    return result


@router.get('/preferences')
async def get_preferences(user_id: str = Query(...)):
    encoded_user_id = quote(user_id)
    try:
        rows = await _supabase_get(f'news_preferences?select=*&user_id=eq.{encoded_user_id}')
        if rows:
            return rows[0]
    except Exception:
        pass

    defaults = {
        'user_id': user_id,
        'categories': ['markets', 'mergers', 'earnings', 'geopolitics', 'macro'],
        'followed_tickers': [],
        'followed_channels': DEFAULT_CHANNELS,
        'excluded_sources': [],
        'feed_layout': 'grid',
        'show_sentiment': True,
        'updated_at': _iso_now(),
    }
    try:
        await _supabase_post(
            'news_preferences?on_conflict=user_id',
            defaults,
            prefer='resolution=merge-duplicates,return=representation',
        )
    except Exception:
        pass
    return defaults


@router.put('/preferences')
async def update_preferences(payload: Dict[str, Any] = Body(...)):
    user_id = payload.get('user_id')
    if not user_id:
        raise HTTPException(status_code=400, detail='user_id is required')

    merged = {
        'user_id': user_id,
        'categories': payload.get('categories', ['markets', 'mergers', 'earnings', 'geopolitics', 'macro']),
        'followed_tickers': payload.get('followed_tickers', []),
        'followed_channels': payload.get('followed_channels', DEFAULT_CHANNELS),
        'excluded_sources': payload.get('excluded_sources', []),
        'feed_layout': payload.get('feed_layout', 'grid'),
        'show_sentiment': payload.get('show_sentiment', True),
        'updated_at': _iso_now(),
    }

    try:
        await _supabase_post(
            'news_preferences?on_conflict=user_id',
            merged,
            prefer='resolution=merge-duplicates,return=representation',
        )
    except Exception as exc:
        detail = getattr(exc, 'message', None) or str(exc)
        raise HTTPException(status_code=500, detail=f'Failed to update preferences: {detail}') from exc

    return {'status': 'updated', 'preferences': merged}
