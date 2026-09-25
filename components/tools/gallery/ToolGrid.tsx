import type { ToolListItem } from "@/lib/tools/types";
import { ToolCard } from "./ToolCard";

/** Pure layout — no state, no data fetching. Not a client component. */
export function ToolGrid({ tools }: { tools: ToolListItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
        <ToolCard key={tool.slug} tool={tool} />
      ))}
    </div>
  );
}
