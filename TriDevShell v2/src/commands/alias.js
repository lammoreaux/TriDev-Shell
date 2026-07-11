/**
 * @fileoverview Alias manager for TriDev Shell
 * @author Schlaffer Benjamin
 * @version 4.3.1
 * @description
 * COMMANDS:
 * alias -add <alias_name> <command_to_run> : Create a new alias.
 * alias -list    : List all aliases.
 * alias -remove <alias_name> : Remove an alias.
 */

/**
 * @typedef {Object} AliasObject
 * @property {string} aliasName - The shortcut command typed by the user.
 * @property {string} commandToRun - The actual shell command that executes.
 */


//==============================
//*      Module Imports
//==============================
const chalk = require('chalk');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const { conf: CONFIG_DIR, alias: CONFIG_FILE } = require('../utils/pathManager.js');

//==============================
//*    Main command handler
//==============================
/**
 * The main command handler
 * @param {string[]} args the arguments after the main command
 * @returns {void} 
 */
function aliasCommand(args, rl){
    const aliases = LoadAlias();
    const action = args[0];

    if (aliases[action]) {
        const systemCommand = aliases[action];

        rl.pause();

        return new Promise((resolve) => {
            const child = spawn(systemCommand, {
                stdio: 'inherit',
                shell: true
            });

            child.on('close', () => {
                rl.resume();
                resolve();
            });

            child.on('error', (error) => {
                console.log(chalk.red(`Failed to run alias "${action}": ${error.message}`));
                rl.resume();
                resolve();
            });
        });
    }

    switch (action){
        default:
            showAliasHelp();
            break;
        case '-list':
            listAliases(aliases);
            break;
        case '-add':
            addAction(args, aliases);
            break;
        case '-remove':
            removeAction(args, aliases);
            break;
    }
}


//==============================
//*    Main command helpers
//==============================
/**
 * Makes sure that all the config files and directories are available
 * @returns {void}
 */
function ensureConfig() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR);
    }
    if (!fs.existsSync(CONFIG_FILE)) {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({}));
    }
}
/**
 * Loads in all the saved aliases from config files
 * @returns {void}
 */
function LoadAlias() {
    ensureConfig();
    try {
        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
}

/**
 * Saves aliases to the config files
 * @param {AliasObject} aliases 
 * @returns {void}
 */
function saveAliases(aliases) {
    ensureConfig();
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(aliases, null, 2));
    } catch (error) {
        console.log(chalk.red('Failed to save aliases file.'));
    }
}

//==============================
//*     Command actions
//==============================
/**Shows all the command options for the alias command*/
function showAliasHelp() {
    console.log(chalk.cyanBright('Alias Command Help:'));
    console.log(chalk.green('  alias -add <name> <cmd>') + chalk.gray(' : Create a new alias.'));
    console.log(chalk.green('  alias -list             ') + chalk.gray(' : List all aliases.'));
    console.log(chalk.green('  alias -remove <name>    ') + chalk.gray(' : Remove an alias.'));
    console.log(chalk.green('  alias <name>            ') + chalk.gray(' : Show what a name is aliased to.'));
};
/**
 * List's out all the aliases from the config files
 * @param {AliasObject} aliases 
 * @returns {void}
 */
function listAliases(aliases) {
    const entries = Object.entries(aliases);
    if (entries.length === 0) {
        console.log(chalk.yellow('No aliases defined.'));
        return;
    }
    console.log(chalk.blue('\n--- Defined Aliases ---'));
    for (const [alias, command] of entries) {
        console.log(chalk.yellow(`  ${alias.padEnd(15)}`) + chalk.gray(`-> ${command}`));
    }
    console.log('');
}

/**
 * Adds a new alias through the saveAlias function after validation
 * @param {AliasObject} aliases The aliases 
 * @param {string} aliasName The name of the new alias
 * @param {string} commandToRun The command that the alias needs to run upon call
 * @returns 
 */
function addAlias(aliases, aliasName, commandToRun) {
    // Basic loop prevention
    if (aliasName === commandToRun.split(' ')[0]) {
        console.log(chalk.red(`Error: Alias name "${aliasName}" cannot be the same as the start of the command.`));
        return;
    }

    aliases[aliasName] = commandToRun;
    saveAliases(aliases);
    console.log(chalk.green(`> Alias "${aliasName}" saved successfully.`));
}

function removeAlias(aliases, aliasName) {
    if (!aliases[aliasName]) {
        console.log(chalk.red(`Alias "${aliasName}" not found.`));
        return;
    }
    delete aliases[aliasName];
    saveAliases(aliases);
    console.log(chalk.green(`> Alias "${aliasName}" removed.`));
}


/**
 * Checks some parametrs before the addAlias function gets called
 * @param {string[]} args 
 * @param {AliasObject} aliases 
 * @returns {void}
 */
function addAction(args, aliases){
    if (args.length < 3) {
        console.log(chalk.red('Usage: alias -add <name> <command>'));
        return;
    }

    const aliasName = args[1];
    const commandToRun = args.slice(2).join(' ');
    addAlias(aliases, aliasName, commandToRun);
    return;
}

/**
 * Checks some parametrs before the removeAlias function gets called
 * @param {string[]} args 
 * @param {AliasObject} aliases
 * @returns {void}
 */
function removeAction(args, aliases){
    const aliasName = args[1];
    if (!aliasName) {
        console.log(chalk.red('Usage: alias -remove <name>'));
        return;
    }
    removeAlias(aliases, aliasName);
    return;
}


//==============================
//*    Command exporters
//==============================
module.exports = aliasCommand;
module.exports.LoadAlias = LoadAlias;



//? The idea that started it all?//

/**
 * * The idea is that the user can create aliases for commands.
 * * For example: alias <alias_name> <command_to_run>
 * * Then the user can just type <alias_name> to run the command.
 * * The alias should be stored in a file in the user's home directory.
 * * The file should be named .tridev/aliases.json
 * * The file should be a JSON object with the following format:
 * * {
 * *   "alias_name": "command_to_run",
 * *   "alias_name": "command_to_run",
 * *   "alias_name": "command_to_run"
 * * }
 */
