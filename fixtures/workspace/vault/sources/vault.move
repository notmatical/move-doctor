module vault::vault;

public struct AdminCap has key, store {
    id: UID,
}

// Sharing a capability makes it world-accessible → security/public-share-of-cap
// (error severity). This compiles fine — it's a valid call that's a bad idea.
public fun grant(ctx: &mut TxContext) {
    let cap = AdminCap { id: object::new(ctx) };
    transfer::public_share_object(cap);
}
