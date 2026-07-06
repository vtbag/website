import { mayStartViewTransition } from "@vtbag/utensil-drawer/may-start-view-transition";
import data from "./game-data.json";
import { quickShot, longShot } from "./shoot";

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const levelNumber = document.querySelector<HTMLSpanElement>("#level")!;
const message = document.querySelector<HTMLParagraphElement>("#message")!;
const targetName =
  document.querySelector<HTMLSpanElement>("#final-item")!;
const center = document.querySelector<HTMLDivElement>(".reactor-center")!;
const element = document.querySelector<HTMLDivElement>("#active-item")!;
const elementImage =
  element.querySelector<HTMLSpanElement>(".element-image")!;
const elementName =
  element.querySelector<HTMLSpanElement>(".element-name")!;
const resetButton =
  document.querySelector<HTMLButtonElement>("#reset-button")!;
const actionButton =
  document.querySelector<HTMLButtonElement>("#action-button")!;
const chambers = document.querySelectorAll<HTMLDivElement>(".chamber")!;
const breadcrumbs =
  document.querySelector<HTMLDivElement>(".breadcrumbs")!;

const styles = new CSSStyleSheet();
document.adoptedStyleSheets.push(styles);

const levelState = {
  level: 0,
  tree: 0,
  index: 0,
  random: Math.floor(Math.random() * data.length),
  elements: [data[0]!.items[0]!],
  disabled: true,
};

const moveState = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  moving: false,
  pointerId: -1,
  raf: 0,
  lastWhere: -2,
};

resetForge();

resetButton.addEventListener("click", resetForge);
actionButton.addEventListener("click", (event) => {
  if ((event.target as HTMLButtonElement).innerText === "NEXT LEVEL") {
    ++levelState.level;
    initializeLevel();
    actionButtonText("SHUFFLE");
    actionButtonRelocate();
  } else if (
    (event.target as HTMLButtonElement).innerText === "SHUFFLE"
  ) {
    levelState.random = Math.floor(Math.random() * data.length);
    initializeLevel();
  } else /* BACK */ {
    const last = breadcrumbs.lastElementChild as HTMLDivElement | null;
    if (!last) return;
    write("");
    element.style.viewTransitionName = "gone";
    last.style.viewTransitionName = "back";
    mayStartViewTransition(
      {
        update: () => {
          last.style.viewTransitionName = "";
          element.style.viewTransitionName = "back";
          levelState.elements.pop();
          passiveUpdateElement();
        },
        types: ["back"],
      },
      { useTypesPolyfill: "always", collisionBehavior: "chaining" },
    ).ready.then(() => (element.style.viewTransitionName = ""));
    levelState.elements.length > 2 || actionButtonText("SHUFFLE");
    updateBreadcrumbs();
  }
});


async function resetForge() {
  levelState.level = 1;
  await initializeLevel();
}

function turnElement(icon?: string, name?: string) {
  mayStartViewTransition(
    {
      update: () => {
        const last = levelState.elements.length - 1;
        const node = levelState.elements[last];
        elementImage.innerText = icon || node?.icon || elementImage.innerText;
        elementName.innerText = name || node?.name || elementName.innerText;

      },
      types: ["shuffle"],
    },
    { useTypesPolyfill: "always", collisionBehavior: "chaining" },
  );
}
function passiveUpdateElement() {
  const node = levelState.elements[levelState.elements.length - 1]!;
  elementImage.textContent = node.icon;
  elementName.textContent = node.name;
}

async function initializeLevel() {
  write("");
  disableGame();
  levelState.tree = (levelState.level + levelState.random) % data.length;
  while (data[levelState.tree]!.maxDepth <= levelState.level) {
    levelState.tree = (levelState.tree + 1) % data.length;
    if (
      levelState.tree ===
      (levelState.level + levelState.random) % data.length
    ) {
      levelState.elements.length = 0;
      turnElement("🏆", "You made it!");
      updateBreadcrumbs();
      write("No more levels available. Congratulations!");
      longShot();
      return;
    };
  }
  levelState.elements.length = 0;
  const level = data[levelState.tree]!;
  let slot = 0;
  for (let i = 0; i < (reducedMotion() ? 1 : 1); i++) {
    slot = ~~(Math.random() * level.items.length);
    while (level.items[slot]!.depth <= levelState.level) {
      slot = (slot + 1) % level.items.length;
    }
    actionButtonRelocate();
    actionButtonText("SHUFFLE");
    updateBreadcrumbs();
    updateTargetName(level.items[slot]!.name);
    turnElement(level.items[slot]!.icon, level.items[slot]!.name);
    updateLevel();
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  let start = data[levelState.tree]!.items[slot]!;
  for (let i = 0; i < levelState.level; ++i) {
    start = data[levelState.tree]!.items[start.parent]!;
    console.log(start.name);
  }
  levelState.elements.push(start);
  enableGame();
  turnElement();
}


function updateBreadcrumbs() {
  const breadcrumbs =
    document.querySelector<HTMLDivElement>(".breadcrumbs")!;
  mayStartViewTransition(
    {
      update: () => {
        breadcrumbs.innerHTML = "";
        const len = levelState.elements.length;
        const min = Math.max(0, len - 4);
        levelState.elements.forEach((node, idx) => {
          if (idx < min || idx === len - 1) return;
          const card = document.createElement("div");
          card.classList.add("element-card");
          const image = document.createElement("span");
          image.classList.add("element-image");
          image.innerText = node.icon;
          const name = document.createElement("span");
          name.classList.add("element-name");
          name.innerText = node.name;
          card.appendChild(image);
          card.appendChild(name);
          card.style.setProperty("--vtn", `card-${idx}`);
          breadcrumbs.appendChild(card);
        });
      }, types: ["breadcrumbs"]
    }, { useTypesPolyfill: "always", collisionBehavior: "chaining" }
  );
}

element?.addEventListener("pointerdown", startMove);
document.documentElement.addEventListener("pointermove", move);
document.documentElement.addEventListener("pointerup", stopMove);
document.documentElement.addEventListener("pointercancel", stopMove);

function startMove(event: PointerEvent) {
  if (levelState.disabled || moveState.moving) return;
  moveState.x = event.clientX;
  moveState.y = event.clientY;
  moveState.moving = true;
  moveState.pointerId = event.pointerId;
  moveState.lastWhere = -2;
  drag(0, 0, -1, 0);
  enableGame();
  const transition = mayStartViewTransition(
    {
      types: ["drag"],
    },
    { useTypesPolyfill: "always", collisionBehavior: "chaining", respectReducedMotion: false },
  );
  transition.ready.then(() => [...document.getAnimations()]
    .filter(animation => animation.effect?.pseudoElement?.startsWith("::view-transition"))
    .forEach((animation) => animation.pause()));
  transition.finished.finally(() => {
    styles.replaceSync("");
    turnElement();
  });
  levelState.elements.push(levelState.elements[levelState.elements.length - 1]!);
}

function stopMove(event: PointerEvent) {
  if (!moveState.moving || event.pointerId !== moveState.pointerId)
    return;
  moveState.moving = false;
  moveState.pointerId = -1;
  disableGame();
  let current = levelState.elements.length - 1;
  let node = levelState.elements[current]!;
  if (
    node.name === "Invalid Reaction" ||
    node.name === levelState.elements[current - 1]?.name
  ) {
    levelState.elements.pop();
    --current;
    node = levelState.elements[current]!;
  }
  document.documentElement.classList.add("back");
  if (!reducedMotion()) {
    styles.replaceSync(``);
  }
  drag(0, 0, -1, 0);

 document.getAnimations().forEach((animation) => animation.play());
  setTimeout(() => {
    document.getAnimations().forEach((animation) => animation.finish());
    document.documentElement.classList.remove("back");
  }, 300);

  updateBreadcrumbs();
  chambers.forEach((chamber) => chamber.classList.remove("selected"));
  write("");
  if (
    node.reactions[0] === -1 &&
    node.reactions[1] === -1 &&
    node.reactions[2] === -1 &&
    node.reactions[3] === -1
  ) {
    write("No more moves. Try to go back!", true);
  }
  if (elementName.innerText === targetName.innerText) {
    write("Congratulations! You've completed this level!");
    quickShot();
    actionButtonText("NEXT LEVEL");
    actionButtonRelocate(center);
    levelState.elements.length = 0;
    updateBreadcrumbs();
    return;
  }
  if (levelState.elements.length > 1) {
    actionButtonText("BACK");
  }
  enableGame();
}



function move(event: PointerEvent) {
  if (!moveState.moving || event.pointerId !== moveState.pointerId)
    return;
  moveState.top = event.clientY - moveState.y;
  moveState.left = event.clientX - moveState.x;
  moveState.raf || (moveState.raf = requestAnimationFrame(() => {
    work();
    moveState.raf = 0;
  }));
}

function work() {
  const { where, distance, top, left } = geometry(moveState.top, moveState.left);
  chambers.forEach((chamber) => chamber.classList.remove("selected"));
  if (where !== -1) {
    chambers[where]!.classList.add("selected");
  }
  const current = levelState.elements.length - 1;
  const next = levelState.elements[current - 1]?.reactions[where] ?? -1;
  levelState.elements[current] =
    next !== -1
      ? data[levelState.tree]!.items[next]!
      : where === -1
        ? levelState.elements[current - 1]!
        : {
          icon: "⛔",
          name: "Invalid Reaction",
          reactions: [-1, -1, -1, -1],
          depth: 0,
          parent: -1,
        };
  passiveUpdateElement();

  drag(top, left, where, distance);
  const time = (distance - 0.33) * 409;
  document.documentElement.style.setProperty("--extend", "" + Math.max(0, Math.min(1, time / 250)));
  scrub([
    "::view-transition-new(element)",
    "::view-transition-old(element)",
    "::view-transition-new(element-image)",
    "::view-transition-old(element-image)",
  ], time);
}

function scrub(pseudoElement: string | string[], time: number) {
  document.getAnimations().forEach((animation) => {
    if (Array.isArray(pseudoElement)) {
      if (pseudoElement.includes(animation.effect?.pseudoElement ?? "")) {
        animation.currentTime = time;
      }
    } else {
      if (animation.effect?.pseudoElement === pseudoElement) {
        animation.currentTime = time;
      }
    }
  });
}

function drag(top: number, left: number, where: number, distance: number) {
  document.documentElement.style.setProperty("--top", `${top}px`);
  document.documentElement.style.setProperty("--left", `${left}px`);
  document.documentElement.style.setProperty("--scale", `${Math.min(2, 1 + distance * 0.5)}`);

  document.documentElement.dataset.where = where === 0 ? "furnace" : where === 1 ? "freezing" : where === 2 ? "pressure" : where === 3 ? "radiation" : "";
  if (where !== moveState.lastWhere) {
    console.log("where", where, "lastWhere", moveState.lastWhere);
    moveState.lastWhere = where;
  }
}

function geometry(top: number, left: number) {
  const width = chambers[0]!.getBoundingClientRect().width;
  const quarter = width / 4;
  const distance = Math.sqrt(top * top + left * left) / width;
  if (distance > 1.2) {
    top /= distance / 1.2;
    left /= distance / 1.2;
  }
  const where = top > quarter && left > quarter
    ? 3
    : top > quarter && left < -quarter
      ? 2
      : top < -quarter && left > quarter
        ? 1
        : top < -quarter && left < -quarter
          ? 0
          : -1;
  return { where, distance, top, left };
}

function disableGame() {
  levelState.disabled = true;
  setTimeout(() => element.classList.toggle("disabled", true), reducedMotion() ? 0 : 125);
}
function enableGame() {
  levelState.disabled = false;
  setTimeout(() => element.classList.remove("disabled"), reducedMotion() ? 0 : 125);
}
function updateLevel() {
  mayStartViewTransition({
    update: () => {
      levelNumber.innerText = levelState.level.toString();
    }, types: ["level"]
  }, { useTypesPolyfill: "always", collisionBehavior: "chaining" });
}

function actionButtonRelocate(parent?: HTMLElement) {
  mayStartViewTransition(
    {
      update: () => {
        parent
          ? parent.insertAdjacentElement("afterbegin", actionButton)
          : resetButton.insertAdjacentElement("beforebegin", actionButton);
      },
      types: ["button"],
    },
    { useTypesPolyfill: "always", collisionBehavior: "chaining" },
  );
}

function actionButtonText(text: string) {
  if (actionButton.innerText === text) return;
  mayStartViewTransition(
    {
      update: () => {
        actionButton.innerText = text;
      },
      types: ["button"],
    },
    { useTypesPolyfill: "always", collisionBehavior: "chaining" },
  );
}

function write(text: string, error = false) {
  if (message.innerText === text) return;
  mayStartViewTransition(
    {
      update: () => {
        message.textContent = text;
        message.classList.toggle("error", error);
      },
      types: ["message"],
    },
    {
      collisionBehavior: "chaining",
      useTypesPolyfill: "always",
    },
  );
}
function updateTargetName(text: string) {
  if (targetName.innerText === text) return;
  mayStartViewTransition(
    {
      update: () => {
        targetName.innerText = text;
      },
      types: ["shuffle"],
    },
    {
      collisionBehavior: "chaining",
      useTypesPolyfill: "always",
    },
  );
}
