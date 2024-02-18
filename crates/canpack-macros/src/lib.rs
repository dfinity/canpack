use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, punctuated::Punctuated};

struct CanpackAttribute {
    rename: Option<String>,
    method_type: Option<String>,
    // is_init: bool,
}

fn get_lit_str(expr: &syn::Expr) -> std::result::Result<syn::LitStr, ()> {
    if let syn::Expr::Lit(expr) = expr {
        if let syn::Lit::Str(lit) = &expr.lit {
            return Ok(lit.clone());
        }
    }
    Err(())
}

fn get_canpack_attribute(meta_items: Vec<syn::Meta>) -> syn::Result<CanpackAttribute> {
    let mut attr = CanpackAttribute {
        rename: None,
        method_type: None,
    };
    for meta in meta_items {
        match &meta {
            syn::Meta::NameValue(m) if m.path.is_ident("rename") && attr.rename.is_none() => {
                if let Ok(lit) = get_lit_str(&m.value) {
                    attr.rename = Some(lit.value());
                }
            }
            syn::Meta::Path(p) if attr.method_type.is_none() => {
                let mode = p.get_ident().unwrap().to_string();
                match mode.as_ref() {
                    "query" | "composite_query" | "update" | "oneway" => {
                        attr.method_type = Some(mode);
                    }
                    // "init" => res.is_init = true,
                    _ => return Err(syn::Error::new_spanned(p, "unknown mode")),
                }
            }
            _ => {
                return Err(syn::Error::new_spanned(
                    meta,
                    "unknown or conflicting attribute",
                ))
            }
        }
    }
    Ok(attr)
}

#[proc_macro]
pub fn export(input: TokenStream) -> TokenStream {
    let fn_item = parse_macro_input!(input as syn::ItemFn);
    let functions = vec![fn_item]; // TODO

    let mut module_output = quote! {};
    let mut canpack_output = quote! {};
    for function in functions {
        // let attrs = match Punctuated::<Meta, Token![,]>::parse_terminated.parse(attr) {
        //     Ok(attrs) => attrs.into_iter().collect(),
        //     Err(e) => return e.to_compile_error().into(),
        // };
        
        // if let Some(meta) = function
        //     .attrs
        //     .iter()
        //     .find(|attr| attr.meta.path().is_ident("canpack"))
        // {
        //  let attribute = get_canpack_attribute   (attr)
        // }

        let fn_sig = &function.sig;
        let fn_name = &function.sig.ident;
        let fn_args = function
            .sig
            .inputs
            .iter()
            .map(|arg| {
                if let syn::FnArg::Typed(pat_type) = arg {
                    if let syn::Pat::Ident(id) = &*pat_type.pat {
                        return &id.ident;
                    }
                }
                unimplemented!("non-identifier pattern in function input args")
            })
            .collect::<Punctuated<_, syn::Token![,]>>();
        module_output = quote! {
            #module_output
            #function
        };
        canpack_output = quote! {
            #canpack_output
            #[ic_cdk::query]
            #[candid::candid_method(query)]
            #fn_sig {
                $crate::#fn_name(#fn_args)
            }
        }
    }
    let output = quote! {
        #module_output
        #[macro_export]
        macro_rules! canpack {
            () => {
                #canpack_output
            };
        }
    };
    output.into()
}
