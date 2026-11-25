from rest_framework import serializers

from .models import Applicant, RentalApplication, Screening


class ApplicantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Applicant
        fields = (
            "id",
            "first_name",
            "last_name",
            "email",
            "phone",
            "employment_status",
            "employer_name",
            "monthly_income",
            "current_address",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class RentalApplicationSerializer(serializers.ModelSerializer):
    applicant = ApplicantSerializer()

    class Meta:
        model = RentalApplication
        validators = []
        fields = (
            "id",
            "listing",
            "applicant",
            "move_in_date",
            "notes",
            "rejection_reason",
            "status",
            "submitted_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "rejection_reason",
            "status",
            "submitted_at",
            "created_at",
            "updated_at",
        )


class ScreeningSerializer(serializers.ModelSerializer):
    class Meta:
        model = Screening
        fields = (
            "id",
            "application",
            "score",
            "notes",
            "income_verified",
            "employment_verified",
            "references_checked",
            "status",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "application",
            "status",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "updated_at",
        )


class RentalApplicationDetailSerializer(RentalApplicationSerializer):
    screening = ScreeningSerializer(read_only=True)

    class Meta(RentalApplicationSerializer.Meta):
        fields = RentalApplicationSerializer.Meta.fields + ("screening",)


class ApplicationRejectionSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(allow_blank=False, trim_whitespace=True)


class ScreeningResultSerializer(serializers.Serializer):
    score = serializers.IntegerField(min_value=0, max_value=100, required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    income_verified = serializers.BooleanField(required=False)
    employment_verified = serializers.BooleanField(required=False)
    references_checked = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if "score" in attrs and attrs["score"] is None:
            raise serializers.ValidationError(
                {"score": "Score must be between 0 and 100."}
            )
        return attrs
