import { addStyle, initStyles } from "./dynamic-style";

export function setVectors(scope: HTMLElement | Document = document) {
  initStyles('vtbag-vectors');
  (scope !== document ? scope.getAnimations({ subtree: true }) : document.getAnimations()).forEach(animation => {
    const effect = animation.effect;
    const pseudo = effect?.pseudoElement;
    if (effect instanceof KeyframeEffect && pseudo?.startsWith("::view-transition-group")) {
      const group = pseudo.slice(24, -1);

      const frame = effect.getKeyframes();
      let from = frame[0]?.transform as string;
      let to = frame[1]?.transform as string;
      console.log(group, from, to)
      if (to === "none") {
        animation.currentTime = effect.getComputedTiming().endTime?.valueOf() as number ?? 0;
        to = window.getComputedStyle(scope instanceof HTMLElement ? scope : document.documentElement, pseudo).transform || "none";
        animation.currentTime = 0;
      }
      if (from === "none") {
        from = window.getComputedStyle(scope instanceof HTMLElement ? scope : document.documentElement, pseudo).transform || "none";
      }
      const fromValues = from.match(/matrix\(([^)]+)\)/)?.[1]?.split(',').map(parseFloat);
      const toValues = to.match(/matrix\(([^)]+)\)/)?.[1]?.split(',').map(parseFloat);


      addStyle('vtbag-vectors', `
        :root {
          --vtbag-vector-${group}-from-x: ${(fromValues?.[4] || 0)}px;
          --vtbag-vector-${group}-to-x: ${toValues?.[4] || 0}px;
          --vtbag-vector-${group}-from-y: ${(fromValues?.[5] || 0)}px;
          --vtbag-vector-${group}-to-y: ${toValues?.[5] || 0}px;
        }
        ::view-transition-group(${group}) {
          --vtbag-vector-from-x: ${(fromValues?.[4] || 0)}px;
          --vtbag-vector-to-x: ${toValues?.[4] || 0}px;
          --vtbag-vector-from-y: ${(fromValues?.[5] || 0)}px;
          --vtbag-vector-to-y: ${toValues?.[5] || 0}px;
        }`);
    }
  });
}