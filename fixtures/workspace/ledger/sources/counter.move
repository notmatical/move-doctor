module ledger::counter;

public struct Counter has key, store {
    id: UID,
    value: u64,
}

public fun new(ctx: &mut TxContext): Counter {
    Counter { id: object::new(ctx), value: 0 }
}

public fun value(self: &Counter): u64 {
    self.value
}
