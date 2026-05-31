import {
  cancel,
  multiselect as clackMultiselect,
  select as clackSelect,
  isCancel,
} from "@clack/prompts";
import { isInteractive } from "./is-ci.js";

// Ctrl-C / Esc on any prompt aborts the whole run with the conventional 130.
const abort = (): never => {
  cancel("Cancelled.");
  process.exit(130);
};

export interface SelectChoice<T extends string> {
  description?: string;
  title: string;
  value: T;
}

interface SelectOptions<T extends string> {
  choices: SelectChoice<T>[];
  initial?: number;
  message: string;
}

// Single-question select. Returns the chosen value, or `null` when the
// environment is not interactive (CI, coding-agent, piped stdin) so callers can
// fall back to a sensible default. Cancellation exits the process.
export const select = async <T extends string>(
  options: SelectOptions<T>
): Promise<T | null> => {
  if (!isInteractive()) {
    return null;
  }
  const initialValue = options.choices[options.initial ?? 0]?.value;
  // clack's `Option` type is a conditional that only resolves to the
  // label-optional shape for a concrete primitive; calling it with `string`
  // (T extends string) sidesteps the deferred-conditional error, then we cast
  // the result back to the caller's narrower T.
  const result = await clackSelect<string>({
    message: options.message,
    options: options.choices.map((choice) => ({
      value: choice.value,
      label: choice.title,
      ...(choice.description ? { hint: choice.description } : {}),
    })),
    ...(initialValue === undefined ? {} : { initialValue }),
  });
  if (isCancel(result)) {
    abort();
  }
  return result as T;
};

export interface MultiSelectChoice<T extends string> {
  description?: string;
  disabled?: boolean;
  selected?: boolean;
  title: string;
  value: T;
}

interface MultiSelectOptions<T extends string> {
  choices: MultiSelectChoice<T>[];
  message: string;
  min?: number;
}

export const multiselect = async <T extends string>(
  options: MultiSelectOptions<T>
): Promise<T[] | null> => {
  if (!isInteractive()) {
    return null;
  }
  const initialValues = options.choices
    .filter((choice) => choice.selected)
    .map((choice) => choice.value);
  const result = await clackMultiselect<string>({
    message: options.message,
    options: options.choices.map((choice) => ({
      value: choice.value,
      label: choice.title,
      ...(choice.description ? { hint: choice.description } : {}),
      disabled: choice.disabled ?? false,
    })),
    initialValues,
    required: (options.min ?? 1) >= 1,
  });
  if (isCancel(result)) {
    abort();
  }
  return result as T[];
};
