"""
Django management command: python manage.py seed_parking_data

Populates the database with realistic starter parking spaces
across Lagos, Port Harcourt, and Abuja.

Based on real area types, price ranges, and landmarks.
Run once after initial migrate. Safe to run multiple times (idempotent).
"""

from django.core.management.base import BaseCommand
from apps.listings.models import ParkingSpace

SEED_SPACES = [
    # ── PORT HARCOURT ─────────────────────────────────────────
    {
        "name": "Rumuola Junction Compound",
        "city": "port_harcourt",
        "area_type": "commercial",
        "address": "Rumuola Road, beside Access Bank, Port Harcourt",
        "latitude": 4.8230, "longitude": 7.0237,
        "capacity": 5, "price_per_hour": 1500,
        "available_from": "07:00", "available_until": "21:00",
        "available_days": ["monday","tuesday","wednesday","thursday","friday","saturday"],
        "has_security": True, "is_covered": False, "has_cctv": False,
        "notes": "Green gate. Gateman on duty. Call before arrival.",
        "is_verified": True,
    },
    {
        "name": "GRA Phase 2 Private Lot",
        "city": "port_harcourt",
        "area_type": "residential",
        "address": "Old GRA Phase 2, off Aba Road, Port Harcourt",
        "latitude": 4.8060, "longitude": 7.0120,
        "capacity": 8, "price_per_hour": 1000,
        "available_from": "06:00", "available_until": "22:00",
        "available_days": ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"],
        "has_security": True, "is_covered": True, "has_cctv": True,
        "notes": "Covered parking. CCTV monitored. Night parking available on request.",
        "is_verified": True,
    },
    {
        "name": "Trans Amadi Open Lot",
        "city": "port_harcourt",
        "area_type": "commercial",
        "address": "Trans Amadi Industrial Layout, near Shell RA, Port Harcourt",
        "latitude": 4.8350, "longitude": 7.0410,
        "capacity": 20, "price_per_hour": 800,
        "price_is_negotiable": True,
        "available_from": "07:00", "available_until": "19:00",
        "available_days": ["monday","tuesday","wednesday","thursday","friday"],
        "has_security": True, "is_covered": False, "has_cctv": False,
        "notes": "Large open lot. Ideal for workers in Trans Amadi. Monthly rates available.",
        "is_verified": True,
    },
    {
        "name": "D-Line Shopping Area Parking",
        "city": "port_harcourt",
        "area_type": "market",
        "address": "D-Line Road, opposite Chicken Republic, Port Harcourt",
        "latitude": 4.7980, "longitude": 7.0080,
        "capacity": 6, "price_per_hour": 1200,
        "available_from": "08:00", "available_until": "20:00",
        "available_days": ["monday","tuesday","wednesday","thursday","friday","saturday"],
        "has_security": False, "is_covered": False, "has_cctv": False,
        "notes": "Close to D-Line market and restaurants. Pay at entrance.",
        "is_verified": False,
    },
    {
        "name": "New GRA Compound Parking",
        "city": "port_harcourt",
        "area_type": "residential",
        "address": "New GRA, off Peter Odili Road, Port Harcourt",
        "latitude": 4.8490, "longitude": 7.0340,
        "capacity": 4, "price_per_hour": 2000,
        "available_from": "07:00", "available_until": "22:00",
        "available_days": ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"],
        "has_security": True, "is_covered": True, "has_cctv": True,
        "notes": "Premium covered parking. Very secure neighbourhood. CCTV 24/7.",
        "is_verified": True,
    },

    # ── LAGOS ─────────────────────────────────────────────────
    {
        "name": "Victoria Island Compound — Akin Adesola",
        "city": "lagos",
        "area_type": "commercial",
        "address": "Akin Adesola Street, Victoria Island, Lagos",
        "latitude": 6.4281, "longitude": 3.4219,
        "capacity": 10, "price_per_hour": 3000,
        "available_from": "07:00", "available_until": "21:00",
        "available_days": ["monday","tuesday","wednesday","thursday","friday"],
        "has_security": True, "is_covered": False, "has_cctv": True,
        "notes": "Walking distance to major VI offices and banks. CCTV. Business hours only.",
        "is_verified": True,
    },
    {
        "name": "Ikeja GRA Private Lot",
        "city": "lagos",
        "area_type": "residential",
        "address": "Mobolaji Bank Anthony Way, Ikeja GRA, Lagos",
        "latitude": 6.5958, "longitude": 3.3478,
        "capacity": 6, "price_per_hour": 1500,
        "available_from": "06:00", "available_until": "23:00",
        "available_days": ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"],
        "has_security": True, "is_covered": True, "has_cctv": False,
        "notes": "Quiet residential area. 5 mins walk to Allen Avenue. Available weekends too.",
        "is_verified": True,
    },
    {
        "name": "Lekki Phase 1 — Admiralty Way Lot",
        "city": "lagos",
        "area_type": "commercial",
        "address": "Admiralty Way, Lekki Phase 1, Lagos",
        "latitude": 6.4358, "longitude": 3.4721,
        "capacity": 12, "price_per_hour": 2500,
        "price_is_negotiable": True,
        "available_from": "07:00", "available_until": "22:00",
        "available_days": ["monday","tuesday","wednesday","thursday","friday","saturday"],
        "has_security": True, "is_covered": False, "has_cctv": True,
        "notes": "High-demand area. Book in advance on Fridays. Security on site.",
        "is_verified": True,
    },
    {
        "name": "Surulere Open Parking — Adeniran Ogunsanya",
        "city": "lagos",
        "area_type": "market",
        "address": "Adeniran Ogunsanya Street, Surulere, Lagos",
        "latitude": 6.5020, "longitude": 3.3599,
        "capacity": 15, "price_per_hour": 1000,
        "available_from": "06:00", "available_until": "20:00",
        "available_days": ["monday","tuesday","wednesday","thursday","friday","saturday"],
        "has_security": False, "is_covered": False, "has_cctv": False,
        "notes": "Budget parking near Tejuosho market. Busy Saturdays — arrive before 8am.",
        "is_verified": False,
    },
    {
        "name": "Marina CBD Underground Car Park",
        "city": "lagos",
        "area_type": "commercial",
        "address": "Marina Road, Lagos Island CBD, Lagos",
        "latitude": 6.4509, "longitude": 3.3958,
        "capacity": 30, "price_per_hour": 2000,
        "available_from": "07:00", "available_until": "20:00",
        "available_days": ["monday","tuesday","wednesday","thursday","friday"],
        "has_security": True, "is_covered": True, "has_cctv": True,
        "notes": "Only covered underground lot on the Island. Limited spaces. Book early.",
        "is_verified": True,
    },

    # ── ABUJA ─────────────────────────────────────────────────
    {
        "name": "Wuse 2 — Aminu Kano Crescent Lot",
        "city": "abuja",
        "area_type": "commercial",
        "address": "Aminu Kano Crescent, Wuse 2, Abuja",
        "latitude": 9.0695, "longitude": 7.4834,
        "capacity": 15, "price_per_hour": 1500,
        "available_from": "07:00", "available_until": "21:00",
        "available_days": ["monday","tuesday","wednesday","thursday","friday","saturday"],
        "has_security": True, "is_covered": False, "has_cctv": True,
        "notes": "Near major embassies and restaurants. CCTV. Security guard from 7am.",
        "is_verified": True,
    },
    {
        "name": "Maitama Compound Parking",
        "city": "abuja",
        "area_type": "residential",
        "address": "Mississippi Street, Maitama, Abuja",
        "latitude": 9.0880, "longitude": 7.4920,
        "capacity": 4, "price_per_hour": 2500,
        "available_from": "07:00", "available_until": "22:00",
        "available_days": ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"],
        "has_security": True, "is_covered": True, "has_cctv": True,
        "notes": "Premium quiet compound. Covered. Perfect for meetings in Maitama.",
        "is_verified": True,
    },
    {
        "name": "Garki Area 11 Open Lot",
        "city": "abuja",
        "area_type": "commercial",
        "address": "Moshood Abiola Way, Garki Area 11, Abuja",
        "latitude": 9.0520, "longitude": 7.4701,
        "capacity": 25, "price_per_hour": 1000,
        "price_is_negotiable": True,
        "available_from": "06:00", "available_until": "21:00",
        "available_days": ["monday","tuesday","wednesday","thursday","friday","saturday"],
        "has_security": True, "is_covered": False, "has_cctv": False,
        "notes": "Large lot near Garki market and government offices. Monthly pass available.",
        "is_verified": False,
    },
    {
        "name": "CBD Central Business District — Unity House",
        "city": "abuja",
        "area_type": "commercial",
        "address": "Central Business District, near Unity House, Abuja",
        "latitude": 9.0579, "longitude": 7.4951,
        "capacity": 20, "price_per_hour": 2000,
        "available_from": "07:00", "available_until": "19:00",
        "available_days": ["monday","tuesday","wednesday","thursday","friday"],
        "has_security": True, "is_covered": False, "has_cctv": True,
        "notes": "Government zone. Business hours only. ID may be required at gate.",
        "is_verified": True,
    },
]


class Command(BaseCommand):
    help = "Seed the database with realistic starter parking spaces for Lagos, Port Harcourt, and Abuja."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear", action="store_true",
            help="Delete all existing seed data before inserting (use with caution)"
        )

    def handle(self, *args, **options):
        if options["clear"]:
            deleted, _ = ParkingSpace.objects.filter(source=ParkingSpace.Source.ADMIN).delete()
            self.stdout.write(self.style.WARNING(f"Cleared {deleted} existing seed spaces."))

        created_count = 0
        skipped_count = 0

        for data in SEED_SPACES:
            space, created = ParkingSpace.objects.get_or_create(
                name=data["name"],
                city=data["city"],
                defaults={
                    **data,
                    "source": ParkingSpace.Source.ADMIN,
                    "status": ParkingSpace.Status.ACTIVE,
                }
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"  ✅ Created: {space.name} ({space.city})")
                )
            else:
                skipped_count += 1
                self.stdout.write(
                    f"  — Skipped (already exists): {space.name}"
                )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"Done. {created_count} spaces created, {skipped_count} already existed."
        ))
        self.stdout.write(f"  Lagos:          {sum(1 for s in SEED_SPACES if s['city']=='lagos')} spaces")
        self.stdout.write(f"  Port Harcourt:  {sum(1 for s in SEED_SPACES if s['city']=='port_harcourt')} spaces")
        self.stdout.write(f"  Abuja:          {sum(1 for s in SEED_SPACES if s['city']=='abuja')} spaces")
