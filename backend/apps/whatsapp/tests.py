"""
Park Naija AI — WhatsApp Bot Tests
Run with: python manage.py test apps.whatsapp

Tests cover:
  - Intent matching
  - Price parsing
  - Time parsing
  - Full find-parking conversation flow
  - Full submit-listing conversation flow
  - Extract flow trigger
  - Global overrides (menu, reset, help)
"""

from unittest.mock import patch, MagicMock
from django.test import TestCase
from apps.whatsapp.models import WhatsAppSession
from apps.whatsapp.bot import (
    match_intent, parse_naira, parse_time,
    parse_hours_range, handle_message,
)
from apps.whatsapp import messages as msg


class IntentMatchingTests(TestCase):
    def test_find_intents(self):
        for text in ["find", "1", "park", "where can i park"]:
            self.assertEqual(match_intent(text), "find", f"Failed for: {text}")

    def test_list_intents(self):
        for text in ["list", "2", "my space", "submit"]:
            self.assertEqual(match_intent(text), "list", f"Failed for: {text}")

    def test_reset_intents(self):
        for text in ["reset", "cancel", "start over", "back"]:
            self.assertEqual(match_intent(text), "reset", f"Failed for: {text}")

    def test_menu_intents(self):
        for text in ["menu", "hi", "hello", "hey"]:
            self.assertEqual(match_intent(text), "menu", f"Failed for: {text}")

    def test_no_match(self):
        self.assertIsNone(match_intent("jhlkajfhdskjfhds"))


class PriceParsingTests(TestCase):
    def test_naira_shorthand(self):
        self.assertEqual(parse_naira("2k"), 2000)
        self.assertEqual(parse_naira("1.5k"), 1500)
        self.assertEqual(parse_naira("2K"), 2000)

    def test_plain_number(self):
        self.assertEqual(parse_naira("1500"), 1500)
        self.assertEqual(parse_naira("₦2000"), 2000)
        self.assertEqual(parse_naira("2000 naira"), 2000)

    def test_invalid(self):
        self.assertIsNone(parse_naira("free"))
        self.assertIsNone(parse_naira("plenty"))


class TimeParsingTests(TestCase):
    def test_am_pm(self):
        self.assertEqual(parse_time("8am"),   "08:00")
        self.assertEqual(parse_time("9pm"),   "21:00")
        self.assertEqual(parse_time("12pm"),  "12:00")
        self.assertEqual(parse_time("12am"),  "00:00")
        self.assertEqual(parse_time("2:30pm"), "14:30")

    def test_24hr(self):
        self.assertEqual(parse_time("14:00"), "14:00")
        self.assertEqual(parse_time("08:30"), "08:30")

    def test_invalid(self):
        self.assertIsNone(parse_time("later"))
        self.assertIsNone(parse_time("sometime"))

    def test_now(self):
        result = parse_time("now")
        self.assertIsNotNone(result)
        self.assertRegex(result, r"\d{2}:\d{2}")


class HoursRangeParsingTests(TestCase):
    def test_standard_range(self):
        f, u = parse_hours_range("7am to 9pm")
        self.assertEqual(f, "07:00")
        self.assertEqual(u, "21:00")

    def test_anytime(self):
        f, u = parse_hours_range("anytime")
        self.assertEqual(f, "00:00")
        self.assertEqual(u, "23:59")

    def test_24hours(self):
        f, u = parse_hours_range("24 hours")
        self.assertEqual(f, "00:00")


class BotConversationTests(TestCase):

    def _session(self):
        return WhatsAppSession.objects.create(phone_number="+2348012345678")

    # ── Global overrides ──────────────────────────────────────

    def test_menu_resets_and_shows_welcome(self):
        s = self._session()
        s.set_state(WhatsAppSession.State.FIND_AREA, city="lagos")
        reply = handle_message(s, "menu")
        self.assertIn("Park Naija AI", reply)
        s.refresh_from_db()
        self.assertEqual(s.state, WhatsAppSession.State.IDLE)

    def test_reset_works_from_any_state(self):
        s = self._session()
        s.set_state(WhatsAppSession.State.SUBMIT_PRICE)
        reply = handle_message(s, "reset")
        s.refresh_from_db()
        self.assertEqual(s.state, WhatsAppSession.State.IDLE)

    def test_help_returns_help_text(self):
        s = self._session()
        reply = handle_message(s, "help")
        self.assertIn("Commands", reply)
        self.assertIn("find", reply.lower())

    # ── Welcome / Idle ─────────────────────────────────────────

    def test_hello_shows_welcome(self):
        s = self._session()
        reply = handle_message(s, "hello")
        self.assertIn("Park Naija AI", reply)

    def test_find_from_idle(self):
        s = self._session()
        reply = handle_message(s, "find")
        self.assertIn("City", reply)
        s.refresh_from_db()
        self.assertEqual(s.state, WhatsAppSession.State.FIND_CITY)

    def test_list_from_idle(self):
        s = self._session()
        reply = handle_message(s, "list")
        self.assertIn("List Your Parking Space", reply)
        s.refresh_from_db()
        self.assertEqual(s.state, WhatsAppSession.State.SUBMIT_START)

    def test_parse_from_idle(self):
        s = self._session()
        reply = handle_message(s, "parse")
        self.assertIn("Parse", reply)
        s.refresh_from_db()
        self.assertEqual(s.state, WhatsAppSession.State.EXTRACT_WAIT)

    # ── Find flow ─────────────────────────────────────────────

    def test_find_city_lagos(self):
        s = self._session()
        s.set_state(WhatsAppSession.State.FIND_CITY)
        reply = handle_message(s, "1")
        s.refresh_from_db()
        self.assertEqual(s.data.get("city"), "lagos")
        self.assertEqual(s.state, WhatsAppSession.State.FIND_AREA)
        self.assertIn("Area", reply)

    def test_find_city_ph(self):
        s = self._session()
        s.set_state(WhatsAppSession.State.FIND_CITY)
        reply = handle_message(s, "ph")
        s.refresh_from_db()
        self.assertEqual(s.data.get("city"), "port_harcourt")

    def test_find_city_invalid(self):
        s = self._session()
        s.set_state(WhatsAppSession.State.FIND_CITY)
        reply = handle_message(s, "nairobi")
        s.refresh_from_db()
        self.assertEqual(s.state, WhatsAppSession.State.FIND_CITY)  # no change
        self.assertIn("1", reply)  # re-prompts

    def test_find_area_commercial(self):
        s = self._session()
        s.set_state(WhatsAppSession.State.FIND_AREA, city="lagos")
        reply = handle_message(s, "1")
        s.refresh_from_db()
        self.assertEqual(s.data.get("area_type"), "commercial")
        self.assertIn("time", reply.lower())

    def test_find_time_8am(self):
        s = self._session()
        s.set_state(WhatsAppSession.State.FIND_TIME, city="lagos", area_type="commercial")
        reply = handle_message(s, "8am")
        s.refresh_from_db()
        self.assertEqual(s.data.get("arrival_time"), "08:00")
        self.assertIn("budget", reply.lower())

    def test_find_budget_skip(self):
        s = self._session()
        s.set_state(WhatsAppSession.State.FIND_BUDGET, city="lagos", area_type="commercial", arrival_time="08:00")
        # Should call recommendation engine — patch it to avoid DB dependency
        reply = handle_message(s, "skip")
        # Reply should mention parking options or no spaces found
        self.assertTrue(
            "parking" in reply.lower() or "space" in reply.lower() or "found" in reply.lower()
        )

    # ── Submit flow ────────────────────────────────────────────

    def test_submit_flow_collects_name(self):
        s = self._session()
        s.set_state(WhatsAppSession.State.SUBMIT_START)
        reply = handle_message(s, "My compound behind GTB Rumuola")
        s.refresh_from_db()
        self.assertEqual(s.data.get("name"), "My compound behind GTB Rumuola")
        self.assertIn("city", reply.lower())

    def test_submit_city_selection(self):
        s = self._session()
        s.set_state(WhatsAppSession.State.SUBMIT_CITY, name="Test Space")
        handle_message(s, "2")
        s.refresh_from_db()
        self.assertEqual(s.data.get("city"), "port_harcourt")

    def test_submit_price_parsing(self):
        s = self._session()
        s.set_state(WhatsAppSession.State.SUBMIT_PRICE,
            name="Test", city="lagos", address="Test Address")
        handle_message(s, "2k")
        s.refresh_from_db()
        self.assertEqual(s.data.get("price_per_hour"), 2000.0)

    def test_submit_capacity_parsing(self):
        s = self._session()
        s.set_state(WhatsAppSession.State.SUBMIT_CAP,
            name="Test", city="lagos", address="Addr", price_per_hour=1500)
        handle_message(s, "3 cars")
        s.refresh_from_db()
        self.assertEqual(s.data.get("capacity"), 3)

    # ── Smart paste detection ──────────────────────────────────

    def test_pasted_listing_triggers_extract(self):
        s = self._session()
        long_msg = "you can park in my compound at rumuola junction, 3 cars, 1500 per hour, available weekdays till 9pm, gateman dey there"
        # Patch AI call
        with patch("apps.whatsapp.bot.get_ai_response") as mock_ai, \
             patch("apps.whatsapp.bot.parse_json_response") as mock_parse:
            mock_ai.return_value = "{}"
            mock_parse.return_value = {
                "name": "Rumuola Compound", "city": "port_harcourt",
                "address": "Rumuola Junction", "capacity": 3,
                "price_per_hour": 1500, "price_is_negotiable": False,
                "available_from": None, "available_until": "21:00",
                "has_security": True, "notes": "gateman available",
                "confidence": "high", "missing_fields": []
            }
            reply = handle_message(s, long_msg)
        self.assertIn("Extracted", reply)
