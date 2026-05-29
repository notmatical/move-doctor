// GENERATED FILE — do not edit by hand. Run `bun run gen` to regenerate.
// Source of truth: every `defineRule` / `defineManifestRule` / `defineAstRule`
// under `src/rules/<bucket>/<rule>.ts`. Classification is by which `define*`
// the rule uses, so AST rules land in `astRules` automatically.

import type { AstRule, ManifestRule, Rule } from "core";

import { javadocStyleDocComment } from "./rules/conventions/javadoc-style-doc-comment.js";
import { moduleUsesBraceSyntax } from "./rules/conventions/module-uses-brace-syntax.js";
import { ungroupedPackageImports } from "./rules/conventions/ungrouped-package-imports.js";
import { unpackExplicitUnderscoreFields } from "./rules/conventions/unpack-explicit-underscore-fields.js";
import { useSelfOnly } from "./rules/conventions/use-self-only.js";
import { useSplitImport } from "./rules/conventions/use-split-import.js";
import { importStdStringUtf8 } from "./rules/idioms/import-std-string-utf8.js";
import { explicitFrameworkDep } from "./rules/conventions/explicit-framework-dep.js";
import { missingEdition2024 } from "./rules/conventions/missing-edition-2024.js";
import { unprefixedNamedAddress } from "./rules/conventions/unprefixed-named-address.js";
import { copyDropOnAsset } from "./rules/abilities/copy-drop-on-asset.js";
import { missingPhantomOnTypedReceipt } from "./rules/abilities/missing-phantom-on-typed-receipt.js";
import { capStructMissingSuffix } from "./rules/conventions/cap-struct-missing-suffix.js";
import { duplicateErrorCode } from "./rules/conventions/duplicate-error-code.js";
import { dynamicFieldKeyMissingSuffix } from "./rules/conventions/dynamic-field-key-missing-suffix.js";
import { errorConstNotEpascalcase } from "./rules/conventions/error-const-not-epascalcase.js";
import { eventNotPastTense } from "./rules/conventions/event-not-past-tense.js";
import { leftoverDebugPrint } from "./rules/conventions/leftover-debug-print.js";
import { nonErrorConstNotScreaming } from "./rules/conventions/non-error-const-not-screaming.js";
import { nonSnakeCaseFunction } from "./rules/conventions/non-snake-case-function.js";
import { potatoInTypeName } from "./rules/conventions/potato-in-type-name.js";
import { unusedConst } from "./rules/conventions/unused-const.js";
import { getterUsesGetPrefix } from "./rules/functions/getter-uses-get-prefix.js";
import { paramOrderCapSecond } from "./rules/functions/param-order-cap-second.js";
import { paramOrderObjectsFirst } from "./rules/functions/param-order-objects-first.js";
import { predicateNotBool } from "./rules/functions/predicate-not-bool.js";
import { publicEntryCombined } from "./rules/functions/public-entry-combined.js";
import { recursiveFunctionCall } from "./rules/functions/recursive-function-call.js";
import { transferInComposable } from "./rules/functions/transfer-in-composable.js";
import { getOrGetMutOnCollection } from "./rules/idioms/get-or-get-mut-on-collection.js";
import { manualOptionUnwrap } from "./rules/idioms/manual-option-unwrap.js";
import { moduleFnInsteadOfMethod } from "./rules/idioms/module-fn-instead-of-method.js";
import { vectorBorrowInsteadOfIndex } from "./rules/idioms/vector-borrow-instead-of-index.js";
import { manualVectorDestroyLoop } from "./rules/macros/manual-vector-destroy-loop.js";
import { manualWhileLoop } from "./rules/macros/manual-while-loop.js";
import { initNotPrivate } from "./rules/security/init-not-private.js";
import { mutUidAccessorLeak } from "./rules/security/mut-uid-accessor-leak.js";
import { publicShareOfCap } from "./rules/security/public-share-of-cap.js";
import { assertEqualityNotAssertEq } from "./rules/testing/assert-equality-not-assert-eq.js";
import { assertWithAbortCodeInTest } from "./rules/testing/assert-with-abort-code-in-test.js";
import { cleanupInExpectedFailure } from "./rules/testing/cleanup-in-expected-failure.js";
import { separateTestAndExpectedFailure } from "./rules/testing/separate-test-and-expected-failure.js";
import { testPrefixInTestsModule } from "./rules/testing/test-prefix-in-tests-module.js";
import { unnecessaryTestScenario } from "./rules/testing/unnecessary-test-scenario.js";
import { useTestUtilsDestroy } from "./rules/testing/use-test-utils-destroy.js";

// Regex/text rules — layout, comments, import lines, and `Move.toml` checks the
// parse tree can't express.
export const fileRules: readonly Rule[] = [
  javadocStyleDocComment,
  moduleUsesBraceSyntax,
  ungroupedPackageImports,
  unpackExplicitUnderscoreFields,
  useSelfOnly,
  useSplitImport,
  importStdStringUtf8,
];

export const manifestRules: readonly ManifestRule[] = [
  explicitFrameworkDep,
  missingEdition2024,
  unprefixedNamedAddress,
];

// AST rules — parsed once per file via the tree-sitter Move grammar.
export const astRules: readonly AstRule[] = [
  copyDropOnAsset,
  missingPhantomOnTypedReceipt,
  capStructMissingSuffix,
  duplicateErrorCode,
  dynamicFieldKeyMissingSuffix,
  errorConstNotEpascalcase,
  eventNotPastTense,
  leftoverDebugPrint,
  nonErrorConstNotScreaming,
  nonSnakeCaseFunction,
  potatoInTypeName,
  unusedConst,
  getterUsesGetPrefix,
  paramOrderCapSecond,
  paramOrderObjectsFirst,
  predicateNotBool,
  publicEntryCombined,
  recursiveFunctionCall,
  transferInComposable,
  getOrGetMutOnCollection,
  manualOptionUnwrap,
  moduleFnInsteadOfMethod,
  vectorBorrowInsteadOfIndex,
  manualVectorDestroyLoop,
  manualWhileLoop,
  initNotPrivate,
  mutUidAccessorLeak,
  publicShareOfCap,
  assertEqualityNotAssertEq,
  assertWithAbortCodeInTest,
  cleanupInExpectedFailure,
  separateTestAndExpectedFailure,
  testPrefixInTestsModule,
  unnecessaryTestScenario,
  useTestUtilsDestroy,
];
