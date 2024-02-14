import ECDSA "mo:ecdsa";

actor {
    public func hello() : async Text {
        ECDSA.verify()
    }
}
