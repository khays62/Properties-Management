# 05 - Workflows

## Rental application and screening

1. An applicant submits a rental application for a published listing. Submission is public and includes applicant details, a move-in date, and optional notes.
2. The API creates the applicant and application together. The move-in date must be today or later. An active application for the same listing and normalized applicant email is rejected.
3. An owner or assigned property manager moves a submitted application to `UNDER_REVIEW`.
4. The manager starts screening. The application moves to `SCREENING` and receives one `PENDING` screening.
5. The manager starts the screening, then records a `PASSED` or `FAILED` result, score, verification flags, and review metadata.
6. A screening-passed application may be approved. Applications in screening may be rejected with a required rejection reason.
7. Applications may be withdrawn while `SUBMITTED` or `UNDER_REVIEW`.

Application and screening records are visible only to owners of the related property and property managers with an active assignment. Anonymous applicants can submit applications but cannot access application or screening review data.
