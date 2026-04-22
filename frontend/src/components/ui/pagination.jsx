import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Server-side pagination component.
 * Props: page (1-based), totalPages, onPage(newPage)
 */
export function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
  const left = Math.max(1, page - delta);
  const right = Math.min(totalPages, page + delta);

  for (let i = left; i <= right; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {left > 1 && (
        <>
          <Button variant="outline" size="sm" className="h-8 w-8" onClick={() => onPage(1)}>1</Button>
          {left > 2 && <span className="px-1 text-muted-foreground">…</span>}
        </>
      )}

      {pages.map((p) => (
        <Button
          key={p}
          variant={p === page ? "default" : "outline"}
          size="sm"
          className="h-8 w-8"
          onClick={() => onPage(p)}
        >
          {p}
        </Button>
      ))}

      {right < totalPages && (
        <>
          {right < totalPages - 1 && <span className="px-1 text-muted-foreground">…</span>}
          <Button variant="outline" size="sm" className="h-8 w-8" onClick={() => onPage(totalPages)}>
            {totalPages}
          </Button>
        </>
      )}

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
