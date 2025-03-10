export function setVectors(scope: HTMLElement | Document = document) {
  pauseAllAnimations(scope);


  (scope !== document ? scope.getAnimations({ subtree: true }) : scope.getAnimations()).forEach(animation => {
    const effect = animation.effect;
    const pseudo = effect?.pseudoElement;
    if (effect instanceof KeyframeEffect && pseudo?.startsWith("::view-transition-group")) {
      const group = pseudo.slice(24, -1);

      console.log(group);

      animation.currentTime = effect.getComputedTiming().endTime?.valueOf() as number ?? 0;
      let styles = window.getComputedStyle(scope instanceof HTMLElement ? scope : document.documentElement, pseudo);
      console.log(styles.transform);

      animation.currentTime = 0;
      styles = window.getComputedStyle(scope instanceof HTMLElement ? scope : document.documentElement, pseudo);
      console.log(styles.transform);

      effect.getKeyframes().forEach((keyframe, index) => {console.log(index, keyframe.transform);});
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