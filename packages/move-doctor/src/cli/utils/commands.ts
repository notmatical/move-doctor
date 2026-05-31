// Suggested commands surfaced in CLI hints. Standardized on `npx
// move-doctor@latest` so the copy-paste works whether or not the user has the
// package installed locally, matching the README.
const NPX = "npx move-doctor@latest";

export const CMD = {
  verbose: `${NPX} --verbose`,
  verboseHere: `${NPX} . --verbose`,
  install: `${NPX} install`,
  all: `${NPX} --all`,
} as const;

export const SUI_INSTALL_URL =
  "https://docs.sui.io/guides/developer/getting-started/sui-install";
