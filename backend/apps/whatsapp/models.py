from django.db import models
import json


class WhatsAppSession(models.Model):
    """
    Tracks ongoing conversations per WhatsApp phone number.
    Stores state so multi-turn flows (find parking, submit listing) work correctly.

    State machine states:
      IDLE         → waiting for user input / first message
      FIND_CITY    → asked user for city
      FIND_AREA    → asked user for area type
      FIND_TIME    → asked user for time
      FIND_BUDGET  → asked user for budget
      FIND_RESULT  → showed results, waiting for follow-up
      SUBMIT_START → user wants to list a space
      SUBMIT_DATA  → collecting space details step by step
      EXTRACT_WAIT → waiting for raw text to parse
    """

    class State(models.TextChoices):
        IDLE         = "idle",         "Idle"
        FIND_CITY    = "find_city",    "Finding: City"
        FIND_AREA    = "find_area",    "Finding: Area Type"
        FIND_TIME    = "find_time",    "Finding: Time"
        FIND_BUDGET  = "find_budget",  "Finding: Budget"
        FIND_RESULT  = "find_result",  "Finding: Showed Results"
        SUBMIT_START = "submit_start", "Submit: Started"
        SUBMIT_NAME  = "submit_name",  "Submit: Collecting Name"
        SUBMIT_CITY  = "submit_city",  "Submit: Collecting City"
        SUBMIT_ADDR  = "submit_addr",  "Submit: Collecting Address"
        SUBMIT_PRICE = "submit_price", "Submit: Collecting Price"
        SUBMIT_CAP   = "submit_cap",   "Submit: Collecting Capacity"
        SUBMIT_HOURS = "submit_hours", "Submit: Collecting Hours"
        EXTRACT_WAIT = "extract_wait", "Extract: Waiting for Text"

    phone_number  = models.CharField(max_length=30, unique=True, db_index=True)
    state         = models.CharField(max_length=30, choices=State.choices, default=State.IDLE)
    data          = models.JSONField(default=dict, help_text="Collected form data for current flow")
    last_activity = models.DateTimeField(auto_now=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    message_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "whatsapp_sessions"

    def __str__(self):
        return f"{self.phone_number} [{self.state}]"

    def reset(self):
        self.state = self.State.IDLE
        self.data  = {}
        self.save(update_fields=["state", "data", "last_activity"])

    def set_state(self, state, **extra_data):
        self.state = state
        self.data.update(extra_data)
        self.save(update_fields=["state", "data", "last_activity"])

    def increment(self):
        self.message_count += 1
        self.save(update_fields=["message_count", "last_activity"])


class WhatsAppLog(models.Model):
    """Audit log of all inbound/outbound messages."""

    class Direction(models.TextChoices):
        INBOUND  = "inbound",  "Inbound"
        OUTBOUND = "outbound", "Outbound"

    phone_number = models.CharField(max_length=30, db_index=True)
    direction    = models.CharField(max_length=10, choices=Direction.choices)
    body         = models.TextField()
    state_before = models.CharField(max_length=30, blank=True)
    state_after  = models.CharField(max_length=30, blank=True)
    timestamp    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "whatsapp_logs"
        ordering = ["-timestamp"]

    def __str__(self):
        arrow = "→" if self.direction == "inbound" else "←"
        return f"{self.phone_number} {arrow} {self.body[:60]}"
