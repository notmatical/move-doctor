# abilities/copy-drop-on-asset

**Severity:** `error` &nbsp; **Bucket:** `abilities` &nbsp; **Source:** [Move Book: Key Ability](https://move-book.com/storage/key-ability)

## What this catches

A struct that has both `copy` and `drop` abilities **and** at least one asset-shaped field (`id: UID`, `Balance<T>`, or `Coin<T>`). This is one of the most common ability-related security mistakes in Sui Move.

## Trigger

```move
public struct TokenCoin has copy, drop, store {
    id: UID,
    amount: u64,
}
```

The `copy` ability lets the holder mint arbitrary additional copies of the asset. The `drop` ability lets it disappear silently. On an asset that represents real value, this is catastrophic.

## Fix

Assets get `key, store`. Snapshots (read-only computation values) get a separate type with `copy, drop`.

```move
// the actual asset
public struct TokenCoin has key, store {
    id: UID,
    balance: Balance<MY_TOKEN>,
}

// a copyable snapshot used for math, never persisted
public struct BalanceSnapshot has copy, drop {
    amount: u64,
}
```

## How an agent should fix it

1. Decide whether the struct is an asset (something with identity / value) or a snapshot (a derived computation value).
2. If asset: remove `copy` and `drop`. Replace any code that depended on those abilities with explicit object lifecycle (`object::new` / `object::delete`, transfer, share).
3. If snapshot: rename the type to make the intent obvious (`*Snapshot`, `*View`) and remove `id: UID`. Snapshots should never have a Sui object ID.
4. Re-run move-doctor — the error must go away. **Do not suppress this rule** without a written justification reviewed by another engineer.

## Why this is `error`

This is one of two move-doctor rules at error severity (the other is `security/public-share-of-cap`). Both correspond to real exploit classes that have shipped to mainnet in production protocols.

## Source

- Rule definition: [`packages/rules/src/rules/abilities/copy-drop-on-asset.ts`](https://github.com/notmatical/move-doctor/blob/main/packages/rules/src/rules/abilities/copy-drop-on-asset.ts)
- Canonical reference: [Move Book: Key Ability](https://move-book.com/storage/key-ability)
