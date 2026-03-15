from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.services.email_service import send_enterprise_auto_reply, send_enterprise_contact_email

router = APIRouter(prefix='/enterprise', tags=['enterprise'])


class EnterpriseContactRequest(BaseModel):
    company: str
    email: EmailStr
    teamSize: str
    message: str


@router.post('/contact')
async def enterprise_contact(body: EnterpriseContactRequest):
    try:
        send_enterprise_contact_email(body.company, body.email, body.teamSize, body.message)
        send_enterprise_auto_reply(body.email, body.company)
        return {'success': True}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
