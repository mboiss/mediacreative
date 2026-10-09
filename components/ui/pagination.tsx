"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

/**
 * Client-side pagination over an already-filtered list.
 * Jumps back to page 1 whenever `resetKey` changes (e.g. search text or filters).
 */
export function usePagination<T>(items: T[], resetKey: unknown = null, initialPageSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [items, currentPage, pageSize]
  );

  return { pageItems, page: currentPage, setPage, pageSize, setPageSize, totalPages, totalItems: items.length };
}

type PaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

const navButtonClass =
  "flex size-9 items-center justify-center rounded-control border border-line bg-surface text-fg transition hover:border-line-accent hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent";

export function Pagination({ page, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange }: PaginationProps) {
  if (totalItems === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3.5 text-sm text-fg-muted">
      <div>
        Showing{" "}
        <strong className="font-semibold text-fg">
          {from}–{to}
        </strong>{" "}
        of <strong className="font-semibold text-fg">{totalItems}</strong>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex items-center gap-1.5">
          Rows
          <select
            className="form-select h-9 rounded-control border border-line bg-inset py-1 pl-2.5 text-sm text-fg outline-none focus-visible:border-accent"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={navButtonClass}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="min-w-[4.5rem] text-center tabular-nums">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          className={navButtonClass}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
