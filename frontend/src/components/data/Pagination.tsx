import { Button } from "../ui/Button";

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  className,
  onPageChange,
  page,
  pageSize,
  totalItems,
}: PaginationProps) {
  const itemCount = Math.max(0, totalItems);
  const totalPages =
    pageSize > 0 ? Math.ceil(itemCount / pageSize) : 0;
  const currentPage =
    totalPages > 0 ? Math.min(Math.max(page, 1), totalPages) : 0;
  const firstItem =
    currentPage > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const lastItem =
    currentPage > 0
      ? Math.min(currentPage * pageSize, itemCount)
      : 0;
  const firstVisiblePage = Math.max(
    1,
    Math.min(currentPage - 2, totalPages - 4),
  );
  const visiblePages = Array.from(
    { length: Math.min(totalPages, 5) },
    (_, index) => firstVisiblePage + index,
  );

  return (
    <nav
      aria-label="Pagination"
      className={["flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="text-sm text-text-secondary" aria-live="polite">
        Showing {firstItem}-{lastItem} of {itemCount}
        <span className="sr-only">
          . Page {currentPage} of {totalPages}.
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Go to previous page"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="text-text-secondary"
        >
          Previous
        </Button>
        <span className="px-2 text-sm text-text-secondary sm:hidden">
          Page {currentPage} of {totalPages}
        </span>
        <div className="hidden items-center gap-1 sm:flex">
          {visiblePages.map((pageNumber) => (
            <Button
              key={pageNumber}
              type="button"
              variant={pageNumber === currentPage ? "primary" : "ghost"}
              size="sm"
              aria-label={`Go to page ${pageNumber}`}
              aria-current={pageNumber === currentPage ? "page" : undefined}
              onClick={() => onPageChange(pageNumber)}
              className="min-w-9 px-2"
            >
              {pageNumber}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Go to next page"
          disabled={currentPage === 0 || currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="text-text-secondary"
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
