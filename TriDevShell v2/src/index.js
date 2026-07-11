/**
 * @fileoverview Core Entry Point and REPL Execution Engine for TriDev Shell
 * @author Schlaffer Benjamin
 * @version 1.0.0
 * @description
 * Initializes the shell workspace environment
 */


//==========================================
//* 1. Module Imports
//==========================================
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const readline = require('readline');
const Module = require('module');
const chalk = require('chalk');
const gradient = require('gradient-string');


//=== === === === 
//Helper imports
//=== === === === 
const { version } = require('../package.json');
const commandJson = require('./JSON/commands.json');
const helperJson = require('./JSON/index_helper.json');
const { conf: CONFIG_DIR, alias, logs: LOG_FILE } = require('./utils/pathManager.js');
const logJson = require('./utils/jsonParser.js').ParseJsonFile(LOG_FILE);
const FIRST_TIME = logJson.shellOpen === 0 || logJson.shellOpen === 1;


//=== === === ===
//Command imports
//=== === === ===

//Commands for shell run
const tdsAdminCommand = require('./commands/tds-admin.js');
const { AnimatedLoading } = require('./utils/loading.js');
const logCommand = require('./commands/log.js');
const { getCertainSetting } = require('./commands/settings.js');
const { getTheme } = require('./commands/color.js');
const { shellCompleter } = require('./utils/completer.js');

//Custom shell commands
const aliasCommand = require('./commands/alias.js');
const aiCommand = require('./commands/ai.js');
const attackCommand = require('./commands/attack.js');
const { changeColor } = require('./commands/color.js');
const deviceCommand = require('./commands/device.js');
const doctorCommand = require('./commands/doctor.js');
const fileCommand = require('./commands/file.js');
const mockCommand = require('./commands/mock.js');
const pathCommand = require('./commands/path.js');
const portCommand = require('./commands/port.js');
const scaffoldCommand = require('./commands/scaffold.js');
const { settingsCommand } = require('./commands/settings.js');
const sshCommand = require('./commands/ssh.js');
const taskCommand = require('./commands/task.js');
const infoCommand = require('./commands/tdinfo.js');
const templateCommand = require('./commands/template.js');
const updateCommand = require('./commands/update.js');
const workCommand = require('./commands/work.js');

//===--===--===--===
//Global variables
//===--===--===--===
const INITIAL_CWD = process.cwd();
let currentDir = INITIAL_CWD;

let isPrompting = false;
let isUpdateAvailable = false;
let activePlugins = [];

const COMMANDS = Object.keys(commandJson);
const SUBCOMMANDS = commandJson



//==========================================
//* 2. Core Shell Runtime Bootstrapper
//==========================================
/**
 * Initializes the shell's runtime profile
 */
function startShell(){
    process.stdout.write('\x1b[1 q');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: buildPrompt(),
        removeHistoryDuplicates: true,
        terminal: true, 
        completer: (line) => shellCompleter(line, currentDir)
    });

    

    rl.prompt();
    rl.on('line', (line) => {
        if (isPrompting) return;
        handleUserCommand(rl, line.trim());
    }).on('close', () => {
        console.log(chalk.yellow('\nExiting TriSev Shell. Byeee...'));
        process.exit(0);
    })
}

/**
 * Builds the promptText based on user settings and current directory
 * @returns {string} - The promtText for each new line
 */
function buildPrompt(){
    //Grabs the color
    const theme = getTheme();
    const colors = theme.colors;

    //Grabs the active line ending and sets it as a prompt text
    const lineEnding = getCertainSetting('line_endings', '/> ');
    const promptText = `${currentDir}${lineEnding}`;

    //Returns the prompt text in the theme color
    return gradient([colors.primary, colors.secondary, colors.tertiary, colors.accent])(promptText);
}

/**
 * Builds the header depending on the user settings
 * @param {boolean} shouldClear - If the header should delete everything before it gets built or no
 */
function showHeader(shouldClear = true) {
    //If it's the users first time entering the shell they will see a welcome message
    //82
    if (FIRST_TIME) {
        showWelcomeMessage();
    }



    if (shouldClear) console.clear();

    const headerStyle = getCertainSetting('header_style', 'retro').toLowerCase();
    const theme = getTheme();
    const colors = theme.colors;

    const primaryColor = chalk.hex(colors.primary || '#00FFFF');
    const accentColor = chalk.hex(colors.accent || '#FF00FF');
    const gray = chalk.gray;

    console.log('');

    if (headerStyle === 'retro') {
const title = ` ______   ______     __     _____     ______     __   __      ______     __  __     ______     __         __        
/\\__  _\\ /\\  == \\   /\\ \\   /\\  __-.  /\\  ___\\   /\\ \\ / /     /\\  ___\\   /\\ \\_\\ \\   /\\  ___\\   /\\ \\       /\\ \\       
\\/_/\\ \\/ \\ \\  __<   \\ \\ \\  \\ \\ \\/\\ \\ \\ \\  __\\   \\ \\ \\'/      \\ \\___  \\  \\ \\  __ \\  \\ \\  __\\   \\ \\ \\____  \\ \\ \\____  
   \\ \\_\\  \\ \\_\\ \\_\\  \\ \\_\\  \\ \\____-  \\ \\_____\\  \\ \\__|       \\/\\_____\\  \\ \\_\\ \\_\\  \\ \\_____\\  \\ \\_____\\  \\ \\_____\\ 
    \\/_/   \\/_/ /_/   \\/_/   \\/____/   \\/_____/   \\/_/         \\/_____/   \\/_/\\/_/   \\/_____/   \\/_____/   \\/_____/ 
                                                                                                                    `;

        console.log(gradient([colors.primary, colors.secondary, colors.tertiary, colors.accent]).multiline(title));
        
        console.log(primaryColor(` ─── TriDev Shell v${version} ────────────────────────────────────────────────────────────`));
        console.log(`   Welcome to your custom workspace environment.`);
        console.log(`   Type "help" to display custom configurations.`);
        console.log(`   Plugins Active: ${gray(activePlugins.length)} | Path: ${chalk.cyanBright(currentDir)}`);
        console.log(primaryColor(` ──────────────────────────────────────────────────────────────────────────────────`));

    } else if (headerStyle === 'alpha') {
        console.log(` ${primaryColor.bold('TRIDEV_SHELL')} ${gray('::')} ${accentColor('v' + version)}`);
        console.log(` ${gray('env:')} ${chalk.white(process.platform)} ${gray('|')} ${gray('node:')} ${chalk.white(process.version)}`);
        console.log(` ${gray('cwd:')} ${chalk.cyan(currentDir)}`);
        console.log(gray(' ──────────────────────────────────────────────────'));

    } else { // Default to 'basic'
        console.log(primaryColor(` » TriDev Shell v${version}`));
        console.log(gray(` Path: ${currentDir}`));
        console.log(gray(' ──────────────────────────────────────────────────'));
    }

    if (isUpdateAvailable) {
        console.log(`\n${chalk.red('!')} ${chalk.yellow('A new shell version is available online.')} Run ${chalk.cyan('update -allow')} to apply patches.`);
    }
    console.log('');
}

/**
 * Plays the loading animation depending on user settings and checks the updates 
 * @returns {void}
 */
async function showLoading(){
    const adminConfig = tdsAdminCommand.loadAdminConfig();
    const loadingOption = adminConfig.loadingScreen;
    const useAnimatedLoading = adminConfig.showAnimatedLoading ?? adminConfig.showAnimatedLoading ?? false;

    if (useAnimatedLoading) {
        await AnimatedLoading();
        return;
    }


    console.clear();
    const theme = getTheme();
    const primary = chalk.hex(theme.colors.primary);
    const gray = chalk.gray();


    const steps = loadingOption 
        ? (helperJson.loading_steps.slow || [])
        : (helperJson.loading_steps.fast || []);

    const frames = helperJson.loading_animation || [];

    for (const step of steps) {
        let frameIndex = 0;
        let workDone = false;
        let workResultString = '';

        const spinnerInterval = setInterval(() => {
            process.stdout.write(`\r${primary(frames[frameIndex])} ${gray(step)}`);
            frameIndex = (frameIndex + 1) % frames.length;
        }, 50);

        // Execute the real work without artificial delays
        try {
            switch (step) {
                case 'Checking for updates...':
                    isUpdateAvailable = await updateCheck();
                    workResultString = isUpdateAvailable 
                        ? `\r${chalk.red('NEW')} ${gray('New update packages located online.')}\n`
                        : `\r${chalk.green('OK ')} ${gray('Core files up to date.')}\n`;
                    break;

                case 'Loading system plugins...':
                    await loadPlugins(); // Made async if loading file systems
                    workResultString = `\r${chalk.green('OK ')} ${gray('Dynamic extensions linked cleanly.')}\n`;
                    break;

                default:
                    // If there's no actual task assigned to the step, give it a tiny aesthetic delay
                    if (!loadingOption) await new Promise(r => setTimeout(r, 200));
                    workResultString = `\r${chalk.green('OK ')} ${gray(step)}\n`;
                    break;
            }
        } finally {
            // Always clear the spinner interval and log the real output status
            clearInterval(spinnerInterval);
            process.stdout.write(workResultString);
        }
    }

    // Small breath room before the prompt hits
    await new Promise(r => setTimeout(r, 150));
};


//==========================================
//* 5. Command String Tokenizer & Router
//==========================================
/**
 * Parses the given command input and removes unwanted spaces and more
 * @param {string} input - The unparsed command input
 * @returns {string[]} - The parsed command input
 */
function parseCommand(input){
    const parts = input.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    return parts.map(p => p.replace(/^"|"$/g, ''));
}

function suppressPrompt(rl) {
    rl.setPrompt('');
    rl._prompt = '';
    rl.pause();
}

function restorePrompt(rl) {
    rl.setPrompt(buildPrompt());
    rl.resume();
    rl.prompt();
}

async function handleUserCommand(rl, input){
    const tokens = parseCommand(input);
    if (!tokens.length) return rl.prompt();

    const [cmd, ...args] = tokens;
    const normalizedCmd = cmd.toLowerCase();
    
    logCommand(['--write', normalizedCmd]);

    suppressPrompt(rl);

    try {
        const commandHandlers = {
            exit: () => { console.log(chalk.yellow('Goodbye!')); process.exit(0); },
            cls: () => console.clear(),
            clear: () => console.clear(),
            help: () => showHelp(args),
            port: () => portCommand(args),
            scaffold: () => scaffoldCommand(args, currentDir),
            tdinfo: () => infoCommand(args),
            template: () => templateCommand(args, rl),
            cd: () => handleCd(args),
            settings: () => settingsCommand(args),
            color: () => {
                if (changeColor(args)) {
                    showHeader();
                }
            },
            welcome: () => showWelcomeMessage(),
            update: () => updateCommand(args),
            doc: () => doctorCommand(args),
            log: () => logCommand(args),
            attack: () => wrapAsyncCommand(rl, attackCommand, args, rl),
            connect: () => wrapAsyncCommand(rl, sshCommand, args),
            work: () => wrapAsyncCommand(rl, workCommand, rl, args),
            device: () => wrapAsyncCommand(rl, deviceCommand, args, rl),
            file: () => wrapAsyncCommand(rl, fileCommand, args, currentDir, rl),
            mock: () => wrapAsyncCommand(rl, mockCommand, args, currentDir, rl),
            ai: () => wrapAsyncCommand(rl, aiCommand, args, rl),
            tds: () => wrapAsyncCommand(rl, tdsAdminCommand, args, rl),
            task: () => wrapAsyncCommand(rl, taskCommand, args, rl),
            path: async () => {
                const newDir = await pathCommand(args, currentDir);
                if (newDir) {
                    currentDir = newDir;
                    try {
                        process.chdir(currentDir);
                    } catch (error) {
                        console.log(chalk.red(error.message));
                    }
                }
            },
            alias: () => aliasCommand(args, rl),
            shell: () => handleShellReset(args)
        };

        const handler = commandHandlers[normalizedCmd];
        if (handler) {
            await handler();
        } else {
            const fullCommand = [cmd, ...args].map(arg => arg.includes(' ') ? `"${arg}"` : arg).join(' ');
            await new Promise((resolve) => {
                executeSystemCommand(fullCommand, resolve);
            });
        }
    } finally {
        restorePrompt(rl);
    }
}


async function wrapAsyncCommand(rl, commandFn, ...args) {
    rl.pause();

    // Check if the command uses interactive select menus (like Inquirer)
    const isInteractive = (commandFn.name === 'attackCommand' || commandFn.name === 'taskCommand');

    let kpListeners = [];
    if (isInteractive) {
        // Temporarily detach Readline's listeners so they don't fight the menu system
        kpListeners = process.stdin.listeners('keypress');
        process.stdin.removeAllListeners('keypress');
    }

    try {
        await Promise.resolve(commandFn(...args));
    } catch (err) {
        console.log(chalk.red(`Command boundary failure error: ${err.message}`));
    } finally {
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }

        // Safely hand keyboard control back to Readline
        if (isInteractive) {
            kpListeners.forEach(l => process.stdin.on('keypress', l));
        }
    }
}

/**
 * Spawns detached native shell runners to interface background TTY commands.
 * @param {string} commandStr - Aggregated string executed across OS command handlers.
 * @param {Function} callback - Thread termination signal notifier tracking completions.
 */
function executeSystemCommand(commandStr, callback) {
    const child = spawn(commandStr, {
        shell: true,
        stdio: 'inherit',
        cwd: currentDir
    });

    child.on('error', (err) => {
        console.log(chalk.red(`System execution error: ${err.message}`));
        callback();
    });

    child.on('close', () => callback());
}

/**
 * Drives structural folder traversals updating global state variables.
 * @param {string[]} args - Target destination path criteria array.
 */
function handleCd(args) {
    if (!args.length) return;
    const target = args.join(' ');
    const newPath = path.resolve(currentDir, target);

    if (fs.existsSync(newPath) && fs.lstatSync(newPath).isDirectory()) {
        currentDir = newPath;
        try {
            process.chdir(currentDir);
        } catch (err) {
            console.log(chalk.red(`Directory binding error: ${err.message}`));
        }
    } else {
        console.log(chalk.red(`The system cannot locate specific directory coordinates: ${target}`));
    }
}

/**
 * Handles the shell reset command
 * @param {string} args 
 */
function handleShellReset(args){
    const scale = args[1] || 'soft';
    if (scale === 'soft' || scale === '') showHeader();
    else if (scale === 'factory'){
        try {
            if (fs.existsSync(CONFIG_DIR)) fs.rmSync(CONFIG_DIR, { recursive: true, force: true });
            showHeader();
            console.log(chalk.yellow('! All the data from the .tridev save folder was erased !'));

        } catch (error) {
            console.log(chalk.red(`Failed to complete factory sweep: ${error.message}`));
        }
    }
    else console.log(chalk.red(`Unknown reset parameters option: '${scale}'. Use 'soft' or 'factory'.`));
}

/**
 * Shows the command and subcommand options for the shell to the user
 * @param {string[]} args - The subcommands
 * @returns 
 */
function showHelp(args = []) {
    const verbose = args.includes('--?') || args.includes('--verbose') || args.includes('-v');
    const accent = chalk.hex('#0284c7');
    const commands = helperJson.commands || [];

    const categoryMap = {
        'Development & AI': ['scaffold', 'mock', 'api', 'ai', 'plugin', 'work'],
        'System & Files': ['connect', 'path', 'file', 'device', 'attack', 'port', 'cd', 'cls', 'clear', 'exit', 'help'],
        'Shell Customization': ['shell', 'color', 'tdinfo', 'alias', 'settings', 'tds', 'update']
    };

    const getSection = (usage) => {
        const commandToken = usage.trim().split(/\s+/)[0].toLowerCase().replace(/\/.*/, '');
        for (const [section, commands] of Object.entries(categoryMap)) {
            if (commands.includes(commandToken)) return section;
        }
        return 'Other Commands';
    };

    const groupedCommands = commands.reduce((acc, [usage, desc]) => {
        const section = getSection(usage);
        if (!acc[section]) acc[section] = [];
        acc[section].push([usage, desc]);
        return acc;
    }, {});

    const sectionOrder = ['Development & AI', 'System & Files', 'Shell Customization', 'Other Commands'];

    console.log(accent('\n--- TriDev Custom Commands ---'));
    if (verbose) {
        commands.forEach(([usage, desc]) => {
            console.log(chalk.yellowBright(`  ${usage}`));
            console.log(chalk.gray(`    ${desc}\n`));
        });

        if (activePlugins.length) {
            console.log(accent('--- Custom Plugins ---'));
            activePlugins.forEach(p => console.log(chalk.yellowBright(`  ${p.name}`) + chalk.gray(` : ${p.description}\n`)));
        }

        console.log(accent('--- System Commands ---'));
        console.log(chalk.gray('  All standard system commands (dir, ipconfig, npm, git, etc) resolve correctly.\n'));
        return;
    }

    sectionOrder.forEach((section) => {
        const entries = groupedCommands[section];
        if (!entries || !entries.length) return;

        console.log(chalk.cyanBright(`\n  [${section}]`));
        entries.forEach(([usage, desc]) => {
            console.log(chalk.yellow(`  ${usage}`.padEnd(36)) + ` : ${desc}`);
        });
    });

    if (activePlugins.length) {
        console.log(chalk.cyanBright('\n  [Plugins]'));
        activePlugins.forEach(p => console.log(chalk.yellow(`  ${p.name}`.padEnd(36)) + ` : ${p.description}`));
    }

    console.log(chalk.gray('\n  ...plus all standard host platform shell utilities (dir, ipconfig, etc)\n'));
}

/**
 * Shows a welcome message that helps new users
 * 
 * [2 excetution in lifetime by {[system]} ] 
 * 
 * Users can still call it if they are stuck
 */
function showWelcomeMessage() {
    const totalWidth = 65;
    const line = '━'.repeat(totalWidth);
    
    console.log(); // Top spacing
    console.log(chalk.cyan(line));
    
    // Centered Title Block
    const title = "Welcome to TriDevShell v2.0";
    const titleLeftPad = Math.max(0, Math.floor((totalWidth - title.length) / 2));
    console.log(' '.repeat(titleLeftPad) + chalk.bold.cyan(title));
    
    // Centered Subtitle Block
    const subtitle = "Your Personalized Development Command Center";
    const subLeftPad = Math.max(0, Math.floor((totalWidth - subtitle.length) / 2));
    console.log(' '.repeat(subLeftPad) + chalk.gray(subtitle));
    
    console.log(chalk.cyan(line));
    console.log();

    // Quick Start Feature Guide
    console.log(chalk.white(`  Getting started is simple. Try these core operations:`));
    console.log();
    
    console.log(`    ${chalk.cyan('path -list')}       ${chalk.gray('» View your customized location anchors')}`);
    console.log(`    ${chalk.cyan('alias')}            ${chalk.gray('» Manage system execution macro keys')}`);
    console.log(`    ${chalk.cyan('connect')}          ${chalk.gray('» Initialize network server remote tunnels')}`);
    console.log(`    ${chalk.cyan('work')}             ${chalk.gray('» Initialize work enviorment and git actions')}`);
    console.log(`    ${chalk.cyan('help')}             ${chalk.gray('» Review structural blueprint syntax guidelines')}`);
    console.log();
    console.log(chalk.white(`  Don't forget to check the settings as well for more personalisation:`));
    console.log(`    ${chalk.cyan('color')}            ${chalk.gray('» Change the color palette of the entire shell')}`);
    console.log(`    ${chalk.cyan('settings')}         ${chalk.gray('» Personalize more of the shell experience')}`);
    console.log(`    ${chalk.cyan('tds')}              ${chalk.gray("» Admin settings to change the shell's behavior")}`);
    
    console.log();
    console.log(chalk.cyan(line));
    console.log(`  ${chalk.bold.yellow('Tip:')} Hit ${chalk.bold.green('[Tab]')} anywhere to invoke context-aware suggestions.`);
    console.log(`  Enter ${chalk.bold.green('[welcome]')} to get this message any time you feel stuck.`);
    console.log(chalk.cyan(line));
    console.log(); // Bottom spacing
}

//============================================
//* 6. Process Initialization Initialization
//============================================
// Ensure administrative system database parameters exist prior to loading animation windows
tdsAdminCommand.ensureConfig();

showLoading().then(() => {
    logCommand(['--write', 'ShellStart']);
    showHeader(!FIRST_TIME);
    startShell();
});