"""
Park Naija AI — Twilio WhatsApp Webhook
-----------------------------------------
Twilio sends a POST to /api/whatsapp/webhook/ for every inbound message.

Flow:
  1. Validate Twilio signature (security)
  2. Get or create session for this phone number
  3. Log inbound message
  4. Pass to bot brain → get reply string
  5. Log outbound message
  6. Return TwiML response

Setup:
  - In your Twilio console, set the WhatsApp sandbox webhook to:
    POST https://yourdomain.com/api/whatsapp/webhook/
  - Add TWILIO_AUTH_TOKEN to your .env

Testing locally:
  - Use ngrok: ngrok http 8000
  - Set sandbox webhook to your ngrok URL
"""

import logging
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.conf import settings
from twilio.twiml.messaging_response import MessagingResponse
from twilio.request_validator import RequestValidator

from .models import WhatsAppSession, WhatsAppLog
from .bot import handle_message

logger = logging.getLogger(__name__)


def _validate_twilio(request) -> bool:
    """
    Verify that the request actually came from Twilio.
    Skip validation in DEBUG mode for local testing.
    """
    if settings.DEBUG:
        return True

    auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
    if not auth_token:
        logger.warning("TWILIO_AUTH_TOKEN not set — skipping signature validation")
        return True

    validator = RequestValidator(auth_token)
    signature = request.META.get("HTTP_X_TWILIO_SIGNATURE", "")
    url = request.build_absolute_uri()
    return validator.validate(url, request.POST, signature)


def _twiml_reply(text: str) -> HttpResponse:
    """Build a TwiML response with a single WhatsApp message."""
    resp = MessagingResponse()
    resp.message(text)
    return HttpResponse(str(resp), content_type="text/xml")


@csrf_exempt
@require_POST
def whatsapp_webhook(request):
    """
    POST /api/whatsapp/webhook/
    Twilio calls this for every inbound WhatsApp message.
    """
    # ── Security check ────────────────────────────────────────
    if not _validate_twilio(request):
        logger.warning("Invalid Twilio signature — request rejected")
        return HttpResponse("Forbidden", status=403)

    # ── Extract message data ──────────────────────────────────
    from_number = request.POST.get("From", "").strip()  # e.g. "whatsapp:+2348012345678"
    body        = request.POST.get("Body", "").strip()
    media_url   = request.POST.get("MediaUrl0", "")     # image/voice note (future)

    if not from_number or not body:
        logger.warning("Received empty WhatsApp message — ignoring")
        return _twiml_reply("❓ Please send a text message.")

    # Normalize phone number
    phone = from_number.replace("whatsapp:", "").strip()

    logger.info(f"[WhatsApp] INBOUND  {phone}: {body[:80]}")

    # ── Get or create session ─────────────────────────────────
    session, created = WhatsAppSession.objects.get_or_create(phone_number=phone)
    state_before = session.state

    # Log inbound
    WhatsAppLog.objects.create(
        phone_number=phone,
        direction=WhatsAppLog.Direction.INBOUND,
        body=body,
        state_before=state_before,
    )

    # ── Handle media messages (images / voice) ─────────────────
    if media_url and not body:
        reply = (
            "📷 I can see you sent a media file, but I can only process text for now.\n\n"
            "Please type out the parking details or paste the listing text.\n\n"
            "Reply *help* for all commands."
        )
    else:
        # ── Bot brain ─────────────────────────────────────────
        try:
            reply = handle_message(session, body)
        except Exception as e:
            logger.error(f"[WhatsApp] Bot error for {phone}: {e}", exc_info=True)
            reply = (
                "😕 Something went wrong on our end. Please try again.\n\n"
                "Reply *menu* to start fresh."
            )

    state_after = session.state

    # ── Log outbound ──────────────────────────────────────────
    WhatsAppLog.objects.create(
        phone_number=phone,
        direction=WhatsAppLog.Direction.OUTBOUND,
        body=reply[:500],  # truncate for log
        state_before=state_before,
        state_after=state_after,
    )

    logger.info(f"[WhatsApp] OUTBOUND {phone} [{state_before}→{state_after}]: {reply[:60]}...")

    return _twiml_reply(reply)


@csrf_exempt
def whatsapp_status(request):
    """
    POST /api/whatsapp/status/
    Optional: Twilio delivery status callbacks.
    """
    message_sid    = request.POST.get("MessageSid")
    message_status = request.POST.get("MessageStatus")
    logger.info(f"[WhatsApp] Status update: {message_sid} → {message_status}")
    return HttpResponse("", status=204)
