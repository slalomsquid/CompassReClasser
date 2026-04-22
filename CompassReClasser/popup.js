const container = document.getElementById("classContainer");

function createRow(name, color) {
    const row = document.createElement("div");
    row.className = "row";

    const label = document.createElement("label");
    label.textContent = name;

    const picker = document.createElement("input");
    picker.type = "color";
    
    // Defaulting to a darker gray (#333333) instead of light gray (#888888)
    picker.value = color || "#333333"; 

    picker.dataset.className = name;

    row.appendChild(label);
    row.appendChild(picker);
    container.appendChild(row);
}

function renderClasses(classes) {
    container.innerHTML = "";
    chrome.storage.sync.get(
        null,
        (settings) => {
            classes.forEach(className => {createRow(className,settings[className]);});
        }
    );
}

function loadClasses() {

    chrome.tabs.query(
        {active: true,currentWindow: true},
        (tabs) => {
            if (!tabs.length)
                return;

            chrome.tabs.sendMessage(tabs[0].id,
                {type:"getClasses"},
                (response) => {

                    if (chrome.runtime.lastError) {

                        console.warn(
                            chrome.runtime
                                .lastError
                                .message
                        );

                        return;
                    }

                    if (!Array.isArray(response))
                        return;

                    renderClasses(response);
                }
            );
        }
    );
}

function saveSettings() {

    const inputs = document.querySelectorAll("input[type=color]");

    const settings = {};

    inputs.forEach(
        input => {settings[input.dataset.className] = input.value;
        }
    );

    chrome.storage.sync.set(
        settings,
        () => {

            chrome.tabs.query(
                {active: true,currentWindow: true},
                (tabs) => {

                    if (!tabs.length)
                        return;

                    chrome.tabs.sendMessage(tabs[0].id,{type:"updateColors",settings:settings});
                }
            );
        }
    );
}

document.getElementById("save").addEventListener("click",saveSettings);

loadClasses();