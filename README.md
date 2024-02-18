# `canpack` &nbsp;[![npm version](https://img.shields.io/npm/v/canpack.svg?logo=npm)](https://www.npmjs.com/package/canpack) [![GitHub license](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Canpack is a code generation tool which simplifies cross-language communication in [Internet Computer](https://internetcomputer.org/) canisters (such as calling a [Rust](https://www.rust-lang.org/) crate from [Motoko](https://github.com/dfinity/motoko)).

**Note:** This project is early in development; unannounced breaking changes may occur at any time.

## Prerequisites

Ensure that the following software is installed on your system:
* [`dfx`](https://support.dfinity.org/hc/en-us/articles/10552713577364-How-do-I-install-dfx) (latest version)
* [Rust](https://www.rust-lang.org/tools/install) `>= 1.71`
* [Node.js](https://nodejs.org/en) `>= 16`

## Quick Start (Mops)

Canpack has built-in support for the [Mops](https://mops.one/) package manager. 

In your `mops.toml` file, add a `rust-dependencies` section:

```toml
[rust-dependencies]
canpack-example-hello = "^0.0.1"
custom-package = { path = "path/to/custom-package" }
```

Next, run the following command in the directory with the `mops.toml` and `dfx.json` files.

```bash
npx canpack
```

This will configure and generate a `motoko_rust` canister with Candid bindings for the specified dependencies.

Any Rust crate with Canpack compatibility can be specified as a standard [Cargo.toml dependency](https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html). See the [Rust Crates](#rust-crates) section for more details.

## Programmatic API

Canpack is primarily intended as a low-level building block for use in package managers and other development tools. 

Add the `canpack` npm package to your Node.js project with the following command:

```bash
npm i --save canpack
```

The following example JavaScript code runs Canpack in the current working directory:

```js
import { canpack } from 'canpack';

const directory = '.';
const config = {
    canisters: {
        my_canister: {
            type: 'rust',
            parts: [{
                package: 'canpack-example-hello',
                version: '^0.0.1',
            }]
        }
    }
};

await canpack(directory, config);
```

## Advanced Usage

To create a new Motoko project, run `dfx new my_project`, selecting "Motoko" for the backend and "No frontend canister" for the frontend. Once complete, run `cd my_project` and open in your editor of choice. 

Add a new file named `canpack.json` (in the same directory as `dfx.json`). 

Define a Rust canister named `my_project_backend_rust` in your `canpack.json` file:

```json
{
    "canisters": {
        "my_project_backend_rust": {
            "type": "rust",
            "parts": [{
                "package": "canpack-example-hello",
                "version": "^0.0.1"
            }]
        }
    }
}
```

Next, run the following command in this directory to generate all necessary files: 

```bash
npx canpack
```

In your `dfx.json` file, configure the `"dependencies"` for the Motoko canister:

```json
{
    "canisters": {
        "my_project_backend": {
            "dependencies": ["my_project_backend_rust"],
            "main": "src/my_project_backend/main.mo",
            "type": "motoko"
        }
    },
}
```

Now you can call Rust functions from Motoko using a canister import:

```motoko
import Rust "canister:my_project_backend_rust";

actor {
    public func hello(name: Text) : async Text {
        await Rust.canpack_example_hello(name)
    } 
}
```

Run the following commands to build and deploy the `dfx` project on your local machine:

```
dfx start --background
dfx deploy
```

## Rust Crates

Add Canpack support to any IC Wasm-compatible Rust crate by exporting a top-level `canpack!` macro. 

For example (in your `lib.rs` file):

```rust
pub fn hello(name: String) -> String {
    format!("Hello, {name}!")
}

#[macro_export]
macro_rules! canpack {
    () => {
        #[ic_cdk::query]
        #[candid::candid_method(query)]
        fn canpack_example_hello(name: String) -> String {
            $crate::hello(name)
        }
    };
}
```
