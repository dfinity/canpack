import Rust "../rust";

module {
    public func verify() : async Text {
        await Rust.ecdsa_verify();
    };
};
