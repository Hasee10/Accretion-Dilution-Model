from __future__ import annotations

import os
from typing import Any, Dict, Optional
from urllib.parse import quote

import httpx
from fastapi import HTTPException


def supabase_headers() -> Dict[str, str]:
    key = os.getenv('SUPABASE_KEY')
    if not key:
        raise HTTPException(status_code=500, detail='SUPABASE_KEY not configured')
    return {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
    }


def supabase_rest_url() -> str:
    base = os.getenv('SUPABASE_URL')
    if not base:
        raise HTTPException(status_code=500, detail='SUPABASE_URL not configured')
    return f"{base.rstrip('/')}/rest/v1"


async def fetch_profile(user_id: str) -> Optional[Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{supabase_rest_url()}/profiles?select=*&id=eq.{quote(user_id)}",
            headers=supabase_headers(),
        )
        response.raise_for_status()
        data = response.json()
        return data[0] if data else None


async def fetch_organization(org_id: str) -> Optional[Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{supabase_rest_url()}/organizations?select=*&id=eq.{quote(org_id)}",
            headers=supabase_headers(),
        )
        response.raise_for_status()
        data = response.json()
        return data[0] if data else None


async def update_organization_by_id(org_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.patch(
            f"{supabase_rest_url()}/organizations?id=eq.{quote(org_id)}",
            headers=supabase_headers(),
            json=payload,
        )
        response.raise_for_status()
        data = response.json()
        return data[0] if data else None


async def update_organization_by_field(field: str, value: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.patch(
            f"{supabase_rest_url()}/organizations?{field}=eq.{quote(value)}",
            headers=supabase_headers(),
            json=payload,
        )
        response.raise_for_status()
        data = response.json()
        return data[0] if data else None


async def insert_activity_log(payload: Dict[str, Any]) -> None:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            f"{supabase_rest_url()}/activity_log",
            headers=supabase_headers(),
            json=payload,
        )
        response.raise_for_status()
