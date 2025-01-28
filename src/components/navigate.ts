type VtbagDataAttributes = {
  'data-vtbag-link-types': string|undefined;
};
type CamelCaseString<S extends string> = S extends `${infer P1}-${infer P2}${infer P3}`
  ? `${P1}${Uppercase<P2>}${CamelCaseString<P3>}`
  : S;

type CamelCase<T> = {
  [K in keyof T as K extends string ? CamelCaseString<K> : never]: T[K];
};
type NavigateAttributes = Partial<HTMLAnchorElement & VtbagDataAttributes & CamelCase<VtbagDataAttributes>>;

export function vtbagNavigate(attributes: NavigateAttributes) {

  const link = document.createElement('a');
  Object.keys(attributes).forEach(key => {
    const kebabKey = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    const value = attributes[key as keyof typeof attributes];
    if (value !== undefined) {
      link.setAttribute(kebabKey, "" + value);
    } else {
      link.removeAttribute(kebabKey);
    }
  });
  document.body.insertAdjacentElement('beforeend', link);
  link.click();
}


