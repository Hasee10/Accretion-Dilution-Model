"""
Resend email service for QuantEdge transactional emails.
All templates use dark branding: #0a0a0a bg, #ffffff text, #f97316 orange accent.
"""
import os
import resend
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY", "")

FROM_ADDRESS = os.getenv("RESEND_FROM", "QuantEdge <onboarding@resend.dev>")
APP_URL = os.getenv("APP_URL", "http://localhost:5173")

# ──────────────────────────────────────────────────────────────────────────────
# Shared layout wrapper
# ──────────────────────────────────────────────────────────────────────────────

def _wrap(body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QuantEdge</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border-radius:12px;border:1px solid #1f1f1f;overflow:hidden;max-width:560px;width:100%;">

          <!-- Header / Logo -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #1f1f1f;">
              <span style="font-size:22px;font-weight:700;letter-spacing:-0.5px;color:#ffffff;">
                Quant<span style="color:#f97316;">Edge</span>
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              {body_html}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1f1f1f;text-align:center;">
              <p style="margin:0;font-size:12px;color:#555555;">
                &copy; QuantEdge. Built for finance professionals.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _cta_button(label: str, href: str) -> str:
    return f"""
<table cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
  <tr>
    <td style="border-radius:8px;background:#f97316;">
      <a href="{href}"
         style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;
                color:#ffffff;text-decoration:none;letter-spacing:0.2px;border-radius:8px;">
        {label}
      </a>
    </td>
  </tr>
</table>"""


# ──────────────────────────────────────────────────────────────────────────────
# WelcomeEmail
# ──────────────────────────────────────────────────────────────────────────────

def _welcome_html(first_name: str) -> str:
    body = f"""
<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
  Welcome, {first_name}.
</h1>
<p style="margin:0 0 4px;font-size:15px;color:#a3a3a3;">
  Your account is ready.
</p>
<p style="margin:20px 0 0;font-size:15px;line-height:1.7;color:#cccccc;">
  You now have access to institutional-grade financial modeling tools &mdash;
  DCF Valuation, Merger Analysis, and AI-powered insights.
</p>
{_cta_button("Open QuantEdge", APP_URL)}
"""
    return _wrap(body)


def send_welcome_email(email: str, first_name: str) -> dict:
    """Send a welcome email after successful sign-up."""
    params = {
        "from": FROM_ADDRESS,
        "to": [email],
        "subject": f"Welcome to QuantEdge, {first_name}",
        "html": _welcome_html(first_name),
    }
    return resend.Emails.send(params)


# ──────────────────────────────────────────────────────────────────────────────
# PasswordResetEmail
# ──────────────────────────────────────────────────────────────────────────────

def _password_reset_html(reset_link: str) -> str:
    body = f"""
<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
  Reset your password
</h1>
<p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#cccccc;">
  A password reset was requested for your QuantEdge account.
  Click the button below to choose a new password.
</p>
{_cta_button("Reset Password", reset_link)}
<p style="margin:20px 0 0;font-size:13px;color:#666666;line-height:1.6;">
  This link expires in <strong style="color:#a3a3a3;">1 hour</strong>.
  If you didn&apos;t request this, you can safely ignore this email.
</p>
"""
    return _wrap(body)


def send_password_reset_email(email: str, reset_link: str) -> dict:
    """Send a password reset email."""
    params = {
        "from": FROM_ADDRESS,
        "to": [email],
        "subject": "Reset your QuantEdge password",
        "html": _password_reset_html(reset_link),
    }
    return resend.Emails.send(params)


# ──────────────────────────────────────────────────────────────────────────────
# DealSavedEmail
# ──────────────────────────────────────────────────────────────────────────────

def _deal_saved_html(first_name: str, deal_name: str, deal_id: str, ad_result: str) -> str:
    from datetime import datetime, timezone
    date_saved = datetime.now(timezone.utc).strftime("%B %d, %Y")
    deal_url = f"{APP_URL}/merger-analysis?deal={deal_id}"

    body = f"""
<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
  Deal saved
</h1>
<p style="margin:0 0 20px;font-size:15px;color:#a3a3a3;">
  Hi {first_name}, your deal has been saved to your account.
</p>

<!-- Summary card -->
<table width="100%" cellpadding="0" cellspacing="0"
       style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;margin-bottom:4px;">
  <tr>
    <td style="padding:20px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#666666;width:50%;">Deal name</td>
          <td style="padding:6px 0;font-size:13px;color:#ffffff;font-weight:600;">{deal_name}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#666666;">A/D result (Yr 3)</td>
          <td style="padding:6px 0;font-size:13px;color:#f97316;font-weight:600;">{ad_result}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#666666;">Date saved</td>
          <td style="padding:6px 0;font-size:13px;color:#ffffff;">{date_saved}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
{_cta_button("View Deal", deal_url)}
"""
    return _wrap(body)


def send_deal_saved_email(
    email: str,
    first_name: str,
    deal_name: str,
    deal_id: str,
    ad_result: str,
) -> dict:
    """Send a confirmation email when a deal is saved."""
    params = {
        "from": FROM_ADDRESS,
        "to": [email],
        "subject": f"Deal saved: {deal_name}",
        "html": _deal_saved_html(first_name, deal_name, deal_id, ad_result),
    }
    return resend.Emails.send(params)


def _firm_invite_html(inviter_name: str, firm_name: str, invite_link: str, role: str) -> str:
    body = f"""
<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
  Join {firm_name} on QuantEdge
</h1>
<p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#cccccc;">
  {inviter_name} invited you to join the {firm_name} workspace as <strong style="color:#ffffff;">{role}</strong>.
</p>
{_cta_button("Accept Invitation", invite_link)}
<p style="margin:20px 0 0;font-size:13px;color:#666666;line-height:1.6;">
  This invite expires in 7 days.
</p>
"""
    return _wrap(body)


def send_firm_invite_email(email: str, inviter_name: str, firm_name: str, invite_link: str, role: str) -> dict:
    params = {
        "from": FROM_ADDRESS,
        "to": [email],
        "subject": f"Invitation to join {firm_name} on QuantEdge",
        "html": _firm_invite_html(inviter_name, firm_name, invite_link, role),
    }
    return resend.Emails.send(params)


def send_enterprise_contact_email(company: str, email: str, team_size: str, message: str) -> dict:
    params = {
        "from": FROM_ADDRESS,
        "to": [os.getenv("ENTERPRISE_CONTACT_EMAIL", FROM_ADDRESS)],
        "subject": f"QuantEdge Enterprise inquiry — {company}",
        "html": _wrap(
            f"""
<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">Enterprise inquiry</h1>
<p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#cccccc;">
  <strong style="color:#ffffff;">Company:</strong> {company}<br/>
  <strong style="color:#ffffff;">Work email:</strong> {email}<br/>
  <strong style="color:#ffffff;">Team size:</strong> {team_size}
</p>
<p style="margin:20px 0 0;font-size:15px;line-height:1.7;color:#cccccc;">{message}</p>
"""
        ),
    }
    return resend.Emails.send(params)


def send_enterprise_auto_reply(email: str, company: str) -> dict:
    params = {
        "from": FROM_ADDRESS,
        "to": [email],
        "subject": "Thanks for your interest in QuantEdge Enterprise",
        "html": _wrap(
            f"""
<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">Thanks for reaching out.</h1>
<p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#cccccc;">
  We received your enterprise inquiry for <strong style="color:#ffffff;">{company}</strong>.
  Our team will be in touch within 1 business day.
</p>
"""
        ),
    }
    return resend.Emails.send(params)
