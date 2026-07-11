/**
 * @fileoverview System Administration and Profile Controls for TriDev Shell
 * @author Schlaffer Benjamin
 * @version 5.1.4
 * @description
 * COMMANDS:
 * tds -toggleAI        : Toggles local large language model daemon routing hooks.
 * tds -toggleLoading   : Toggles initial loading graphic execution blocks on boot.
 * tds -showShellInfo   : Renders path metrics, active version variables, and states.
 * tds -commitsShown    : Interactively alters maximum git metrics historical read depth.
 * tds -togglePerformance : Displays the time taken for the last command to execute.
 * tds -toggleNotification: Displays a desktop notification when the last command finishes.
 * tds -restart         : Detaches a new instance loop thread and terminates current process.
 * tds --delete         : Forcibly purges application binaries and local data profiles.
 */

//==============================
//* Module Imports
//==============================
const { version } = require('../../package.json');
const chalk = require('chalk');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { Readline } = require('readline');

//==============================
//* Constants & Configuration
//==============================
const { conf: CONFIG_DIR, admin: CONFIG_FILE } = require('../utils/pathManager.js');
const APP_DIR = path.join(os.homedir(), 'AppData', 'Local', 'TDS');
const APP_EXE = path.join(APP_DIR, "tds.exe");

const DEFAULT_ADMIN_SETTINGS = {
    "aiEnabled": false,
    "loadingScreen": true,
    "commitsShown": 2,
    "ai": false,
    "loading": true,
    "showProcessTimeInfo": true,
    "returnNotification": true,
    "showAnimatedLoading": true
};

// Initialize administrative global tracking states across session lifecycle bounds
let settings = loadAllSettings();


//==============================
//* Main Command Handler
//==============================
/**
 * Main command router managing application architecture parameters and lifecycle loops.
 * @param {string[]} args - Dynamic parameter components passed from execution contexts.
 * @param {Readline} rl - Active Readline capture instance for reading console queries.
 * @returns {Promise<void>}
 */
async function adminCommand(args, rl) {
    if (!args || args.length === 0) {
        showAdminHelp();
        return;
    }

    const firstArg = args[0].toLowerCase();

    switch (firstArg) {
        case '-toggleai':
            toggleAi();
            break;
        case '-toggleloading':
            toggleLoading();
            break;
        case '-toggleperformance':
            togglePerformance();
            break;
        case '-togglenotification':
            toggleNotification();
            break;
        case '-toggleanimatedloading':
            toggleAnimatedLoading();
            break;
        case '-commitsshown':
            await changeCommitsShown(rl);
            break;
        case '-showshellinfo':
            showShellInfo();
            break;
        case '-restart':
            restartShell();
            break;
        case '--delete':
            await deleteShell(rl);
            break;
        default:
            console.log(chalk.red(`\nUnknown admin option: ${args[0]}`));
            showAdminHelp();
            break;
    }
}


//==============================
//* Core Persistent Storage Helpers
//==============================
/** Ensures basic system config folder structures are mounted onto local disk layers. */
function ensureConfig() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    if (!fs.existsSync(CONFIG_FILE)) {
        saveSettings();
    }
}

/**
 * Sweeps internal baseline configs against user configurations to resolve system variables.
 * @returns {object} Completely constructed persistent configuration keys layout map.
 */
function loadAllSettings() {
    let internalSettings = { ...DEFAULT_ADMIN_SETTINGS };

    try {
        const fileSettings = CONFIG_FILE;
        if (fileSettings && typeof fileSettings === 'object') {
            internalSettings = { ...internalSettings, ...fileSettings };
        }
    } catch (e) { /* Safe silent fallback processing queries */ }

    let userSettings = {};
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            userSettings = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Error reading user settings file wrapper:', e.message);
    }

    const merged = { ...internalSettings, ...userSettings };
    if (merged.aiEnabled === undefined && typeof merged.ai === 'boolean') {
        merged.aiEnabled = merged.ai;
    }
    return merged;
}

/** Commits active in-memory operational flags directly back down to target configuration paths. */
function saveSettings() {
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(settings, null, 4), 'utf8');
    } catch (e) {
        console.error(chalk.red('Error saving administrative settings mapping profile:'), e.message);
    }
}

/**
 * Public helper resolving active tracking metrics down to external calling modules.
 * @returns {object} Cloned state snapshot variables.
 */
function loadAdminConfig() {
    return { ...settings };
}


//==============================
//* Command Actions
//==============================
/** Toggles direct query parsing parameters down into local AI integration gateways. */
function toggleAi() {
    settings.aiEnabled = !Boolean(settings.aiEnabled);
    console.log(chalk.green(`LLM feature is now ${settings.aiEnabled ? 'enabled' : 'disabled'}.`));
    saveSettings();
}

/** Toggles whether structural frame processing visual loading graphics block shell boots. */
function toggleLoading() {
    settings.loadingScreen = !Boolean(settings.loadingScreen);
    console.log(chalk.green(`The loading profile is now ${settings.loadingScreen ? 'loading' : 'instant'}.`)); 
    saveSettings();  
}

/** Toggles whether performance timing information is displayed after command execution. */
function togglePerformance() {
    settings.showProcessTimeInfo = !Boolean(settings.showProcessTimeInfo);
    console.log(chalk.green(`Performance timing display is now ${settings.showProcessTimeInfo ? 'enabled' : 'disabled'}.`));
    saveSettings();
}

/** Toggles whether desktop notifications are displayed after command execution. */
function toggleNotification() {
    settings.returnNotification = !Boolean(settings.returnNotification);
    console.log(chalk.green(`Desktop notifications are now ${settings.returnNotification ? 'enabled' : 'disabled'}.`));
    saveSettings();
}

/** Toggles whether the loading animation is the new one or the old one*/
function toggleAnimatedLoading(){
    settings.showAnimatedLoading = !Boolean(settings.showAnimatedLoading);
    console.log(chalk.green(`Animated loading is now ${settings.showAnimatedLoading ? 'enabled' : 'disabled'}.`));
    saveSettings();
}
/**
 * Modifies historical terminal lookup depths parameters for dynamic codebase reads.
 * @param {Readline} rl - Active core process shell line reader instance handle.
 * @returns {Promise<void>}
 */
function changeCommitsShown(rl) {
    return new Promise((resolve) => {
        rl.question('Amount of commit messages to be shown: ', (amount) => {
            const parsedAmount = parseInt(amount, 10);

            if (!isNaN(parsedAmount)) {
                settings.commitsShown = parsedAmount;
                console.log(chalk.green(`The layout counter has been changed to ${parsedAmount}.`));
                saveSettings();
            } else {
                console.log(chalk.red('The input must be a valid number.'));
            }
            resolve();
        });
    });
}

/** Reads structural environmental attributes and prints system tracking matrices. */
function showShellInfo() {
    console.log(chalk.cyan('\n===--- TriDev Shell Information ---===\n'));
    console.log(`${chalk.yellow('Version:         ')} ${chalk.gray(version)}`);
    console.log(`${chalk.yellow('AI State:        ')} ${chalk.gray(settings.aiEnabled ? 'enabled' : 'disabled')}`);
    console.log(`${chalk.yellow('Commits Shown:   ')} ${chalk.gray(settings.commitsShown)}`);
    console.log(`${chalk.yellow('App Directory:   ')} ${chalk.gray(APP_DIR)}`);
    console.log(`${chalk.yellow('App Config Path: ')} ${chalk.gray(CONFIG_DIR)}\n`);
}

/** Prints cleanly aligned system guidance guidelines detailing core parameter structures. */
function showAdminHelp() {
    console.log(chalk.cyan('\n===--- Admin Options ---===\n'));
    console.log(`${chalk.yellow('  tds -toggleAI')}       ${chalk.gray(': Toggles the local LLM interaction layer')}`);
    console.log(`${chalk.yellow('  tds -toggleLoading')}  ${chalk.gray(': Toggles the startup canvas animation frames')}`);
    console.log(`${chalk.yellow('  tds -showShellInfo')}  ${chalk.gray(': Shows metadata statistics describing TriDev Shell')}`);
    console.log(`${chalk.yellow('  tds -commitsshown')}   ${chalk.gray(': Adjusts maximum log historical workspace depths')}`);
    console.log(`${chalk.yellow('  tds -restart')}         ${chalk.gray(': Executes a hard thread reload loop across processes')}`);
    console.log(`${chalk.yellow('  tds -togglePerformance')} ${chalk.gray(': Toggles performance timing information display')}`);
    console.log(`${chalk.yellow('  tds -toggleNotification')} ${chalk.gray(': Toggles desktop notifications for command completion')}`);
    console.log(`${chalk.yellow('  tds -toggleAnimatedLoading')} ${chalk.gray(': Toggles the boot up animation')}`);
    console.log(chalk.gray('\nMore administration features will come so the user can fully customise the shell.\n'));
}

/**
 * Spawns an isolated binary handle background process before terminating the parent loop thread context.
 * @returns {void}
 */
function restartShell() {
    console.log(chalk.yellow('Restarting TriDev Shell...'));

    const child = spawn(`"${APP_EXE}"`, [], {
        detached: true,
        stdio: 'ignore',
        shell: true,
        windowsHide: false 
    });

    child.on('error', (err) => {
        console.error(chalk.red('Failed to spawn new shell thread context process:'), err.message);
    });

    child.unref();
    process.exit();
}

/**
 * Destructive removal command sweeping system folders to drop application footprints.
 * @param {Readline} rl - Active baseline interface wrapper handle.
 * @returns {Promise<void>}
 */
async function deleteShell(rl) {
    console.log(chalk.red('\nWarning: This will delete the TriDev Shell installation. This action cannot be undone!'));
    console.log(chalk.yellow('If you wish to re-download the shell, go to this website: https://www.tridevhungary.com/projects.html'));
    console.log(`Enter ${chalk.bold('allow')} to delete the app binaries.`);
    console.log(`Enter ${chalk.bold('allowAll')} to delete the app and all profile configuration records.`);
    console.log(`Enter ${chalk.bold('anything else')} to break execution parameters and cancel.\n`);

    return new Promise((resolve) => {
        rl.question(chalk.red('> '), (answer) => {
            try {
                const choice = answer.trim().toLowerCase();

                if (choice === 'allow' || choice === 'allowall') {
                    fs.rmSync(APP_DIR, { recursive: true, force: true });

                    if (choice === 'allowall') {
                        fs.rmSync(CONFIG_DIR, { recursive: true, force: true });
                        console.log(chalk.green('TriDev Shell files and persistent settings profiles purged.'));
                    } else {
                        console.log(chalk.green('TriDev Shell core binaries deleted. Config directories kept intact.'));
                    }
                } else {
                    console.log(chalk.yellow('Deletion sequence terminated.'));
                }
            } catch (err) {
                console.error(chalk.red('Error running removal subroutines:'), err.message);
            } finally {
                resolve();
            }
        });
    });
}


//==============================
//* Module Exporter
//==============================
module.exports = adminCommand;
module.exports.ensureConfig = ensureConfig;
module.exports.loadAdminConfig = loadAdminConfig;