/**
 * @fileoverview Json Parser utility for TriDev Shell
 * @author Schlaffer Benjamin
 * @version 6.0.1
 * @description
 */

//==============================
//* Module Imports
//==============================
const fs = require('fs');
const chalk = require('chalk');

//==============================
//* Main Functionality
//==============================
/**
 * Turns a JSON file path into a json object. Tries to fix it if its a core json and is missing
 * @param {string} filePath - The json's file path
 * @returns {json} - {} | parsed json
 */
function ParseJsonFile(filePath) {
    if (!fs.existsSync(filePath)){
        console.log(chalk.red(`File missing: ${filePath}.`));
        fs.writeFileSync(file, '{}');
    }

    try {
        const fileDate = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(fileDate);
    } catch (error) {
        console.error(`Error reading or parsing JSON file at ${filePath}: ${error.message}`);
        return {};
    }
}

//==============================
//* Module Exports
//==============================
module.exports = { ParseJsonFile };