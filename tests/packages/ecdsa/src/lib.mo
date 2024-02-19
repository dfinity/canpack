import Rust "canister:motoko_rust";

module {
  public func verify(address : Text, message : Text, signature : Text) : async Bool {
    await Rust.ecdsa_verify(address, message, signature);
  };
};
