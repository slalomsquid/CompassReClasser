function extractClassName(text) {
    const match = text.match(/\((.*?)\)/);

    if (match && match[1]) {
        return match[1];
    }

    return text;
}

function getClasses() {
    const events = document.querySelectorAll(".ext-cal-evt");
    const classes = new Set();

    events.forEach(event => {
        const text = event.innerText || "";
        const className = extractClassName(text);

        if (className) {
            classes.add(className);
        }
    });

    // If the set is empty, return the "Try reloading" message
    if (classes.size === 0) {
        return ["Try reloading"];
    }

    return Array.from(classes);
}

function colorEvents(settings) {

    const events = document.querySelectorAll(".ext-cal-evt");

    events.forEach(event => {

        const text = event.innerText || "";
        const className = extractClassName(text);

        if (settings[className]) {
            event.style.backgroundColor = settings[className];
            event.style.color = "#ffffff";
        }
    });
}

function applyColors() {
    chrome.storage.sync.get(null, (settings) => {colorEvents(settings);});
}

applyColors();

let updateTimer;

const observer = new MutationObserver(() => {
        clearTimeout(updateTimer);
        updateTimer = setTimeout(applyColors, 100);
    });

observer.observe(document.body, {childList: true,subtree: true});

chrome.runtime.onMessage.addListener(
    (msg, sender, sendResponse) => {

        if (msg.type === "getClasses") {

            try {
                const classes = getClasses();
                sendResponse(classes);
            } catch (err) {
                console.error(err);
                sendResponse([]);
            }

            return true;
        }

        if (msg.type === "updateColors") {
            try {

                if (msg.settings) {
                    colorEvents(msg.settings);
                } else {
                    applyColors();
                }
                sendResponse(true);

            } catch (err) {
                console.error(err);
                sendResponse(false);
            }

            return true;
        }
    }
);