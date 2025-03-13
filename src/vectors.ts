//import { addStyle, initStyles } from "./dynamic-style";

export function setVectors(scope: Document) {
  //const map = new Map<string, { x1: number, y1: number, x2: number, y2: number; }>();

  const fs: Keyframe[][] = [];
  scope.getAnimations().forEach(animation => {
    const effect = animation.effect;
    const pseudo = effect?.pseudoElement;
    if (effect instanceof KeyframeEffect && pseudo?.startsWith("::view-transition-group")) {
   //   const group = pseudo.slice(24, -1);

      fs.push(animation.effect!.getKeyframes());
    }
  });
  console.log(JSON.stringify(fs, null, 2));
}