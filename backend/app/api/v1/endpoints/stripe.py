from __future__ import annotations

import os

import stripe
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, EmailStr

from app.services.supabase_service import insert_activity_log, update_organization_by_field, update_organization_by_id

router = APIRouter(prefix='/stripe', tags=['stripe'])


class CheckoutRequest(BaseModel):
    org_id: str
    user_id: str
    user_email: EmailStr


@router.post('/checkout')
async def create_checkout_session(body: CheckoutRequest):
    secret_key = os.getenv('STRIPE_SECRET_KEY')
    price_id = os.getenv('STRIPE_PRO_PRICE_ID')
    app_url = os.getenv('APP_URL', 'http://localhost:5173')
    if not secret_key or not price_id:
        raise HTTPException(status_code=500, detail='Stripe is not configured')

    stripe.api_key = secret_key
    try:
        session = stripe.checkout.Session.create(
            mode='subscription',
            payment_method_types=['card'],
            line_items=[{'price': price_id, 'quantity': 1}],
            customer_email=body.user_email,
            metadata={'org_id': body.org_id, 'user_id': body.user_id},
            success_url=f'{app_url}/admin?tab=billing&upgraded=true',
            cancel_url=f'{app_url}/admin?tab=billing',
            allow_promotion_codes=True,
        )
        return {'url': session.url}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post('/webhook')
async def stripe_webhook(request: Request, stripe_signature: str = Header(alias='stripe-signature')):
    secret_key = os.getenv('STRIPE_SECRET_KEY')
    webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
    if not secret_key or not webhook_secret:
        raise HTTPException(status_code=500, detail='Stripe webhook is not configured')

    stripe.api_key = secret_key
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload=payload, sig_header=stripe_signature, secret=webhook_secret)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    event_type = event['type']
    data = event['data']['object']

    if event_type == 'checkout.session.completed':
        org_id = data.get('metadata', {}).get('org_id')
        if org_id:
            await update_organization_by_id(org_id, {
                'stripe_customer_id': data.get('customer'),
                'stripe_subscription_id': data.get('subscription'),
                'plan': 'pro',
                'seat_limit': 25,
                'ai_calls_limit': 1000,
                'subscription_status': 'active',
            })
            user_id = data.get('metadata', {}).get('user_id')
            if user_id:
                await insert_activity_log({
                    'org_id': org_id,
                    'user_id': user_id,
                    'action': 'org.upgraded',
                    'resource_type': 'org',
                    'resource_id': org_id,
                    'metadata': {'plan': 'pro'},
                    'ip_address': None,
                })

    elif event_type == 'customer.subscription.deleted':
        await update_organization_by_field('stripe_subscription_id', str(data.get('id')), {
            'plan': 'free',
            'seat_limit': 5,
            'ai_calls_limit': 100,
            'subscription_status': 'canceled',
        })

    elif event_type == 'customer.subscription.updated':
        await update_organization_by_field('stripe_subscription_id', str(data.get('id')), {
            'subscription_status': data.get('status', 'active'),
        })

    elif event_type == 'invoice.payment_failed':
        await update_organization_by_field('stripe_customer_id', str(data.get('customer')), {
            'subscription_status': 'past_due',
        })

    return {'ok': True}
