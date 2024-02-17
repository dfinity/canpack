use std::str::FromStr;

use ethers_core::types::{Address, RecoveryMessage, Signature};

pub fn ecdsa_verify(eth_address: String, message: String, signature: String) -> bool {
    Signature::from_str(&signature)
        .unwrap()
        .verify(
            RecoveryMessage::Data(message.into_bytes()),
            Address::from_str(&eth_address).unwrap(),
        )
        .is_ok()
}

#[macro_export]
macro_rules! canpack {
    () => {
        #[ic_cdk::query]
        #[candid::candid_method(query)]
        fn ecdsa_verify(eth_address: String, message: String, signature: String) -> bool {
            $crate::ecdsa_verify(eth_address, message, signature)
        }
    };
}
