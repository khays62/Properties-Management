import { Modal } from "../../../components/overlays/Modal";
import { Button } from "../../../components/ui/Button";
import type { ApplicationDetails } from "../types/application";

export interface ApplicationReviewModalProps {
  application: ApplicationDetails;
  open: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ApplicationReviewModal({
  application,
  isLoading = false,
  onClose,
  onConfirm,
  open,
}: ApplicationReviewModalProps) {
  const { applicant } = application;

  return (
    <Modal
      open={open}
      title="Review application"
      description="Confirm the applicant information before moving this submission into review."
      onClose={onClose}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={isLoading}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            isLoading={isLoading}
            onClick={onConfirm}
          >
            Move to review
          </Button>
        </>
      }
    >
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-text-secondary">Applicant</dt>
          <dd className="mt-1 font-medium">
            {applicant.first_name} {applicant.last_name}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-text-secondary">Email</dt>
          <dd className="mt-1 break-words font-medium">{applicant.email}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-secondary">Phone</dt>
          <dd className="mt-1 font-medium">{applicant.phone}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-secondary">Requested move-in</dt>
          <dd className="mt-1 font-medium">{application.move_in_date}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-sm text-text-secondary">Applicant notes</dt>
          <dd className="mt-1 whitespace-pre-wrap font-medium">
            {application.notes || "No notes provided."}
          </dd>
        </div>
      </dl>
    </Modal>
  );
}
