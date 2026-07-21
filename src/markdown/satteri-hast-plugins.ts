import { defineHastPlugin, type HastPluginInput } from "satteri";

export type ExternalLinkOptions = {
  target?: string;
  rel?: string;
  marker?: string;
};

function isExternalHref(href: unknown): href is string {
  if (typeof href !== "string") return false;
  return href.startsWith("http://") || href.startsWith("https://");
}

export function createExternalLinksPlugin(
  options: ExternalLinkOptions = {}
): HastPluginInput {
  const target = options.target ?? "_blank";
  const rel = options.rel ?? "noopener noreferrer";
  const marker = options.marker ?? "↗";

  return () =>
    defineHastPlugin({
      name: "vtbag-external-links",
      element: {
        filter: ["a"],
        visit(node, ctx) {
          const href = node.properties?.["href"];
          if (!isExternalHref(href)) return;

          ctx.setProperty(node, "target", target);
          ctx.setProperty(node, "rel", rel);

          const lastChild = node.children[node.children.length - 1];
          if (lastChild?.type === "text" && lastChild.value === marker) return;

          ctx.appendChild(node, { type: "text", value: marker });
        },
      },
    });
}