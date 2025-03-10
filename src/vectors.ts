export function setVectors(scope: HTMLElement | Document = document) {
  pauseAllAnimations(scope);


  (scope !== document ? scope.getAnimations({ subtree: true }) : scope.getAnimations()).forEach(animation => {
    const effect = animation.effect;
    const pseudo = effect?.pseudoElement;
    if (effect instanceof KeyframeEffect && pseudo?.startsWith("::view-transition-group")) {
      const group = pseudo.slice(24, -1);

      let from = effect.getKeyframes()[0]?.transform as string || "none";
      let to = effect.getKeyframes()[1]?.transform as string || "none";
      if (to === "none") {
        animation.currentTime = effect.getComputedTiming().endTime?.valueOf() as number ?? 0;
        to = window.getComputedStyle(scope instanceof HTMLElement ? scope : document.documentElement, pseudo).transform;
        animation.currentTime = 0;
      }
      if (from === "none") {
        from = window.getComputedStyle(scope instanceof HTMLElement ? scope : document.documentElement, pseudo).transform || "none";
      }
      const fromValues = from.match(/matrix\(([^)]+)\)/)?.[1]?.split(',').map(parseFloat);
      const toValues = to.match(/matrix\(([^)]+)\)/)?.[1]?.split(',').map(parseFloat);

      console.log(group, (toValues?.[4]||0)-(fromValues?.[4]||0), (toValues?.[5]||0)-(fromValues?.[5]||0));
    }
  });

  unPauseAllAnimations(scope);
}


function pauseAllAnimations(scope: HTMLElement | Document) {
  (scope !== document ? scope.getAnimations({ subtree: true }) : scope.getAnimations()).forEach(animation => {
    const effect = animation.effect;
    const pseudo = effect?.pseudoElement;
    if (effect instanceof KeyframeEffect && pseudo?.startsWith("::view-transition-group")) {
      animation.pause();
    }
  });
}

function unPauseAllAnimations(scope: HTMLElement | Document) {
  (scope !== document ? scope.getAnimations({ subtree: true }) : scope.getAnimations()).forEach(animation => {
    const effect = animation.effect;
    const pseudo = effect?.pseudoElement;
    if (effect instanceof KeyframeEffect && pseudo?.startsWith("::view-transition-group")) {
      animation.play();
    }
  });
}