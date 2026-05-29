# security/public-share-of-cap

**Severity:** `error` &nbsp; **Bucket:** `security` &nbsp; **Source:** [Move Book: Capability Pattern](https://move-book.com/programmability/capability)

## What this catches

Either of two patterns:

1. **Direct:** `transfer::public_share_object(AdminCap { ... })` or `transfer::share_object(NameCap { ... })`.
2. **Binding-then-share:** `let cap = NameCap { ... };` followed by `transfer::public_share_object(cap)` in the same function body.

`public_share_object` makes the target reachable to anyone who can call admin functions guarded by it. On a capability — a struct whose **whole purpose** is access control — this defeats the access control.

## Trigger

```move
public fun init(ctx: &mut TxContext) {
    let cap = AdminCap { id: object::new(ctx) };
    transfer::public_share_object(cap);   // ← anyone can now authorize as admin
}
```

## Fix

Capabilities go to a specific address, not to the shared pool.

```move
public fun init(ctx: &mut TxContext) {
    let cap = AdminCap { id: object::new(ctx) };
    transfer::transfer(cap, ctx.sender());   // only the deployer has it
}
```

If multiple parties need administrative power, mint multiple caps and transfer each to its intended owner. Never share one.

## How an agent should fix it

1. Confirm the struct really is a capability — its name ends with `Cap` and it gates authorization in some other function.
2. Replace `transfer::public_share_object(<name>)` with `transfer::transfer(<name>, ctx.sender())` for single-owner cases.
3. For multi-owner cases, mint N distinct cap objects and transfer each individually.
4. Re-run move-doctor; if the error remains, you missed a share site.
5. If the code is in `init`, also verify that no other place in the package re-mints or re-shares the cap.

## Real-world context

This is one of the **most damaging** capability mistakes in Sui Move, and a recurring finding in published audits. It usually slips through review because the share looks like "publishing the cap so the public can interact with the contract" — but interacting with a shared cap means *being able to use it*, not "the contract is now public."

## Source

- Rule definition: [`packages/rules/src/rules/security/public-share-of-cap.ts`](https://github.com/notmatical/move-doctor/blob/main/packages/rules/src/rules/security/public-share-of-cap.ts)
- Canonical reference: [Move Book: Capability Pattern](https://move-book.com/programmability/capability)
