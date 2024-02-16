pub use ethers_core;

#[macro_export]
macro_rules! setup_rust_canister {
    () => {
        use std::str::FromStr;

        use candid::candid_method;
        use $crate::ethers_core::types::{Address, RecoveryMessage, Signature};

        #[ic_cdk::query]
        #[candid_method(query)]
        pub fn ecdsa_verify(eth_address: String, message: String, signature: String) -> bool {
            Signature::from_str(&signature)
                .unwrap()
                .verify(
                    RecoveryMessage::Data(message.into_bytes()),
                    Address::from_str(&eth_address).unwrap(),
                )
                .is_ok()
        }
    };
}
