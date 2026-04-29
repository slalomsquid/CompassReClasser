// Helper: Converts RGB strings to Hex for consistency
function rgbToHex(rgb) {
    const result = rgb.match(/\d+/g);
    if (!result || result.length < 3) return rgb;
    const r = parseInt(result[0]);
    const g = parseInt(result[1]);
    const b = parseInt(result[2]);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}


// Helper: Extracts class name from parentheses, e.g., "Math (MAT101)" -> "MAT101"
function extractClassName(text) {
    const match = text.match(/\((.*?)\)/);
    return (match && match[1]) ? match[1] : text;
}


// Helper: Captures the natural site colors before we modify them
function captureOriginals(event) {
    if (!event.dataset.originalBg) {
        const style = window.getComputedStyle(event);
        event.dataset.originalBg = style.backgroundColor;
        event.dataset.originalColor = style.color;
        
        const children = event.querySelectorAll('*');
        children.forEach((child, index) => {
            if (!child.dataset.originalColor) {
                child.dataset.originalColor = window.getComputedStyle(child).color;
            }
        });
    }
}

// Main Logic: Applies custom colors or reverts to originals
function applyColors(settings) {
    if (!settings) {
        chrome.storage.sync.get(null, (res) => applyColors(res));
        return;
    }

    const events = document.querySelectorAll(".ext-cal-evt");

    events.forEach(event => {
        captureOriginals(event);

        if (settings.enabled === false) {
            // REVERT to site originals
            // event.style.backgroundImage = "url('https://picsum.photos/200/300')";
            event.style.backgroundSize = "50px 50px";
            event.style.backgroundColor = event.dataset.originalBg;
            event.style.color = event.dataset.originalColor;
            event.querySelectorAll('*').forEach(child => {
                if (child.dataset.originalColor) {
                    child.style.color = child.dataset.originalColor;
                }
            });
            delete event.dataset.customized;
        } else {
            // APPLY custom colors
            const text = event.innerText || "";
            const className = extractClassName(text);

            if (settings[className]) {
                event.style.setProperty('background-color', settings[className].bg, 'important');
                event.style.setProperty('color', settings[className].text, 'important');

                event.querySelectorAll('*').forEach(child => {
                    child.style.setProperty('color', settings[className].text, 'important');
                });
                event.dataset.customized = 'true';
            }
        }
    });
}

// Scans for all unique class names for the popup list
function getClasses() {
    const events = document.querySelectorAll(".ext-cal-evt");
    if (events.length === 0) return ["Try Reloading..."];

    const classes = new Set();
    events.forEach(event => {
        const className = extractClassName(event.innerText || "");
        if (className) classes.add(className);
    });
    return Array.from(classes);
}

// Observer: Watches for calendar changes (e.g., switching weeks)
let updateTimer;
const observer = new MutationObserver((mutations) => {
    const hasNewEvents = mutations.some(m => 
        Array.from(m.addedNodes).some(node => 
            node.nodeType === 1 && (node.classList.contains('ext-cal-evt') || node.querySelector('.ext-cal-evt'))
        )
    );

    if (hasNewEvents) {
        clearTimeout(updateTimer);
        updateTimer = setTimeout(() => applyColors(), 150);
    }
});
observer.observe(document.body, { childList: true, subtree: true });

// Message Listener: Communication from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "getClasses") {
        sendResponse(getClasses());
    } 
    else if (request.type === "updateColors") {
        applyColors(request.settings);
        sendResponse(true);
    }
    return true;
});

// Initial Run
applyColors()