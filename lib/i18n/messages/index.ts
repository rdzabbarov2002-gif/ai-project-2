import type { Locale } from "../config";
import { en, type Messages } from "./en";
import { ru } from "./ru";

export type { Messages };

/** Both dictionaries — small enough to ship to the browser whole. */
export const MESSAGES: Record<Locale, Messages> = { en, ru };
