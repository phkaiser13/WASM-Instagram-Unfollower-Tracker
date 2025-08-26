<!--
/* Copyright (C) 2025 Pedro Henrique / phkaiser13
* File: README.md
* Description: Main documentation for the WASM Instagram Unfollower Tracker project.
* It provides an overview, feature list, and detailed instructions for building,
* installing, and using the extension.
* SPDX-License-Identifier: Apache-2.0 */
-->

# WASM Instagram Unfollower Tracker

[![Build Status](https://github.com/phkaiser13/WASM-Instagram-Unfollower-Tracker/actions/workflows/build-release.yml/badge.svg)](https://github.com/phkaiser13/WASM-Instagram-Unfollower-Tracker/actions/workflows/build-release.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

A high-performance Chrome extension built with Rust and WebAssembly to track your Instagram unfollowers.

## Overview

This extension allows you to capture a snapshot of your followers at a given time. Later, you can take another snapshot, and the extension will efficiently compare the two lists to show you exactly who has unfollowed you.

The core logic for list comparison and data serialization is written in Rust and compiled to WebAssembly (WASM), ensuring maximum performance and minimal impact on browser responsiveness, even with tens of thousands of followers. Data is stored locally and efficiently in your browser using the MessagePack format.

## Features

-   **High-Performance:** Core logic in Rust/WASM for near-native speed.
-   **Efficient:** Uses `HashSet` data structures for O(n) list comparison.
-   **Compact Storage:** Follower lists are serialized to MessagePack, saving space.
-   **Secure & Private:** All data is processed and stored locally in your browser. Nothing is ever sent to a server.
-   **Simple UI:** A clean, no-frills interface to get the job done quickly.

## Prerequisites

To build this project from the source, you will need:

1.  **Rust Toolchain:** Install from [rustup.rs](https://rustup.rs/).
2.  **`wasm-pack`:** The tool for building Rust-generated WebAssembly.
    ```bash
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
    ```

## Building from Source

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/phkaiser13/WASM-Instagram-Unfollower-Tracker.git
    cd WASM-Instagram-Unfollower-Tracker
    ```

2.  **Build the WebAssembly module:**
    Navigate to the Rust crate directory and run the `wasm-pack` build command. This will compile the Rust code and place the necessary WASM and JavaScript wrapper files into the `extension/wasm` directory.
    ```bash
    cd rust_logic
    wasm-pack build --target web --out-dir ../extension/wasm
    ```

After this step, the `extension` directory is fully self-contained and ready to be loaded into Chrome.

## Installation

1.  Open Google Chrome and navigate to `chrome://extensions`.
2.  Enable **"Developer mode"** using the toggle switch in the top-right corner.
3.  Click the **"Load unpacked"** button that appears.
4.  In the file selection dialog, navigate to this project's directory and select the `extension` folder.
5.  The extension icon should now appear in your Chrome toolbar.

## How to Use

1.  Navigate to [instagram.com](https://www.instagram.com/) and log in.
2.  Go to your profile page.
3.  Click on your **"Followers"** count to open the list of followers in a modal window.
4.  Click the extension's icon in the Chrome toolbar to open the popup.
5.  Click the **"Check for Unfollowers"** button.
    -   **First Run:** The extension will scroll through your entire follower list, save it, and inform you that it has stored the initial snapshot.
    -   **Subsequent Runs:** The extension will fetch the new list, compare it against the previously saved one using WebAssembly, and display a list of any users who have unfollowed you. The new list will then be saved for the next check.

## Project Structure

```
.
├── .github/workflows/      # CI/CD workflow for automated builds and releases.
├── extension/              # The Chrome extension source files.
│   ├── wasm/               # (Generated) Compiled WASM and JS wrapper.
│   ├── content_script.js   # Injected into Instagram to scrape data.
│   ├── manifest.json       # Extension manifest file.
│   ├── popup.html          # The UI for the extension popup.
│   └── popup.js            # The main logic for the UI and WASM orchestration.
└── rust_logic/             # The Rust crate containing the core logic.
    ├── src/lib.rs          # The main Rust source file.
    └── Cargo.toml          # Rust project manifest.
```

## License

This project is licensed under the Apache License 2.0. See the `LICENSE` file for details.
