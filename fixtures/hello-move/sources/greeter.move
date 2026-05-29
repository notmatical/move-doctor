module hello_move::greeter;

use std::string::String;

public struct Greeter has key, store {
    id: UID,
    message: String,
}

public fun new(message: String, ctx: &mut TxContext): Greeter {
    Greeter { id: object::new(ctx), message }
}

public fun message(self: &Greeter): &String {
    &self.message
}
