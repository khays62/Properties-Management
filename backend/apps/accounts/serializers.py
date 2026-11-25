from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, UserProfile


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "role",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class LoginTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs: dict[str, object]) -> dict[str, object]:
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class CurrentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
        )
        read_only_fields = fields


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = (
            "user",
            "avatar",
            "address",
            "city",
            "country",
            "date_of_birth",
            "emergency_contact",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("user", "created_at", "updated_at")
