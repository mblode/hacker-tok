import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <div aria-label="Loading" className="animate-spin" role="status">
      <Loader2Icon className={cn("size-4", className)} {...props} />
    </div>
  );
}

export { Spinner };
