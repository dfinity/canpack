#[macro_export]
macro_rules! canpack {
    () => {
        #[ic_cdk::query]
        #[candid::candid_method(query)]
        pub fn canpack_example_hello(name: String) -> String {
            format!("Hello, {name}!")
        }
    };
}
