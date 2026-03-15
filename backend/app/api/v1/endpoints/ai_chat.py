from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Literal, Optional
import json
import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from groq import Groq
from pydantic import BaseModel, Field
from app.services.supabase_service import fetch_organization, fetch_profile, insert_activity_log, update_organization_by_id

router = APIRouter()

RATE_LIMIT = 20
RATE_WINDOW = timedelta(hours=1)
rate_limit_store: Dict[str, List[datetime]] = defaultdict(list)


class Message(BaseModel):
    role: Literal['user', 'assistant']
    content: str


class ContextPayload(BaseModel):
    type: Literal['merger', 'dcf', 'general'] = 'general'
    data: Dict[str, Any] = Field(default_factory=dict)


class ChatRequest(BaseModel):
    messages: List[Message]
    context: ContextPayload
    user_id: str = 'anonymous'


def _compact_number(value: Any, prefix: str = '') -> str:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 'N/A'

    abs_number = abs(number)
    suffix = ''
    display = number

    if abs_number >= 1_000_000_000:
        display = number / 1_000_000_000
        suffix = 'B'
    elif abs_number >= 1_000_000:
        display = number / 1_000_000
        suffix = 'M'
    elif abs_number >= 1_000:
        display = number / 1_000
        suffix = 'K'

    if suffix:
        return f"{prefix}{display:.1f}{suffix}"
    return f"{prefix}{display:,.2f}"


def _check_rate_limit(user_id: str) -> bool:
    now = datetime.utcnow()
    cutoff = now - RATE_WINDOW
    timestamps = [stamp for stamp in rate_limit_store[user_id] if stamp > cutoff]
    if len(timestamps) >= RATE_LIMIT:
        rate_limit_store[user_id] = timestamps
        return False
    timestamps.append(now)
    rate_limit_store[user_id] = timestamps
    return True


def _merger_prompt(data: Dict[str, Any]) -> str:
    inputs = data.get('inputs', {})
    results = data.get('results', {})
    ad_pct = results.get('adPct')
    pro_forma_eps = results.get('proFormaEPS')
    return (
        'You are QuantEdge AI, an expert M&A analyst and investment banker. '
        f"The user is currently analyzing a merger deal with these parameters: {json.dumps(inputs, default=str)}. "
        f"The current results show: A/D Impact Year 3: {ad_pct if ad_pct is not None else 'N/A'}%, "
        f"Pro-Forma EPS: {_compact_number(pro_forma_eps, '$') if pro_forma_eps is not None else 'N/A'}. "
        'Provide concise, professional analysis. Use specific numbers from the deal. '
        'Flag risks. Suggest sensitivity ranges. Keep responses under 200 words unless asked to elaborate. '
        "Format numbers professionally (e.g., '$2.4B' not '$2400000000'). Never give investment advice."
    )


def _dcf_prompt(data: Dict[str, Any]) -> str:
    inputs = data.get('inputs', {})
    results = data.get('results', {})
    wacc = inputs.get('wacc')
    t_growth = inputs.get('terminal_growth_rate')
    intrinsic_value = results.get('intrinsicValue')
    return (
        'You are QuantEdge AI, a valuation expert specializing in DCF analysis. '
        f"Current model: WACC {round(float(wacc) * 100, 1) if wacc is not None else 'N/A'}%, "
        f"Terminal Growth {round(float(t_growth) * 100, 1) if t_growth is not None else 'N/A'}%, "
        f"Intrinsic Value {_compact_number(intrinsic_value, '$') if intrinsic_value is not None else 'N/A'}/share. "
        'Provide professional commentary on valuation assumptions, WACC reasonableness for this sector, '
        'and key risks to the valuation. Under 200 words unless asked.'
    )


def build_system_prompt(context: ContextPayload) -> str:
    if context.type == 'merger':
        return _merger_prompt(context.data)
    if context.type == 'dcf':
        return _dcf_prompt(context.data)
    return (
        'You are QuantEdge AI, a financial analysis assistant for investment banking professionals. '
        'Help with M&A analysis, DCF valuation, financial modeling questions, and market analysis.'
    )


async def _stream_completion(messages: List[Dict[str, str]], system_prompt: str):
    try:
        client = Groq(api_key=os.getenv('GROQ_API_KEY'))
        stream = client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[{'role': 'system', 'content': system_prompt}, *messages],
            max_tokens=600,
            temperature=0.3,
            stream=True,
        )

        for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices and chunk.choices[0].delta else None
            if delta:
                yield f"data: {json.dumps({'content': delta})}\n\n"

        yield 'data: [DONE]\n\n'
    except Exception:
        yield "data: {\"error\": \"AI Analyst is temporarily unavailable. Please try again.\"}\n\n"


@router.post('/ai/chat')
async def ai_chat(request: ChatRequest):
    if not _check_rate_limit(request.user_id):
        raise HTTPException(status_code=429, detail='Rate limit exceeded. Maximum 20 requests per hour.')

    if not os.getenv('GROQ_API_KEY'):
        raise HTTPException(status_code=500, detail='GROQ_API_KEY not configured')

    org = None
    if request.user_id and request.user_id != 'anonymous':
        profile = await fetch_profile(request.user_id)
        current_org_id = profile.get('current_org_id') if profile else None
        if current_org_id:
            org = await fetch_organization(current_org_id)
            if org and org.get('ai_calls_used', 0) >= org.get('ai_calls_limit', 100):
                reset_date = org.get('billing_cycle_start', 'next cycle')
                raise HTTPException(
                    status_code=429,
                    detail=f"Your firm has used all {org.get('ai_calls_limit', 100)} AI calls this month. Resets from {reset_date}."
                )

    messages = [message.model_dump() for message in request.messages]
    system_prompt = build_system_prompt(request.context)

    if org:
        await update_organization_by_id(org['id'], {'ai_calls_used': org.get('ai_calls_used', 0) + 1})
        await insert_activity_log({
            'org_id': org['id'],
            'user_id': request.user_id,
            'action': 'ai.call_made',
            'resource_type': 'ai',
            'resource_id': None,
            'metadata': {'context_type': request.context.type},
            'ip_address': None,
        })

    return StreamingResponse(_stream_completion(messages, system_prompt), media_type='text/event-stream')


@router.post('/ai-chat')
async def ai_chat_legacy(request: ChatRequest):
    return await ai_chat(request)
