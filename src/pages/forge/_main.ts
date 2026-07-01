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

const effects = [
  `        
        filter: saturate(2.5) brightness(1.2) hue-rotate(340deg);
        transform: skewX(-3deg);
      `,
  `
        filter: saturate(0.2) brightness(1.2) hue-rotate(190deg);
        transform: skewX(3deg);
      `,
  `  
        filter: saturate(3) brightness(1.2) contrast(1.3);
        transform: scaleY(0.5) scaleX(1.5) skewX(3deg);
      `,
  `
        filter: saturate(3) hue-rotate(90deg) brightness(1.3) contrast(1.2);
        transform: skewX(-3deg);
      `,
];
const shadows = [
  `box-shadow: inset 0 0 30px rgba(255, 0,0, 0.6), 0 0 20px rgba(255, 230, 200, 0.8);`,
  `box-shadow: inset 0 0 30px rgba(0, 210, 255, 0.6), 0 0 20px rgba(135, 206, 250, 0.8);`,
  `box-shadow: inset 0 0 30px rgba(0, 210, 255, 0.6), 0 0 20px rgba(135, 206, 250, 0.8);`,
  `box-shadow: inset 0 0 35px rgba(0, 210, 255, 0.6), 0 0 60px rgba(135, 206, 250, 0.8);`,
];
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
        const node = levelState.elements[levelState.elements.length - 1]!;
        elementImage.innerText = icon || node.icon;
        elementName.innerText = name || node.name;

      },
      types: ["shuffle"],
    },
    { useTypesPolyfill: "always", collisionBehavior: "chaining" },
  );
}
function passiveUpdateElement() {
  const node = levelState.elements[levelState.elements.length - 1]!;
  elementImage.innerText = node.icon;
  elementName.innerText = node.name;
}

async function initializeLevel() {
  styles.replaceSync(``);
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
  for (let i = 0; i < (reducedMotion() ? 1 : 4); i++) {
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
  styles.replaceSync(`
      ::view-transition-group(element) { 
        top: 0;
        left: 0;
      }`);
  mayStartViewTransition(
    {
      types: ["drag"],
    },
    { useTypesPolyfill: "always", collisionBehavior: "chaining", respectReducedMotion: false },
  ).finished.then(() => {
    styles.replaceSync(`
      ::view-transition-group(.element) { 
        top: 0px;
        left: 0px;
      }`);
  });
  levelState.elements.push(
    levelState.elements[levelState.elements.length - 1]!,
  );
}

function stopMove(event: PointerEvent) {
  if (!moveState.moving || event.pointerId !== moveState.pointerId)
    return;
  moveState.moving = false;
  moveState.pointerId = -1;
  disableGame();
  const current = levelState.elements.length - 1;
  const node = levelState.elements[current]!;
  if (
    node.name === "Invalid Reaction" ||
    node.name === levelState.elements[current - 1]?.name
  ) {
    levelState.elements.pop();
    passiveUpdateElement();
  }
  document.getAnimations().forEach((animation) => animation.play());
  if (reducedMotion()) {
    styles.replaceSync(`
      ::view-transition-group(.element) { 
        top: 0px;
        left: 0px;
      }`);
  } else {
    styles.replaceSync(`
      ::view-transition-group(.element) { 
        top: 0px;
        left: 0px;
        transition: top 0.3s cubic-bezier(0.4, 0, 0.2, 1), left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }`);
  }
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
  if (next !== -1) {
    levelState.elements[current] = data[levelState.tree]!.items[next]!;
    passiveUpdateElement();
  } else {
    levelState.elements[current] =
      where === -1
        ? levelState.elements[current - 1]!
        : {
          icon: "⛔",
          name: "Invalid Reaction",
          reactions: [],
          depth: 0,
          parent: -1,
        };
    passiveUpdateElement();
  }
  drag(top, left, where, distance);
  scrub(distance);
}

function scrub(distance: number) {
  document.getAnimations().forEach((animation) => {
    if (animation.effect?.pseudoElement?.startsWith(
      "::view-transition-new(element"
    ) ||
      animation.effect?.pseudoElement?.startsWith(
        "::view-transition-old(element"
      )) {
      animation.currentTime = Math.min(248, (distance - 0.5) * 240);
    }
  });
}

function drag(top: number, left: number, where: number, distance: number) {
  styles.replaceSync(`
      ::view-transition-group(.element) { 
        top: ${top}px;
        left: ${left}px;
      }
      ::view-transition-new(element) {${effects[where] ?? ""}}
      ::view-transition-new(element-image) {${effects[where] ?? ""}}
      ::view-transition-new(element) {${shadows[where] ?? ""}}
      ::view-transition-image-pair(.element) {
      scale: ${Math.min(2, 1 + distance / 2)};
      }`);
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
