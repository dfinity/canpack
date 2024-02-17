import Rust "canister:mo_rust";

import Blob "mo:base/Blob";

actor {
  public func hello(name : Text) : async Text {
    Rust.hello(name);
  };

  public func verify() : async Bool {
    await Rust.ecdsa_verify("0xc9b28dca7ea6c5e176a58ba9df53c30ba52c6642", "hello", "0x5c0e32248c10f7125b32cae1de9988f2dab686031083302f85b0a82f78e9206516b272fb7641f3e8ab63cf9f3a9b9220b2d6ff2699dc34f0d000d7693ca1ea5e1c");
  };
};
