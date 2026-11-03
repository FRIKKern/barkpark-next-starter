import assert from "node:assert/strict";
import test from "node:test";
import {renderToStaticMarkup} from "react-dom/server";

import {PortableDoc} from "@/components/portable-doc";

test("the adapter preserves the starter empty state", () => {
  assert.equal(
    renderToStaticMarkup(<PortableDoc blocks={[]} />),
    '<p class="text-sm text-zinc-400 italic">This paper has no content.</p>',
  );
});

test("the adapter opts into field and embed blocks", () => {
  const html = renderToStaticMarkup(
    <PortableDoc
      blocks={[
        {type: "field-string", label: "Title", value: "Hello"},
        {type: "embed", target: "paper-1"},
      ]}
    />,
  );
  assert.doesNotMatch(html, /bp-unknown-block/);
  assert.match(html, /class="bp-field__v"><span>Hello/);
  assert.match(html, /class="paper-embed [^"]*" data-embed="paper-1"/);
});
