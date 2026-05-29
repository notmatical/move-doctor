#[test_only]
module movebook_gaps::gaps_tests;

use sui::test_scenario;

#[test]
#[expected_failure]
fun unnecessary_cleanup() {
    let mut test = test_scenario::begin(@0);
    abort 0;
    test.end()
}

#[test]
fun uses_scenario_for_ctx_only() {
    let mut test = test_scenario::begin(@0);
    let _ctx = test.ctx();
    test.end()
}

#[test]
fun uses_destroy_for_testing() {
    let obj = make_obj();
    obj.destroy_for_testing()
}

fun make_obj(): u64 { 0 }
