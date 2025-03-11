
const styleMap = new Map(); let styles = document.head.querySelector('#vtbag-dynamic-styles') as HTMLStyleElement;
export function initStyles(name: string) {
  if (!styleMap.has(name)) {
    document.head.insertAdjacentHTML('beforeend', `<style id="vtbag-dynamic-styles-${name}"/>`);
    styleMap.set(name, document.head.querySelector(`#vtbag-dynamic-styles-${name}`));
  }
  styleMap.get(name).innerHTML = '';
}
export function addStyle(name: string, rule: string) {
  styleMap.get(name).innerHTML += rule;
}
