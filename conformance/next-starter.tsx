import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Window } from "happy-dom";

import { PortableDoc } from "@/components/portable-doc";
import {
  MISSING,
  conform,
  counts,
  diffShapes,
  modeFromEnv,
  settle,
  shapeOf,
} from "./pack/conformance.mjs";

const PACK = new URL("./pack/goldens", import.meta.url).pathname;
const REPORT = new URL("./next-starter.json", import.meta.url).pathname;
const KNOWN_TYPES = new Set([
  "action",
  "asciicast",
  "byline",
  "callout",
  "code",
  "diagram",
  "divider",
  "eyebrow",
  "figure",
  "heading",
  "image",
  "ingress",
  "list",
  "paragraph",
  "pullquote",
  "section",
  "sheet",
  "table",
]);

function nodesOf(html: string): NodeList {
  const document = new Window().document;
  document.body.innerHTML = html;
  const wrapper = document.body.children.length === 1 ? document.body.firstElementChild : null;
  return (wrapper?.classList.contains("flex")
    ? wrapper.childNodes
    : document.body.childNodes) as unknown as NodeList;
}

function judge(golden: { type: string; input: unknown; expectedHtml: string }) {
  if (!KNOWN_TYPES.has(golden.type)) return MISSING;
  const actual = renderToStaticMarkup(
    createElement(PortableDoc, { blocks: [golden.input] } as never),
  );
  return diffShapes(shapeOf(nodesOf(actual)), shapeOf(nodesOf(golden.expectedHtml)));
}

async function main() {
  try {
    const report = await conform({
      renderer: "next-starter",
      compare: "dom",
      judge,
      pack: process.env.CONFORMANCE_PACK || PACK,
    });
    const problems = settle(report, { ...modeFromEnv(), path: REPORT });
    const result = counts(report);
    console.log(
      `next-starter: ${result.pass} pass, ${result.fail} fail, ${result.missing} missing, ${result.unchecked} unchecked of ${report.rows.length}`,
    );
    for (const problem of problems) console.error(problem);
    process.exitCode = problems.length ? 1 : 0;
  } catch (error) {
    console.error(`next-starter: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}

void main();
