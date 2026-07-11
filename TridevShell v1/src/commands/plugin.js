/**
 * @fileoverview Plugin Ecosystem Manager for TriDev Shell
 * @author Schlaffer Benjamin
 * @version 4.2.7
 * @description
 * COMMANDS:
 * plugin -create [<name>]  : Spawns a new template plugin file inside your environment context.
 * plugin -delete [<name>]  : Safely unlinks a plugin file wrapper from local storage.
 * plugin -explore          : Pops open your active runtime plugin directory in OS Explorer.
 * plugin -list             : Parses and displays all available extensions and metadata.
 */

// ============================
//* Required modules
// ============================
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { exec } = require('child_process');
const os = require('os');
const { Readline } = require('readline');

// ============================
//* Constants & Configuration
// ============================
const { plug: pluginDir } = require('../utils/pathManager.js');

// ============================
//* Main command handler
// ============================
/**
 * Routing gateway orchestrating dynamic shell extension loading and management.
 * @param {string[]} args - Parameter flags and string arguments passed after core call.
 * @param {Readline} rl - Active Readline interface context for reading interactive questions.
 * @returns {void}
 */
function handlePluginCommand(args, rl) {
    const action = args[0]?.toLowerCase();
    const subcommand = args.slice(1);

    switch (action) {
        case '-create':
            createPlugin(rl, subcommand[0]);
            break;
        case '-delete':
            deletePlugin(rl, subcommand[0]);
            break;
        case '-explore':
            explorePlugins();
            break;
        case '-list':
            listPlugins();
            break;
        case '-help':
        default:
            showPluginHelp();
            break;
    }
}


// ============================
//* Command Actions
// ============================
/** Prints cleanly aligned interface details across the terminal standard output stream. */
function showPluginHelp() {
    console.log(chalk.cyan('\n--- Plugin Command Help: ---'));
    console.log(`${chalk.yellow('  plugin -create [plugin_name]: ')}${chalk.gray("Creates a new plugin with a basic template")}`);
    console.log(`${chalk.yellow('  plugin -delete [plugin_name]: ')}${chalk.gray("Deletes the specified plugin file archive")}`);
    console.log(`${chalk.yellow('  plugin -explore:              ')}${chalk.gray("Opens the plugin sandbox folder in File Explorer")}`);
    console.log(`${chalk.yellow('  plugin -list:                 ')}${chalk.gray("Shows all loaded plugin names and active descriptions")}`);
    console.log(`${chalk.yellow('  plugin -help:                 ')}${chalk.gray("Shows this help menu guidelines documentation\n")}`);
}

/**
 * Opens your system runtime file environment using native thread sub-processes.
 * @returns {null}
 */
function explorePlugins() {
    ensurePluginDir(pluginDir);
    console.log(chalk.yellow('Opening Plugin Directory...'));
    exec('start .', { cwd: pluginDir });
    return null;
}

/** Loops over filesystem files reading internal JSDoc descriptors to construct live metrics lists. */
function listPlugins() {
    ensurePluginDir(pluginDir);

    const pluginFiles = fs.readdirSync(pluginDir).filter(f => f.endsWith('.js'));

    if (pluginFiles.length === 0) {
        console.log(chalk.yellow('No added plugins found!'));
    } else {
        console.log(chalk.cyan('--- Loaded Plugins: ---'));
        let indexer = 1;
        pluginFiles.forEach(file => {
            const filePath = path.join(pluginDir, file);
            const fileContent = fs.readFileSync(filePath, 'utf-8');

            const descriptionMatch = fileContent.match(/@description\s+([^\n]+)/);
            const description = descriptionMatch ? descriptionMatch[1].trim() : 'No description provided';
            
            console.log(chalk.yellow(` ${indexer++}. ${file.padEnd(20)} - ${chalk.gray(description)}`));
        });
        console.log('');
    }
}

/**
 * Handles initialization validation chains before building dynamic script source text files.
 * @param {Readline} rl - Active operational line reader context handle.
 * @param {string} pluginName - Alphanumeric key code label token string.
 */
function createPlugin(rl, pluginName) {
    ensurePluginDir(pluginDir);

    if (!pluginName) {
        rl.question(chalk.yellow('Enter the name of the plugin: '), (answer) => {
            const cleanedAnswer = answer.trim();
            if (!cleanedAnswer) {
                console.log(chalk.red('Plugin name cannot be empty!'));
                return;
            }
            createPluginFile(cleanedAnswer);
        });
    } else {
        createPluginFile(pluginName.trim());
    }
}

/**
 * Validates dynamic deletion request items or runs fallback query flows if key metrics parameters drop.
 * @param {Readline} rl - Active operational line reader context handle.
 * @param {string} pluginName - Targeted key identifier file index match name.
 */
function deletePlugin(rl, pluginName) {
    ensurePluginDir(pluginDir);
    
    if (!pluginName) {
        listPlugins();
        rl.question(chalk.yellow('Enter the name of the plugin to delete: '), (answer) => {
            const cleanedAnswer = answer.trim();
            if (!cleanedAnswer) {
                console.log(chalk.red('Plugin name cannot be empty!'));
                return;
            }
            deletePluginFile(cleanedAnswer);
        });
    } else {
        deletePluginFile(pluginName.trim());
    }
}


// ============================
//* Helper functions
// ============================
/**
 * Safely generates persistent folder directories on system file targets.
 * @param {string} pluginDirectory - Local platform coordinate path.
 */
function ensurePluginDir(pluginDirectory) {
    if (!fs.existsSync(pluginDirectory)) {
        fs.mkdirSync(pluginDirectory, { recursive: true });
    }
}

/**
 * Direct file-writer routine injecting templates dynamically into specific file locations.
 * @param {string} pluginName - Clean name argument parsed downstream.
 */
function createPluginFile(pluginName) {
    const pluginFileName = `${pluginName}.js`;
    const pluginPath = path.join(pluginDir, pluginFileName);
    
    const template = basePluginTemplate.replace(/\[plugin_name\]/g, pluginName);
    
    fs.writeFileSync(pluginPath, template);
    console.log(chalk.green(`\n✔ ${pluginFileName} created successfully in plugins directory!`));
    console.log(chalk.gray('Please restart the shell to load the new plugin.\n'));
}

/**
 * Removes physical target objects from the drive environment framework layer.
 * @param {string} pluginName - Targeted configuration file name string.
 */
function deletePluginFile(pluginName) {
    if (!pluginName.endsWith('.js')) pluginName += '.js';
    const pluginPath = path.join(pluginDir, pluginName);

    if (fs.existsSync(pluginPath)) {
        fs.rmSync(pluginPath);
        console.log(chalk.green(`\n✔ ${pluginName} has been deleted permanently.`));
        console.log(chalk.gray('Please restart the shell to unload the deleted plugin.\n'));
    } else {
        console.log(chalk.red(`\n❌ Could not find a plugin file named '${pluginName}'.\n`));
    }
}


// ============================
//* Base plugin template
// ============================
const basePluginTemplate = `/**
 * @fileoverview [plugin_name] plugin for TriDev Shell
 * @description A basic plugin template for TriDev Shell. Customize this plugin to add new functionality to the shell.
 * @author Your Name
 * @version 1.0.0
 */

module.exports = {
    name: '[plugin_name]',
    description: 'A basic plugin template - customize this description',
    subcommands: ['-help', '-version'],
    
    /**
     * Main execute function called when the plugin command is run
     * @param {string[]} args - Command line arguments passed to the plugin
     */
    execute: function(args) {
        if (args.length > 0) {
            switch (args[0]) {
                case '-help':
                    console.log('Help info for [plugin_name]');
                    return;
                case '-version':
                    console.log('[plugin_name] plugin v1.0.0');
                    return;
                default:
                    console.log(\`Unknown subcommand: \${args[0]}\`);
                    return;
            }
        }
    }
};
`;


// ============================
//* Module Exporter
// ============================
module.exports = handlePluginCommand;



// ============================
/*
?    My little note:
?  Heyyy. So the only reason I'm writing this is to remind you:
?  Yes. Humans can write js docs too, and NO just because my code is organized and clean doesn't mean
?  that I did it with AI. Yes I used AI to help me with the '=========' lines. THATS IT. So please
?  don't ask me if I used AI. Because I didn't. This was on me. I asked for help yes but I WROTE THIS. 
   Thanks for understanding and have a nice day. Love you whoever is reading this. :)
   Also I used AI mostlz to write UI elements like the font coloriung when typing or the headers. 
*/