use std::str::FromStr;

use ethers_core::types::{Address, RecoveryMessage, Signature};

canpack::export! {
    #[canpack(query, rename = "ecdsa_verify")]
    pub async fn verify(eth_address: String, message: String, signature: String) -> bool {
        Signature::from_str(&signature)
            .unwrap()
            .verify(
                RecoveryMessage::Data(message.into_bytes()),
                Address::from_str(&eth_address).unwrap(),
            )
            .is_ok()
    }
}
