/**
 * "1 generation", "2 генерации", "5 генераций" — the word form a number
 * takes in each language (English has two forms, Russian three).
 */
export interface PluralForms {
  one: string;
  few?: string;
  many?: string;
  other: string;
}

const rules = new Map<string, Intl.PluralRules>();

export function plural(locale: string, count: number, forms: PluralForms): string {
  let rule = rules.get(locale);
  if (!rule) {
    rule = new Intl.PluralRules(locale);
    rules.set(locale, rule);
  }
  const category = rule.select(count);
  const form =
    category === "one" ? forms.one : category === "few" ? (forms.few ?? forms.other) : category === "many" ? (forms.many ?? forms.other) : forms.other;
  return `${count} ${form}`;
}
