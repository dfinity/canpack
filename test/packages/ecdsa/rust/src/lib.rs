pub use ethers_core;

#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum Message {
    Data(Vec<u8>),
    Hash([u8; 32]),
}

impl From<Message> for RecoveryMessage {
    fn from(message: Message) -> Self {
        match message {
            Message::Data(d) => RecoveryMessage::Data(d),
            Message::Hash(h) => RecoveryMessage::Hash(h.into()),
        }
    }
}

#[macro_export]
macro_rules! canpack {
    () => {
        use std::str::FromStr;

        use $crate::ethers_core::types::{Address, RecoveryMessage, Signature};

        #[ic_cdk::query]
        #[candid_method(query)]
        pub fn ecdsa_verify(
            eth_address: String,
            message: $crate::Message,
            signature: String,
        ) -> bool {
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
