/**
 * @fileoverview Workspace Workspace Automation and Git Lifecycle Utility for TriDev Shell
 * @author Schlaffer Benjamin
 * @version 1.0.0
 * @description
 * COMMANDS:
 * work start            : Automatically fires up all local workspace application executable paths.
 * work save [message]   : Runs an automated git add and commit sequence wrapper.
 * work done             : Spawns a synchronous foreground thread to execute a git push.
 * work setup            : Interactively registers workspace application executable paths.
 * work discharge [type] : Restores repository state parameters (-soft or -hard HEAD resets).
 * work oops             : Interactively updates and amends your most recent git commit message.
 * work info             : Reads active repository statuses and previews brief trailing commit strings.
 */

//========================================
//* Module Imports
//========================================
const chalk = require('chalk');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { Readline } = require('readline');

//========================================
//* Config Imports
//========================================
const adminConfig = require('./tds-admin.js');
const APP_CONFIG_FILE = path.join(__dirname, '..', 'JSON', 'opening_apps.json');
const { workc } = require('../utils/pathManager.js');

//========================================
//* Constants & Configuration
//========================================
const DEFAULT_CONFIGURED_APPS = {
    apps: []
};


//========================================
//* Main Command Handler
//========================================
/**
 * Main command router filtering developer workflow operations and Git VCS utilities.
 * @param {Readline} rl - Active Readline capture interface context handle.
 * @param {string[]} args - Sliced argument arrays containing target actions and option flags.
 * @returns {Promise<void>|void}
 */
function workCommand(rl, args) {
    ensureAppConfigFile();
    const action = args[0]?.toLowerCase();
    const secondAction = args.slice(1);

    switch (action) {
        case 'start':
            startApps();
            break;
        case 'save':
            return saveGit(rl, secondAction);
        case 'oops':
            return redoCommitMessage(rl);
        case 'done':
            return pushGit();
        case 'setup':
            return setupEnvironment(rl);
        case 'discharge':
            restoreLatestCommit(secondAction, rl, secondAction);
            break;
        case 'info':
            return showGitInfo();
        case 'help':
        default:
            workHelpCommand();
            break;
    }
}


//========================================
//* Core Storage & Environment Helpers
//========================================
/** Ensures the application tracking configuration JSON asset is available on disk. */
function ensureAppConfigFile() {
    if (!fs.existsSync(workc)) {
        fs.writeFileSync(workc, JSON.stringify(DEFAULT_CONFIGURED_APPS, null, 4), 'utf8');
    }
}

/**
 * Loads registered workspace files cleanly from local JSON configs.
 * @returns {{apps: string[]}} Object instance compiling file location strings.
 */
function loadOpeningAppsConfig() {
    ensureAppConfigFile();
    try {
        const raw = fs.readFileSync(workc, 'utf8');
        const config = JSON.parse(raw);
        if (!config || !Array.isArray(config.apps)) {
            return { apps: [] };
        }
        return config;
    } catch (err) {
        return { apps: [] };
    }
}

/**
 * Persists updated application lists back down onto storage layers.
 * @param {{apps: string[]}} config - Object mapping collection properties.
 */
function saveOpeningAppsConfig(config) {
    fs.writeFileSync(workc, JSON.stringify(config, null, 4), 'utf8');
}

/**
 * Interface query prompt wrapper isolating resolve logic strings.
 * @param {Readline} rl - Active shell line reader instance handles.
 * @param {string} question - Informational prompt text displayed across the row boundary.
 * @returns {Promise<string>} Trimmed user text input response values.
 */
function askQuestion(rl, question) {
    return new Promise((resolve) => {
        rl.question(chalk.yellow(question), (answer) => resolve(answer.trim()));
    });
}

/**
 * Spawns an isolated detached thread mapping default host parameters to launch executables.
 * @param {string} appPath - Destination target coordinate address or system variable.
 * @returns {Promise<boolean>} True if the operation fired successfully.
 */
function openApplication(appPath) {
    return new Promise((resolve) => {
        let child;

        if (process.platform === 'win32') {
            child = spawn('cmd', ['/c', 'start', '""', appPath], {
                detached: true,
                stdio: 'ignore'
            });
        } else if (process.platform === 'darwin') {
            child = spawn('open', [appPath], {
                detached: true,
                stdio: 'ignore'
            });
        } else {
            child = spawn('xdg-open', [appPath], {
                detached: true,
                stdio: 'ignore'
            });
        }

        child.on('error', () => resolve(false));
        child.unref();
        resolve(true);
    });
}


//========================================
//* Command Actions
//========================================
/** Prints cleanly aligned terminal guide lines detailing core parameter structures. */
function workHelpCommand() {
    console.log(chalk.cyan('\n--- Work Command Help ---'));
    console.log(chalk.yellow('  work help') + chalk.gray('             : Shows structural work syntax usage manuals'));
    console.log(chalk.yellow('  work start') + chalk.gray('            : Starts all configured workspace tool links'));
    console.log(chalk.yellow('  work save [message]') + chalk.gray('   : Forces an automated git <add .> + <commit -m>'));
    console.log(chalk.yellow('  work done') + chalk.gray('             : Spawns synchronous foreground threads to git <push>'));
    console.log(chalk.yellow('  work setup') + chalk.gray('            : Mounts an active intercept menu configuring apps')); 
    console.log(chalk.yellow('  work discharge [type] <commit>') + chalk.gray(' : Rewinds repository states back onto last commit bounds'));
    console.log(chalk.yellow('  work oops') + chalk.gray('             : Amends and alters your most recent commit message'));
    console.log(chalk.yellow('  work info') + chalk.gray('             : Pulls tracking states descriptive statistics logs\n'));
}

/**
 * Sweeps active directories calling git tools to display status metrics maps.
 * @returns {Promise<void>}
 */
function showGitInfo() {
    const adminConfigs = adminConfig.loadAdminConfig();
    const gitCommitShown = adminConfigs.commitsShown;
    console.log(chalk.cyan('\n--- Repository Status ---'));

    return new Promise((resolve) => {
        const status = spawn('git', ['status'], { stdio: 'inherit' });

        status.on('close', (code) => {
            if (code !== 0) {
                console.log(chalk.red('Status metrics failed to resolve. Verify local git tracking context.'));
                resolve(); 
                return;
            }

            console.log(chalk.cyan('\n--- Recent Logs ---'));
            console.log(chalk.gray('Configure historical display thresholds anytime via the administrative tds panel.'));
            
            const log = spawn('git', ['log', `-${gitCommitShown}`, '--oneline'], { stdio: 'inherit' });

            log.on('close', (logCode) => {
                if (logCode === 0) {
                    console.log(chalk.green('\nRepository telemetry fetched successfully.'));
                } else {
                    console.log(chalk.red('Log metrics failed to resolve.'));
                }
                resolve();
            });

            log.on('error', (err) => {
                console.log(chalk.red('Error fetching history trees: ' + err));
                resolve();
            });
        });

        status.on('error', (err) => {
            console.log(chalk.red('Failed to mount internal git monitoring processes: ' + err));
            resolve();
        });
    });
}

/**
 * Automates tracking staging updates and signs localized repository changes.
 * @param {Readline} rl - Active user interface wrapper capture module.
 * @param {string[]} secondCommand - Sliced parameters list containing string message tokens.
 * @returns {Promise<void>}
 */
function saveGit(rl, secondCommand) {
    if (secondCommand && secondCommand.length > 0) {
        const joinedMessage = secondCommand.join(' ');
        return new Promise((resolve) => {
            exec('git add .', (err, stdout, stderr) => {
                if (err) {
                    console.log(chalk.red(stderr || err.message));
                    resolve();
                    return;
                }

                exec(`git commit -m "${joinedMessage}"`, (commitErr, commitStdout, commitStderr) => {
                    if (commitErr) {
                        console.error(chalk.red(commitStderr || commitErr.message));
                    } else {
                        console.log(chalk.gray(`\ngit add .\ngit commit -m "${joinedMessage}"`));
                        console.log(chalk.green(commitStdout.trim()) + '\n');
                    }
                    resolve();
                });
            }); 
        });
    }

    return new Promise((resolve) => {
        rl.question(chalk.yellow('\nEnter the commit message: '), (message) => {
            const cleanedMessage = message.trim();
            if (!cleanedMessage) {
                console.log(chalk.red('Commit process aborted: An explicit message description is required.'));
                resolve();
                return;
            }
            
            console.log(chalk.gray('\ngit add .'));

            exec('git add .', (err, stdout, stderr) => {
                if (err) {
                    console.log(chalk.red(stderr || err.message));
                    resolve();
                    return;
                }

                exec(`git commit -m "${cleanedMessage}"`, (commitErr, commitStdout, commitStderr) => {
                    if (commitErr) {
                        console.error(chalk.red(commitStderr || commitErr.message));
                    } else {
                        console.log(chalk.gray(`git commit -m "${cleanedMessage}"`));
                        console.log(chalk.green(commitStdout.trim()) + '\n');
                    }
                    resolve();
                });
            }); 
        });
    });
}

/**
 * Deploys data state increments out to origin master heads using tracking channels.
 * @returns {Promise<void>}
 */
function pushGit() {
    return new Promise((resolve) => {
        console.log(chalk.gray('\nPushing changes up to remote master origins...\n'));
        
        const child = spawn('git', ['push'], { stdio: 'inherit' });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(chalk.green('\n✔ Git push sequence completed.'));
            } else {
                console.log(chalk.red(`\n❌ Git push rejected. Execution failure exit code: ${code}`));
            }
            resolve();
        });

        child.on('error', (err) => {
            console.log(chalk.red(`Failed to coordinate active deployment pipelines:`), err);
            resolve();
        }); 
    });
}

/**
 * Rewrites the most recent commit signature parameters without un-staging data logs.
 * @param {Readline} rl - Core process shell line reader instance handle.
 * @returns {Promise<void>}
 */
function redoCommitMessage(rl) {
    return new Promise((resolve) => {
        rl.question(chalk.yellow('\nEnter amended replacement commit message: '), (message) => {
            const cleanedMessage = message.trim();
            if (!cleanedMessage) {
                console.log(chalk.red('Amend processing aborted: Message cannot be blank.'));
                resolve();
                return;
            }

            exec(`git commit --amend -m "${cleanedMessage}"`, (err, stdout, stderr) => {
                if (err) {
                    console.error(chalk.red(stderr || err.message));
                } else {
                    console.log(chalk.gray(`\ngit commit --amend -m "${cleanedMessage}"`));
                    console.log(chalk.green(stdout.trim()) + '\n');
                }
                resolve();
            });
        });
    });
}

/**
 * Rewinds active workspace heads back across local state parameters levels.
 * @param {string[]} action - Swapped validation array markers matching options indices.
 * @param {Readline} rl - Core process shell line reader context.
 * @param {string} commitHash - The commit hash that the user want to restore the work state to 
 * @returns {Promise<void>}
 */
async function restoreLatestCommit(action, rl, commitHash = null) {
    let commandType = action?.[0]?.toLowerCase() || "";

    return new Promise(async (resolve) => {
        if (commandType !== '-soft' && commandType !== '-hard' && commandType !== 'soft' && commandType !== 'hard') {
            console.log(chalk.cyan('\n--- Restore Modes ---'));
            console.log(chalk.yellow('  soft / -soft -> ') + chalk.gray('Rewinds the commit block but keeps your uncommitted files intact'));
            console.log(chalk.yellow('  hard / -hard -> ') + chalk.gray('Destructive reset: Wipes out ALL changes back to last commit signature\n'));

            const type = await new Promise((askResolve) => {
                rl.question('Enter target tracking discharge type: ', askResolve);
            });
            
            commandType = type.trim().toLowerCase();
        }

        let command = [];
        let normalizedLevel = "";
        
        if (commandType === 'soft' || commandType === '-soft') {
            command = ['reset', '--soft', commitHash || 'HEAD~1'];
            normalizedLevel = '-soft';
        } else if (commandType === 'hard' || commandType === '-hard') {
            command = ['reset', '--hard', commitHash || 'HEAD'];
            normalizedLevel = '-hard';
        } else {
            console.log(chalk.red('\n❌ Invalid discharge parameters selection. Execution loop aborted.\n'));
            resolve();
            return;
        }

        const child = spawn('git', command, { stdio: 'inherit' });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(chalk.green(`\n✔ Discharge successful tracking target level: ${normalizedLevel}\n`));
            } else {
                console.log(chalk.red('\n❌ Git rollback processing reset routine dropped or failed.\n'));
            }
            resolve();
        });

        child.on('error', (error) => {
            console.log(chalk.red(`Failed to mount system branch rollback blocks:`), error);
            resolve();
        });
    }); 
}

/** Loops through filesystem lists spinning up individual application target parameters. */
function startApps() {
    const config = loadOpeningAppsConfig();

    if (!config.apps.length) {
        console.log(chalk.yellow('\n⚠ No configured tool routes located. Run "work setup" to map path keys.\n'));
        return;
    }

    console.log(chalk.cyan('\nOpening workspace tool suite dependencies...'));
    for (const appPath of config.apps) {
        const resolvedPath = appPath || '';
        console.log(chalk.gray(` ➜ Launching process link: ${resolvedPath}`));
        openApplication(resolvedPath).then((ok) => {
            if (!ok) {
                console.log(chalk.red(`Failed to open application link: ${resolvedPath}`));
            }
        });
    }
    console.log('');
}

/**
 * Iterates configuration prompt lines allowing builders to track local execution links.
 * @param {Readline} rl - Core user command line reader link interface.
 * @returns {Promise<void>}
 */
function setupEnvironment(rl) {
    return new Promise(async (resolve) => {
        console.log(chalk.cyan('\n--- Work Environment Workspace Setup ---'));
        const apps = [];

        while (true) {
            const appPath = await askQuestion(rl, 'Enter tool path, file coordinate, or alias link: ');

            if (!appPath) {
                console.log(chalk.red('Executable target links cannot be left blank.'));
                continue;
            }

            apps.push(appPath);
            const addMore = await askQuestion(rl, 'Register another workspace dependency? (y/n): ');
            const normalized = addMore.toLowerCase();
            if (normalized !== 'y' && normalized !== 'yes') {
                break;
            }
        }

        saveOpeningAppsConfig({ apps });
        console.log(chalk.green(`\n✔ Setup complete! Saved ${apps.length} tool dependencies configuration maps.\n`));
        resolve();
    });
}


//========================================
//* Module Exporter
//========================================
module.exports = workCommand;