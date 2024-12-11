
export function cutSVG(element: Element, cutters:{element:HTMLElement,inset: string}[]) {
  if (!element) return;
  const masks = ['<rect width="100%" height="100%" fill="white" />'];
  const outerRect = element.getBoundingClientRect();
  cutters.forEach((cutter) => {
    const inner = cutter.element;
    const insets = cutter.inset.split(" ").map(parseFloat);
    for (let i = 0; i < 4; i++) {
      const len = insets.length;
      insets[i] = isNaN(insets[i] ?? 0)
        ? 0
        : (insets[len === 3 && i === 3 ? 2 : i % len] ?? 0);
    }
    const innerRect = inner.getBoundingClientRect();
    const innerStyle = getComputedStyle(inner);

    const left = parseFloat(innerStyle.borderLeftWidth);
    innerRect.width -=
      left +
      parseFloat(innerStyle.borderRightWidth) +
      insets[1]! +
      insets[3]!;
    innerRect.x += left + insets[3]!;
    const top = parseFloat(innerStyle.borderTopWidth);
    innerRect.height -=
      top +
      parseFloat(innerStyle.borderBottomWidth) +
      insets[0]! +
      insets[2]!;
    innerRect.y += top + insets[0]!;
    masks.push(
      `<rect x="${innerRect.x - outerRect.x}" y="${innerRect.y - outerRect.y}" width="${innerRect.width}" height="${innerRect.height}" fill="black" />`
    );
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outerRect.width}" height="${outerRect.height}">${masks.join("")}</svg>`;
  return svg;
}
