import { highlighter } from "core";
import prompts from "prompts";
import { isInteractive } from "./is-ci.js";

const POINTER =
  process.platform === "win32" && !process.env.WT_SESSION ? ">" : "›";

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

// Single-question select wrapper. Returns the chosen value, or `null` when:
//   - the environment is not interactive (CI, coding-agent, piped stdin)
//   - the user pressed Ctrl-C / Esc
// Callers fallback to a sensible non-interactive default.
export const select = async <T extends string>(
  options: SelectOptions<T>
): Promise<T | null> => {
  if (!isInteractive()) {
    return null;
  }
  const answer = await prompts(
    {
      type: "select",
      name: "value",
      message: options.message,
      choices: options.choices.map((choice) => ({
        title: choice.title,
        description: choice.description,
        value: choice.value,
      })),
      initial: options.initial ?? 0,
    },
    {
      onCancel: () => {
        process.stderr.write(
          `\n  ${highlighter.muted(POINTER)} Cancelled.\n\n`
        );
        process.exit(130);
      },
    }
  );
  return (answer.value as T | undefined) ?? null;
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
  hint?: string;
  message: string;
  min?: number;
}

export const multiselect = async <T extends string>(
  options: MultiSelectOptions<T>
): Promise<T[] | null> => {
  if (!isInteractive()) {
    return null;
  }
  const answer = await prompts(
    {
      type: "multiselect",
      name: "values",
      message: options.message,
      hint: options.hint ?? "- Space to toggle. Enter to confirm.",
      instructions: false,
      min: options.min ?? 1,
      choices: options.choices.map((choice) => ({
        title: choice.title,
        description: choice.description,
        value: choice.value,
        selected: choice.selected ?? false,
        disabled: choice.disabled ?? false,
      })),
    },
    {
      onCancel: () => {
        process.stderr.write(
          `\n  ${highlighter.muted(POINTER)} Cancelled.\n\n`
        );
        process.exit(130);
      },
    }
  );
  return (answer.values as T[] | undefined) ?? null;
};

export interface ConfirmOptions {
  initial?: boolean;
  message: string;
}

export const confirm = async (
  options: ConfirmOptions
): Promise<boolean | null> => {
  if (!isInteractive()) {
    return null;
  }
  const answer = await prompts(
    {
      type: "confirm",
      name: "value",
      message: options.message,
      initial: options.initial ?? true,
    },
    {
      onCancel: () => {
        process.stderr.write(
          `\n  ${highlighter.muted(POINTER)} Cancelled.\n\n`
        );
        process.exit(130);
      },
    }
  );
  return (answer.value as boolean | undefined) ?? null;
};
