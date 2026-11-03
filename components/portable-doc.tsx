import { PortableDoc as CanonicalPortableDoc } from "@portable-doc/react";

import { embedBlocks } from "@portable-doc/react/embed";
import { fieldBlocks } from "@portable-doc/react/field-blocks";

import type { Block } from "@/lib/papers";

const renderers = { ...fieldBlocks, ...embedBlocks() };

/**
 * Preserve the starter's `blocks` prop and empty state while delegating every
 * non-empty document to PortableDoc's canonical React renderer.
 */
export function PortableDoc({ blocks }: { blocks: Block[] }) {
  if (!blocks.length) {
    return (
      <p className="text-sm text-zinc-400 italic">This paper has no content.</p>
    );
  }

  return <CanonicalPortableDoc value={blocks} blocks={renderers} />;
}
