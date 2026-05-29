module conventions_bad::bad;

/**
 * This is a JavaDoc-style block comment — should be flagged.
 */
public struct Admin has key, store {
    id: UID,
}

public struct PromisePotato {}

public struct DynamicField(u64, u64)

public struct RegisterUser has copy, drop {
    user: address,
}

const NOT_AUTHORIZED: u64 = 0;
const myConstant: vector<u8> = b"hello";

public fun do_thing() {
    event::emit(RegisterUser { user: @0x1 });
}
