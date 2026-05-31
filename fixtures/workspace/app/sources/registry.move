module app::registry;

public struct Registry has key, store {
    id: UID,
    total: u64,
}

public fun new(ctx: &mut TxContext): Registry {
    Registry { id: object::new(ctx), total: 0 }
}

// Manual `while` loop → macros/manual-while-loop (advisory).
public fun bump(self: &mut Registry, by: u64) {
    let mut i = 0;
    while (i < by) {
        self.total = self.total + 1;
        i = i + 1;
    };
}
