import { useState, useEffect } from "react";

const DEFAULT_PAGE_SIZE = 8;

/**
 * Hook — returns a paginated slice of `data` plus controls.
 * Automatically resets to page 1 whenever the data array reference changes.
 */
export function usePagination(data, pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);

  // Reset to first page when the underlying dataset changes
  useEffect(() => {
    setPage(1);
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  // Clamp current page in case data shrinks
  const safePage = Math.min(page, totalPages);
  const paged = data.slice((safePage - 1) * pageSize, safePage * pageSize);

  return { paged, page: safePage, setPage, totalPages };
}

/**
 * Paginator — renders prev/next + numbered page buttons with ellipsis.
 * Renders nothing when totalPages <= 1.
 */
export default function Paginator({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;

  // Build a smart list: always show first, last, current ±1, with "..." gaps
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("ellipsis-start");
    const from = Math.max(2, page - 1);
    const to = Math.min(totalPages - 1, page + 1);
    for (let i = from; i <= to; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("ellipsis-end");
    pages.push(totalPages);
  }

  return (
    <div className="paginator">
      <button
        className="pag-btn"
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        ‹
      </button>

      {pages.map((p) =>
        typeof p === "string" ? (
          <span key={p} className="pag-ellipsis">…</span>
        ) : (
          <button
            key={p}
            className={`pag-btn${p === page ? " pag-active" : ""}`}
            onClick={() => onPage(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        )
      )}

      <button
        className="pag-btn"
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}
