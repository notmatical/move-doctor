# functions/transfer-in-composable

**Severity:** `info` &nbsp; **Bucket:** `functions` &nbsp; **Source:** [Move Book: Write Composable Functions for PTBs](https://move-book.com/guides/code-quality-checklist#write-composable-functions-for-ptbs)

## What this catches

A `public` (non-`entry`) function whose body contains `transfer::transfer(...)`. Public composable functions are meant to be chainable inside Programmable Transaction Blocks — but a function that hard-codes a transfer can't return its result to the next call in the chain.

## Trigger

```move
public fun mint_and_transfer(ctx: &mut TxContext) {
    let nft = NFT { id: object::new(ctx) };
    transfer::transfer(nft, ctx.sender());
}
```

The caller can't compose this function with anything downstream. They can't pass `nft` to a marketplace, can't wrap it, can't put it in a kiosk — the function unilaterally decides "this object goes to the sender."

## Fix

Split the composable concern (mint) from the side effect (transfer).

```move
// composable — returns the object
public fun mint(ctx: &mut TxContext): NFT {
    NFT { id: object::new(ctx) }
}

// intentionally non-composable — wraps mint with a transfer
entry fun mint_and_keep(ctx: &mut TxContext) {
    transfer::transfer(mint(ctx), ctx.sender());
}
```

The PTB call sites get a choice: chain `mint(...)` into something else, or call `mint_and_keep(...)` for the convenience path.

## How an agent should fix it

1. Read the function body. Identify what's being constructed and what's being transferred.
2. Refactor so the public function returns the constructed value(s).
3. If the existing transfer behavior is important to keep, add a sibling `entry` function that wraps the new composable + does the transfer.
4. Verify call sites — anywhere that used to call `public fun mint_and_transfer(ctx)` now needs to call either `mint_and_keep(ctx)` (entry) or chain `mint(ctx)` with `transfer::transfer(...)` explicitly.

## When this rule is wrong

This is `info` severity for a reason — the rule fires on **shape**, not **intent**. Some public functions intentionally do transfer (e.g. a `donate` function that takes money from the caller and sends it to a beneficiary). The rule will flag those too. In that case, either:

- Mark the function `entry` so it's clearly a side-effecting endpoint (the rule won't fire).
- Add a `#[lint_allow(...)]` comment if your toolchain supports it.

## Source

- Rule definition: [`packages/rules/src/rules/functions/transfer-in-composable.ts`](https://github.com/notmatical/move-doctor/blob/main/packages/rules/src/rules/functions/transfer-in-composable.ts)
- Canonical reference: [Move Book: Write Composable Functions for PTBs](https://move-book.com/guides/code-quality-checklist#write-composable-functions-for-ptbs)
