use proc_macro::TokenStream;
use quote::{quote, ToTokens};
use syn::{parse::Parser, parse_macro_input, punctuated::Punctuated, spanned::Spanned};

#[derive(Default)]
struct CanpackAttribute {
    rename: Option<String>,
    mode: Option<MethodMode>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum MethodMode {
    // Init,
    Query,
    // CompositeQuery,
    Update,
}

impl MethodMode {
    pub fn candid_mode(&self) -> &'static str {
        match self {
            // Self::Init => "init",
            Self::Query => "query",
            // Self::CompositeQuery => "composite_query",
            Self::Update => "update",
        }
    }

    pub fn ic_cdk_attr(&self) -> &'static str {
        match self {
            // Self::Init => "query",
            Self::Query => "query",
            // Self::CompositeQuery => "query",
            Self::Update => "update",
        }
    }
}

impl<'a> TryFrom<&'a str> for MethodMode {
    type Error = &'a str;

    fn try_from(mode: &'a str) -> Result<Self, Self::Error> {
        use MethodMode::*;
        Ok(match mode {
            // "init" => Init,
            "query" => Query,
            // "composite_query" => CompositeQuery,
            "update" => Update,
            _ => Err(mode)?,
        })
    }
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
        mode: None,
    };
    for meta in meta_items {
        match &meta {
            syn::Meta::NameValue(m) if m.path.is_ident("rename") && attr.rename.is_none() => {
                if let Ok(lit) = get_lit_str(&m.value) {
                    attr.rename = Some(lit.value());
                }
            }
            syn::Meta::Path(p) if attr.mode.is_none() => {
                let mode = p.get_ident().unwrap().to_string();
                attr.mode = Some(mode.as_str().try_into().map_err(|mode| {
                    syn::Error::new_spanned(meta, format!("unknown mode: {}", mode))
                })?)
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
    for mut function in functions {
        let (canpack_attrs, fn_attrs) = function
            .attrs
            .into_iter()
            .partition(|attr| attr.path().is_ident("canpack"));
        function.attrs = fn_attrs;

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

        let mut mode = MethodMode::Query;
        let mut fn_sig_rename = fn_sig.clone();
        for attr in canpack_attrs {
            let attrs = match Punctuated::<syn::Meta, syn::Token![,]>::parse_terminated
                .parse(attr.meta.to_token_stream().into())
            {
                Ok(attrs) => attrs.into_iter().collect(),
                Err(err) => return err.to_compile_error().into(),
            };
            let canpack_attr = match get_canpack_attribute(attrs) {
                Ok(attr) => attr,
                Err(err) => return err.to_compile_error().into(),
            };
            fn_sig_rename.ident = canpack_attr
                .rename
                .map(|id| syn::Ident::new(&id, attr.span()))
                .unwrap_or(fn_sig_rename.ident);
            mode = canpack_attr.mode.unwrap_or(mode);
        }

        let ic_cdk_attr_ident = syn::Ident::new(mode.ic_cdk_attr(), function.span());
        let candid_mode_ident = syn::Ident::new(mode.candid_mode(), function.span());

        module_output = quote! {
            #module_output
            #function
        };
        canpack_output = quote! {
            #canpack_output
            #[ic_cdk::#ic_cdk_attr_ident]
            #[candid::candid_method(#candid_mode_ident)]
            #fn_sig_rename {
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
