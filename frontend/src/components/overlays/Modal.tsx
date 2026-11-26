import { useEffect, useId, useRef, type ReactNode } from "react";

import { Button } from "../ui/Button";

export interface ModalProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  className?: string;
}

export function Modal({
  children,
  className,
  closeLabel = "Close dialog",
  description,
  footer,
  onClose,
  open,
  title,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;

    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={[
        "m-auto w-[min(42rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-card p-0 text-text-primary shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-6 py-5">
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          {description && (
            <div
              id={descriptionId}
              className="mt-1 text-sm text-text-secondary"
            >
              {description}
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={closeLabel}
          onClick={onClose}
          className="-mr-2 -mt-2 shrink-0"
        >
          <span aria-hidden="true">×</span>
        </Button>
      </div>
      <div className="px-6 py-5">{children}</div>
      {footer && (
        <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--color-border)] px-6 py-4">
          {footer}
        </div>
      )}
    </dialog>
  );
}
