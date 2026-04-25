"""
POST /api/extract/
Converts informal WhatsApp/text messages into structured parking listings.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from .ai_service import get_ai_response, parse_json_response

EXTRACTION_SYSTEM_PROMPT = """
You are Park Naija AI — a parking data extraction engine for Nigerian cities.

Your job is to convert informal, unstructured text (WhatsApp messages, voice note transcripts, 
social media posts) into structured parking listing data.

Nigerian context you understand:
- Prices are in Naira (₦). "2k" = ₦2,000. "1.5k" = ₦1,500. "500 naira" = ₦500.
- Common landmarks: "beside GTB", "opposite shoprite", "after the roundabout"
- Time formats: "till 9", "from morning", "8am to 10pm", "weekdays only"
- Space descriptions: "compound", "lot", "my yard", "open space", "garage"
- Cities: Lagos, Port Harcourt (PH), Abuja

Return ONLY a valid JSON object. No preamble. No explanation. No markdown.

JSON schema:
{
  "name": "string or null — descriptive name you infer",
  "city": "lagos | port_harcourt | abuja | unknown",
  "address": "string — full address or landmark description",
  "capacity": integer — number of cars (default 1 if unclear),
  "price_per_hour": number — in Naira (convert shorthand like 2k → 2000),
  "price_is_negotiable": boolean,
  "available_from": "HH:MM or null",
  "available_until": "HH:MM or null",
  "available_days": ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] or [],
  "has_security": boolean,
  "is_covered": boolean,
  "notes": "string — anything else relevant",
  "confidence": "high | medium | low",
  "missing_fields": ["list of important fields that were not mentioned"]
}
"""


class ExtractionView(APIView):
    """
    POST /api/extract/
    Body: { "text": "you can park in my compound today, 3 cars, 1500 per hour till 9pm" }
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def post(self, request):
        raw_text = request.data.get("text", "").strip()

        if not raw_text:
            return Response(
                {"error": "No text provided. Send { \"text\": \"your parking message\" }"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(raw_text) > 1000:
            return Response(
                {"error": "Text too long. Max 1000 characters."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            raw_response = get_ai_response(EXTRACTION_SYSTEM_PROMPT, raw_text)
            extracted = parse_json_response(raw_response)
        except ValueError as e:
            return Response(
                {"error": "AI parsing failed.", "detail": str(e)},
                status=status.HTTP_502_BAD_GATEWAY
            )
        except Exception as e:
            print("🔥 AI ERROR:", str(e))  # ADD This To know when Ai extraction fails
            return Response(
                {"error": "AI service error.", "detail": str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        return Response({
            "input_text": raw_text,
            "extracted": extracted,
            "note": "Review extracted data before saving as a listing."
        }, status=status.HTTP_200_OK)


