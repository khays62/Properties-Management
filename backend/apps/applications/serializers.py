from rest_framework import serializers

from apps.accounts.models import User

from .models import Applicant, RentalApplication, Screening


def user_display_name(user: User) -> str:
    return f"{user.first_name} {user.last_name}".strip() or user.email


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
    applicant_name = serializers.SerializerMethodField()
    listing_title = serializers.CharField(source="listing.title", read_only=True)

    @staticmethod
    def get_applicant_name(application: RentalApplication) -> str:
        applicant = application.applicant
        return (
            f"{applicant.first_name} {applicant.last_name}".strip()
            or applicant.email
        )

    class Meta:
        model = RentalApplication
        validators = []
        fields = (
            "id",
            "listing",
            "listing_title",
            "applicant",
            "applicant_name",
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
    application_label = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()

    @staticmethod
    def get_application_label(screening: Screening) -> str:
        application = screening.application
        applicant = application.applicant
        name = f"{applicant.first_name} {applicant.last_name}".strip()
        return f"{name or applicant.email} - {application.listing.title}"

    @staticmethod
    def get_reviewed_by_name(screening: Screening) -> str | None:
        if screening.reviewed_by is None:
            return None
        return user_display_name(screening.reviewed_by)

    class Meta:
        model = Screening
        fields = (
            "id",
            "application",
            "application_label",
            "score",
            "notes",
            "income_verified",
            "employment_verified",
            "references_checked",
            "status",
            "reviewed_by",
            "reviewed_by_name",
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
