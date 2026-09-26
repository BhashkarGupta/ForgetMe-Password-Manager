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
async function generatePasswordFromHash(masterPassword, finalJson, algorithm = 'PBKDF2') {
    const encoder = new TextEncoder();
    let finalHash;

    if (algorithm === 'Argon2id') {
        // Argon2id Implementation
        // Salt: User configuration string (Argon2 requires at least 8 bytes)
        // Memory: 16MB (65536 KB)
        // Iterations: 3
        // Parallelism: 1
        // Hash Length: 32 bytes (256 bits)
        let salt = encoder.encode(finalJson.finalString);
        if (salt.length < 8) {
            const paddedSalt = new Uint8Array(8);
            paddedSalt.set(salt);
            salt = paddedSalt;
        }

        const hashUint8 = await hashwasm.argon2id({
            password: masterPassword,
            salt: salt,
            parallelism: 1,
            iterations: 3,
            memorySize: 65536,
            hashLength: 32,
            outputType: 'binary'
        });
        finalHash = hashUint8.buffer;

    } else {
        // PBKDF2 Implementation (Legacy/Default)
        // Import master password as key material
        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            encoder.encode(masterPassword),
            { name: "PBKDF2" },
            false,
            ["deriveBits"]
        );

        // Derive bits using PBKDF2
        // Salt is the user configuration string
        // Iterations: 600,000
        // Hash: SHA-256
        // Output: 256 bits (32 bytes)
        finalHash = await crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt: encoder.encode(finalJson.finalString),
                iterations: 600000,
                hash: "SHA-256"
            },
            keyMaterial,
            256
        );
    }

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
        const byte = hashArray[i % hashLength];
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
    masterPasswordInput.value = '';
    if (typeof updateMasterPasswordStatus === 'function') {
        updateMasterPasswordStatus();
    }
    return password;
}

/**
 * NEW UI & APP LOGIC
 */

// DOM Elements
const masterPasswordInput = document.getElementById('masterPassword');
const toggleMasterPasswordBtn = document.getElementById('toggleMasterPasswordBtn');
const strengthBars = [
    document.getElementById('strengthBar1'),
    document.getElementById('strengthBar2'),
    document.getElementById('strengthBar3'),
    document.getElementById('strengthBar4')
];
const strengthText = document.getElementById('strengthText');
const masterPasswordFingerprint = document.getElementById('masterPasswordFingerprint');
const domainInput = document.getElementById('domain');
const usernameInput = document.getElementById('username');
const passwordLengthInput = document.getElementById('passwordLength');
const passwordLengthRange = document.getElementById('passwordLengthRange');
const generatedPasswordDisplay = document.getElementById('generatedPassword');
const toggleGeneratedPasswordBtn = document.getElementById('toggleGeneratedPasswordBtn');
const generateBtn = document.getElementById('generateBtn');
const copyBtn = document.getElementById('copyBtn');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const clearStorageBtn = document.getElementById('clearStorageBtn');
const downloadConfigBtn = document.getElementById('downloadConfigBtn');
const uploadConfigBtn = document.getElementById('uploadConfigBtn');
const uploadFileInput = document.getElementById('uploadFileInput');
const savedConfigsList = document.getElementById('savedConfigsList');
const searchConfigInput = document.getElementById('searchConfigInput');
const themeToggleBtn = document.getElementById('themeToggleBtn');

// Modal Elements
const passwordModal = document.getElementById('passwordModal');
const passwordModalContent = document.getElementById('passwordModalContent');
const modalPasswordInput = document.getElementById('modalPasswordInput');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');

// Legacy/Advanced Inputs
const algorithmSelect = document.getElementById('algorithm');
const nameInput = document.getElementById('name');
const customStringInput = document.getElementById('customString');
const yearInput = document.getElementById('year');
const monthInput = document.getElementById('month');

// Checkboxes
const numbersCheckbox = document.getElementById('numbers');
const lowercaseCheckbox = document.getElementById('lowercase');
const uppercaseCheckbox = document.getElementById('uppercase');
const symbolsCheckbox = document.getElementById('symbols');
const complexSymbolsCheckbox = document.getElementById('complexSymbols');
const enforceSelectionCheckbox = document.getElementById('enforceSelection');

// Theme Logic
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    const html = document.documentElement;
    const icon = themeToggleBtn.querySelector('i');

    if (theme === 'dark') {
        html.classList.add('dark');
        html.classList.remove('light');
        icon.textContent = 'light_mode'; // Icon to switch to light
    } else {
        html.classList.remove('dark');
        html.classList.add('light');
        icon.textContent = 'dark_mode'; // Icon to switch to dark
    }
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

// 64 visually distinct emojis for deterministic master password verification seal
const FINGERPRINT_EMOJIS = [
    '⚡', '🔥', '💎', '🚀', '🌟', '🛡️', '🔑', '🎯',
    '🦊', '🦁', '🐼', '🐨', '🐯', '🐸', '🐙', '🦄',
    '🦉', '🐬', '🐺', '🦅', '🐝', '🦋', '🐢', '🦖',
    '🪐', '🌈', '🌊', '🍀', '🌴', '🍄', '🌋', '🌙',
    '☀️', '⭐', '🎲', '🧩', '💡', '🛸', '🎪', '🎨',
    '👑', '🏆', '⚓', '🎸', '🎹', '🏹', '🔮', '🧭',
    '🍎', '🍉', '🍓', '🍒', '🥑', '🍕', '🍩', '🍦',
    '☕', '🍪', '🥨', '🍿', '🍭', '🎈', '🔔', '🎁'
];

function evaluatePasswordStrength(password) {
    if (!password) {
        return {
            score: 0,
            label: 'Empty',
            textClass: 'text-gray-400 dark:text-slate-500',
            barClass: '',
            count: 0
        };
    }

    const len = password.length;
    let score = 0;

    // Length scoring
    if (len >= 8) score += 1;
    if (len >= 12) score += 1;
    if (len >= 16) score += 1;

    // Character variety checks
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigits = /[0-9]/.test(password);
    const hasSymbols = /[^a-zA-Z0-9]/.test(password);

    const varietyCount = [hasLower, hasUpper, hasDigits, hasSymbols].filter(Boolean).length;
    if (varietyCount >= 3) score += 1;
    if (varietyCount === 4 && len >= 10) score += 1;

    // Penalties for trivial patterns
    if (/^[0-9]+$/.test(password) || /^[a-zA-Z]+$/.test(password)) {
        score = Math.max(1, score - 1);
    }
    if (/(.)\1{2,}/.test(password)) {
        score = Math.max(1, score - 1);
    }
    const commonPatterns = ['password', '123456', 'qwerty', 'admin', 'welcome', 'letmein'];
    if (commonPatterns.some(p => password.toLowerCase().includes(p))) {
        score = Math.max(1, score - 2);
    }

    let finalScore = 1;
    if (len < 6) {
        finalScore = 1;
    } else if (score <= 1) {
        finalScore = 1;
    } else if (score === 2) {
        finalScore = 2;
    } else if (score === 3) {
        finalScore = 3;
    } else {
        finalScore = 4;
    }

    const levels = {
        1: {
            label: 'Weak',
            textClass: 'text-rose-500 dark:text-rose-400',
            barClass: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]',
            count: 1
        },
        2: {
            label: 'Fair',
            textClass: 'text-amber-500 dark:text-amber-400',
            barClass: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
            count: 2
        },
        3: {
            label: 'Strong',
            textClass: 'text-blue-500 dark:text-cyan-400',
            barClass: 'bg-blue-500 dark:bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]',
            count: 3
        },
        4: {
            label: 'Very Strong',
            textClass: 'text-emerald-500 dark:text-emerald-400',
            barClass: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
            count: 4
        }
    };

    return {
        score: finalScore,
        ...levels[finalScore]
    };
}

async function generatePasswordFingerprint(password) {
    if (!password) return null;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password));
    const hashArray = new Uint8Array(hashBuffer);

    return [
        FINGERPRINT_EMOJIS[hashArray[0] % 64],
        FINGERPRINT_EMOJIS[hashArray[1] % 64],
        FINGERPRINT_EMOJIS[hashArray[2] % 64],
        FINGERPRINT_EMOJIS[hashArray[3] % 64]
    ];
}

let masterPasswordReqCounter = 0;
async function updateMasterPasswordStatus() {
    if (!masterPasswordInput || !strengthText || !masterPasswordFingerprint) return;

    const password = masterPasswordInput.value;
    const reqId = ++masterPasswordReqCounter;

    // 1. Update Strength Meter
    const strength = evaluatePasswordStrength(password);
    strengthText.textContent = strength.label;
    strengthText.className = 'text-xs font-semibold uppercase tracking-wider shrink-0 text-right min-w-[75px] transition-colors ' + strength.textClass;

    const defaultBarClass = 'rounded-full bg-gray-200 dark:bg-slate-700/60 transition-all duration-300';
    strengthBars.forEach((bar, index) => {
        if (!bar) return;
        if (index < strength.count) {
            bar.className = 'rounded-full ' + strength.barClass + ' transition-all duration-300';
        } else {
            bar.className = defaultBarClass;
        }
    });

    // 2. Update Visual Emoji Verification Stamp
    if (!password) {
        masterPasswordFingerprint.innerHTML = '<span class="text-gray-300 dark:text-slate-600 tracking-widest text-xs">••••</span>';
        return;
    }

    const emojis = await generatePasswordFingerprint(password);
    if (reqId !== masterPasswordReqCounter) return; // Prevent race conditions on fast typing

    if (emojis) {
        masterPasswordFingerprint.innerHTML = emojis.map(emoji =>
            `<span class="inline-block transform hover:scale-125 transition-transform duration-150 cursor-default" title="Visual verification seal">${emoji}</span>`
        ).join(' ');
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderSavedConfigs();
    updateMasterPasswordStatus();

    // Sync Range and Number inputs
    passwordLengthRange.addEventListener('input', (e) => {
        passwordLengthInput.value = e.target.value;
    });
    passwordLengthInput.addEventListener('input', (e) => {
        passwordLengthRange.value = e.target.value;
    });

    // Master Password Listeners
    masterPasswordInput.addEventListener('input', updateMasterPasswordStatus);
    masterPasswordInput.addEventListener('change', updateMasterPasswordStatus);
    toggleMasterPasswordBtn.addEventListener('click', () => {
        const type = masterPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        masterPasswordInput.setAttribute('type', type);
        toggleMasterPasswordBtn.querySelector('i').textContent = type === 'password' ? 'visibility' : 'visibility_off';
    });

    // Generated Password Toggle
    if (toggleGeneratedPasswordBtn) {
        toggleGeneratedPasswordBtn.addEventListener('click', () => {
            const type = generatedPasswordDisplay.getAttribute('type') === 'password' ? 'text' : 'password';
            generatedPasswordDisplay.setAttribute('type', type);
            toggleGeneratedPasswordBtn.querySelector('i').textContent = type === 'password' ? 'visibility' : 'visibility_off';
        });
    }

    // Generate Handler
    generateBtn.addEventListener('click', handleGenerate);

    // Copy Handler
    copyBtn.addEventListener('click', handleCopy);

    // Save Config Handler
    saveConfigBtn.addEventListener('click', handleSaveConfig);

    // Clear Storage Handler
    clearStorageBtn.addEventListener('click', handleClearStorage);

    // Download Config Handler
    downloadConfigBtn.addEventListener('click', handleDownloadConfig);

    // Upload Config Handler
    uploadConfigBtn.addEventListener('click', () => uploadFileInput.click());
    uploadFileInput.addEventListener('change', handleUploadConfig);

    // Theme Toggle
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Search Handler
    if (searchConfigInput) {
        searchConfigInput.addEventListener('input', () => renderSavedConfigs());
    }
});

async function handleGenerate(e) {
    e.preventDefault();

    try {
        const masterPassword = masterPasswordInput.value;
        if (!masterPassword) {
            alert("Master Password is required!");
            return;
        }

        const domain = domainInput.value;
        const username = usernameInput.value;
        const name = nameInput.value;
        const customString = customStringInput.value;
        const month = monthInput.value;
        const year = yearInput.value;
        const passwordLength = parseInt(passwordLengthInput.value, 10);

        const charSet = {
            numbers: numbersCheckbox.checked,
            lowercase: lowercaseCheckbox.checked,
            uppercase: uppercaseCheckbox.checked,
            symbols: symbolsCheckbox.checked,
            complexSymbols: complexSymbolsCheckbox.checked
        };
        const enforceCharTypes = enforceSelectionCheckbox.checked;
        const algorithm = algorithmSelect.value;

        const userJson = userFunction(domain, username, name, customString, month, year, passwordLength, charSet, enforceCharTypes);
        const password = await generatePasswordFromHash(masterPassword, generateUserString(userJson), algorithm);

        generatedPasswordDisplay.value = password;
        // Reset to hidden when generating new
        generatedPasswordDisplay.setAttribute('type', 'password');
        if (toggleGeneratedPasswordBtn) {
            toggleGeneratedPasswordBtn.querySelector('i').textContent = 'visibility';
        }

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

function handleCopy() {
    const text = generatedPasswordDisplay.value;
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="material-icons">check</i> Copied!';
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
        }, 2000);
    });
}

// Local Storage Logic
function handleSaveConfig() {
    const domain = domainInput.value;
    if (!domain) {
        alert("Domain is required to save configuration.");
        return;
    }

    const config = {
        domain: domain,
        username: usernameInput.value,
        name: nameInput.value,
        customString: customStringInput.value,
        month: monthInput.value,
        year: yearInput.value,
        passwordLength: parseInt(passwordLengthInput.value, 10),
        charSet: {
            numbers: numbersCheckbox.checked,
            lowercase: lowercaseCheckbox.checked,
            uppercase: uppercaseCheckbox.checked,
            symbols: symbolsCheckbox.checked,
            complexSymbols: complexSymbolsCheckbox.checked
        },
        enforceCharTypes: enforceSelectionCheckbox.checked,
        algorithm: algorithmSelect.value
        // Theme is NOT saved per config anymore
    };

    const existingConfigs = JSON.parse(localStorage.getItem('configs')) || [];

    // Check if exists and update, or push new
    const index = existingConfigs.findIndex(c => c.domain === domain);
    if (index !== -1) {
        existingConfigs[index] = config;
    } else {
        existingConfigs.push(config);
    }

    localStorage.setItem('configs', JSON.stringify(existingConfigs));
    renderSavedConfigs();
    alert("Configuration saved!");
}

function renderSavedConfigs() {
    const existingConfigs = JSON.parse(localStorage.getItem('configs')) || [];
    const searchQuery = searchConfigInput ? searchConfigInput.value.toLowerCase() : '';

    savedConfigsList.innerHTML = '';

    const filteredConfigs = existingConfigs.filter(config => {
        const domain = (config.domain || '').toLowerCase();
        const username = (config.username || '').toLowerCase();
        return domain.includes(searchQuery) || username.includes(searchQuery);
    });

    if (filteredConfigs.length === 0) {
        savedConfigsList.innerHTML = '<li class="text-gray-500 italic">No Configuration saved yet.</li>';
        return;
    }

    filteredConfigs.forEach((config) => {
        // Find original index for deletion/loading
        const originalIndex = existingConfigs.indexOf(config);

        const li = document.createElement('li');
        li.className = "flex justify-between items-center p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded hover:border-blue-500 dark:hover:border-cyan-500 transition-colors cursor-pointer group";
        li.onclick = () => loadConfig(originalIndex);

        const span = document.createElement('span');
        span.className = "text-gray-800 dark:text-slate-200 font-mono";
        span.textContent = config.domain + (config.username ? ` (${config.username})` : '');

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="material-icons">delete</i>';
        deleteBtn.className = "text-red-400 hover:text-red-300 p-1 opacity-0 group-hover:opacity-100 transition-opacity";
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteConfig(originalIndex);
        };

        li.appendChild(span);
        li.appendChild(deleteBtn);
        savedConfigsList.appendChild(li);
    });
}

function loadConfig(index) {
    const existingConfigs = JSON.parse(localStorage.getItem('configs')) || [];
    const config = existingConfigs[index];
    if (!config) return;

    domainInput.value = config.domain || '';
    usernameInput.value = config.username || '';
    nameInput.value = config.name || '';
    customStringInput.value = config.customString || '';
    monthInput.value = config.month || '';
    yearInput.value = config.year || '';
    passwordLengthInput.value = config.passwordLength || 16;
    passwordLengthRange.value = config.passwordLength || 16;

    // Load algorithm if present, default to PBKDF2
    if (algorithmSelect) {
        algorithmSelect.value = config.algorithm || 'PBKDF2';
    }

    if (config.charSet) {
        numbersCheckbox.checked = config.charSet.numbers;
        lowercaseCheckbox.checked = config.charSet.lowercase;
        uppercaseCheckbox.checked = config.charSet.uppercase;
        symbolsCheckbox.checked = config.charSet.symbols;
        complexSymbolsCheckbox.checked = config.charSet.complexSymbols;
    }

    enforceSelectionCheckbox.checked = config.enforceCharTypes;
}

function deleteConfig(index) {
    if (!confirm("Are you sure you want to delete this configuration?")) return;

    const existingConfigs = JSON.parse(localStorage.getItem('configs')) || [];
    existingConfigs.splice(index, 1);
    localStorage.setItem('configs', JSON.stringify(existingConfigs));
    renderSavedConfigs();
}

function handleClearStorage() {
    if (!confirm("Are you sure you want to clear ALL saved configurations? This cannot be undone.")) return;
    localStorage.removeItem('configs');
    renderSavedConfigs();
}

// Modal Logic
function showPasswordModal() {
    return new Promise((resolve) => {
        passwordModal.classList.remove('hidden');
        // Small delay to allow display:block to apply before opacity transition
        setTimeout(() => {
            passwordModalContent.classList.remove('scale-95', 'opacity-0');
            passwordModalContent.classList.add('scale-100', 'opacity-100');
        }, 10);
        modalPasswordInput.value = '';
        modalPasswordInput.focus();

        const confirmHandler = () => {
            const password = modalPasswordInput.value;
            if (password) {
                cleanup();
                resolve(password);
            } else {
                alert("Password is required.");
            }
        };

        const cancelHandler = () => {
            cleanup();
            resolve(null);
        };

        const cleanup = () => {
            passwordModalContent.classList.remove('scale-100', 'opacity-100');
            passwordModalContent.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                passwordModal.classList.add('hidden');
            }, 200); // Match transition duration

            modalConfirmBtn.removeEventListener('click', confirmHandler);
            modalCancelBtn.removeEventListener('click', cancelHandler);
        };

        modalConfirmBtn.addEventListener('click', confirmHandler);
        modalCancelBtn.addEventListener('click', cancelHandler);

        // Allow Enter key to confirm
        modalPasswordInput.onkeydown = (e) => {
            if (e.key === 'Enter') confirmHandler();
            if (e.key === 'Escape') cancelHandler();
        };
    });
}

// Encryption & Download Logic
async function handleDownloadConfig() {
    const password = await showPasswordModal();
    if (!password) return; // User cancelled

    const existingConfigs = JSON.parse(localStorage.getItem('configs')) || [];
    const dataToEncrypt = {
        canary: "__FORGETME_CANARY__",
        configs: existingConfigs,
        theme: localStorage.getItem('theme') || 'dark'
    };

    try {
        const encryptedJSON = await encryptData(JSON.stringify(dataToEncrypt), password);
        const configBlob = new Blob([encryptedJSON], { type: "application/json" });
        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(configBlob);
        downloadLink.download = "ForgetMe.fmpm";
        downloadLink.click();
    } catch (error) {
        console.error(error);
        alert("Encryption failed: " + error.message);
    }
}

async function handleUploadConfig(event) {
    const file = event.target.files[0];
    if (!file) return;

    const password = await showPasswordModal();
    if (!password) {
        uploadFileInput.value = '';
        return; // User cancelled
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        const fileContent = e.target.result;
        try {
            const decryptedData = await decryptData(fileContent, password);
            const parsedData = JSON.parse(decryptedData);

            if (parsedData.canary !== "__FORGETME_CANARY__") {
                throw new Error("Invalid password or corrupted file.");
            }

            const parsedConfigs = parsedData.configs || [];
            const existingConfigs = JSON.parse(localStorage.getItem('configs')) || [];

            // Merge configs (avoid duplicates based on domain)
            parsedConfigs.forEach(config => {
                const exists = existingConfigs.some(ec => ec.domain === config.domain && ec.username === config.username);
                if (!exists) {
                    existingConfigs.push(config);
                }
            });

            localStorage.setItem('configs', JSON.stringify(existingConfigs));

            if (parsedData.theme) {
                applyTheme(parsedData.theme);
            }

            renderSavedConfigs();
            alert("Configuration loaded successfully!");
        } catch (error) {
            console.error(error);
            alert("Decryption failed. Please check your password.");
        }
        // Reset file input
        uploadFileInput.value = '';
    };
    reader.readAsText(file);
}

/**
 * CRYPTO HELPERS
 */

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

async function deriveKey(password, salt, algorithm = 'PBKDF2') {
    const encoder = new TextEncoder();

    if (algorithm === 'Argon2id') {
        // Argon2id Key Derivation
        let saltBytes = new Uint8Array(salt);
        if (saltBytes.length < 8) {
            const paddedSalt = new Uint8Array(8);
            paddedSalt.set(saltBytes);
            saltBytes = paddedSalt;
        }

        const hashUint8 = await hashwasm.argon2id({
            password: password,
            salt: saltBytes,
            parallelism: 1,
            iterations: 3,
            memorySize: 65536,
            hashLength: 32,
            outputType: 'binary'
        });

        return crypto.subtle.importKey(
            "raw",
            hashUint8,
            { name: "AES-GCM" },
            false,
            ["encrypt", "decrypt"]
        );
    } else {
        // PBKDF2 Key Derivation
        const passwordKey = await crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        return crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 600000,
                hash: "SHA-256"
            },
            passwordKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }
}

async function encryptData(data, password) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const algorithm = algorithmSelect.value;
    const key = await deriveKey(password, salt, algorithm);

    const encryptedContent = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encoder.encode(data)
    );

    return JSON.stringify({
        salt: arrayBufferToBase64(salt),
        iv: arrayBufferToBase64(iv),
        data: arrayBufferToBase64(encryptedContent),
        kdf: algorithm // Store the KDF used
    });
}

async function decryptData(jsonString, password) {
    try {
        const encryptedObj = JSON.parse(jsonString);

        if (!encryptedObj.salt || !encryptedObj.iv || !encryptedObj.data) {
            throw new Error("Invalid file format");
        }

        const salt = base64ToArrayBuffer(encryptedObj.salt);
        const iv = base64ToArrayBuffer(encryptedObj.iv);
        const encryptedData = base64ToArrayBuffer(encryptedObj.data);
        const kdf = encryptedObj.kdf || 'PBKDF2'; // Default to PBKDF2 for backward compatibility

        const key = await deriveKey(password, salt, kdf);

        const decryptedContent = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encryptedData
        );

        return new TextDecoder().decode(decryptedContent);
    } catch (e) {
        throw new Error("Decryption failed");
    }
}

/**
 * PARTICLE NETWORK ANIMATION
 */
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
let animationFrameId;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles();
}

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }

    draw(color) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    const particleCount = Math.min(100, (canvas.width * canvas.height) / 15000); // Responsive count
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isDark = document.documentElement.classList.contains('dark');
    const particleColor = isDark ? 'rgba(34, 211, 238, 0.5)' : 'rgba(100, 116, 139, 0.5)'; // Cyan vs Slate
    const lineColor = isDark ? 'rgba(34, 211, 238, 0.15)' : 'rgba(100, 116, 139, 0.15)';

    particles.forEach((particle, index) => {
        particle.update();
        particle.draw(particleColor);

        // Draw connections
        for (let j = index + 1; j < particles.length; j++) {
            const other = particles[j];
            const dx = particle.x - other.x;
            const dy = particle.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 150) {
                ctx.beginPath();
                ctx.strokeStyle = lineColor;
                ctx.lineWidth = 1;
                ctx.moveTo(particle.x, particle.y);
                ctx.lineTo(other.x, other.y);
                ctx.stroke();
            }
        }
    });

    animationFrameId = requestAnimationFrame(animateParticles);
}

// Start Animation
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
animateParticles();

// PWA Installation & Service Worker Logic
let deferredInstallPrompt = null;
const installPwaBtn = document.getElementById('installPwaBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default mini-infobar on mobile
    e.preventDefault();
    deferredInstallPrompt = e;
    // Show custom themed Install button
    if (installPwaBtn) {
        installPwaBtn.classList.remove('hidden');
        installPwaBtn.classList.add('flex');
    }
});

if (installPwaBtn) {
    installPwaBtn.addEventListener('click', async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        deferredInstallPrompt = null;
        installPwaBtn.classList.remove('flex');
        installPwaBtn.classList.add('hidden');
    });
}

window.addEventListener('appinstalled', () => {
    console.log('ForgetMe was successfully installed!');
    deferredInstallPrompt = null;
    if (installPwaBtn) {
        installPwaBtn.classList.remove('flex');
        installPwaBtn.classList.add('hidden');
    }
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker registered successfully:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });
}
