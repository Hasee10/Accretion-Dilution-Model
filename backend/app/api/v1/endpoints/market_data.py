from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Dict
from urllib.parse import quote

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()
logger = logging.getLogger(__name__)

TWELVE_BASE_URL = 'https://api.twelvedata.com'
ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query'
CACHE_TTL_HOURS = 4


def _supabase_headers() -> Dict[str, str]:
    key = os.getenv('SUPABASE_KEY')
    if not key:
        raise HTTPException(status_code=500, detail='SUPABASE_KEY not configured')
    return {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
    }


def _supabase_url() -> str:
    base = os.getenv('SUPABASE_URL')
    if not base:
        raise HTTPException(status_code=500, detail='SUPABASE_URL not configured')
    return f'{base}/rest/v1'


def _twelve_key() -> str | None:
    return os.getenv('TWELVE_DATA_KEY')


def _alpha_vantage_key() -> str | None:
    return os.getenv('AV_API_KEY')


def _hours_since(timestamp: str) -> float:
    fetched_at = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
    return round((datetime.now(timezone.utc) - fetched_at).total_seconds() / 3600, 2)


def _safe_float(value: Any) -> float | None:
    if value in (None, '', 'None'):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _first_number(source: Dict[str, Any] | None, *keys: str) -> float | None:
    if not source:
        return None
    for key in keys:
        value = _safe_float(source.get(key))
        if value is not None:
            return value
    return None


async def _read_cache(ticker: str, endpoint: str) -> Dict[str, Any] | None:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            f"{_supabase_url()}/fmp_cache?select=data,fetched_at&ticker=eq.{quote(ticker)}&endpoint=eq.{quote(endpoint)}",
            headers=_supabase_headers(),
        )
        response.raise_for_status()
        records = response.json()
        return records[0] if records else None


async def _write_cache(ticker: str, endpoint: str, data: Any) -> None:
    headers = _supabase_headers()
    headers['Prefer'] = 'resolution=merge-duplicates'
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            f'{_supabase_url()}/fmp_cache',
            headers=headers,
            json={
                'ticker': ticker,
                'endpoint': endpoint,
                'data': data,
            },
        )
        response.raise_for_status()


async def _cached_market(
    ticker: str,
    endpoint: str,
    loader: Callable[[], Awaitable[Any]],
) -> Dict[str, Any]:
    cache = None
    try:
        cache = await _read_cache(ticker, endpoint)
    except Exception as cache_error:
        logger.warning('Failed to read market cache for %s/%s: %s', ticker, endpoint, cache_error)

    if cache:
        cache_age = _hours_since(cache['fetched_at'])
        if cache_age <= CACHE_TTL_HOURS:
            return {
                'data': cache['data'],
                'source': 'cache',
                'cacheAgeHours': cache_age,
                'stale': cache_age > 24,
            }

    try:
        fresh = await loader()
        try:
            await _write_cache(ticker, endpoint, fresh)
        except Exception as cache_error:
            logger.warning('Failed to write market cache for %s/%s: %s', ticker, endpoint, cache_error)
        return {
            'data': fresh,
            'source': 'live',
            'cacheAgeHours': 0,
            'stale': False,
        }
    except HTTPException as exc:
        if cache:
            cache_age = _hours_since(cache['fetched_at'])
            return {
                'data': cache['data'],
                'source': 'cache',
                'cacheAgeHours': cache_age,
                'stale': cache_age > 24,
            }
        raise exc
    except Exception as exc:
        logger.exception('Unexpected market data failure for %s/%s', ticker, endpoint)
        if cache:
            cache_age = _hours_since(cache['fetched_at'])
            return {
                'data': cache['data'],
                'source': 'cache',
                'cacheAgeHours': cache_age,
                'stale': cache_age > 24,
            }
        raise HTTPException(status_code=502, detail='Failed to fetch market data') from exc


async def _twelve_get(path: str, params: Dict[str, Any]) -> Any:
    api_key = _twelve_key()
    if not api_key:
        raise HTTPException(status_code=502, detail='TWELVE_DATA_KEY not configured')

    async with httpx.AsyncClient(timeout=12) as client:
        try:
            response = await client.get(f'{TWELVE_BASE_URL}{path}', params={**params, 'apikey': api_key})
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            body = exc.response.text[:500]
            logger.error('Twelve Data request failed for %s with status %s: %s', path, exc.response.status_code, body)
            raise HTTPException(status_code=502, detail=f'Twelve Data upstream returned {exc.response.status_code}') from exc
        except httpx.HTTPError as exc:
            logger.error('Twelve Data request failed for %s: %s', path, exc)
            raise HTTPException(status_code=502, detail='Failed to reach Twelve Data') from exc

    payload = response.json()
    if isinstance(payload, dict) and payload.get('status') == 'error':
        code = payload.get('code')
        message = payload.get('message') or 'Twelve Data returned an error'
        logger.error('Twelve Data application error for %s: %s (%s)', path, message, code)
        raise HTTPException(status_code=502, detail=f'Twelve Data error: {message}')
    return payload


async def _alpha_get(params: Dict[str, Any]) -> Any:
    api_key = _alpha_vantage_key()
    if not api_key:
        raise HTTPException(status_code=502, detail='AV_API_KEY not configured')

    async with httpx.AsyncClient(timeout=12) as client:
        try:
            response = await client.get(ALPHA_VANTAGE_BASE_URL, params={**params, 'apikey': api_key})
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            body = exc.response.text[:500]
            logger.error('Alpha Vantage request failed with status %s: %s', exc.response.status_code, body)
            raise HTTPException(status_code=502, detail=f'Alpha Vantage upstream returned {exc.response.status_code}') from exc
        except httpx.HTTPError as exc:
            logger.error('Alpha Vantage request failed: %s', exc)
            raise HTTPException(status_code=502, detail='Failed to reach Alpha Vantage') from exc

    payload = response.json()
    if isinstance(payload, dict) and payload.get('Error Message'):
        message = payload['Error Message']
        logger.error('Alpha Vantage application error: %s', message)
        raise HTTPException(status_code=502, detail=f'Alpha Vantage error: {message}')
    return payload


async def _search_symbols(query: str) -> list[Dict[str, Any]]:
    if _twelve_key():
        try:
            payload = await _twelve_get('/symbol_search', {'symbol': query})
            return [
                {
                    'ticker': item.get('symbol'),
                    'companyName': item.get('instrument_name') or item.get('symbol'),
                    'exchange': item.get('exchange'),
                    'type': item.get('instrument_type'),
                    'marketCap': None,
                    'logoUrl': None,
                }
                for item in payload.get('data', [])
                if item.get('symbol')
            ]
        except HTTPException as exc:
            logger.warning('Twelve Data search failed for %s: %s', query, exc.detail)

    if _alpha_vantage_key():
        payload = await _alpha_get({'function': 'SYMBOL_SEARCH', 'keywords': query})
        return [
            {
                'ticker': item.get('1. symbol'),
                'companyName': item.get('2. name') or item.get('1. symbol'),
                'exchange': item.get('4. region') or item.get('3. type'),
                'type': item.get('3. type'),
                'marketCap': None,
                'logoUrl': None,
            }
            for item in payload.get('bestMatches', [])
            if item.get('1. symbol')
        ]

    raise HTTPException(status_code=502, detail='No market data provider configured')


async def _load_company_snapshot(symbol: str) -> Dict[str, Any]:
    if _twelve_key():
        try:
            quote_payload, statistics_payload = await asyncio.gather(
                _twelve_get('/quote', {'symbol': symbol}),
                _twelve_get('/statistics', {'symbol': symbol}),
            )

            valuations = statistics_payload.get('valuations_metrics', {}) if isinstance(statistics_payload, dict) else {}
            financials = statistics_payload.get('financials', {}) if isinstance(statistics_payload, dict) else {}
            fifty_two_week = quote_payload.get('fifty_two_week', {}) if isinstance(quote_payload, dict) else {}

            price = _safe_float(quote_payload.get('close')) or 0
            market_cap = _first_number(valuations, 'market_cap')
            revenue_ttm = _first_number(financials, 'revenue_ttm', 'total_revenue_ttm', 'sales_ttm')
            ebitda_ttm = _first_number(financials, 'ebitda_ttm')
            net_income_ttm = _first_number(financials, 'net_income_ttm', 'net_income')
            shares_outstanding_m = (market_cap / price / 1_000_000) if market_cap and price else None
            return {
                'ticker': symbol,
                'companyName': quote_payload.get('name') or symbol,
                'exchange': quote_payload.get('exchange') or 'N/A',
                'price': price,
                'marketCap': market_cap,
                'impliedSharesM': shares_outstanding_m or 0,
                'sharesOutstandingM': shares_outstanding_m,
                'sector': None,
                'industry': None,
                'beta': _first_number(financials, 'beta'),
                'logoUrl': None,
                'netIncomeM': (net_income_ttm / 1_000_000) if net_income_ttm else None,
                'revenueTtmM': (revenue_ttm / 1_000_000) if revenue_ttm else None,
                'ebitdaTtmM': (ebitda_ttm / 1_000_000) if ebitda_ttm else None,
                'eps': _first_number(financials, 'eps_diluted_ttm', 'eps_ttm'),
                'peRatio': _first_number(valuations, 'pe_ratio'),
                'enterpriseValue': _first_number(valuations, 'enterprise_value'),
                'yearLow': _safe_float(fifty_two_week.get('low')),
                'yearHigh': _safe_float(fifty_two_week.get('high')),
                'priceAvg50': _safe_float(quote_payload.get('fifty_day_ma')),
                'changesPercentage': _safe_float(quote_payload.get('percent_change')),
                'attributionUrl': 'https://twelvedata.com/docs',
            }
        except HTTPException as exc:
            logger.warning('Twelve Data company load failed for %s: %s', symbol, exc.detail)

    if _alpha_vantage_key():
        overview_payload, quote_payload = await asyncio.gather(
            _alpha_get({'function': 'OVERVIEW', 'symbol': symbol}),
            _alpha_get({'function': 'GLOBAL_QUOTE', 'symbol': symbol}),
        )
        quote = quote_payload.get('Global Quote', {}) if isinstance(quote_payload, dict) else {}
        price = _safe_float(quote.get('05. price')) or 0
        market_cap = _safe_float(overview_payload.get('MarketCapitalization'))
        shares_outstanding_m = (market_cap / price / 1_000_000) if market_cap and price else None
        revenue_ttm = _safe_float(overview_payload.get('RevenueTTM'))
        ebitda_ttm = _safe_float(overview_payload.get('EBITDA'))
        return {
            'ticker': symbol,
            'companyName': overview_payload.get('Name') or symbol,
            'exchange': overview_payload.get('Exchange') or 'N/A',
            'price': price,
            'marketCap': market_cap,
            'impliedSharesM': shares_outstanding_m or 0,
            'sharesOutstandingM': shares_outstanding_m,
            'sector': overview_payload.get('Sector'),
            'industry': overview_payload.get('Industry'),
            'beta': _safe_float(overview_payload.get('Beta')),
            'logoUrl': None,
            'netIncomeM': _safe_float(overview_payload.get('QuarterlyEarningsGrowthYOY')),
            'revenueTtmM': (revenue_ttm / 1_000_000) if revenue_ttm else None,
            'ebitdaTtmM': (ebitda_ttm / 1_000_000) if ebitda_ttm else None,
            'eps': _safe_float(overview_payload.get('EPS')),
            'peRatio': _safe_float(overview_payload.get('PERatio')),
            'enterpriseValue': market_cap,
            'yearLow': _safe_float(overview_payload.get('52WeekLow')),
            'yearHigh': _safe_float(overview_payload.get('52WeekHigh')),
            'priceAvg50': _safe_float(overview_payload.get('50DayMovingAverage')),
            'changesPercentage': _safe_float(quote.get('10. change percent', '').replace('%', '')),
            'attributionUrl': 'https://www.alphavantage.co/documentation/',
        }

    raise HTTPException(status_code=502, detail='No market data provider configured')


async def _load_quote_snapshot(symbol: str) -> Dict[str, Any]:
    if _twelve_key():
        try:
            quote_payload = await _twelve_get('/quote', {'symbol': symbol})
            return {
                'ticker': symbol,
                'companyName': quote_payload.get('name') or symbol,
                'price': _safe_float(quote_payload.get('close')),
                'changePercent': _safe_float(quote_payload.get('percent_change')),
                'peRatio': None,
                'marketCap': None,
            }
        except HTTPException as exc:
            logger.warning('Twelve Data quote load failed for %s: %s', symbol, exc.detail)

    if _alpha_vantage_key():
        quote_payload = await _alpha_get({'function': 'GLOBAL_QUOTE', 'symbol': symbol})
        quote = quote_payload.get('Global Quote', {}) if isinstance(quote_payload, dict) else {}
        return {
            'ticker': symbol,
            'companyName': symbol,
            'price': _safe_float(quote.get('05. price')),
            'changePercent': _safe_float((quote.get('10. change percent') or '').replace('%', '')),
            'peRatio': None,
            'marketCap': None,
        }

    raise HTTPException(status_code=502, detail='No market data provider configured')


@router.get('/market/search')
async def search_companies(q: str = Query(..., min_length=1)):
    payload = await _cached_market(q.upper(), 'search', lambda: _search_symbols(q))
    return {
        'results': payload['data'] if isinstance(payload['data'], list) else [],
        'source': payload['source'],
        'cacheAgeHours': payload['cacheAgeHours'],
    }


@router.get('/market/company/{ticker}')
async def get_company_data(ticker: str):
    symbol = ticker.upper()
    payload = await _cached_market(symbol, 'profile', lambda: _load_company_snapshot(symbol))
    data = payload['data'] if isinstance(payload['data'], dict) else {}
    return {
        **data,
        'ticker': data.get('ticker') or symbol,
        'companyName': data.get('companyName') or symbol,
        'exchange': data.get('exchange') or 'N/A',
        'price': data.get('price') or 0,
        'source': payload['source'],
        'cacheAgeHours': payload['cacheAgeHours'],
        'stale': payload['stale'],
        'attributionUrl': data.get('attributionUrl') or 'https://twelvedata.com/docs',
    }


@router.get('/market/quotes')
async def get_quotes(tickers: str = Query(...)):
    symbols = [symbol.strip().upper() for symbol in tickers.split(',') if symbol.strip()]
    if not symbols:
        return {'quotes': []}

    async def load_quote(symbol: str):
        payload = await _cached_market(symbol, 'quote', lambda: _load_quote_snapshot(symbol))
        data = payload['data'] if isinstance(payload['data'], dict) else {}
        return {
            'ticker': symbol,
            'companyName': data.get('companyName') or symbol,
            'price': data.get('price'),
            'changePercent': data.get('changePercent'),
            'peRatio': data.get('peRatio'),
            'marketCap': data.get('marketCap'),
            'source': payload['source'],
            'cacheAgeHours': payload['cacheAgeHours'],
        }

    return {'quotes': await asyncio.gather(*(load_quote(symbol) for symbol in symbols))}
