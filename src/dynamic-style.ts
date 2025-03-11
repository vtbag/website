
const styleMap = new Map();
export function initStyles(name: string) {
  let styles = styleMap.get(name);
  if (!styles) {
    document.head.insertAdjacentHTML('beforeend', `<style id="vtbag-dynamic-styles-${name}"/>`);
    styleMap.set(name, styles = document.head.querySelector(`#vtbag-dynamic-styles-${name}`));
  }
  styles.innerHTML = '';
}
export function addStyle(name: string, rule: string) {
  styleMap.get(name).innerHTML += rule;
}
