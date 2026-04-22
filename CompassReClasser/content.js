function extractClassName(text) {
    const match = text.match(/\((.*?)\)/);

    if (match && match[1]) {
        return match[1];
    }

    return text;
}

function getClasses() {
    const events = document.querySelectorAll(".ext-cal-evt");
    
    if (events.length === 0) {
        // If we find nothing, let the popup know we are still searching
        return ["Loading classes..."]; 
    }

    const classes = new Set();
    events.forEach(event => {
        const text = event.innerText || "";
        const className = extractClassName(text);
        if (className) classes.add(className);
    });

    return Array.from(classes);
}

function colorEvents(settings) {
    const events = document.querySelectorAll(".ext-cal-evt");
    
    // Switch Check
    if (settings.enabled === false) {
        removeColors();
        return;
    }

    events.forEach(event => {
        const text = event.innerText || "";
        const className = extractClassName(text);

        if (settings[className]) {
            // Save the default color if we haven't already
            if (!event.dataset.originalBg) {
                // getComputedStyle gets the color from the CSS file/class
                event.dataset.originalBg = window.getComputedStyle(event).backgroundColor;
                event.dataset.originalColor = window.getComputedStyle(event).color;
            }

            // Apply the custom color
            event.style.backgroundColor = settings[className];
            event.style.color = "#ffffff";
        }
    });
}

function removeColors() {
    const events = document.querySelectorAll(".ext-cal-evt"); 
    events.forEach(event => {
        // Restore original colors if they exist
        if (event.dataset.originalBg) {
            event.style.backgroundColor = event.dataset.originalBg;
            event.style.color = event.dataset.originalColor;
            
            // Clean up the data attributes
            delete event.dataset.originalBg;
            delete event.dataset.originalColor;
        }
    });
    console.log("Original colors restored!");
}

// Update this to accept settings directly to avoid extra storage calls
function applyColors(settings) {
    if (settings) {
        colorEvents(settings);
    } else {
        chrome.storage.sync.get(null, (result) => {
            colorEvents(result);
        });
    }
}

applyColors();

let updateTimer;
const observer = new MutationObserver(() => {
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => applyColors(), 100);
});
observer.observe(document.body, { childList: true, subtree: true });

// Message Listener for popup requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "getClasses") {
        sendResponse(getClasses());
    } 
    else if (request.type === "updateColors") {
        // Use the settings sent directly from the popup for instant feedback
        applyColors(request.settings);
        sendResponse(true);
    }
    return true;
});