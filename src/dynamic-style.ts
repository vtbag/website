
document.head.insertAdjacentHTML('beforeend', '<style id="vtbag-dynamic-styles"/>');
let styles = document.head.querySelector('#vtbag-dynamic-styles') as HTMLStyleElement;
export function initStyles() {
  styles.innerHTML = '';
}
export function addStyle(rule: string) {
  styles.innerHTML += rule;
}
