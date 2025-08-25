/* Copyright (C) 2025 Pedro Henrique / phkaiser13
* File: lib.rs
* Description: This file contains the core logic of the unfollower tracker,
* written in Rust and compiled to WebAssembly (WASM). It exposes two main
* functions to the JavaScript environment: `find_unfollowers` and
* `serialize_followers_to_mpack`. The logic leverages HashSet for highly
* efficient O(n) list comparison, ensuring high performance even with thousands
* of followers. Data is serialized to and from the MessagePack format for
* compact and fast storage.
* SPDX-License-Identifier: Apache-2.0 */

use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use std::collections::HashSet;

// This function is called when the WASM module is instantiated.
// It sets up a hook to forward Rust's panic messages to the browser's console.
// This is invaluable for debugging.
#[wasm_bindgen(start)]
pub fn main() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Finds users who are in the old follower list but not in the new one.
///
/// This function is highly optimized. It deserializes the old follower list from
/// the efficient MessagePack format and converts it into a HashSet for O(1) average
/// time complexity lookups. It then iterates through the new follower list,
/// effectively calculating the difference between the two sets.
///
/// # Arguments
///
/// * `new_followers_js`: A `JsValue` from JavaScript, expected to be an array of strings
///   representing the latest list of followers.
/// * `old_followers_mpack`: A byte slice (`&[u8]`) containing the previous follower
///   list, serialized in MessagePack format.
///
/// # Returns
///
/// A `Result` containing either:
/// - `Ok(JsValue)`: A JavaScript array of strings with the usernames of the unfollowers.
/// - `Err(JsValue)`: A JavaScript error object if deserialization or processing fails.
#[wasm_bindgen]
pub fn find_unfollowers(new_followers_js: JsValue, old_followers_mpack: &[u8]) -> Result<JsValue, JsValue> {
    // Deserialize the old followers list from MessagePack bytes into a Rust Vec<String>.
    // If the input is empty (first run), initialize an empty vector.
    let old_followers: Vec<String> = if old_followers_mpack.is_empty() {
        Vec::new()
    } else {
        rmp_serde::from_slice(old_followers_mpack)
            .map_err(|e| JsValue::from_str(&format!("Failed to deserialize old followers: {}", e)))?
    };

    // Deserialize the new followers list from the JavaScript JsValue into a Rust Vec<String>.
    let new_followers: Vec<String> = serde_wasm_bindgen::from_value(new_followers_js)
        .map_err(|e| JsValue::from_str(&format!("Failed to deserialize new followers: {}", e)))?;

    // Convert the vectors into HashSets for efficient comparison.
    // This is the core performance optimization.
    let old_followers_set: HashSet<String> = old_followers.into_iter().collect();
    let new_followers_set: HashSet<String> = new_followers.into_iter().collect();

    // Calculate the difference. The result is an iterator of usernames that are
    // in the old set but not in the new set.
    let unfollowers: Vec<String> = old_followers_set
        .difference(&new_followers_set)
        .cloned()
        .collect();

    // Serialize the resulting vector of unfollowers back into a JsValue (JS array)
    // and return it.
    serde_wasm_bindgen::to_value(&unfollowers)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

/// Serializes a list of follower usernames into the MessagePack binary format.
///
/// This function takes a JavaScript array of strings, converts it into a Rust
/// `Vec<String>`, and then serializes it using `rmp_serde` into a compact
* `Vec<u8>`. This byte vector is then returned to JavaScript as a `Uint8Array`,
* ready to be stored using `chrome.storage.local`.
///
/// # Arguments
///
/// * `followers_js`: A `JsValue` from JavaScript, expected to be an array of strings.
///
/// # Returns
///
/// A `Result` containing either:
/// - `Ok(Vec<u8>)`: A byte vector (`Uint8Array` in JS) of the serialized data.
/// - `Err(JsValue)`: A JavaScript error object if the input is invalid or
///   serialization fails.
#[wasm_bindgen]
pub fn serialize_followers_to_mpack(followers_js: JsValue) -> Result<Vec<u8>, JsValue> {
    // Deserialize the JSValue into a Rust vector of strings.
    let followers: Vec<String> = serde_wasm_bindgen::from_value(followers_js)
        .map_err(|e| JsValue::from_str(&format!("Failed to deserialize followers for serialization: {}", e)))?;

    // Serialize the vector into MessagePack format.
    rmp_serde::to_vec(&followers)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize to MessagePack: {}", e)))
}