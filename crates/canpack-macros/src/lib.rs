use proc_macro::TokenStream;
use proc_macro2::TokenStream as TokenStream2;
use quote::quote;
use syn::{punctuated::Punctuated, spanned::Spanned, Attribute};

#[derive(Default)]
struct CanpackAttribute {
    rename: Option<String>,
    mode: Option<MethodMode>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum MethodMode {
    // Init,
    Query,
    CompositeQuery,
    Update,
}

impl MethodMode {
    pub fn candid_mode(&self) -> TokenStream2 {
        match self {
            // Self::Init => "init",
            Self::Query => quote! {query},
            Self::CompositeQuery => quote! {composite_query},
            Self::Update => quote! {update},
        }
    }

    pub fn ic_cdk_attr(&self) -> TokenStream2 {
        match self {
            // Self::Init => "init",
            Self::Query => quote! {query},
            Self::CompositeQuery => quote! {query(composite = true)},
            Self::Update => quote! {update},
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
            "composite_query" => CompositeQuery,
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

fn parse_canpack_args(attr: &Attribute) -> syn::Result<Punctuated<syn::Meta, syn::Token![,]>> {
    Ok(attr
        .meta
        .require_list()?
        .parse_args_with(Punctuated::<syn::Meta, syn::Token![,]>::parse_terminated)?)
}

fn read_canpack_attribute(args: Vec<syn::Meta>) -> syn::Result<CanpackAttribute> {
    let mut attr = CanpackAttribute {
        rename: None,
        mode: None,
    };
    for meta in args {
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
            meta => {
                return Err(syn::Error::new_spanned(
                    meta,
                    format!("unknown or conflicting attribute: {}", quote! {#meta}),
                ))
            }
        }
    }
    Ok(attr)
}

#[proc_macro]
pub fn export(input: TokenStream) -> TokenStream {
    match export_macro(input) {
        Ok(output) => output,
        Err(err) => err.to_compile_error().into(),
    }
}

fn export_macro(input: TokenStream) -> syn::Result<TokenStream> {
    let input2: TokenStream2 = input.into();
    let module: syn::ItemMod = syn::parse(
        quote! {
            mod __canpack_mod {
                #input2
            }
        }
        .into(),
    )?;

    let mut module_output = quote! {};
    let mut canpack_output = quote! {};

    let mut functions = vec![];

    for item in module.content.unwrap().1 {
        if let syn::Item::Fn(function) = item {
            functions.push(function);
        } else {
            module_output = quote! {
                #module_output
                #item
            };
        }
    }
    for mut function in functions {
        let (canpack_attrs, fn_attrs) = function
            .attrs
            .into_iter()
            .partition(|attr| attr.path().is_ident("canpack"));
        function.attrs = fn_attrs;
        if canpack_attrs.len() > 1 {
            return Err(syn::Error::new_spanned(
                canpack_attrs.last().unwrap(),
                "more than one #[canpack] attribute on the same function",
            ));
        }

        let fn_sig = &function.sig;
        let fn_name = &function.sig.ident;
        let fn_args = function
            .sig
            .inputs
            .iter()
            .map(|arg| {
                if let syn::FnArg::Typed(pat_type) = arg {
                    if let syn::Pat::Ident(id) = &*pat_type.pat {
                        return Ok(&id.ident);
                    }
                }
                Err(syn::Error::new_spanned(
                    arg,
                    "non-identifier pattern in function args",
                ))
            })
            .collect::<syn::Result<Punctuated<_, syn::Token![,]>>>()?;

        let mut mode = MethodMode::Query;
        let mut fn_sig_rename = fn_sig.clone();

        for attr in canpack_attrs {
            let args = parse_canpack_args(&attr)?;
            let canpack_attr = read_canpack_attribute(args.clone().into_iter().collect())?;
            mode = canpack_attr.mode.unwrap_or(mode);
            fn_sig_rename.ident = canpack_attr
                .rename
                .map(|name| syn::Ident::new(&name, attr.span()))
                .unwrap_or(fn_sig_rename.ident);
        }

        let ic_cdk_attr = mode.ic_cdk_attr();
        let candid_mode = mode.candid_mode();

        module_output = quote! {
            #module_output
            #function
        };
        canpack_output = quote! {
            #canpack_output
            #[::ic_cdk::#ic_cdk_attr]
            #[::candid::candid_method(#candid_mode)]
            #fn_sig_rename {
                $crate::#fn_name(#fn_args)
            }
        };
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
    // Err(syn::Error::new_spanned(
    //     output.clone(),
    //     format!(">>>\n{}", quote! {#output}),
    // ))?;
    Ok(output.into())
}
