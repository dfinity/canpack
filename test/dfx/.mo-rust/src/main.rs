// Generated

#![allow(unused_imports)]

#[ic_cdk::query]
#[candid::candid_method(query)]
pub fn get_dependencies() -> Vec<String> {
    vec!["ecdsa".to_string()]
}

ecdsa::setup_rust_canister!();

#[cfg(not(any(target_arch = "wasm32", test)))]
fn main() {
    candid::export_service!();
    std::print!("{}", __export_service());
}

#[cfg(any(target_arch = "wasm32", test))]
fn main() {}
