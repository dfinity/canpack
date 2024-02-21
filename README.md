# `canpack` &nbsp; [![npm version](https://img.shields.io/npm/v/canpack.svg?logo=npm&color=default)](https://www.npmjs.com/package/canpack) [![GitHub license](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Canpack is a code generation tool which simplifies cross-language communication in [Internet Computer](https://internetcomputer.org/) canisters (such as calling a [Rust](https://www.rust-lang.org/) crate from [Motoko](https://github.com/dfinity/motoko)). This works by generating a separate canister from the host language, combining fragments defined across multiple libraries.

**Note:** This project is early in development; unannounced breaking changes may occur at any time.

## Installation

Ensure that the following software is installed on your system:
* [dfx](https://support.dfinity.org/hc/en-us/articles/10552713577364-How-do-I-install-dfx) (latest version)
* [Rust](https://www.rust-lang.org/tools/install) `>= 1.71`
* [Node.js](https://nodejs.org/en) `>= 16`

Run the following command to install the Canpack CLI on your global system path:

```
npm install -g canpack
```

## Quick Start (Motoko + Rust)

Canpack has built-in support for the [Mops](https://mops.one/) package manager. 

In your canister's `mops.toml` file, add a `rust-dependencies` section:

```toml
[rust-dependencies]
canpack-example-hello = "^0.1"
local-crate = { path = "path/to/local-crate" }
```

You can also specify `[rust-dependencies]` in a Motoko package's `mops.toml` file to include Rust crates in any downstream canisters.

Next, run the following command in the directory with the `mops.toml` and `dfx.json` files:

```bash
canpack
```

This will configure and generate a `motoko_rust` canister with Candid bindings for the specified dependencies. Here is a Motoko canister which uses a function defined in the [`canpack-example-hello`](https://docs.rs/canpack-example-hello/latest/src/canpack_example_hello/lib.rs.html) crate:

```motoko
import Rust "canister:motoko_rust";

actor {
    public composite query func hello(name: Text) : async Text {
        await Rust.canpack_example_hello(name)
    } 
}
```

Any Rust crate with Canpack compatibility can be specified as a standard [`Cargo.toml` dependency](https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html). See the [Rust Crates](#rust-crates) section for more details.

## Rust Crates

It's relatively simple to add Canpack support to any IC Wasm-compatible Rust crate.

Here is the full implementation of the [`canpack-example-hello`](https://docs.rs/canpack-example-hello/latest/src/canpack_example_hello/lib.rs.html) package:

```rust
canpack::export! {
    pub fn canpack_example_hello(name: String) -> String {
        format!("Hello, {name}!")
    }
}
```

If needed, you can configure the generated Candid method using a `#[canpack]` attribute:

```rust
canpack::export! {
    #[canpack(composite_query, rename = "canpack_example_hello")]
    pub fn hello(name: String) -> String {
        format!("Hello, {name}!")
    }
}
```

Note that it is possible to reference local constants, methods, etc.

```rust
const WELCOME: &str = "Welcome";

fn hello(salutation: &str, name: String) -> String {
    format!("{salutation}, {name}!")
}

canpack::export! {
    pub fn canpack_example_hello(name: String) -> String {
        hello(WELCOME, name)
    }
}
```

The `canpack::export!` shorthand requires adding [`canpack`](https://crates.io/crates/canpack) as a dependency in your Cargo.toml file. It's also possible to manually define Candid methods by exporting a `canpack!` macro:

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

## Advanced Usage

### `canpack.json`

Pass the `-v` or `--verbose` flag to view the resolved JSON configuration for a project:

```bash
canpack --verbose
```

Below is a step-by-step guide for setting up a `dfx` project with a `canpack.json` config file. The goal here is to illustrate how one could use Canpack without additional tools such as Mops, which is specific to the Motoko ecosystem. 

Run `dfx new my_project`, selecting "Motoko" for the backend and "No frontend canister" for the frontend. Once complete, run `cd my_project` and open in your editor of choice. 

Add a new file named `canpack.json` in the same directory as `dfx.json`. 

In the `canpack.json` file, define a Rust canister named `my_project_backend_rust`:

```json
{
    "canisters": {
        "my_project_backend_rust": {
            "type": "rust",
            "parts": [{
                "package": "canpack-example-hello",
                "version": "^0.1"
            }]
        }
    }
}
```

Next, run the following command in this directory to generate all necessary files: 

```bash
canpack
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

### Programmatic API

Canpack may be used as a low-level building block for package managers and other development tools. 

Add the `canpack` dependency to your Node.js project with the following command:

```bash
npm i --save canpack
```

The following example JavaScript code runs Canpack in the current working directory:

```js
import { canpack } from 'canpack';

const config = {
    verbose: true,
    canisters: {
        my_canister: {
            type: 'rust',
            parts: [{
                package: 'canpack-example-hello',
                version: '^0.1',
            }]
        }
    }
};

await canpack(config);
```