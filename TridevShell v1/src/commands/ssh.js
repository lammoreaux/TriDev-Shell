/**
 * @fileoverview SSH Connection Manager for TriDev Shell
 * @author Schlaffer Benjamin
 * @version 4.2.6
 * @description
 * COMMANDS:
 * connect <server>                     : Connect to a saved server alias or a direct IP.
 * connect <ip> [user]                  : Run an instant, fast connection using direct parameters.
 * connect -save <ip> <name> [user]     : Persist a new connection alias record to config database.
 * connect -remove <name>               : Remove a saved server connection template.
 * connect -delete --hard               : Clear all saved credentials and targets completely.
 * connect -list                        : Render a table view displaying all saved connection mappings.
 */

//==============================
//* Module Imports
//==============================
const { spawn } = require('child_process');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const os = require('os');

//==============================
//* Constants & Configuration
//==============================
const { conf: CONFIG_DIR, servr: CONFIG_FILE} = require('../utils/pathManager.js')
const accent = chalk.hex('#0284c7');

const DEFAULT_SERVERS = {
    'aws': 'ec2-user@3.14.15.92'
};


//==============================
//* Main Command Handler
//==============================
/**
 * Routing switchboard validating credentials and handing off background TTY execution hooks to native SSH.
 * @param {string[]} args - Parameter flags and string arguments passed after core call.
 * @returns {Promise<void>} Resolves when the active remote sub-process terminal wraps down.
 */
async function sshCommand(args) {
    if (!args || args.length === 0) {
        showConnectHelp();
        return;
    }

    const action = args[0]?.toLowerCase();

    switch (action) {
        case '-list':
        case '--list':
            listServers();
            break;
            
        case '-save':
            handleSaveAction(args);
            break;
            
        case '-remove':
            handleRemoveAction(args);
            break;
            
        case '-delete':
            handleDeleteAction(args);
            break;
            
        case '-help':
            showConnectHelp();
            break;

        default:
            await executeSshConnection(args);
            break;
    }
}


//==============================
//* Core Persistent Storage Helpers
//==============================
/** Ensures basic system environment structures are valid and mounted onto disk. */
function ensureConfig() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    if (!fs.existsSync(CONFIG_FILE)) {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_SERVERS, null, 2));
    }
}

/**
 * Reads local configurations safely from shared persistence endpoints.
 * @returns {Object.<string, string>} Mapping profiles linking alias names to target endpoints.
 */
function loadServers() {
    ensureConfig();
    try {
        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(chalk.red('Error loading servers config:', err.message));
        return DEFAULT_SERVERS;
    }
}

/**
 * Commits a structural endpoint profile securely onto standard data layers.
 * @param {string} ip - Destination interface hardware internet coordinate string.
 * @param {string} name - Base unique key dictionary identifier label.
 * @param {string|null} user - Optional configuration access credential profile block.
 * @returns {void}
 */
function saveServer(ip, name, user) {
    const servers = loadServers();
    const connectionString = user ? `${user}@${ip}` : ip;
    servers[name] = connectionString;

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(servers, null, 2));
    console.log(chalk.green(`\n✔ Saved connection '${name}' -> ${connectionString}`));
}

/**
 * Unlinks a specific alias reference pointer out of configuration files.
 * @param {string} name - Selected locator index key target matching configuration attributes.
 * @returns {void}
 */
function removeServer(name) {
    const servers = loadServers();
    if (!servers[name]) {
        console.log(chalk.red(`\n❌ Server '${name}' not found inside configuration registry.`));
        return;
    }
    delete servers[name];
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(servers, null, 2));
    console.log(chalk.green(`\n✔ Removed connection '${name}' successfully.`));
}

/** Completely purges the host directory template profile database. */
function deleteAllServers() {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({}, null, 2));
    console.log(chalk.redBright('\n💥 All saved connections have been deleted permanently.'));
}


//==============================
//* Command Actions
//==============================
/** Displays clear operational instructions describing standard SSH parameter layouts. */
function showConnectHelp() {
    console.log(accent('\n--- Connect: SSH Manager ---'));
    console.log(chalk.yellow('  connect <server>') + chalk.gray('                : Connect to saved or raw server'));
    console.log(chalk.yellow('  connect <ip> [user]') + chalk.gray('             : Run an instant, manual connection link'));
    console.log(chalk.yellow('  connect -save <ip> <name> [user]') + chalk.gray(' : Save a new persistent target connection'));
    console.log(chalk.yellow('  connect -remove <name>') + chalk.gray('           : Delete a target definition from memory'));
    console.log(chalk.yellow('  connect -delete --hard') + chalk.gray('           : Purge ALL server references cleanly'));
    console.log(chalk.yellow('  connect -list') + chalk.gray('                    : Previews stored terminal layout logs\n'));
}

/** Renders all active profile shortcuts cleanly to console output streams. */
function listServers() {
    const servers = loadServers();
    console.log(chalk.hex('#0284c7')('\n--- Saved Connections ---'));
    const keys = Object.keys(servers);
    
    if (keys.length === 0) {
        console.log(chalk.gray('  No saved connections found. Use "connect -save" to add one.'));
    } else {
        keys.forEach(key => {
            console.log(chalk.yellow(`  ${key.padEnd(16)}`) + chalk.gray(`-> ${servers[key]}`));
        });
    }
    console.log('');
}

/**
 * Validates parameter requirements before driving connection save subroutines.
 * @param {string[]} args - Sliced operational variable values tracking index arguments.
 */
function handleSaveAction(args) {
    const [_, ip, name, user] = args;

    if (!ip || !name) {
        console.log(chalk.red('\n❌ Usage: connect -save <ip> <servername> [username]'));
        return;
    }

    saveServer(ip, name, user);
}

/**
 * Formats interface attributes before removing targeting items out of system configurations.
 * @param {string[]} args - Target parameters matching data models items.
 */
function handleRemoveAction(args) {
    const name = args[1];
    if (!name) {
        console.log(chalk.red('\n❌ Usage: connect -remove <servername>'));
        return;
    }
    removeServer(name);
}

/**
 * Guards administrative destruction checks preventing unintended data removal execution.
 * @param {string[]} args - Parameters verified against structural boundary keys.
 */
function handleDeleteAction(args) {
    if (args[1] === '--hard') {
        deleteAllServers();
    } else {
        console.log(chalk.red('\n❌ Usage: connect -delete --hard'));
        console.log(chalk.gray('Warning: This action will destroy ALL recorded server links permanently.\n'));
    }
}

/**
 * Evaluates host signatures and detaches a terminal layer mapping sub-thread to execute raw native SSH.
 * @param {string[]} args - Standard server parameters mapping remote endpoints.
 * @returns {Promise<void>} Resolves when the local spawn hook closes down cleanly.
 */
function executeSshConnection(args) {
    return new Promise((resolve) => {
        const [target, username] = args;
        const servers = loadServers();

        // Check if targeted token matches an internal user profile alias shorthand, otherwise evaluate as standard direct string
        let host = servers[target] || target;

        // Perform target domain formatting matching custom terminal credential indicators
        if (username) {
            if (host.includes('@')) {
                const parts = host.split('@');
                host = `${username}@${parts[parts.length - 1]}`;
            } else {
                host = `${username}@${host}`;
            }
        }

        console.log(chalk.yellow(`\nConnecting to ${host}...`));

        // Mount a detached sub-process sharing runtime standard IO pipes to hand terminal execution keys directly to native SSH
        const child = spawn('ssh', [host], { stdio: 'inherit' });

        child.on('close', (code) => {
            console.log(chalk.gray(`\nConnection closed cleanly (Exit code: ${code}).\n`));
            resolve();
        });

        child.on('error', (err) => {
            console.log(chalk.red(`\n❌ Failed to execute SSH layer connection: ${err.message}\n`));
            resolve();
        });
    });
}


//==============================
//* Module Exporter
//==============================
module.exports = sshCommand;
module.exports.listServers = listServers;
module.exports.loadServers = loadServers;