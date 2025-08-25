/* Copyright (C) 2025 Pedro Henrique / phkaiser13
* File: content_script.js
* Description: This script is injected into the active Instagram tab to scrape
* the user's followers. It programmatically scrolls through the followers modal
* to ensure all users are loaded into the DOM, then extracts the usernames.
* This is the most brittle part of the extension, as it relies on specific
* CSS selectors from Instagram's front-end, which are subject to change.
* The entire logic is wrapped in an async IIFE to avoid polluting the global
* scope and to handle the asynchronous nature of scrolling and waiting.
* SPDX-License-Identifier: Apache-2.0 */

(async () => {
    // --- CONFIGURATION ---
    // These selectors are the most likely to break if Instagram updates its UI.
    // They are defined here for easy maintenance.
    // This selector should target the scrollable div inside the followers modal.
    const SCROLLABLE_CONTAINER_SELECTOR = 'div._aano'; 
    // This selector should target the anchor (<a>) tag that contains the username.
    const FOLLOWER_USERNAME_SELECTOR = 'a[role="link"] span._ap3a';

    /**
     * A simple utility to pause execution for a given time.
     * @param {number} ms - The number of milliseconds to wait.
     * @returns {Promise<void>}
     */
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    /**
     * The main function to perform the scraping.
     * @returns {Promise<string[]>} A promise that resolves to an array of usernames.
     */
    const scrapeFollowers = async () => {
        const scrollableContainer = document.querySelector(SCROLLABLE_CONTAINER_SELECTOR);

        if (!scrollableContainer) {
            console.error("Unfollower Tracker: Could not find the followers list container. Is the followers modal open?");
            // Return an empty array to signal failure gracefully.
            return [];
        }

        let lastHeight = 0;
        let currentHeight = -1;
        const collectedUsernames = new Set(); // Use a Set to automatically handle duplicates.

        // Scroll until the bottom of the list is reached.
        // This is detected when the scroll height stops increasing after a scroll event.
        while (lastHeight !== currentHeight) {
            lastHeight = scrollableContainer.scrollHeight;
            scrollableContainer.scrollTo(0, scrollableContainer.scrollHeight);
            
            // Wait for new content to load. Adjust delay if needed.
            await sleep(1000); 
            
            currentHeight = scrollableContainer.scrollHeight;

            // While scrolling, collect the usernames currently visible.
            const followerElements = scrollableContainer.querySelectorAll(FOLLOWER_USERNAME_SELECTOR);
            followerElements.forEach(el => {
                if (el.textContent) {
                    collectedUsernames.add(el.textContent.trim());
                }
            });
        }

        console.log(`Unfollower Tracker: Scraped ${collectedUsernames.size} usernames.`);
        return Array.from(collectedUsernames);
    };

    // The script returns the result of this async function call.
    // The `chrome.scripting.executeScript` API will receive this resolved value.
    return await scrapeFollowers();
})();