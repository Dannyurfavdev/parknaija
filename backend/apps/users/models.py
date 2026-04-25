from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        DRIVER = "driver", "Driver"
        SPACE_OWNER = "space_owner", "Space Owner"
        ADMIN = "admin", "Admin"

    class City(models.TextChoices):
        LAGOS = "lagos", "Lagos"
        PORT_HARCOURT = "port_harcourt", "Port Harcourt"
        ABUJA = "abuja", "Abuja"
        OTHER = "other", "Other"

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150)
    phone_number = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.DRIVER)
    city = models.CharField(max_length=20, choices=City.choices, default=City.OTHER)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return f"{self.full_name} ({self.role}) — {self.email}"

    @property
    def is_driver(self):
        return self.role == self.Role.DRIVER

    @property
    def is_space_owner(self):
        return self.role == self.Role.SPACE_OWNER
