import Rust "../rust";

module {
    public func hello() : async Text {
        await Rust.hello();
    };
};
