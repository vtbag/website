document.documentElement.classList.add("vtbag-bar-loading", "vtbag-bar-new");

let timeout:any;
let width = -1;
export function addBar(first:number) {
  document.querySelector("#vtbag-bar-outer")?.remove();
  console.log("adding");
  document.body.insertAdjacentHTML(
    "afterbegin",
    `<div id="vtbag-bar-outer"><div id="vtbag-bar"><div id="vtbag-bar-inner"/></div></div>`
  );
  const timing = [
    10, 20, 30, 40, 50, 100, 90, 80, 70, 60, 50, 40, 20, 25, 30, 35, 40, 45,
    50, 55, 60, 65, 70, 75, 70, 65, 60, 55, 50, 45, 400, 35, 30, 25, 20, 20,
    20, 20, 20, 20, 200, 20, 20, 20, 20, 400, 20, 20, 20, 20, 200, 20, 20, 20,
    20, 30, 40, 50, 600, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170,
    180, 190, 200, 210, 220, 230, 240, 250, 260, 270, 280, 290, 300, 310, 320,
    330, 340, 350, 360, 370, 380, 390, 400, 410, 420, 430, 440, 450, 460, 470,
  ];
  timing[-1] = first;
  let step = -1;
  const f = () => {
    width += 1;
    console.log("width:", width);
    const bar = document.getElementById("vtbag-bar");
    if (bar) {
      bar.style.width = `${width}%`;
      if (timing[step] !== undefined) {
        console.log("waiting for", timing[step], "ms");
        clearTimeout(timeout);
        timeout = setTimeout(f, timing[step++]);
      }
      sessionStorage.setItem("vtbag-bar", ""+width);
    }
  };
  //f();
  return document.getElementById("vtbag-bar");
}

const storedWidth = () => ~~sessionStorage.getItem("vtbag-bar")!;

// @ts-expect-error
(window.navigation as EventTarget)?.addEventListener("navigate", (event) => {
  // @ts-expect-error
  const e = event as NavigateEvent;
  console.log("event:", "navigate", e);

  const back =
    e.navigationType === "traverse" &&
    // @ts-expect-error
    e.destination.index < window.navigation?.currentEntry.index;

  if (
    !e.downloadRequest &&
    e.userInitiated &&
    (!e.destination.sameDocument ||
      (!back && !e.hashChange) ||
    // @ts-expect-error
    (back && !new URL(window.navigation?.currentEntry.url).hash))
  ) {
    document.documentElement.classList.add("vtbag-bar-loading", "vtbag-bar-old");
    width = -1;
    addBar(0);
  }
});

addEventListener("DOMContentLoaded", (_e) =>
  stop("DOMContentloaded", storedWidth() !== 0)
);

function stop(where: string, extend: boolean) {
  console.log("stop", where, extend);
  clearTimeout(timeout);
  const bar = document.getElementById("vtbag-bar");
  if (bar) {
    if (extend) {
      bar.style.width = "100%";
      setTimeout(() => {
        document.documentElement.classList.remove(
          "vtbag-bar-loading",
          "vtbag-bar-freeze",
          "vtbag-bar-old",
          "vtbag-bar-new"
        );
        bar.parentElement?.remove();
      }, 200);
      return;
    }
    bar.parentElement?.remove();
  }
  document.documentElement.classList.remove(
    "vtbag-bar-loading",
    "vtbag-bar-freeze",
    "vtbag-bar-old",
    "vtbag-bar-new"
  );
}

["pageswap", "pagereveal"].forEach((event) =>
  addEventListener(event, (e) => {
    // @ts-expect-errork
    console.log("event:", event, e.viewTransition);
    // @ts-expect-error
    if (e.viewTransition) {
      let bar = document.getElementById("vtbag-bar");
      width = storedWidth();
      if (bar) {
        // pageswap
        if (width < 1) {
          stop("pageswap", false);
          return;
        }
        document.documentElement.classList?.add("vtbag-bar-freeze");
        width+=30;
        addBar(0);
      } else {
        // pagereveal
        if (width < 1) return;
        bar = addBar(0);
        // @ts-expect-error
        e.viewTransition.ready.then(() => stop("ready", true));
      }
    } else {
      stop("no viewTransition", false);
    }
  })
);
