import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className, size = "default" }) {
  const sizes = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-10 w-10",
  };
  return <Loader2 className={cn("animate-spin text-primary", sizes[size], className)} />;
}

export function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

export function TableLoader({ colSpan = 6 }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center">
        <div className="flex justify-center">
          <Spinner />
        </div>
      </td>
    </tr>
  );
}

export function TableEmpty({ colSpan = 6, message = "No data available" }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center text-muted-foreground text-sm">
        {message}
      </td>
    </tr>
  );
}
