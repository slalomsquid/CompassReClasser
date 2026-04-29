const container = document.getElementById("classContainer");
const checkbox = document.getElementById("checkbox");
const saveBtn = document.getElementById("save");
const randomizeBtn = document.getElementById("randomize");
const exportBtn = document.getElementById("export");
const importBtn = document.getElementById("import");
const importFile = document.getElementById("importFile");

// Creates the UI row for a specific class
function createRow(name, bgColor, textColor) {
    const row = document.createElement("div");
    row.className = "row";

    const label = document.createElement("label");
    label.textContent = name;
    label.style.flex = "1";

    const pickerContainer = document.createElement("div");
    pickerContainer.style.display = "flex";
    pickerContainer.style.gap = "5px";

    const bgPicker = document.createElement("input");
    bgPicker.type = "color";
    bgPicker.value = bgColor || "#333333";
    bgPicker.dataset.className = name;
    bgPicker.dataset.type = "bg";

    bgPicker.addEventListener("input", (event) => {
        saveSettings();
    });

    const textPicker = document.createElement("input");
    textPicker.type = "color";
    textPicker.value = textColor || "#ffffff";
    textPicker.dataset.className = name;
    textPicker.dataset.type = "text";

    textPicker.addEventListener("input", (event) => {
        saveSettings();
    });

    pickerContainer.appendChild(document.createTextNode("BG:"));
    pickerContainer.appendChild(bgPicker);
    pickerContainer.appendChild(document.createTextNode("Text:"));
    pickerContainer.appendChild(textPicker);

    row.appendChild(label);
    row.appendChild(pickerContainer);
    container.appendChild(row);
}

// Loads classes from storage and populates the UI
function renderClasses(classes) {
    container.innerHTML = "";
    chrome.storage.sync.get(null, (settings) => {
        classes.forEach(className => {
            const classSettings = settings[className] || {};
            createRow(className, classSettings.bg, classSettings.text);
        });
    });
}

// Asks content.js for the list of classes found on the page
function loadClasses() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        chrome.tabs.sendMessage(tabs[0].id, { type: "getClasses" }, (response) => {
            if (chrome.runtime.lastError) return;
            if (Array.isArray(response)) renderClasses(response);
        });
    });
}

// Saves all current UI settings to storage and notifies the tab
function saveSettings() {
    const inputs = document.querySelectorAll("input[type=color]");
    const settings = {};

    inputs.forEach(input => {
        const className = input.dataset.className;
        const type = input.dataset.type;
        if (!settings[className]) settings[className] = {};
        settings[className][type] = input.value;
    });

    settings.enabled = checkbox.checked;

    chrome.storage.sync.set(settings, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { type: "updateColors", settings: settings });
            }
        });
    });
}

// Randomize Logic: Generates high-contrast color pairs
randomizeBtn.addEventListener("click", () => {
    const rows = document.querySelectorAll(".row");
    rows.forEach(row => {
        const bgPicker = row.querySelector('input[data-type="bg"]');
        const textPicker = row.querySelector('input[data-type="text"]');

        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);

        const toHex = (n) => n.toString(16).padStart(2, '0');
        bgPicker.value = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

        // Select text based on perceptive brightness formula
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        textPicker.value = brightness > 125 ? "#000000" : "#FFFFFF";
    });
    loadClasses()
    saveSettings();
});

// Export/Import Logic
exportBtn.addEventListener("click", () => {
    chrome.storage.sync.get(null, (settings) => {
        const blob = new Blob([JSON.stringify(settings, null, 4)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "compass-colors.json";
        a.click();
        URL.revokeObjectURL(url);
    });
});

importBtn.addEventListener("click", () => importFile.click());

importFile.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            chrome.storage.sync.set(imported, () => {
                init(); // Re-sync the checkbox and UI
            });
        } catch (err) {
            alert("Invalid JSON file.");
        }
    };
    reader.readAsText(file);
});

saveBtn.addEventListener("click", saveSettings);

checkbox.addEventListener("change", saveSettings);

// Initialization
function init() {
    chrome.storage.sync.get(["enabled"], (result) => {
        checkbox.checked = result.enabled !== false; // Default to true if never set
        setTimeout(loadClasses, 100);
        // Ensure content script is synced with current storage state
        chrome.storage.sync.get(null, (all) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: "updateColors", settings: all });
            });
        });
    });
}

init();