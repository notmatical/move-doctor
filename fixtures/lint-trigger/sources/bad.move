module lint_trigger::bad;

public struct Thing has key, store {
    id: UID,
}

public fun mint_to_sender(ctx: &mut TxContext) {
    let thing = Thing { id: object::new(ctx) };
    transfer::transfer(thing, tx_context::sender(ctx));
}
