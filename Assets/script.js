const masterPassword = document.getElementById('masterPassword');
const domain = document.getElementById('domain');
const passwordLength = document.getElementById('passwordLength');
const advancedOptionsToggle = document.getElementById('advancedOptionsToggle');
const advancedOptions = document.getElementById('advancedOptions');
const customizeOptionsToggle = document.getElementById('customizeOptionsToggle');
const customizeOptions = document.getElementById('customizeOptions');
const generatedPassword = document.getElementById('generatedPassword');

// Event listeners
document.getElementById('masterPassword').addEventListener('input', (event) => {
    updatePasswordStrength(event.target.value);
});

document.getElementById('openHowToPopup').onclick = function () {
    document.getElementById('howToPopup').style.display = 'block';
}
document.getElementById('closeHowToPopup').onclick = function () {
    document.getElementById('howToPopup').style.display = 'none';
}

document.getElementById('openDownloadConfig').onclick = function () {
    document.getElementById('downloadConfig').style.display = 'block';
}
document.getElementById('closeDownloadConfig').onclick = function () {
    document.getElementById('downloadConfig').style.display = 'none';
}

document.getElementById('openUploadConfig').onclick = function () {
    document.getElementById('uploadConfig').style.display = 'block';
}
document.getElementById('closeUploadConfig').onclick = function () {
    document.getElementById('uploadConfig').style.display = 'none';
}

document.getElementById('saved-configs').onclick = function () {
    document.getElementById('saved-config-popup').style.display = 'block';
    displaySavedDomains();
}
document.getElementById('saved-configs-close').onclick = function () {
    document.getElementById('saved-config-popup').style.display = 'none';
}

//close popup when clicking outside popup window
window.onclick = function (event) {
    const popups = document.querySelectorAll('.popup');
    popups.forEach(popup => {
        if (event.target === popup) {
            popup.style.display = 'none';
        }
    });
}

// Toggle Advanced Options
advancedOptionsToggle.onclick = () => {
    advancedOptions.style.display = advancedOptions.style.display === 'none' ? 'block' : 'none';
};

// Toggle Customize Options
customizeOptionsToggle.onclick = () => {
    customizeOptions.style.display = customizeOptions.style.display === 'none' ? 'block' : 'none';
};

// Dark Mode
document.getElementById('darkModeToggle').addEventListener('click', () => {
    toggleDarkMode();
});
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    toggleDarkMode();
} else if(savedTheme === 'light') {
} else {
    if (window.matchMedia('(prefers-color-scheme: dark)')){
        toggleDarkMode();
    }
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    document.querySelector('#generatedPassword').classList.toggle('dark-mode');
    document.querySelector('.container').classList.toggle('dark-mode');
    document.querySelector('select').classList.toggle('dark-mode');
    document.querySelector('.saved-config-popup').classList.toggle('dark-mode');
    document.querySelector('.downloadConfig').classList.toggle('dark-mode');
    document.querySelector('.uploadConfig').classList.toggle('dark-mode');
    const labels = document.querySelectorAll('label');
    labels.forEach(label => {
        label.classList.toggle('dark-mode');
    });
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.classList.toggle('dark-mode');
    });
    darkModeToggle.classList.toggle('active');
    const popups = document.querySelectorAll('.howToPopup');
    popups.forEach(popup => {
        popup.classList.toggle('dark-mode');
    })
    // Save the current theme to localStorage
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
}

function handleSubmit(event) {
    event.preventDefault();
    generatePassword();
}

function handleDownloadConfig(event) {
    event.preventDefault();
    const password = document.getElementById('passwordDownload').value;
    saveConfig(password);
    document.getElementById('downloadConfig').style.display = 'none';
}

function handleUploadConfig(event) {
    event.preventDefault();
    const password = document.getElementById('passwordUpload').value;
    uploadConfig(password);
    document.getElementById('uploadConfig').style.display = 'none';
}

function updatePasswordStrength(password) {
    const strengthText = document.getElementById('passwordStrength');
    const strengthProgress = document.getElementById('strengthProgress');
    let strength = 0;

    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[\W_]/.test(password)) strength += 25;

    // Update the strength text and progress bar
    strengthProgress.value = strength;

    // Remove previous strength classes
    strengthText.classList.remove('weak', 'medium', 'strong');

    if (strength === 0) {
        strengthText.textContent = 'Strength: Weak';
        strengthText.classList.add('weak');
        strengthProgress.className = '';
    } else if (strength < 100) {
        strengthText.textContent = 'Strength: Weak';
        strengthText.classList.add('weak');
        strengthProgress.className = 'progress-weak';
    } else if (strength < 125) {
        strengthText.textContent = 'Strength: Medium';
        strengthText.classList.add('medium');
        strengthProgress.className = 'progress-medium';
    } else {
        strengthText.textContent = 'Strength: Strong';
        strengthText.classList.add('strong');
        strengthProgress.className = 'progress-strong';
    }
}

function copyPassword() {
    navigator.clipboard.writeText(generatedPassword.textContent).then(() => {
        alert("Password copied to clipboard!");
    });
}

async function saveConfig(masterPassword) {
    const existingConfigs = JSON.parse(localStorage.getItem('configs')) || [];
    const encryptedConfigs = await encryptData(JSON.stringify(existingConfigs), masterPassword);

    const configBlob = new Blob([encryptedConfigs], { type: "application/json" });
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(configBlob);
    downloadLink.download = "ForgetMe.fmpm";
    downloadLink.click();
}

async function uploadConfig(masterPassword) {
    const fileInput = document.getElementById('uploadFile');
    const file = fileInput.files[0];  // Get the first file selected by the user

    if (!file) {
        console.log("No file selected");
        return;
    }

    // handle the file content
    const reader = new FileReader();
    reader.onload = async function (e) {
        const encryptedData = e.target.result;
        console.log("password:", masterPassword);
        const decryptedData = await decryptData(encryptedData, masterPassword);

        const parsedConfigs = JSON.parse(decryptedData);
        const existingConfigs = JSON.parse(localStorage.getItem('configs')) || [];
        parsedConfigs.forEach((config) => {
            let exists = existingConfigs.some(existingConfig => existingConfig.domain === config.domain && existingConfig.username === config.username && existingConfig.name === config.name && existingConfig.customString === config.customString && existingConfig.month === config.month && existingConfig.year === config.year); 
            if (!exists) {
                existingConfigs.push(config);
            }
        });
        localStorage.setItem('configs', JSON.stringify(existingConfigs));
        displaySavedDomains(); // Update the domain list
    };

    // Reading the file as text
    reader.readAsText(file);
}

//Display Domains
let currentPage = 0;  
const itemsPerPage = 5;  
function displaySavedDomains() {
    const domainList = document.getElementById('domainList');
    domainList.innerHTML = '';
    const existingConfigs = JSON.parse(localStorage.getItem('configs')) || [];
    
    const startIndex = currentPage * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, existingConfigs.length);

    for (let i = startIndex; i < endIndex; i++) {
        const config = existingConfigs[i];
        const li = document.createElement('li');
        const domainName = document.createElement('span');
        domainName.textContent = config.domain;
        li.appendChild(domainName);

        const buttonsContainer = document.createElement('div');
        buttonsContainer.classList.add('buttons-container');

        const loadButton = document.createElement('button');
        loadButton.textContent = "Load";
        loadButton.classList.add('domainList-button', 'load');
        loadButton.onclick = () => loadConfig(i);
        buttonsContainer.appendChild(loadButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = "Delete";
        deleteButton.classList.add('domainList-button', 'delete');
        deleteButton.onclick = (e) => {
            e.stopPropagation(); 
            deleteConfig(i);
        };
        buttonsContainer.appendChild(deleteButton);

        li.appendChild(buttonsContainer);
        li.onclick = () => loadConfig(i);
        domainList.appendChild(li);
    }

    const paginationContainer = document.createElement('div');
    paginationContainer.classList.add('pagination-container');

    const prevButton = document.createElement('button');
    prevButton.textContent = "<";
    prevButton.disabled = currentPage === 0; 
    prevButton.onclick = () => {
        if (currentPage > 0) {
            currentPage--;
            displaySavedDomains(); 
        }
    };
    paginationContainer.appendChild(prevButton);

    const nextButton = document.createElement('button');
    nextButton.textContent = ">";
    nextButton.disabled = endIndex >= existingConfigs.length;  
    nextButton.onclick = () => {
        if (endIndex < existingConfigs.length) {
            currentPage++;
            displaySavedDomains(); 
        }
    };
    paginationContainer.appendChild(nextButton);

    domainList.appendChild(paginationContainer);
}

function deleteConfig(index) {
    const existingConfigs = JSON.parse(localStorage.getItem('configs')) || [];
    existingConfigs.splice(index, 1);
    localStorage.setItem('configs', JSON.stringify(existingConfigs));
    displaySavedDomains();
}

function loadConfig(index) {
    const existingConfigs = JSON.parse(localStorage.getItem('configs')) || [];
    const config = existingConfigs[index];

    // Load the configuration into the input fields
    document.getElementById('domain').value = config.domain;
    document.getElementById('username').value = config.username;
    document.getElementById('name').value = config.name;
    document.getElementById('customString').value = config.customString;
    document.getElementById('month').value = config.month;
    document.getElementById('year').value = config.year;
    document.getElementById('passwordLength').value = config.passwordLength;
    document.getElementById('enforceSelection').checked = config.enforceCharTypes;

    document.getElementById('numbers').checked = config.charSet.numbers;
    document.getElementById('lowercase').checked = config.charSet.lowercase;
    document.getElementById('uppercase').checked = config.charSet.uppercase;
    document.getElementById('symbols').checked = config.charSet.symbols;
    document.getElementById('complexSymbols').checked = config.charSet.complexSymbols;

    //close the popup
    document.getElementById('saved-config-popup').style.display = 'none';
}

// Search functionality
let searchPage = 0;
document.getElementById('searchInput').addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const domainList = document.getElementById('domainList');
    const existingConfigs = JSON.parse(localStorage.getItem('configs')) || [];

    const filteredConfigs = existingConfigs.filter(config => 
        config.domain.toLowerCase().includes(searchTerm)
    );

    const itemsPerPage = 3;
    const startIndex = searchPage * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredConfigs.length);

    domainList.innerHTML = '';

    for (let i = startIndex; i < endIndex; i++) {
        const config = filteredConfigs[i];
        const li = document.createElement('li');
        const domainName = document.createElement('span');
        domainName.textContent = config.domain;
        li.appendChild(domainName);

        const buttonsContainer = document.createElement('div');
        buttonsContainer.classList.add('buttons-container');

        const loadButton = document.createElement('button');
        loadButton.textContent = "Load";
        loadButton.classList.add('domainList-button', 'load');
        loadButton.onclick = () => loadConfig(i);
        buttonsContainer.appendChild(loadButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = "Delete";
        deleteButton.classList.add('domainList-button', 'delete');
        deleteButton.onclick = (e) => {
            e.stopPropagation(); // Prevent triggering loadConfig
            deleteConfig(i);
        };
        buttonsContainer.appendChild(deleteButton);

        li.appendChild(buttonsContainer);
        li.onclick = () => loadConfig(i);
        domainList.appendChild(li);
    }

    const paginationContainer = document.createElement('div');
    paginationContainer.classList.add('pagination-container');

    const prevButton = document.createElement('button');
    prevButton.textContent = "<";
    prevButton.disabled = searchPage === 0; 
    prevButton.onclick = () => {
        if (searchPage > 0) {
            searchPage--;
            displaySearchResults(); 
        }
    };
    paginationContainer.appendChild(prevButton);

    const nextButton = document.createElement('button');
    nextButton.textContent = ">";
    nextButton.disabled = endIndex >= filteredConfigs.length; 
    nextButton.onclick = () => {
        if (endIndex < filteredConfigs.length) {
            searchPage++;
            displaySearchResults(); 
        }
    };
    paginationContainer.appendChild(nextButton);

    domainList.appendChild(paginationContainer);
});

function displaySearchResults() {
    const event = new Event('input');
    document.getElementById('searchInput').dispatchEvent(event);
}

// Generate password
async function generatePassword() {
    try {
        const masterPassword = document.getElementById('masterPassword').value;
        const domain = document.getElementById('domain').value;
        const username = document.getElementById('username').value;
        const name = document.getElementById('name').value;
        const customString = document.getElementById('customString').value;
        const month = document.getElementById('month').value;
        const year = document.getElementById('year').value;
        const passwordLength = parseInt(document.getElementById('passwordLength').value, 10);

        const userJson = userFunction(domain, username, name, customString, month, year, passwordLength, {
            numbers: document.getElementById('numbers').checked,
            lowercase: document.getElementById('lowercase').checked,
            uppercase: document.getElementById('uppercase').checked,
            symbols: document.getElementById('symbols').checked,
            complexSymbols: document.getElementById('complexSymbols').checked
        }, document.getElementById('enforceSelection').checked);

        const password = await generatePasswordFromHash(masterPassword, generateUserString(userJson));

        generatedPassword.textContent = password;

        saveSiteConfiguration(userJson);

    } catch (error) {
        console.error(error.message);
        alert(error.message);
    }
}

// 1. User Function: Generates the initial JSON structure
function userFunction(domain, username, name, customString, month, year, passwordLength, charSet, enforceCharTypes) {
    if (!charSet.numbers && !charSet.lowercase && !charSet.uppercase && !charSet.symbols && !charSet.complexSymbols) {
        throw new Error("At least one character set must be selected.");
    }
    if (enforceCharTypes) {
        const numSelectedCharSets = Object.values(charSet).filter(Boolean).length;
        if (passwordLength < numSelectedCharSets) {
            throw new Error("Password length must be at least equal to the number of selected character types when enforcing characters.");
        }
    }

    return {
        charSet: {
            complexSymbols: charSet.complexSymbols || false,
            lowercase: charSet.lowercase !== false,
            numbers: charSet.numbers !== false,
            symbols: charSet.symbols !== false,
            uppercase: charSet.uppercase !== false
        },
        customString: customString || null,
        domain: domain,
        enforceCharTypes: enforceCharTypes || true,
        month: month || null,
        name: name || null,
        passwordLength: passwordLength,
        username: username || null,
        year: year || null
    };
    
}

// 2. Generate User String Function: Combines the relevant fields into one string
function generateUserString(userJson) {
    let combinedString = "";

    if (userJson.domain) combinedString += userJson.domain;
    if (userJson.username) combinedString += userJson.username;
    if (userJson.name) combinedString += userJson.name;
    if (userJson.customString) combinedString += userJson.customString;
    if (userJson.month) combinedString += userJson.month;
    if (userJson.year) combinedString += userJson.year;

    return {
        finalString: combinedString,
        passwordLength: userJson.passwordLength,
        enforceCharTypes: userJson.enforceCharTypes,
        charSet: userJson.charSet
    };
}

// 3. Generate Password Function: Uses the master password and the final JSON to generate a password
async function generatePasswordFromHash(masterPassword, finalJson) {
    const encoder = new TextEncoder();
    const masterPasswordHash = await crypto.subtle.digest('SHA-256', encoder.encode(masterPassword));
    // console.log(masterPasswordHash);

    const combinedInput = new Uint8Array([...new Uint8Array(masterPasswordHash), ...encoder.encode(finalJson.finalString)]);
    const finalHash = await crypto.subtle.digest('SHA-256', combinedInput);
    // console.log(finalHash);

    let characterSet = "";
    const numbers = "0123456789";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const symbols = "!@#$%^&*()";
    const complexSymbols = "[]{}<>?|";

    let selectedCharSets = [];
    if (finalJson.charSet.numbers) {
        characterSet += numbers;
        selectedCharSets.push(numbers);
    }
    if (finalJson.charSet.uppercase) {
        characterSet += uppercase;
        selectedCharSets.push(uppercase);
    }
    if (finalJson.charSet.lowercase) {
        characterSet += lowercase;
        selectedCharSets.push(lowercase);
    }
    if (finalJson.charSet.symbols) {
        characterSet += symbols;
        selectedCharSets.push(symbols);
    }
    if (finalJson.charSet.complexSymbols) {
        characterSet += complexSymbols;
        selectedCharSets.push(complexSymbols);
    }
    // console.log(characterSet, characterSet.length);

    let password = "";
    const hashArray = new Uint8Array(finalHash);
    // console.log(hashArray);
    const hashLength = hashArray.length;
    // console.log(hashLength);

    for (let i = 0; i < finalJson.passwordLength; i++) {
        const byte = hashArray[i % hashLength]; // since using SHA256 (limited to 32 bytes, but password lengh allowed is 40)
        const randomIndex = byte % characterSet.length;
        password += characterSet[randomIndex];
        // console.log(password);
        // console.log("trigger1");
    }

    if (finalJson.enforceCharTypes) {
        const numTypesToEnforce = selectedCharSets.length;
        let positions = [];

        for (let count = 0; count < hashLength; count++) {
            let position = hashArray[count] % finalJson.passwordLength;
            if (!positions.includes(position)) {
                positions.push(position);
            }
            // console.log("trigger3");
        }
        if (positions.length < numTypesToEnforce) {
            if (positions[-1] == 0) {
                let position;
                let count = 1;
                while (positions.length < numTypesToEnforce) {
                    position = positions[-1] + count;
                    count++;
                    if (!positions.includes(position)) {
                        positions.push(position);
                    }
                    // console.log("trigger+");
                }
            }
            if (positions[-1] == (finalJson.passwordLength - 1)) {
                let position;
                let count = 1;
                while (positions.length < numTypesToEnforce) {
                    position = positions[-1] - count;
                    count++;
                    if (!positions.includes(position)) {
                        positions.push(position);
                    }
                    // console.log("trigger-");
                }
            }
        }


        for (let i = 0; i < numTypesToEnforce; i++) {
            // console.log("trigger4");
            const charSet = selectedCharSets[i];
            const byte = hashArray[(i + numTypesToEnforce) % hashLength];
            const charIndex = byte % charSet.length;
            const character = charSet[charIndex];

            const position = positions[i];
            password = password.substring(0, position) + character + password.substring(position + 1);
        }
    }

    return password;
}

function saveSiteConfiguration(userJson) {
    const existingConfigs = JSON.parse(localStorage.getItem('configs')) || [];
    const userJsonString = JSON.stringify(userJson);
    const configExists = existingConfigs.some(config => JSON.stringify(config) === userJsonString);

    if (configExists) {
        console.log("This configuration already exists. Not saving again.");
    } else {
        existingConfigs.push(userJson);
        localStorage.setItem('configs', JSON.stringify(existingConfigs));

        console.log("New configuration saved.");
    }
}

async function encryptData(data, masterPassword) {
    const encoder = new TextEncoder();
    const masterPasswordHash = await crypto.subtle.digest('SHA-256', encoder.encode(masterPassword));
    const halfHash = masterPasswordHash.slice(0, masterPasswordHash.byteLength / 2);

    const iv = crypto.getRandomValues(new Uint8Array(12)); // Initialization vector
    const key = await crypto.subtle.importKey(
        'raw',
        halfHash,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );

    const encryptedData = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        key,
        encoder.encode(data)
    );

    // Combine iv and encrypted data for storage
    const combined = new Uint8Array(iv.byteLength + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.byteLength);

    return btoa(String.fromCharCode(...combined)); // Convert to base64 for storage
}

async function decryptData(data, masterPassword) {
    const combined = new Uint8Array(atob(data).split("").map(c => c.charCodeAt(0)));
    const iv = combined.slice(0, 12); // Extract the IV
    const encryptedData = combined.slice(12); // Extract the encrypted data

    const encoder = new TextEncoder();
    const masterPasswordHash = await crypto.subtle.digest('SHA-256', encoder.encode(masterPassword));
    const halfHash = masterPasswordHash.slice(0, masterPasswordHash.byteLength / 2);

    const key = await crypto.subtle.importKey(
        'raw',
        halfHash,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
    );

    const decryptedData = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        key,
        encryptedData
    );

    return new TextDecoder().decode(decryptedData);
}