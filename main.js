// 1. User Function: Generates the initial JSON structure
function userFunction(domain, firstName, lastName, customString, month, year, passwordLength, charSet, enforceCharTypes) {
    // Ensure that at least one character set is selected
    if (!charSet.numbers && !charSet.lowercase && !charSet.uppercase && !charSet.symbols && !charSet.complexSymbols) {
        throw new Error("At least one character set must be selected.");
    }

    // If enforcing is enabled, ensure the password length is sufficient
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
        month:month ||null,
        year:year || null,
        passwordLength: passwordLength,
        enforceCharTypes: enforceCharTypes || false, // Added enforceCharTypes to the user JSON
        charSet: {
            numbers: charSet.numbers || false,
            lowercase: charSet.lowercase || false,
            uppercase: charSet.uppercase || false,
            symbols: charSet.symbols || false,
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

    // Generate the final JSON to be used for password generation
    return {
        combinedString: combinedString, // Contains the concatenated string of user inputs
        passwordLength: userJson.passwordLength,
        enforceCharTypes: userJson.enforceCharTypes, // Pass enforceCharTypes to final JSON
        charSet: userJson.charSet,
        month: userJson.month,
        year: userJson.year
    };
}

// 3. Generate Password Function: Uses the master password and the final JSON to generate a password
function generatePassword(masterPassword, finalJson) {
    const crypto = require('crypto');

    // Step 1: Hash the master password
    const hashedMasterPassword = crypto.createHash('sha256').update(masterPassword).digest('hex');

    // Step 2: Combine hashed master password with the combined user string and hash again
    const combinedInput = hashedMasterPassword + finalJson.combinedString;
    const finalHash = crypto.createHash('sha256').update(combinedInput).digest();

    // Step 3: Build the character set based on user's selection
    let characterSet = "";
    const numbers = "0123456789";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const symbols = "!@#$%^&*()";
    const complexSymbols = "[]{}<>?|";

    let selectedCharSets = []; // To store selected character sets

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

    // Step 4: Generate the initial password by mapping the hash to the selected character set
    let password = "";
    let hashIndex = 0; // To keep track of hash index
    const hashLength = finalHash.length;

    for (let i = 0; i < finalJson.passwordLength; i++) {
        const byte = finalHash[hashIndex % hashLength];
        const randomIndex = byte % characterSet.length;
        password += characterSet[randomIndex];
        hashIndex++;
    }

    // Step 5: Enforce character inclusion if enabled
    if (finalJson.enforceCharTypes) {
        const numTypesToEnforce = selectedCharSets.length;
        let positions = [];
        let positionHashIndex = hashIndex;

        // Generate unique positions for each character type
        for (let i = 0; i < numTypesToEnforce; i++) {
            let position;
            while (true) {
                // Extract 4 bytes from the hash to generate a random position
                let bytes = 0;
                for (let j = 0; j < 4; j++) {
                    bytes = (bytes << 8) + finalHash[positionHashIndex % hashLength];
                    positionHashIndex++;
                }
                position = bytes % finalJson.passwordLength;

                // Ensure the position is unique
                if (!positions.includes(position)) {
                    positions.push(position);
                    break;
                }
                // If position is not unique, continue to next bytes
            }
        }

        // Select one character from each selected character set
        let charTypeHashIndex = positionHashIndex;

        for (let i = 0; i < numTypesToEnforce; i++) {
            const charSet = selectedCharSets[i];
            const byte = finalHash[charTypeHashIndex % hashLength];
            charTypeHashIndex++;
            const charIndex = byte % charSet.length;
            const character = charSet[charIndex];

            // Replace the character at the selected position
            const position = positions[i];
            password = password.substring(0, position) + character + password.substring(position + 1);
        }

        // Update hashIndex in case it's needed later
        hashIndex = charTypeHashIndex;
    }

    return password;
}

// Example Usage
try {
    // Step 1: Generate the user JSON
    const userJson = userFunction(
        "google.com",  // Domain
        "Bhaskar",     // First Name
        "Gupta",       // Last Name
        "testString",  // Custom String
        "01",          // Month
        "2022",        // Year
        15,            // Password Length
        {              // Character Set (Boolean)
            numbers: true,
            lowercase: true,
            uppercase: true,
            symbols: true,
            complexSymbols: true
        },
        false           // Enforce character types
    );

    // Step 2: Generate the user string based on the JSON
    const finalJson = generateUserString(userJson);

    // Step 3: Generate the password
    const password = generatePassword("MasterPassword123", finalJson);

    console.log("Generated Password:", password);
} catch (error) {
    console.error(error.message);
}
