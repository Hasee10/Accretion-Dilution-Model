"""
FastAPI email endpoints — all Resend calls happen server-side here.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app.services.email_service import (
    send_welcome_email,
    send_password_reset_email,
    send_deal_saved_email,
    send_firm_invite_email,
)

router = APIRouter(prefix="/email", tags=["email"])


# ── Request schemas ──────────────────────────────────────────────────────────

class WelcomeRequest(BaseModel):
    email: EmailStr
    firstName: str


class PasswordResetRequest(BaseModel):
    email: EmailStr
    resetLink: str


class DealSavedRequest(BaseModel):
    email: EmailStr
    firstName: str
    dealName: str
    dealId: str
    adResult: str


class FirmInviteRequest(BaseModel):
    email: EmailStr
    inviterName: str
    firmName: str
    inviteLink: str
    role: str


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/welcome")
async def email_welcome(body: WelcomeRequest):
    """Called server-side after successful sign-up profile creation."""
    try:
        result = send_welcome_email(body.email, body.firstName)
        return {"success": True, "id": result.get("id")}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/password-reset")
async def email_password_reset(body: PasswordResetRequest):
    """Send a password reset link email."""
    try:
        result = send_password_reset_email(body.email, body.resetLink)
        return {"success": True, "id": result.get("id")}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/deal-saved")
async def email_deal_saved(body: DealSavedRequest):
    """Called when a user saves a deal."""
    try:
        result = send_deal_saved_email(
            body.email,
            body.firstName,
            body.dealName,
            body.dealId,
            body.adResult,
        )
        return {"success": True, "id": result.get("id")}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/firm-invite")
async def email_firm_invite(body: FirmInviteRequest):
    try:
        result = send_firm_invite_email(
            body.email,
            body.inviterName,
            body.firmName,
            body.inviteLink,
            body.role,
        )
        return {"success": True, "id": result.get("id")}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
