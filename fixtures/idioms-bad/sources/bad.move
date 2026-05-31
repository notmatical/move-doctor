module idioms_bad::bad;

use std::string::{String, utf8};
use sui::vec_map::VecMap;

public struct Thing has key, store {
    id: UID,
    count: u64,
}

// `public entry` combined → functions/public-entry-combined
public entry fun mint(ctx: &mut TxContext) {
    let thing = Thing { id: object::new(ctx), count: 0 };
    transfer::transfer(thing, tx_context::sender(ctx));
}

// transfer inside a composable function → functions/transfer-in-composable;
// tx_context::sender / transfer:: module calls → idioms/module-fn-instead-of-method
public fun mint_and_transfer(ctx: &mut TxContext) {
    let thing = Thing { id: object::new(ctx), count: 0 };
    transfer::transfer(thing, tx_context::sender(ctx));
}

// `get_` prefix getter → functions/getter-uses-get-prefix
public fun get_count(self: &Thing): u64 {
    self.count
}

// manual `while` loop → macros/manual-while-loop;
// vector:: module calls → idioms/module-fn-instead-of-method
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

// `.get(&key)` on a collection → idioms/get-or-get-mut-on-collection
public fun lookup(m: &VecMap<u64, u64>, key: u64): u64 {
    *m.get(&key)
}

// manual Option unwrap → idioms/manual-option-unwrap
public fun maybe_use(opt: Option<u64>): u64 {
    if (opt.is_some()) {
        opt.destroy_some()
    } else {
        0
    }
}

// `use std::string::utf8` → idioms/import-std-string-utf8
public fun named(): String {
    utf8(b"hello")
}
