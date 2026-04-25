"""
Park Naija AI Service Layer
----------------------------
Currently uses OpenAI GPT-4o.
To switch to Claude (Anthropic), change AI_PROVIDER in settings.py
and uncomment the Anthropic block below.

The interface is identical — both return plain text responses.
"""

from django.conf import settings
import json


def get_ai_response(system_prompt: str, user_message: str) -> str:
    """
    Unified AI call. Returns the model's text response as a string.
    Swap provider in settings.py without touching any other code.
    """
    provider = getattr(settings, "AI_PROVIDER", "openai")

    if provider == "openai":
        return _call_openai(system_prompt, user_message)
    elif provider == "anthropic":
        return _call_anthropic(system_prompt, user_message)
    else:
        raise ValueError(f"Unknown AI_PROVIDER: {provider}")


def _call_openai(system_prompt: str, user_message: str) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=0.2,
        max_tokens=1000,
    )
    return response.choices[0].message.content.strip()


def _call_anthropic(system_prompt: str, user_message: str) -> str:
    """
    Uncomment and use when upgrading to Claude.
    pip install anthropic
    """
    import anthropic
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=1000,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return message.content[0].text.strip()


def parse_json_response(raw: str) -> dict:
    """
    Safely parse JSON from AI response.
    Handles cases where the model wraps output in markdown code fences.
    """
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1])
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"AI returned invalid JSON: {e}\nRaw: {raw}")
