import { mayStartViewTransition } from "@vtbag/utensil-drawer/may-start-view-transition";

const TITLES = [
  'Fix login redirect loop',
  'Redesign onboarding flow',
  'Update API rate limiter',
  'Refactor auth middleware',
  'Add CSV export endpoint',
  'Improve form validation errors',
  'Migrate icons to new set',
  'Polish dashboard empty states',
  'Set up Sentry alerting',
  'Write release notes for v2.3',
  'Audit color contrast in dark mode',
  'Optimize image lazy loading',
  'Add keyboard shortcuts to board',
  'Clean up unused dependencies',
  'Schedule social campaign for launch',
];

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Avery',
  'Quinn', 'Drew', 'Sasha', 'Reese', 'Cameron', 'Skylar', 'Parker', 'Logan',
];
const LAST_NAMES = [
  'Brooks', 'Carter', 'Reed', 'Hayes', 'Bennett', 'Morgan', 'Foster', 'Rivera',
  'Patel', 'Nguyen', 'Castillo', 'Owens', 'Tanaka', 'Walsh', 'Delgado', 'Kim',
];

const CATEGORIES = ['Bug', 'Frontend', 'Marketing'];

interface Priority {
  label: string;
  weight: number;
}

const PRIORITIES: Priority[] = [
  { label: '🟢 Low', weight: 3 },
  { label: '🟡 Medium', weight: 4 },
  { label: '🔴 High', weight: 2 },
  { label: '🟥 Critical', weight: 1 },
];

const CARD_COLORS = ['slate', 'blue', 'green', 'amber', 'rose'];

const AVATAR_COLORS = [
  '#2563eb', '#0891b2', '#7c3aed', '#16a34a', '#d97706',
  '#e11d48', '#4f46e5', '#0ea5e9', '#ea580c', '#9333ea',
];

const id = ({ min, max }: { min: number; max: number; }): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
const weighted = (arr: Priority[]): Priority => {
  const total = arr.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const x of arr) {
    r -= x.weight;
    if (r <= 0) return x;
  }
  return arr[0]!;
};

const randomDateWithin30Days = () => {
  const d = new Date();
  d.setDate(d.getDate() + id({ min: 0, max: 30 }));
  return d;
};

const formatDate = (d: Date): string =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const initials = (first: string, last: string): string =>
  `${first[0]}${last[0]}`.toUpperCase();

let nextId = 1000;


const moveState = {
  pointerId: -1,
  isMoving: false,
  raf: 0,
  initialX: 0,
  initialY: 0,
  card: null as HTMLElement | null,
  cardRect: null as DOMRect | null,
  cardRects: [] as { id: string, rect: DOMRect; }[],
  targetColumn: null as HTMLElement | null,
  targetCard: null as HTMLElement | null,
};


/**
 * Clones the card template, fills it with random values, and prepends it
 * to the top of the given column's card container.
 */
function createCard(columnSlug: string): void {
  const template = document.getElementById('card-template') as HTMLTemplateElement;
  const card = template.content.firstElementChild!.cloneNode(true) as HTMLElement;

  const cardId = ++nextId;
  const title = pick(TITLES);
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const category = pick(CATEGORIES);
  const priority = weighted(PRIORITIES).label;
  const color = pick(CARD_COLORS);
  const total = id({ min: 3, max: 8 });
  const done = id({ min: 0, max: total });
  const due = randomDateWithin30Days();

  card.setAttribute('data-color', color);
  card.id = `${cardId}`;
  card.querySelector<HTMLElement>('[data-field="id"]')!.textContent = `#${cardId}`;
  card.querySelector<HTMLElement>('[data-field="title"]')!.textContent = title;
  card.querySelector<HTMLElement>('[data-field="priority"]')!.textContent = priority;
  card.querySelector<HTMLElement>('[data-field="category"]')!.textContent = category;
  card.querySelector<HTMLElement>('[data-field="assignee"]')!.textContent = `${first} ${last}`;
  const avatar = card.querySelector<HTMLElement>('[data-field="avatar"]')!;
  avatar.textContent = initials(first, last);
  avatar.style.background = pick(AVATAR_COLORS);
  card.querySelector<HTMLElement>('[data-field="due"]')!.textContent = formatDate(due);
  card.querySelector<HTMLElement>('[data-field="fraction"]')!.textContent = `${done}/${total}`;
  card.querySelector<HTMLElement>('[data-field="bar"]')!.style.width = `${(done / total) * 100}%`;
  card.style.viewTransitionName = `card-${card.id}`;
  card.style.viewTransitionClass = 'card';

  const column = document.querySelector<HTMLElement>(`.column[data-column="${columnSlug}"]`);
  if (!column) {
    return;
  }

  const container = column.querySelector<HTMLElement>('[data-cards]')!;
  mayStartViewTransition({
    update: () => {
      container.insertAdjacentElement('afterbegin', card);
      const count = container.querySelectorAll('.task-card').length;
      column.querySelector<HTMLElement>('[data-count]')!.textContent = String(count);
    },
    types: ["insert"]
  }, { collisionBehavior: "chaining", useTypesPolyfill: "always" });
}


// --------------------------------------------


document.addEventListener('pointerdown', event => {
  if (moveState.isMoving) return;
  const card: HTMLElement | null = (event.target as HTMLElement).closest('.task-card');
  if (!card) return;

  initMoveState(card, event);
  setViewTransitionNames();
  drag(0, 0);

  mayStartViewTransition({
    types: ["move"],
    update: hideActiveCard
  }, { collisionBehavior: "chaining", useTypesPolyfill: "always" })
    .ready.then(() => {
      saveCardRects();
      pauseActiveCardAnimations();
    });


  function setViewTransitionNames() {
    document.querySelectorAll<HTMLElement>('main.board article.task-card').forEach(
      c => c.style.viewTransitionName = `card-${c.id}`);
    moveState.card!.style.viewTransitionName = 'active-card';
  }

  function hideActiveCard() {
    moveState.card!.style.height = "0px";
    moveState.card!.style.marginTop = "-0.75rem";
  };

  function saveCardRects() {
    moveState.cardRects = Array.from(document.querySelectorAll<HTMLElement>('main.board article.task-card'))
      .map(c => ({ id: c.id, rect: c.getBoundingClientRect() }));
  }

  function pauseActiveCardAnimations() {
    document.getAnimations().forEach(a => {
      if (a.effect?.pseudoElement?.endsWith("(active-card)")) {
        a.pause();
        a.currentTime = 0;
      }
    });
  }
});


document.addEventListener('pointermove', event => {
  if (!moveState.isMoving || event.pointerId !== moveState.pointerId) return;
  const top = event.clientY - moveState.initialY;
  const left = event.clientX - moveState.initialX;
  moveState.raf || (moveState.raf = requestAnimationFrame(() => {
    moveState.raf = 0;
    drag(top, left);
    markLandingZones(event);
  }));

});


document.addEventListener('pointerup', stop);
document.addEventListener('pointercancel', stop);

function stop(event: PointerEvent) {
  if (!moveState.isMoving || event.pointerId !== moveState.pointerId)
    return;
  updateMoveState();
  unmarkLandingZones();
  moveActiveCardToLastDragPosition(event);
  const oldColumn = moveState.card!.closest('.column') as HTMLElement;
  mayStartViewTransition({
    update: moveActiveCardToTargetPosition,
    types: ["finishing"]
  }, { collisionBehavior: "skipOld", useTypesPolyfill: "always" });

  function moveActiveCardToLastDragPosition(event: PointerEvent) {
    moveState.card!.style = '';
    moveState.card!.style.viewTransitionName = `active-card`;
    moveState.card!.style.position = 'fixed';
    moveState.card!.style.top = `${event.clientY - (moveState.initialY - moveState.cardRect!.top)}px`;
    moveState.card!.style.left = `${event.clientX - (moveState.initialX - moveState.cardRect!.left)}px`;
    moveState.card!.style.width = `${moveState.cardRect!.width}px`;
    moveState.card!.style.height = `${moveState.cardRect!.height}px`;
    moveState.card!.style.zIndex = '1';
  }

  function moveActiveCardToTargetPosition() {
    if (moveState.targetCard) {
      moveState.targetCard.insertAdjacentElement('beforebegin', moveState.card!);
    } else if (moveState.targetColumn) {
      moveState.targetColumn.querySelector<HTMLElement>('[data-cards]')!.insertAdjacentElement('beforeend', moveState.card!);
    }
    updateCardCounts();
    moveState.card!.style = '';
    moveState.card!.style.viewTransitionName = `active-card`;
    document.documentElement.style.removeProperty("--top");
    document.documentElement.style.removeProperty("--left");

    moveState.targetColumn = null;
    moveState.targetCard = null;

    function updateCardCounts() {
      if (moveState.targetColumn) {
        moveState.targetColumn.querySelector<HTMLElement>('[data-count]')!.textContent = String(moveState.targetColumn.querySelectorAll('.task-card').length);
        oldColumn!.querySelector<HTMLElement>('[data-count]')!.textContent = String(oldColumn!.querySelectorAll('.task-card').length);
      }
    }
  }
}

//--------------------------------------------

function initMoveState(card: HTMLElement, event: PointerEvent) {
  moveState.isMoving = true;
  moveState.pointerId = event.pointerId;
  moveState.card = card;
  moveState.initialX = event.clientX;
  moveState.initialY = event.clientY;
  moveState.cardRect = card.getBoundingClientRect();
};

function updateMoveState() {
  moveState.isMoving = false;
  moveState.pointerId = -1;
}

//--------------------------------------------

function markLandingZones(event: PointerEvent) {
  document.querySelectorAll('main.board .landing').forEach(el => el.classList.remove('landing'));
  moveState.targetColumn = null;
  moveState.targetCard = hovered(event);
  if (moveState.targetCard) {
    moveState.targetCard.classList.add('landing');
  } else {
    moveState.targetColumn = here(event, 'main.board .column');
    moveState.targetColumn?.classList.add('landing');
  }
}
function unmarkLandingZones() {
  document.querySelectorAll('main.board .landing').forEach(el => el.classList.remove('landing'));
}

//--------------------------------------------

function here(event: { clientX: number, clientY: number; }, selector: string) {
  const stack = document.elementsFromPoint(event.clientX, event.clientY);
  return stack.find(el => el.matches(selector)) as HTMLElement | null;
}

function hovered(event: PointerEvent): HTMLElement | null {
  const found = moveState.cardRects.find((c) =>
    event.clientX >= c.rect.left &&
    event.clientX <= c.rect.right &&
    event.clientY >= c.rect.top &&
    event.clientY <= c.rect.bottom
  );
  return found ? document.getElementById(found.id) : null;
}

//--------------------------------------------

function drag(top: number, left: number) {
  document.documentElement.style.setProperty("--top", `${top}px`);
  document.documentElement.style.setProperty("--left", `${left}px`);
}

// --------------------------------------------

function init() {
  setTimeout(() => createCard('backlog'), Math.random() * 1000);
  setTimeout(() => createCard('backlog'), Math.random() * 1500);
  setTimeout(() => createCard('backlog'), Math.random() * 2500);
  setTimeout(() => createCard('backlog'), Math.random() * 2500);
  setTimeout(() => createCard('backlog'), Math.random() * 2500);
  setTimeout(() => createCard('backlog'), Math.random() * 3000);
}
init();