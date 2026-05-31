#[test_only]
module security_bad::bad_tests;

#[test]
#[expected_failure(abort_code = 0)]
fun test_failure_case() {
    abort 0
}

#[test]
fun test_basic() {
    let a = 1;
    let b = 1;
    assert!(a == b, 0);
    assert!(a == b);
}
