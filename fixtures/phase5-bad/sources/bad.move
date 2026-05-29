module phase5_bad::bad;

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
