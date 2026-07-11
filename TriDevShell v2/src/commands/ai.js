/**
 * @fileoverview AI integration for TriDev Shell via local Ollama
 * @author Schlaffer Benjamin
 * @version 4.2.4
 * @description
 * COMMANDS:
 * ai -download       : Opens interactive model downloader.
 * ai -run            : Opens interactive list to select and chat with a model.
 * ai -delete         : Opens interactive model uninstaller.
 * ai <prompt>        : Pass a text string directly to the first available model.
 */

/**
 * @typedef {Object} OllamaTagResponse
 * @property {string[]} models - Array of installed model objects containing .name attributes.
 */


//==============================
//* Imports
//==============================
const http = require('http');
const chalk = require('chalk');
const { spawn } = require('child_process');
const adminConfig = require('./tds-admin.js');
const { Readline } = require('readline');

//==============================
//* Initialization
//==============================
const adminConfigData = adminConfig.loadAdminConfig();
const AI_ENABLED = checkAIEnabled();


//==============================
//* Main command handler
//==============================
/**
 * Main command router for managing and running local AI prompts.
 * @param {string[]} args - The arguments array passed after the main command.
 * @param {Readline} rl - Active Readline interface context for CLI text input.
 * @returns {Promise<void>}
 */
async function aiCommand(args, rl) {
    if (args.length >= 0 && !AI_ENABLED) {
        console.log(chalk.yellow("===--- Feature currently down ---===\n"));
        console.log(chalk.red("Cause: "));
        console.log(chalk.red("-Sometimes starting the server would crash the users computer"));
        console.log(chalk.red("-Even after starting the server with the program, it wouldn't work\n"));
        console.log(chalk.gray("New feature will come, where you can reenable this feature manually."));
        return;
    }

    await ensureOllamaRunning();

    if (args.length === 0) {
        console.log(chalk.red('Usage: ai [-download | -run | -delete | <prompt>]'));
        console.log(chalk.gray('Example: ai Write a python script to reverse a string'));
        return;
    }

    const firstArg = args[0].toLowerCase();

    switch (firstArg) {
        case '-download':
            await handleDownload(rl);
            break;
        case '-run':
            await handleRun(rl);
            break;
        case '-delete':
            await handleDelete(rl);
            break;
        default:
            await handlePromptStream(args);
            break;
    }
}


//==============================
//* Main command helpers
//==============================
/**
 * Evaluates whether AI functionality is flagged active within administration profiles.
 * @returns {boolean} True if AI features should build/initialize.
 */
function checkAIEnabled() {
    return adminConfigData.aiEnabled; 
}

/**
 * Fetches the list of installed Ollama models.
 * @returns {Promise<string[]>} A promise resolving to an array of model identifier strings.
 */
function getInstalledModels() {
    return new Promise((resolve) => {
        const options = {
            hostname: '127.0.0.1',
            port: 11434,
            path: '/api/tags',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            if (res.statusCode !== 200) {
                res.resume();
                resolve([]);
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = /** @type {OllamaTagResponse} */ (JSON.parse(data));
                    const models = (parsed.models || []).map(m => m.name);
                    resolve(models);
                } catch (e) {
                    resolve([]);
                }
            });
        });

        req.on('error', () => resolve([]));
        req.end();
    });
}

/**
 * Pings the local daemon or safely detaches an initialization background sub-process if offline.
 * @returns {Promise<boolean>} Resolves when the connection resolves or times out initialization.
 */
async function ensureOllamaRunning() {
    return new Promise((resolve) => {
        let isResolved = false;

        const triggerStart = () => {
            if (isResolved) return;
            isResolved = true;

            console.log(chalk.yellow('\n[Ollama] Ollama server not detected. Attempting to start it...'));
            
            const child = spawn('ollama', ['serve'], { 
                stdio: 'ignore', 
                detached: true,
                shell: true 
            });
            
            child.on('error', (err) => {
                console.log(chalk.red('\n❌ Could not start Ollama. Is it installed?'));
            });

            child.unref();

            // Wait for server initialization
            setTimeout(() => resolve(true), 3000); 
        };

        const check = http.get('http://127.0.0.1:11434/api/tags', (res) => {
            res.resume();
            isResolved = true;
            resolve(true); 
        });

        check.on('error', triggerStart);

        check.setTimeout(1500, () => {
            check.destroy();
            triggerStart();
        });
    });
}


//==============================
//* Command actions
//==============================
/**
 * Prompts the user to install Ollama via PowerShell installer if missing.
 * @param {Readline} rl - Active Readline interface context.
 * @param {Function} resolve - Parent promise resolver executor.
 * @returns {void}
 */
function promptInstallOllama(rl, resolve) {
    console.log(chalk.red('\n❌ Ollama is not installed or not in your PATH.'));
    rl.question(chalk.yellow('Would you like to download and install Ollama now? (y/n): '), (ans) => {
        if (ans.trim().toLowerCase() === 'y' || ans.trim().toLowerCase() === 'yes') {
            console.log(chalk.cyan('\n[Ollama] Downloading and installing... This might take a few minutes.'));
            const installProcess = spawn('powershell', ['-Command', 'irm https://ollama.com/install.ps1 | iex'], { stdio: 'inherit' });

            installProcess.on('close', (code) => {
                if (code === 0) {
                    console.log(chalk.green('\n✅ Ollama installed successfully! Please restart the shell to use it.\n'));
                } else {
                    console.log(chalk.red('\n❌ Failed to install Ollama. You can install it manually from https://ollama.com/download\n'));
                }
                resolve();
            });
        } else {
            console.log(chalk.yellow('Please download and install Ollama manually from: ') + chalk.cyan('https://ollama.com/download\n'));
            resolve();
        }
    });
}

/**
 * Handles download command selection menu and invokes model pull sequences.
 * @param {Readline} rl - Active Readline interface context.
 * @returns {Promise<void>}
 */
async function handleDownload(rl) {
    console.log(chalk.cyan('\n--- Available Models for Download ---'));
    console.log(chalk.yellow('  1.') + ' llama3.2:1b  (1.3GB - Lightweight & fast)');
    console.log(chalk.yellow('  2.') + ' phi3.5       (2.2GB - Strong reasoning)');
    console.log(chalk.gray('\nEnter the number to download, or anything else to cancel.'));

    return new Promise((resolve) => {
        rl.question(chalk.yellowBright('Select model: '), (ans) => {
            let modelToPull = null;
            if (ans.trim() === '1') modelToPull = 'llama3.2:1b';
            if (ans.trim() === '2') modelToPull = 'phi3.5';

            if (!modelToPull) {
                console.log(chalk.gray('Download cancelled.\n'));
                resolve();
                return;
            }

            console.log(chalk.cyan(`\n[Ollama] Pulling ${modelToPull}... This might take a while.`));
            const child = spawn('ollama', ['pull', modelToPull], { stdio: 'inherit' });
            let hasError = false;

            child.on('error', (err) => {
                hasError = true;
                if (/** @type {any} */(err).code === 'ENOENT') {
                    promptInstallOllama(rl, resolve);
                } else {
                    console.log(chalk.red(`\n❌ Failed to start Ollama process: ${err.message}`));
                    resolve();
                }
            });

            child.on('close', (code) => {
                if (hasError) return;
                if (code === 0) {
                    console.log(chalk.green(`\n✅ ${modelToPull} downloaded successfully.\n`));
                } else if (code !== null) {
                    console.log(chalk.red(`\n❌ Failed to pull ${modelToPull}.\n`));
                }
                resolve();
            });
        });
    });
}

/**
 * Renders inventory list of downloaded assets and attaches standard REPL chat process.
 * @param {Readline} rl - Active Readline interface context.
 * @returns {Promise<void>}
 */
async function handleRun(rl) {
    const models = await getInstalledModels();
    
    if (models.length === 0) {
        console.log(chalk.yellow('\n[Ollama] No models found! Run "ai -download" first.\n'));
        return;
    }

    console.log(chalk.cyan('\n--- Installed AI Models ---'));
    models.forEach((m, idx) => {
        console.log(chalk.yellow(`  ${idx + 1}.`) + ` ${m}`);
    });
    console.log(chalk.gray('\nEnter the number to run for chat, or anything else to cancel.'));

    return new Promise((resolve) => {
        rl.question(chalk.yellowBright('Select model: '), (ans) => {
            const idx = parseInt(ans.trim(), 10) - 1;
            if (isNaN(idx) || idx < 0 || idx >= models.length) {
                console.log(chalk.gray('Run cancelled.\n'));
                resolve();
                return;
            }

            const modelToRun = models[idx];
            console.log(chalk.cyan(`\n[Ollama] Starting interactive chat with ${modelToRun}... Type "/bye" to exit.`));

            const child = spawn('ollama', ['run', modelToRun], { stdio: 'inherit' });
            let hasError = false;

            child.on('error', (err) => {
                hasError = true;
                if (/** @type {any} */(err).code === 'ENOENT') {
                    promptInstallOllama(rl, resolve);
                } else {
                    console.log(chalk.red(`\n❌ Failed to start Ollama process: ${err.message}`));
                    resolve();
                }
            });

            child.on('close', (code) => {
                if (hasError) return;
                if (code !== null) {
                    console.log(chalk.green(`\nChat session ended.\n`));
                }
                resolve();
            });
        });
    });
}

/**
 * Handles explicit target removal commands via interactive confirmations.
 * @param {Readline} rl - Active Readline interface context.
 * @returns {Promise<void>}
 */
async function handleDelete(rl) {
    const models = await getInstalledModels();

    if (models.length === 0) {
        console.log(chalk.yellow('\n[Ollama] No models found to delete!\n'));
        return;
    }

    console.log(chalk.cyan('\n--- Installed AI Models ---'));
    models.forEach((m, idx) => {
        console.log(chalk.yellow(`  ${idx + 1}.`) + ` ${m}`);
    });
    console.log(chalk.gray('\nEnter the number to delete, or anything else to cancel.'));

    return new Promise((resolve) => {
        rl.question(chalk.yellowBright('Select model to delete: '), (ans) => {
            const idx = parseInt(ans.trim(), 10) - 1;
            if (isNaN(idx) || idx < 0 || idx >= models.length) {
                console.log(chalk.gray('Delete cancelled.\n'));
                resolve();
                return;
            }

            const modelToDelete = models[idx];

            rl.question(chalk.red(`Are you sure you want to delete ${modelToDelete}? (y/n): `), (confirmAns) => {
                if (confirmAns.trim().toLowerCase() !== 'y' && confirmAns.trim().toLowerCase() !== 'yes') {
                    console.log(chalk.gray('Delete cancelled.\n'));
                    resolve();
                    return;
                }

                console.log(chalk.cyan(`\n[Ollama] Deleting ${modelToDelete}...`));

                const child = spawn('ollama', ['rm', modelToDelete], { stdio: 'inherit' });
                let hasError = false;

                child.on('error', (err) => {
                    hasError = true;
                    console.log(chalk.red(`\n❌ Failed to start Ollama process: ${err.message}`));
                    resolve();
                });

                child.on('close', (code) => {
                    if (hasError) return;
                    if (code === 0) {
                        console.log(chalk.green(`\n✅ ${modelToDelete} deleted successfully.\n`));
                    } else if (code !== null) {
                        console.log(chalk.red(`\n❌ Failed to delete ${modelToDelete}.\n`));
                    }
                    resolve();
                });
            });
        });
    });
}

/**
 * Direct inline natural prompt handler that structures HTTP output streams from the active model.
 * @param {string[]} args - Prompt line arguments.
 * @returns {Promise<void>}
 */
function handlePromptStream(args) {
    const prompt = args.join(' ');

    return new Promise(async (resolve) => {
        const models = await getInstalledModels();
        if (models.length === 0) {
            console.log(chalk.yellow('\n[Ollama] No models found! Please run "ai -download" first.\n'));
            resolve();
            return;
        }

        const model = models[0]; 
        console.log(chalk.cyan(`[Ollama] Generating response with ${model}... (Press Backspace to stop)`));
        console.log(chalk.yellowBright(`[System] Don't zoom when the AI is writing, because it will despawn some text`));

        const postData = JSON.stringify({
            model: model,
            prompt: prompt,
            stream: true
        });

        const options = {
            hostname: '127.0.0.1',
            port: 11434,
            path: '/api/generate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        let isAborted = false;
        let req;

        const onKeyPress = (str, key) => {
            if (key && key.name === 'backspace') {
                isAborted = true;
                console.log(chalk.yellow('\n[Ollama] Generation stopped by user.'));
                if (req) req.destroy();
                cleanupAndResolve();
            }
        };

        const cleanupAndResolve = () => {
            if (process.stdin.isTTY) {
                process.stdin.removeListener('keypress', onKeyPress);
            }
            resolve();
        };

        if (process.stdin.isTTY) {
            process.stdin.on('keypress', onKeyPress);
            process.stdin.setRawMode(true);
            process.stdin.resume();
        }

        req = http.request(options, (res) => {
            if (res.statusCode !== 200) {
                if (res.statusCode === 404) {
                    console.log(chalk.yellow(`\n[Ollama] Model '${model}' not found.`));
                } else {
                    console.log(chalk.red(`\n[Ollama Error] HTTP ${res.statusCode}`));
                }
                res.resume();
                cleanupAndResolve();
                return;
            }

            process.stdout.write(chalk.green(`TridevShell> `));

            res.on('data', (chunk) => {
                if (isAborted) return;
                try {
                    const lines = chunk.toString().split('\n').filter(l => l.trim() !== '');
                    for (const line of lines) {
                        const parsed = JSON.parse(line);
                        if (parsed.response) {
                            process.stdout.write(chalk.green(parsed.response));
                        }
                    }
                } catch (e) {
                    // Ignore parse errors on chunk boundaries
                }
            });

            res.on('end', () => {
                if (isAborted) return;
                console.log('\n'); 
                cleanupAndResolve();
            });
        });

        req.on('error', (e) => {
            if (isAborted) return;
            if (/** @type {any} */(e).code === 'ECONNREFUSED') {
                console.log(chalk.red('\n[Ollama Error] Connection refused. Is Ollama running on http://localhost:11434?'));
            } else {
                console.log(chalk.red(`\n[Ollama Error] ${e.message}`));
            }
            cleanupAndResolve();
        });

        req.write(postData);
        req.end();
    });
}


//==============================
//* Module Exporter
//==============================
module.exports = aiCommand;