const masterPassword = document.getElementById('masterPassword');
const domain = document.getElementById('domain');
const passwordStrength = document.getElementById('passwordStrength');
const passwordLength = document.getElementById('passwordLength');
const advancedOptionsToggle = document.getElementById('advancedOptionsToggle');
const advancedOptions = document.getElementById('advancedOptions');
const customizeOptionsToggle = document.getElementById('customizeOptionsToggle');
const customizeOptions = document.getElementById('customizeOptions');
const generatedPassword = document.getElementById('generatedPassword');

// Toggle Advanced Options
advancedOptionsToggle.onclick = () => {
    advancedOptions.style.display = advancedOptions.style.display === 'none' ? 'block' : 'none';
};

// Toggle Customize Options
customizeOptionsToggle.onclick = () => {
    customizeOptions.style.display = customizeOptions.style.display === 'none' ? 'block' : 'none';
};

// Update Password Strength
masterPassword.oninput = () => {
    const strength = calculatePasswordStrength(masterPassword.value);
    passwordStrength.textContent = `Strength: ${strength}`;
};

function calculatePasswordStrength(password) {
    let strength = "Weak";
    if (password.length > 8) strength = "Moderate";
    if (password.length > 12 && /[A-Z]/.test(password) && /[0-9]/.test(password)) strength = "Strong";
    return strength;
}

// Generate Password
// async function generatePassword() {
//     try {
//         const firstName = document.getElementById('firstName').value; // Retrieve first name
//         const lastName = document.getElementById('lastName').value; // Retrieve last name
//         const customString = document.getElementById('customString').value; // Retrieve custom string
//         const month = document.getElementById('month').value; // Retrieve month
//         const year = document.getElementById('year').value; // Retrieve year

//         const userJson = userFunction(
//             domain.value,
//             firstName,
//             lastName,
//             customString,
//             month,
//             year,
//             parseInt(passwordLength.value, 10),
//             {
//                 numbers: document.getElementById('numbers').checked,
//                 lowercase: document.getElementById('lowercase').checked,
//                 uppercase: document.getElementById('uppercase').checked,
//                 symbols: document.getElementById('symbols').checked,
//                 complexSymbols: document.getElementById('complexSymbols').checked
//             },
//             true
//         );

//         const finalJson = generateUserString(userJson);
//         const password = await generatePasswordFromHash(masterPassword.value, finalJson);

//         generatedPassword.textContent = password;
//     } catch (error) {
//         console.error(error.message);
//         alert(error.message);
//     }
// }

async function generatePassword() {
    try {
        const masterPassword = document.getElementById('masterPassword').value;
        const domain = document.getElementById('domain').value;
        const firstName = document.getElementById('firstName').value; 
        const lastName = document.getElementById('lastName').value; 
        const customString = document.getElementById('customString').value; 
        const month = document.getElementById('month').value; 
        const year = document.getElementById('year').value;
        const passwordLength = parseInt(document.getElementById('passwordLength').value, 10);

        console.log(masterPassword, domain, firstName, lastName, customString, month, year);

        const userJson = userFunction(
            domain,
            firstName,
            lastName,
            customString,
            month,
            year,
            passwordLength,
            {
                numbers: document.getElementById('numbers').checked,
                lowercase: document.getElementById('lowercase').checked,
                uppercase: document.getElementById('uppercase').checked,
                symbols: document.getElementById('symbols').checked,
                complexSymbols: document.getElementById('complexSymbols').checked
            },
            true
        );
        // console.log(userJson);
        const finalJson = generateUserString(userJson);
        // console.log(finalJson);
        const password = await generatePasswordFromHash(masterPassword, finalJson);
        console.log(password);

        generatedPassword.textContent = password;
    } catch (error) {
        console.error(error.message);
        alert(error.message);
    }
}

// Copy Password
function copyPassword() {
    navigator.clipboard.writeText(generatedPassword.textContent).then(() => {
        alert("Password copied to clipboard!");
    });
}

// Save Config
function saveConfig() {
    const config = {
        masterPassword: masterPassword.value,
        domain: domain.value,
        passwordLength: passwordLength.value,
        firstName: firstName.value,
        lastName: lastName.value,
        customString: customString.value,
        month: month.value,
        year: year.value,
        numbers: document.getElementById('numbers').checked,
        lowercase: document.getElementById('lowercase').checked,
        uppercase: document.getElementById('uppercase').checked,
        symbols: document.getElementById('symbols').checked,
        complexSymbols: document.getElementById('complexSymbols').checked
    };
    const configBlob = new Blob([JSON.stringify(config)], { type: "application/json" });
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(configBlob);
    downloadLink.download = "config.json";
    downloadLink.click();
}

// Load Config
function loadConfig() {
    alert("Load Config functionality is not yet implemented.");
}

// 1. User Function: Generates the initial JSON structure
function userFunction(domain, firstName, lastName, customString, month, year, passwordLength, charSet, enforceCharTypes) {
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
        domain: domain,
        firstName: firstName || null,
        lastName: lastName || null,
        customString: customString || null,
        month: month || null,
        year: year || null,
        passwordLength: passwordLength,
        enforceCharTypes: enforceCharTypes || true,
        charSet: {
            numbers: charSet.numbers || true,
            lowercase: charSet.lowercase || true,
            uppercase: charSet.uppercase || true,
            symbols: charSet.symbols || true,
            complexSymbols: charSet.complexSymbols || false
        }
    };
}

// 2. Generate User String Function: Combines the relevant fields into one string
function generateUserString(userJson) {
    let combinedString = "";

    if (userJson.domain) combinedString += userJson.domain;
    if (userJson.firstName) combinedString += userJson.firstName;
    if (userJson.lastName) combinedString += userJson.lastName;
    if (userJson.customString) combinedString += userJson.customString;
    if (userJson.month) combinedString += userJson.month;
    if (userJson.year) combinedString += userJson.year;

    return {
        finalString: combinedString,
        passwordLength: userJson.passwordLength,
        enforceCharTypes: userJson.enforceCharTypes,
        charSet: userJson.charSet
        // month: userJson.month,
        // year: userJson.year
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
    // console.log(characterSet);

    let password = "";
    const hashArray = new Uint8Array(finalHash);
    console.log(hashArray);
    const hashLength = hashArray.length;

    for (let i = 0; i < finalJson.passwordLength; i++) {
        const byte = hashArray[i % hashLength];
        const randomIndex = byte % characterSet.length;
        password += characterSet[randomIndex];
        console.log("trigger1");
    }

    if (finalJson.enforceCharTypes) {
        const numTypesToEnforce = selectedCharSets.length;
        let positions = [];

        for (let i = 0; i < numTypesToEnforce; i++) {
            let position;
            console.log("trigger2");
            while (true) {
                const byte = hashArray[(i + 1) % hashLength];
                position = byte % finalJson.passwordLength;

                if (!positions.includes(position)) {
                    positions.push(position);
                    break;
                }
                console.log("trigger3");
            }
        }

        for (let i = 0; i < numTypesToEnforce; i++) {
            console.log("trigger4");
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
