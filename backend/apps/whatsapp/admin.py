from django.contrib import admin
from .models import WhatsAppSession, WhatsAppLog


@admin.register(WhatsAppSession)
class WhatsAppSessionAdmin(admin.ModelAdmin):
    list_display  = ["phone_number", "state", "message_count", "last_activity"]
    list_filter   = ["state"]
    search_fields = ["phone_number"]
    readonly_fields = ["created_at", "last_activity", "message_count"]
    actions = ["reset_sessions"]

    def reset_sessions(self, request, queryset):
        for session in queryset:
            session.reset()
        self.message_user(request, f"{queryset.count()} session(s) reset.")
    reset_sessions.short_description = "Reset selected sessions to IDLE"


@admin.register(WhatsAppLog)
class WhatsAppLogAdmin(admin.ModelAdmin):
    list_display  = ["phone_number", "direction", "body_preview", "state_before", "state_after", "timestamp"]
    list_filter   = ["direction", "state_before"]
    search_fields = ["phone_number", "body"]
    readonly_fields = ["timestamp"]

    def body_preview(self, obj):
        return obj.body[:60] + ("…" if len(obj.body) > 60 else "")
    body_preview.short_description = "Message"
