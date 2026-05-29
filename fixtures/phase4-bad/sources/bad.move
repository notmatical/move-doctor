module phase4_bad::bad;

use std::string::utf8;
use sui::table::Table;

public struct Thing has key, store {
    id: UID,
    count: u64,
}

public entry fun mint(ctx: &mut TxContext): Thing {
    let thing = Thing { id: object::new(ctx), count: 0 };
    thing
}

public fun mint_and_transfer(ctx: &mut TxContext) {
    let thing = Thing { id: object::new(ctx), count: 0 };
    transfer::transfer(thing, tx_context::sender(ctx));
}

public fun get_count(self: &Thing): u64 {
    self.count
}

public fun increment(self: &mut Thing, by: u64) {
    let mut i = 0;
    while (i < by) {
        self.count = self.count + 1;
        i = i + 1;
    };

    let mut v = vector::empty();
    vector::push_back(&mut v, self.count);
    let _len = vector::length(&v);
}

public fun lookup(table: &Table<u64, u64>, key: u64): u64 {
    *table.get(&key)
}

public fun maybe_use(opt: Option<u64>): u64 {
    if (opt.is_some()) {
        opt.destroy_some()
    } else {
        0
    }
}

public fun named(): vector<u8> {
    utf8(b"hello")
}
