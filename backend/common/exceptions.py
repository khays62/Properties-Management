from rest_framework.exceptions import APIException
from rest_framework import status


class ValidationErrorResponse(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid request."
    default_code = "validation_error"


class PermissionDeniedResponse(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Permission denied."
    default_code = "permission_denied"


class ConflictErrorResponse(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "The request conflicts with the current resource state."
    default_code = "conflict"
