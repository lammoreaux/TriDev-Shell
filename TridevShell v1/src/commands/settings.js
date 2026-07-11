/**
 * @fileoverview Dynamic UI Configuration and Settings Engine for TriDev Shell
 * @author Schlaffer Benjamin
 * @version 1.0.0
 * @description
 * COMMANDS:
 * settings -list             : Renders a profile overview listing all configurable settings.
 * settings -line [<number>]  : Previews or configures runtime string line termination rules.
 * settings -header [<number>]: Previews or shifts visual structural canvas ASCII headers.
 */

//==============================
//* Module Imports
//==============================
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const os = require('os');

//==============================
//* Constants & Configuration
//==============================
const { conf: USER_CONFIG_DIR, uiset: USER_SETTINGS_PATH } = require('../utils/pathManager.js')

// Initialize internal global state arrays across single-session bounds
const settings = loadAllSettings();

// Link pointer handles directly down to elements managed inside our parent matrix array
const lineEndingSetting = settings.find(s => s.id === 'line_endings');
const headerTypeSetting = settings.find(s => s.id === 'header_style');


//==============================
//* Main Command Handler
//==============================
/**
 * Central routing router evaluating switch flags to drive configuration managers.
 * @param {string[]} args - Target parameters and value indices array passed from active shell lines.
 * @returns {void}
 */
function settingsCommand(args) {
    if (!args || args.length === 0 || args[0] === '-list') {
        showSettingOptions();
        return;
    }
    
    const action = args[0].toLowerCase();

    switch (action) {
        case '-line':
            handleSettingsUpdate(args.slice(1), lineEndingSetting, "-line");
            break;
        case '-header':
            handleSettingsUpdate(args.slice(1), headerTypeSetting, "-header");
            break;
        default:
            console.log(chalk.red(`\n❌ Unknown flag: ${args[0]}`));
            showSettingOptions();
            break;
    }
}


//==============================
//* Main command functions
//==============================
/**
 * Aggregates internal default setups against stored disk overrides to map persistent parameters.
 * @returns {object[]} Fully evaluated configuration parameters arrays.
 */
function loadAllSettings() {
    let userSettings = [];
    try {
        if (fs.existsSync(USER_SETTINGS_PATH)) {
            userSettings = JSON.parse(fs.readFileSync(USER_SETTINGS_PATH, 'utf8'));
            internalSettings = userSettings;
        }
    } catch (e) {
        console.error('Error reading saved user settings context:', e.message);
    }

    //Returns the settings as a single object, which can be used to access all settings
    return userSettings;
}

/**
 * Commits structural state configurations directly down into persistent JSON formats.
 * @returns {void}
 */
function saveSettingsToDisk() {
    try {
        ensureConfig();

        fs.writeFileSync(USER_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
        
        console.log(chalk.green(`\n✔ Settings updated successfully.`));
        console.log(chalk.gray('Changes apply immediately to active console hooks.\n'));
    } catch (err) {
        console.log(chalk.red(`\n❌ Error saving settings: ${err.message}\n`));
    }
}

/**
 * Ensures that the config directory is alive
 */
function ensureConfig(){
    if (!fs.existsSync(USER_CONFIG_DIR)) {
        fs.mkdirSync(USER_CONFIG_DIR, { recursive: true });
    }
} 

//==============================
//* Command Actions
//==============================
/** Prints general global option properties managed across the system. */
function showSettingOptions() {
    console.log(chalk.cyan('\n=== Available Settings ==='));
    settings.forEach((setting, index) => {
        console.log(chalk.yellow(`${index + 1}. ${setting.name} <settings ${setting.command}>`));
        console.log(chalk.gray(`   ${setting.description}\n`));
    });
}

/**
 * Evaluates parameter selection parameters and handles dynamic variable mutation overrides.
 * @param {string[]} args - Sliced array parameter values passed into helper chains.
 * @param {object} settingObj - Bound property object reference selected for mutation tracking.
 * @param {string} command - Origin execution flag tracking syntax references.
 * @returns {void}
 */
function handleSettingsUpdate(args, settingObj, command) {
    if (!args || args.length === 0) {
        showCertainSettingOptions(settingObj, command);
        return;
    }

    const choice = parseInt(args[0], 10);
    if (isNaN(choice) || choice < 1 || choice > settingObj.options.length) {
        console.log(chalk.red(`\n❌ Invalid selection. Please choose a number between 1 and ${settingObj.options.length}.`));
        return;
    }

    // Direct reference mutations updating parent reference parameters inside the master matrix array
    settingObj.selected = choice - 1;

    // Save states
    saveSettingsToDisk();
}

/**
 * Previews isolated configuration submenus alongside active toggle states markers.
 * @param {object} settingObj - Target profile context layer to review.
 * @param {string} command - Parameter reference labels injected into help descriptions.
 * @returns {void}
 */
function showCertainSettingOptions(settingObj, command) {
    if (!settingObj) {
        console.log(chalk.red('\n❌ Error: Target layout configuration profile missing.'));
        return;
    }

    console.log(chalk.cyan(`\nAvailable ${settingObj.name}:`));
    
    const hasExamples = settingObj.options[0] && settingObj.options[0].example;
    if (hasExamples) {
        console.log(chalk.gray("With examples \n"));
    }

    settingObj.options.forEach((opt, i) => {
        const isSelected = settingObj.selected === i;
        const prefix = isSelected ? chalk.green('→ ') : '  ';
        const indexStr = chalk.yellow(`${i + 1}.`);
        const displayName = opt.example || opt.name || opt.value;
        
        console.log(`${prefix}${indexStr} ${displayName}${isSelected ? chalk.green(' [Selected]') : ''}`);
    });

    console.log(chalk.gray(`\nTo change, use: settings ${command} <number>\n`));
}


//==============================
//* Public External Getter API
//==============================
/**
 * Safely resolves saved configurations or pulls structural default tokens if lookup keys break.
 * @param {string} idName - Property registry locator identifier index key.
 * @param {any} defaultValue - Fallback data profile string returned if resolution fails.
 * @returns {any} Stored option value data configuration parameters.
 */
function getCertainSetting(idName, defaultValue) {
    try {
        const certainSetting = settings.find(s => s.id === idName);
        if (certainSetting && typeof certainSetting.selected === 'number') {
            return certainSetting.options[certainSetting.selected].value;
        }
    } catch (e) { /* Safe silent fallback processing queries */ }
    return defaultValue;
}


//==============================
//* Module Exporter
//==============================
module.exports = {
    settingsCommand,
    getCertainSetting
};