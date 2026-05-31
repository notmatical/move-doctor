// NOTE: this fixture intentionally does NOT compile. It is static-lint bait for
// rules that flag constructs the Move compiler itself rejects — move-doctor
// catches them on the AST (faster, security-framed, before a build even runs):
//   - `copy, drop` on a struct with a UID field → abilities/copy-drop-on-asset
//       (compiler: E05001 — UID lacks `copy`/`drop`)
//   - unused non-phantom type parameter         → abilities/missing-phantom-on-typed-receipt
//       (compiler: W09006 — unused type parameter)
//   - `public fun init`                         → security/init-not-private
//       (compiler: Sui E02003 — `init` must be internal)
//   - sharing a capability                      → security/public-share-of-cap (this call compiles)
module security_bad::bad;

public struct TokenCoin has copy, drop, store {
    id: UID,
    amount: u64,
}

public struct PaymentReceipt<CoinType> {
    amount: u64,
}

public struct AdminCap has key, store {
    id: UID,
}

public fun init(ctx: &mut TxContext) {
    let cap = AdminCap { id: object::new(ctx) };
    transfer::public_share_object(cap);
}
