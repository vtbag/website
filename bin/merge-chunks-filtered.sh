#!/usr/bin/env bash

set -euo pipefail

out_file="${1:-all-chunks-filtered.json}"
tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

find vtbag.dev -type f -name '*.json' -print0 \
  | xargs -0 jq -s '
      sort_by([(.metadata.headings // [] | join("\u001f")), (.metadata.sequence // 0)])
      | map({
          text: (.text
            | sub("^(?:[ \t]*#[^\n]*\n)+\n"; "")),
          metadata: {
            chunkUrl: .metadata.chunkUrl,
            sequence: .metadata.sequence
          }
        })
    ' > "$tmp_file"

mv "$tmp_file" "$out_file"
echo "Wrote $out_file"