#!/usr/bin/env node
/**
 * @fileoverview Core Entry Point and REPL Execution Engine for TriDev Shell
 * @author Schlaffer Benjamin
 * @version 5.1.1
 * @description
 * Initializes the shell workspace environment, orchestrates autocomplete tab completions,
 * injects real-time syntax token highlighting, and routes structural commands.
 * Falls back dynamically to native sub-process system shells for non-custom tasks.
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
const { version } = require('../package.json');
const commandJson = require('./JSON/commands.json');
const helperJson = require('./JSON/index_helper.json');

// Core Subcommand Architecture Imports
const { scaffoldCommand, TEMPLATES } = require('./commands/scaffold.js');
const sshCommand = require('./commands/ssh.js');
const workCommand = require('./commands/work.js');
const deviceCommand = require('./commands/device.js');
const aliasCommand = require('./commands/alias.js');
const portCommand = require('./commands/port.js');
const attackCommand = require('./commands/attack.js');
const pathCommand = require('./commands/path.js');
const fileCommand = require('./commands/file.js');
const mockCommand = require('./commands/mock.js');
const aiCommand = require('./commands/ai.js');
const { changeColor, getTheme } = require('./commands/color.js');
const infoCommand = require('./commands/tdinfo.js');
const { settingsCommand, getCertainSetting } = require('./commands/settings.js');
const updateCommand = require('./commands/update.js');
const tdsAdminCommand = require('./commands/tds-admin.js');
const pluginCommand = require('./commands/plugin.js');
const updateCheck = require('./updatecheck/updatecheck.js');
const { loadPlugins } = require('./utils/loadPlugin.js');
const templateCommand = require('./commands/template.js');
const taskCommand = require('./commands/task.js');
const doctorCommand = require('./commands/doctor.js');
const { AnimatedLoading } = require('./utils/loading.js');
const logCommand = require('./commands/log.js');


//==========================================
//* 2. Global State & Constants
//==========================================
const INITIAL_CWD = process.cwd();
let currentDir = INITIAL_CWD;
let isPrompting = false;
let isUpdateAvailable = false;
let onlySymbolLine = false;
let activePlugins = [];

const COMMANDS = Object.keys(commandJson);
const SUBCOMMANDS = commandJson;

//==========================================
//* 3. Core Shell Runtime Bootstrapper
//==========================================
/** Sets active terminal pointer shapes and instantiates the main stream input loop engine. */
function startShell() {
    // Re-shape command interface cursors down into blinking block configurations
    process.stdout.write('\x1b[1 q');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: buildPrompt(),
        removeHistoryDuplicates: true,
        terminal: true,
        completer
    });

    // Intercept default TTY raw inputs to handle cyclic inline tab selection sequences
    let tabState = { isTabbing: false, matches: [], index: -1 };
    const originalTtyWrite = rl._ttyWrite;

    rl._ttyWrite = function (d, key) {
        if (!isPrompting && key?.name === 'tab') {
            if (!tabState.isTabbing) {
                tabState.isTabbing = true;
                const [hits, partial] = completer(rl.line);
                if (hits.length > 0) {
                    tabState.matches = hits.map(hit => rl.line.slice(0, rl.line.length - partial.length) + hit);
                    tabState.index = 0;
                    rl.line = tabState.matches[tabState.index];
                    rl.cursor = rl.line.length;
                    rl._refreshLine();
                }
            } else if (tabState.matches.length > 0) {
                tabState.index = (tabState.index + 1) % tabState.matches.length;
                rl.line = tabState.matches[tabState.index];
                rl.cursor = rl.line.length;
                rl._refreshLine();
            }
            return;
        }
        tabState.isTabbing = false;
        originalTtyWrite.apply(rl, arguments);
    };

    setupSyntaxHighlighting(rl);

    rl.prompt();

    rl.on('line', (line) => {
        if (isPrompting) return;
        handleUserCommand(rl, line.trim());
    }).on('close', () => {
        console.log(chalk.yellow('\nExiting TriDev Shell. Goodbye!'));
        process.exit(0);
    });
}


//==========================================
//* 4. Terminal UI Rendering Canvas
//==========================================
/**
 * Constructs multi-color interpolation pathways across variable length working directory nodes.
 * @returns {string} Colored prompt string.
 */
function buildPrompt() {
    const theme = getTheme();
    const colors = theme.colors;

    // Broadcast workspace coordinates updates up to active Electron shell wrappers
    if (process.env.HIDE_HEADER === '1') {
        process.stdout.write('\x1b]1337;CurrentDir=' + currentDir + '\x07');
    }

    const lineEnding = getCertainSetting('line_endings', '/> ');
    if (lineEnding.includes("none")) {
        const cleanLine = lineEnding.replace("none", "");
        onlySymbolLine = true;
        return gradient([colors.primary, colors.secondary, colors.tertiary, colors.accent])(cleanLine);
    }
    onlySymbolLine = false;
    return gradient([colors.primary, colors.secondary, colors.tertiary, colors.accent])(currentDir + lineEnding);
}

/**
 * Clears terminal canvases and prints contextual platform metadata frames.
 * @param {boolean} [shouldClear=true] - Triggers standard console clean sweeps.
 */
function showHeader(shouldClear = true) {
    if (process.env.HIDE_HEADER === '1') return;

    const headerStyle = getCertainSetting('header_style', 'retro');
    const theme = getTheme();
    const colors = theme.colors;

    const primaryColor = chalk.hex(colors.primary || '#00FFFF');
    const secondaryColor = chalk.hex(colors.secondary || '#FFFFFF');
    const accentColor = chalk.hex(colors.accent || '#FF00FF');
    const gray = chalk.gray;

    if (shouldClear) console.clear();

    console.log('');
    switch (headerStyle.toLowerCase()) {
        case 'retro': {
            const title = ` ______      ______     __     _____     ______     __  __      ______     __  __     ______     __         __        
/\\__  _\\    /\\  == \\   /\\ \\   /\\  __-.  /\\  ___\\   /\\ \\/ /     /\\  ___\\   /\\ \\_\\ \\   /\\  ___\\   /\\ \\       /\\ \\       
\\/_/\\ \\/    \\ \\  __<   \\ \\ \\  \\ \\ \\/\\ \\ \\ \\  __\\   \\ \\  _\"-.   \\ \\___  \\  \\ \\  __ \\  \\ \\  __\\   \\ \\ \\____  \\ \\ \\____  
   \\ \\_\\     \\ \\_\\ \\_\\  \\ \\_\\  \\ \\____-  \\ \\_____\\  \\ \\_\\ \\_\\   \\/\\_____\\  \\ \\_\\ \\_\\  \\ \\_____\\  \\ \\_____\\  \\ \\_____\\ 
    \\/_/      \\/_/ /_/   \\/_/   \\/____/   \\/_____/   \\/_/\\/_/    \\/_____/   \\/_/\\/_/  \\/_____/   \\/_____/  \\/_____/ \n`;

            console.log(gradient([colors.primary, colors.secondary, colors.tertiary, colors.accent]).multiline(title));

            const boxWidth = 114;
            const titleStr = ` TriDev Shell v${version} `;

            console.log(primaryColor(`╭─`) + secondaryColor(titleStr) + primaryColor('─'.repeat(boxWidth - titleStr.length - 1)) + primaryColor(`╮`));

            let currentDisplayDir = currentDir;
            if (currentDisplayDir.length > 50) {
                currentDisplayDir = currentDisplayDir.slice(0, 45) + "...";
            }

            const row = (lStr, rStr) => {
                const lLen = lStr.replace(/\u001b\[.*?m/g, '').length;
                const rLen = rStr.replace(/\u001b\[.*?m/g, '').length;
                const rightColWidth = 35;
                const leftColWidth = boxWidth - rightColWidth - 3;
                console.log(primaryColor('│ ') + lStr + ' '.repeat(Math.max(0, leftColWidth - lLen)) + primaryColor('│ ') + rStr + ' '.repeat(Math.max(0, rightColWidth - rLen)) + primaryColor('│'));
            };

            row(`  Welcome to your custom workspace environment.`, accentColor(`Console Links`));
            row(`  Type "help" to display custom configurations or execute standard OS tasks.`, gray(`Plugins Active: ${activePlugins.length}`));
            row(` `, ``);
            row(`  ${chalk.white('AI Engine Core:')} Ollama Integration Matrix Ready`, accentColor(`System Profile`));
            row(`  ${chalk.white('Active Path:')}    ${chalk.cyanBright(currentDisplayDir)}`, gray(`Listening...`));

            console.log(primaryColor(`╰`) + primaryColor('─'.repeat(boxWidth)) + primaryColor(`╯`));
            break;
        }

        case 'basic':
            console.log(primaryColor(`» TriDev Shell v${version}`));
            console.log(gray(`Path: ${currentDir}`));
            console.log(gray('──────────────────────────────────────────────────'));
            break;

        case 'alpha':
            console.log(` ${primaryColor.bold('TRIDEV_SHELL')} ${gray('::')} ${accentColor('v' + version)}`);
            console.log(` ${gray('env:')} ${chalk.white(process.platform)} ${gray('|')} ${gray('node:')} ${chalk.white(process.version)}`);
            console.log(` ${gray('cwd:')} ${chalk.cyan(currentDir)}`);
            console.log(` ${gray('--------------------------------------------------')}`);
            break;
    }

    if (isUpdateAvailable) {
        console.log(`\n${chalk.red('!')} ${chalk.yellow('A new shell version is available online.')} Run ${chalk.cyan('update -allow')} to apply patches.`);
    }
    console.log('');
}

/** Animates a custom status loader sequence across standard console loops. */
async function showLoading() {
    const adminConfigData = tdsAdminCommand.loadAdminConfig();
    const loadingOption = adminConfigData.loadingScreen;
    const animation = adminConfigData.showAnimatedLoading ?? adminConfigData.AnimatedLoading ?? false;

    if (Boolean(animation)) {
        await AnimatedLoading();
        return;
    }


    console.clear();
    const theme = getTheme();
    const primary = chalk.hex(theme.colors.primary);
    const gray = chalk.gray;

    let steps = helperJson.loading_steps.fast || [];
    const frames = helperJson.loading_animation || [];

    if (loadingOption) {
        steps = helperJson.loading_steps.slow || [];
    }

    for (let j = 0; j < steps.length; j++) {
        const step = steps[j];
        let frameIndex = 0;
        const duration = j === 0 ? 800 : 500 + Math.random() * 300;
        const endTime = Date.now() + duration;

        while (Date.now() < endTime) {
            process.stdout.write(`\r${primary(frames[frameIndex])} ${gray(step)}`);
            frameIndex = (frameIndex + 1) % frames.length;
            await new Promise(r => setTimeout(r, 50));
        }

        switch (step) {
            case 'Checking for updates...':
                isUpdateAvailable = await updateCheck();
                if (isUpdateAvailable) {
                    process.stdout.write(`\r${chalk.red('NEW')} ${gray('New update packages located online.')}\n`);
                } else {
                    process.stdout.write(`\r${chalk.green('OK')} ${gray('Core files up to date.')}\n`);
                }
                break;

            case 'Loading system plugins...':
                loadPlugins();
                process.stdout.write(`\r${chalk.green('OK')} ${gray('Dynamic extensions linked cleanly.')}\n`);
                if (!loadingOption) await new Promise(r => setTimeout(r, 500));
                break;

            default:
                process.stdout.write(`\r${chalk.green('OK')} ${gray(step)}\n`);
                break;
        }
    }
    await new Promise(r => setTimeout(r, 200));
};

//==========================================
//* 5. Command String Tokenizer & Router
//==========================================
/**
 * Safely splices command lines handling quoted sub-string blocks.
 * @param {string} input - Raw user typing captured out of line streams.
 * @returns {string[]} Formatted configuration token items arrays.
 */
function parseCommand(input) {
    const parts = input.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    return parts.map(p => p.replace(/^"|"$/g, ''));
}

/**
 * Routes core user parameters down into explicit subcommands loops handlers.
 * @param {readline.Interface} rl - Target interface layer processing input streams.
 * @param {string} input - Raw console row data metrics.
 */
async function handleUserCommand(rl, input) {
    const tokens = parseCommand(input);
    if (!tokens.length) {
        rl.prompt();
        return;
    }

    const [cmd, ...args] = tokens;
    const normalizedCmd = cmd.toLowerCase();

    // 1. Core Synchronous Operations Switches

    logCommand(['--write', normalizedCmd]);

    switch (normalizedCmd) {
        case 'exit':
            console.log(chalk.yellow('Goodbye!'));
            process.exit(0);

        case 'cls':
        case 'clear':
            console.clear();
            rl.prompt();
            return;

        case 'cd':
            handleCd(args);
            if (onlySymbolLine) showHeader(false);
            rl.setPrompt(buildPrompt());
            rl.prompt();
            return;

        case 'help':
            showHelp(args);
            rl.prompt();
            return;

        case 'port':
            portCommand(args);
            rl.prompt();
            return;

        case 'scaffold':
            scaffoldCommand(args, currentDir);
            rl.prompt();
            return;

        case 'tdinfo':
            infoCommand(args);
            rl.prompt();
            return;

        case 'settings':
            settingsCommand(args);
            rl.setPrompt(buildPrompt());
            rl.prompt();
            return;

        case 'update':
            updateCommand(args);
            return;

        case 'plugin':
            pluginCommand(args, rl);
            return;

        case 'color':
            if (changeColor(args)) {
                rl.setPrompt(buildPrompt());
                showHeader();
            }
            rl.prompt();
            return;
        case 'template':
            templateCommand(args, rl);
            rl.prompt();
            return;
        case 'doc':
            doctorCommand(args);
            return;
        case 'log':
            logCommand(args);
            return;
    }

    // 2. Custom Command Aliasing Evaluation Block
    if (normalizedCmd === 'alias') {
        try {
            const userAliases = aliasCommand.LoadAlias();
            const action = args[0];
            if (action && !action.startsWith('-') && userAliases[action]) {
                const aliasValue = userAliases[action];
                const expanded = aliasValue + (args.length > 1 ? ' ' + args.slice(1).join(' ') : '');
                rl.emit('line', expanded);
                return;
            }
        } catch (e) { /* Safe silent profile lookup skips */ }
        aliasCommand(args);
        rl.prompt();
        return;
    }

    // 3. Environmental State Adjustments Block
    if (normalizedCmd === 'shell' && args[0] === '-reset') {
        const scale = args[1] || 'soft';
        if (scale === 'soft') {
            showHeader();
        } else if (scale === 'factory') {
            const configDir = path.join(os.homedir(), '.tridev');
            try {
                if (fs.existsSync(configDir)) fs.rmSync(configDir, { recursive: true, force: true });
                currentDir = INITIAL_CWD;
                process.chdir(currentDir);
                showHeader();
                console.log(chalk.green('✔ Shell configurations successfully restored to factory defaults.'));
            } catch (err) {
                console.log(chalk.red(`Failed to complete factory sweep: ${err.message}`));
            }
        } else {
            console.log(chalk.red(`Unknown reset parameters option: '${scale}'. Use 'soft' or 'factory'.`));
        }
        rl.prompt();
        return;
    }

    // 4. Asynchronous Operational Targets Registry Map
    const asyncMap = {
        'attack': () => wrapAsyncCommand(rl, attackCommand, args, rl),
        'connect': () => wrapAsyncCommand(rl, sshCommand, args),
        'work': () => wrapAsyncCommand(rl, workCommand, rl, args),
        'device': () => wrapAsyncCommand(rl, deviceCommand, args, rl),
        'file': () => wrapAsyncCommand(rl, fileCommand, args, currentDir, rl),
        'mock': () => wrapAsyncCommand(rl, mockCommand, args, currentDir, rl),
        'ai': () => wrapAsyncCommand(rl, aiCommand, args, rl),
        'tds': () => wrapAsyncCommand(rl, tdsAdminCommand, args, rl),
        'task': () => wrapAsyncCommand(rl, taskCommand, args, rl),
        'path': async () => {
            const newDir = await pathCommand(args, currentDir);
            if (newDir) {
                currentDir = newDir;
                try { process.chdir(currentDir); } catch (e) { console.log(chalk.red(e.message)); }
                rl.setPrompt(buildPrompt());
            }
            rl.prompt();
        }
    };

    if (asyncMap[normalizedCmd]) {
        await asyncMap[normalizedCmd]();
        return;
    }

    // 5. Dynamic Extension Plugin Evaluation Hook
    const plugin = activePlugins.find(p => p.name === normalizedCmd);
    if (plugin) {
        await wrapAsyncCommand(rl, plugin.execute, args, rl);
        return;
    }

    // 6. External System Fallback Layer (CMD / Bash Process Hand-off)
    isPrompting = true;
    rl.pause();

    const fullCommand = [cmd, ...args].map(arg => arg.includes(' ') ? `"${arg}"` : arg).join(' ');
    executeSystemCommand(fullCommand, () => {
        isPrompting = false;
        rl.resume();
        rl.prompt();
    });
}


//==========================================
//* 6. System Utility Workers
//==========================================
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
 * Locks main interface lines during slow asynchronous task executions to prevent stream fragmentation.
 * @param {readline.Interface} rl - Shell focus controller reference.
 * @param {Function} commandFn - Wrapped logic target executing async tasks.
 * @param {...any} args - Variable metrics passed down into underlying command blocks.
 */
async function wrapAsyncCommand(rl, commandFn, ...args) {
    isPrompting = true;
    rl.pause();

    const isInteractiveInquirer = (commandFn.name === 'attackCommand' || commandFn.name === 'taskCommand');

    let kpListeners = [];
    if (isInteractiveInquirer) {
        kpListeners = process.stdin.listeners('keypress');
        process.stdin.removeAllListeners('keypress');
    }

    try {
        await Promise.resolve(commandFn(...args));
    } catch (err) {
        console.log(chalk.red(`Command boundary failure error: ${err.message}`));
    } finally {
        isPrompting = false;

        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }

        // Re-attach core structural keystroke listeners unlinked during execution
        if (isInteractiveInquirer) {
            kpListeners.forEach(l => {
                process.stdin.on('keypress', l);
            });
        }

        rl.resume();
        rl.prompt();
    }
}


//==========================================
//* 7. Tab-Completion Engine Matrix
//==========================================
/**
 * Synchronous completion evaluator matching active input states against registered keys.
 * @param {string} line - Current active row contents typed by user.
 * @returns {Array[]} Splice coordinates packaging match options arrays alongside lookahead strings.
 */
function completer(line) {
    const safeLine = line.trimStart();
    if (!safeLine.includes(' ')) {
        const hits = COMMANDS.filter((c) => c.startsWith(safeLine));
        return [hits.length ? hits : [], safeLine];
    }

    const parts = line.split(' ');
    const cmd = parts[0];
    const lastWord = parts[parts.length - 1];

    // Context Evaluation: Standard Subcommands
    if (SUBCOMMANDS[cmd] && parts.length === 2) {
        let hits = SUBCOMMANDS[cmd].filter((s) => s.startsWith(lastWord));

        if (cmd === 'path') {
            try {
                const aliases = Object.keys(pathCommand.loadPaths());
                hits = [...hits, ...aliases.filter(a => a.startsWith(lastWord))];
            } catch (e) { /* Safe silent lookup skips */ }
        }
        if (cmd === 'connect') {
            try {
                const servers = Object.keys(sshCommand.loadServers());
                hits = [...hits, ...servers.filter(s => s.startsWith(lastWord))];
            } catch (e) { /* Safe silent lookup skips */ }
        }
        if (cmd === 'alias') {
            try {
                const aliases = Object.keys(aliasCommand.LoadAlias());
                hits = [...hits, ...aliases.filter(a => a.startsWith(lastWord))];
            } catch (e) { /* Safe silent lookup skips */ }
        }
        if (cmd === 'template') {
            try {
                const templates = templateCommand.loadTemplates();
                hits = [...hits, ...templates.filter(t => t.startsWith(lastWord))];
            } catch (e) { /* Safe silent lookup skips */ }
        }

        if (hits.length > 0) return [hits, lastWord];
    }

    // Context Evaluation: Three-part Multi-Flag Removals
    if (parts.length === 3 && parts[1] === '-remove') {
        let matches = [];
        if (cmd === 'path') matches = Object.keys(pathCommand.loadPaths() || {});
        if (cmd === 'connect') matches = Object.keys(sshCommand.loadServers() || {});
        if (cmd === 'alias') matches = Object.keys(aliasCommand.LoadAlias() || {});

        const hits = matches.filter(m => m.startsWith(lastWord));
        if (hits.length > 0) return [hits, lastWord];
    }

    // Context Evaluation: Dynamic Local File Explorer Trees Navigation
    if (cmd === 'cd' || parts.length > 0) {
        try {
            let dirToCheck = currentDir;
            let partial = lastWord;
            let filePrefix = '';

            const separator = lastWord.includes('/') ? '/' : (lastWord.includes('\\') ? '\\' : null);
            if (separator) {
                const lastSepIndex = lastWord.lastIndexOf(separator);
                const dirPart = lastWord.substring(0, lastSepIndex);
                partial = lastWord.substring(lastSepIndex + 1);
                dirToCheck = path.resolve(currentDir, dirPart);
                filePrefix = dirPart + separator;
            }

            if (fs.existsSync(dirToCheck) && fs.lstatSync(dirToCheck).isDirectory()) {
                let files = fs.readdirSync(dirToCheck).filter(f => f.startsWith(partial));
                if (cmd === 'cd') {
                    files = files.filter(f => {
                        try { return fs.statSync(path.join(dirToCheck, f)).isDirectory(); } catch { return false; }
                    });
                }
                return [files.map(f => filePrefix + f), lastWord];
            }
        } catch (err) {
            return [[], lastWord];
        }
    }

    return [[], line];
}


//==========================================
//* 8. Live Real-Time Syntax Highlighting
//==========================================
/**
 * Injects VT100/ANSI rendering escape codes directly across active writing buffers.
 * @param {readline.Interface} rl - Target interface layer hooked for styling overrides.
 */
function setupSyntaxHighlighting(rl) {
    const originalWrite = rl._writeToOutput;

    rl._writeToOutput = function (stringToWrite) {
        if (!isPrompting && rl.line) {
            const lineIndex = stringToWrite.lastIndexOf(rl.line);
            if (lineIndex !== -1) {
                const prefix = stringToWrite.slice(0, lineIndex);
                let linePart = stringToWrite.slice(lineIndex);

                const parts = rl.line.trimStart().split(/\s+/);
                const cmd = parts[0];

                if (COMMANDS.includes(cmd)) {
                    let formattedLine = '';
                    let tempLine = linePart;
                    let isFirstWord = true;

                    const tokenRegex = /^(\s*)([^\s]+)/;
                    while (tempLine.length > 0) {
                        const match = tempLine.match(tokenRegex);
                        if (!match) {
                            formattedLine += tempLine;
                            break;
                        }

                        const [fullMatch, preSpace, word] = match;
                        tempLine = tempLine.substring(fullMatch.length);

                        let coloredWord = word;
                        if (isFirstWord) {
                            if (COMMANDS.includes(word)) coloredWord = chalk.yellow(word);
                        } else {
                            if (SUBCOMMANDS[cmd]?.includes(word)) {
                                coloredWord = chalk.yellowBright(word);
                            } else {
                                const checkList = (fn) => {
                                    try {
                                        const result = fn();
                                        if (Array.isArray(result)) return result;
                                        if (result && typeof result === 'object') return Object.keys(result);
                                    } catch { }
                                    return [];
                                };
                                if (cmd === 'alias' && checkList(aliasCommand.LoadAlias).includes(word)) coloredWord = chalk.cyanBright(word);
                                if (cmd === 'path' && checkList(pathCommand.loadPaths).includes(word)) coloredWord = chalk.cyanBright(word);
                                if (cmd === 'connect' && checkList(sshCommand.loadServers).includes(word)) coloredWord = chalk.cyanBright(word);
                                if (cmd === 'template' && checkList(templateCommand.loadTemplates).includes(word)) coloredWord = chalk.cyanBright(word);
                            }
                        }

                        formattedLine += preSpace + coloredWord;
                        isFirstWord = false;
                    }
                    stringToWrite = prefix + formattedLine;
                }
            }
        }
        originalWrite.call(rl, stringToWrite);
    };

    // Force an instant microtask tick rewrite on key strokes to clean paint lines dynamically
    process.stdin.on('keypress', (c, k) => {
        if (!isPrompting && (!k || k.name !== 'tab')) {
            setTimeout(() => {
                if (!isPrompting) rl._refreshLine();
            }, 0);
        }
    });
}


//==========================================
//* 9. Central Documentation Display Help
//==========================================
/**
 * Renders cleanly structured usage blueprints describing parameters signatures.
 * @param {string[]} [args=[]] - Explicit option configuration array filters.
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


//============================================
//* 10. Process Initialization Initialization
//============================================
// Ensure administrative system database parameters exist prior to loading animation windows
tdsAdminCommand.ensureConfig();

showLoading().then(() => {
    logCommand(['--write', 'ShellStart']);
    showHeader();
    startShell();
});