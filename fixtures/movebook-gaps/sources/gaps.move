module movebook_gaps::gaps {
    use sui::table;
    use sui::table::Table;
    use std::string::{Self};

    public struct Holder has key, store {
        id: UID,
        items: vector<u64>,
    }

    public fun authorize(cap: &AdminCap, app: &mut Holder) {
        let _ = cap;
        let _ = app;
    }

    public fun call_app(value: u8, app: &mut Holder, cap: &AdminCap, clock: &Clock, ctx: &mut TxContext) {
        let _ = (value, app, cap, clock, ctx);
    }

    public fun first(v: &vector<u64>): &u64 {
        vector::borrow(v, 0)
    }

    public fun consume(items: vector<Holder>) {
        let mut v = items;
        while (!v.is_empty()) {
            let h = vector::pop_back(&mut v);
            let Holder { id, items: _ } = h;
            id.delete();
        };
        v.destroy_empty()
    }
}
