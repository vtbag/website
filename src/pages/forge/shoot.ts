import confetti from "canvas-confetti";

const defaults = {
  spread: 360,
  ticks: 150,
  gravity: 0,
  decay: 0.94,
  startVelocity: 30,
  colors: ["FFE400", "FFBD00", "E89400", "FFCA6C", "FDFFB8"],
};

function shoot() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  confetti({
    ...defaults,
    particleCount: 40,
    scalar: 1.2,
    shapes: ["star"],
  });

  confetti({
    ...defaults,
    particleCount: 10,
    scalar: 0.75,
    shapes: ["circle"],
  });
}

export function quickShot() {
  setTimeout(shoot, 0);
  setTimeout(shoot, 100);
  setTimeout(shoot, 200);
}
export function longShot() {
  setTimeout(shoot, 0);
  setTimeout(shoot, 50);
  setTimeout(shoot, 110);
  setTimeout(shoot, 180);
  setTimeout(shoot, 260);
  setTimeout(shoot, 350);
  setTimeout(shoot, 1000);
  setTimeout(shoot, 1250);
  setTimeout(shoot, 1500);
  setTimeout(shoot, 2500);
}