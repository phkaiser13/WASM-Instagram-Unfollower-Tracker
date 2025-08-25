/* Copyright (C) 2025 Pedro Henrique / phkaiser13
* File: popup.js
* Description: This script serves as the main controller for the extension's
* popup UI. It handles user interactions, loads the Rust/WASM module,
* communicates with the Chrome Extension APIs (storage, scripting), and
* orchestrates the entire unfollower check process. It follows a modern
* async/await pattern for clean, readable, and non-blocking operations.
* SPDX-License-Identifier: Apache-2.0 */

// Wait for the DOM to be fully loaded before running the script.
document.addEventListener('DOMContentLoaded', () => {
    // Get references to all necessary DOM elements.
    const checkButton = document.getElementById('check-button');
    const statusElement = document.getElementById('status');
    const unfollowersList = document.getElementById('unfollowers-list');

    // The main entry point is an async function to allow for top-level await
    // of the WASM module.
    async function main() {
        try {
            // Dynamically import the WASM module. The bundler (wasm-pack) creates
            // this JS file as a wrapper around the .wasm binary.
            const { find_unfollowers, serialize_followers_to_mpack } = await import('./wasm/unfollower_logic.js');

            // Attach the primary event listener to the button.
            checkButton.addEventListener('click', () => handleCheck(find_unfollowers, serialize_followers_to_mpack));
            
            console.log("WASM module loaded successfully. Ready.");

        } catch (error) {
            console.error("Fatal Error: Failed to load WASM module.", error);
            updateStatus("Error: Could not load core logic. Please reload the extension.", true);
            checkButton.disabled = true;
        }
    }

    /**
     * Orchestrates the entire check process when the button is clicked.
     * @param {Function} findUnfollowers - The imported WASM function.
     * @param {Function} serializeFollowers - The imported WASM function.
     */
    async function handleCheck(findUnfollowers, serializeFollowers) {
        checkButton.disabled = true;
        unfollowersList.innerHTML = '';
        updateStatus("Starting check...");

        try {
            // 1. Get the active Instagram tab.
            const tab = await getActiveInstagramTab();
            if (!tab) {
                updateStatus("Error: Not on an Instagram page.", true);
                return;
            }

            // 2. Get the previously stored follower list from Chrome's local storage.
            updateStatus("Loading previous follower list...");
            const oldFollowersData = await chrome.storage.local.get(['latestFollowersMpack']);
            const oldFollowersMpack = oldFollowersData.latestFollowersMpack ? new Uint8Array(Object.values(oldFollowersData.latestFollowersMpack)) : new Uint8Array();

            // 3. Inject the content script to get the current list of followers.
            updateStatus("Fetching current followers from page...");
            const newFollowers = await fetchFollowersFromPage(tab.id);
            if (!newFollowers || newFollowers.length === 0) {
                updateStatus("Error: Could not fetch followers. Is the followers modal open?", true);
                return;
            }
            updateStatus(`Found ${newFollowers.length} current followers.`);

            // 4. If it's the first run, just save the list and inform the user.
            if (oldFollowersMpack.length === 0) {
                updateStatus("First run. Saving current follower list...");
                const newMpack = serializeFollowers(newFollowers);
                await chrome.storage.local.set({ latestFollowersMpack: newMpack });
                updateStatus(`Saved ${newFollowers.length} followers. Run again later to compare.`);
                return;
            }

            // 5. Core Logic: Call the high-performance WASM function to find the difference.
            updateStatus("Comparing lists using WebAssembly...");
            const unfollowers = findUnfollowers(newFollowers, oldFollowersMpack);
            
            // 6. Display the results.
            displayUnfollowers(unfollowers);

            // 7. CRITICAL: Update the stored list to the new list for the next check.
            updateStatus("Comparison complete. Saving latest list...");
            const newMpack = serializeFollowers(newFollowers);
            await chrome.storage.local.set({ latestFollowersMpack: newMpack });
            updateStatus(`Process finished. Found ${unfollowers.length} unfollower(s).`);

        } catch (error) {
            console.error("An error occurred during the check:", error);
            updateStatus(`Error: ${error.message}`, true);
        } finally {
            checkButton.disabled = false;
        }
    }

    /**
     * Injects and executes the content script to scrape follower usernames.
     * @param {number} tabId - The ID of the tab to inject the script into.
     * @returns {Promise<string[]>} A promise that resolves to an array of usernames.
     */
    async function fetchFollowersFromPage(tabId) {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content_script.js'],
        });
        // The result is an array of injection results. We expect one result from our single injection.
        return results[0]?.result;
    }

    /**
     * Finds the active tab and ensures it's an Instagram page.
     * @returns {Promise<chrome.tabs.Tab|null>} A promise resolving to the tab object or null.
     */
    async function getActiveInstagramTab() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0 && tabs[0].url.includes("instagram.com")) {
            return tabs[0];
        }
        return null;
    }

    /**
     * Renders the list of unfollowers in the UI.
     * @param {string[]} unfollowers - An array of usernames.
     */
    function displayUnfollowers(unfollowers) {
        unfollowersList.innerHTML = ''; // Clear previous results
        if (unfollowers.length === 0) {
            const li = document.createElement('li');
            li.textContent = "No new unfollowers found. 🎉";
            unfollowersList.appendChild(li);
        } else {
            unfollowers.forEach(username => {
                const li = document.createElement('li');
                li.textContent = username;
                unfollowersList.appendChild(li);
            });
        }
    }

    /**
     * Updates the status message shown to the user.
     * @param {string} message - The text to display.
     * @param {boolean} [isError=false] - If true, styles the message as an error.
     */
    function updateStatus(message, isError = false) {
        statusElement.textContent = message;
        statusElement.style.color = isError ? '#d93025' : '#65676b';
    }

    // Start the application logic.
    main();
});