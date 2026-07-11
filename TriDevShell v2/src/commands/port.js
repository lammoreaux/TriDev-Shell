/**
 * @fileoverview Dynamic local mock JSON API engine for TriDev Shell.
 * @author Schlaffer Benjamin
 * @version 4.0.0
 * @description
 * COMMANDS:
 * mock <file.json> [options] : Mounts an interactive REST API endpoints matrix.
 * --port <number>          : Set target server port allocation (Default: 3000).
 * --delay <ms>             : Emulate global hardware network latency timing.
 * -key, --key              : Force cryptographically signed API key evaluation blocks.
 * -codes, --codes          : Prints summary definitions explaining core HTTP statuses.
 */


//==============================
//* Module Imports
//==============================
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const chalk = require('chalk');
const crypto = require('crypto');
const { Readline } = require('readline');

const DEFAULT_HOST = '127.0.0.1';

//==============================
//* Global Variables & State
//==============================
let isPaused = false;
let db = {};


//==============================
//* Main Command Handler
//==============================
/**
 * Router initialization loop spinning up internal express networking frameworks.
 * @param {string[]} args - Parameter items passed from core loop contexts.
 * @param {string} currentDir - The active working folder baseline location path.
 * @param {Readline} rl - Active Readline capture instance for global event monitoring.
 * @returns {Promise<void>}
 */
async function mockCommand(args, currentDir, rl) {
    // 1. Process upfront informational flag checks
    if (args.includes('-codes') || args.includes('--codes')) {
        showHttpStatusCodes();
        return;
    }

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        showMockHelpMenu();
        return;
    }

    // 2. Validate database path target arguments
    const dbFilePath = path.resolve(currentDir, args[0]);
    if (!fs.existsSync(dbFilePath)) {
        console.log(chalk.red(`Error: Could not find file at ${dbFilePath}`));
        return;
    }

    // 3. Parse input network switches
    let port = 3000;
    let delay = 0;
    let requireKey = false;
    let apiKey = null;

    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--port' && args[i + 1]) {
            port = parseInt(args[i + 1], 10);
            i++;
        } else if (args[i] === '--delay' && args[i + 1]) {
            delay = parseInt(args[i + 1], 10);
            i++;
        } else if (args[i] === '-key' || args[i] === '--key') {
            requireKey = true;
            apiKey = process.env.TRIDEV_MOCK_API_KEY || crypto.randomBytes(16).toString('hex');
        }
    }

    // 4. Fire dynamic core load configurations
    if (!loadDatabaseFile(dbFilePath)) {
        return;
    }

    // 5. Initialize application runtime structures
    const app = express();
    app.disable('x-powered-by');
    app.use(cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            try {
                const { hostname } = new URL(origin);
                return callback(null, ['localhost', '127.0.0.1'].includes(hostname));
            } catch {
                return callback(null, false);
            }
        }
    }));
    app.use(express.json());

    // Middleware: Pause control
    app.use((req, res, next) => {
        if (isPaused) {
            return res.status(503).json({ error: 'Service Unavailable: Mock server is paused' });
        }
        next();
    });

    // Middleware: Authentication gate tracking
    if (requireKey && apiKey) {
        app.use((req, res, next) => {
            const clientKey = req.headers['x-api-key'] || req.query.key;
            if (clientKey !== apiKey) {
                return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
            }
            next();
        });
    }

    // Middleware: Latency and log profiling
    app.use((req, res, next) => {
        res.on('finish', () => {
            const timestamp = new Date().toISOString();
            let statusColor = chalk.green;
            if (res.statusCode >= 400) statusColor = chalk.red;
            else if (res.statusCode >= 300) statusColor = chalk.yellow;

            console.log(
                `[${chalk.cyan(timestamp)}] ${req.method.padEnd(6)} ${req.originalUrl} - ${statusColor(res.statusCode)}`
            );
        });

        if (delay > 0) {
            setTimeout(next, delay);
        } else {
            next();
        }
    });

    // Mount structural CRUD dynamic mapping endpoints
    mountDynamicRouterEndpoints(app, dbFilePath);

    // 6. Spawn system engine server wrapper context loops
    await startServerInstance(app, port, delay, requireKey, apiKey, dbFilePath, rl);
}


//==============================
//* Main Core Logic Helpers
//==============================
/**
 * Safely parses raw text data maps on disk into active live memory states.
 * @param {string} dbFilePath - Target file path string coordinate index.
 * @returns {boolean} True if parsing process succeeded.
 */
function loadDatabaseFile(dbFilePath) {
    try {
        const fileData = fs.readFileSync(dbFilePath, 'utf8');
        db = JSON.parse(fileData);
        return true;
    } catch (err) {
        console.error(chalk.red("\n[DB ERROR]:"), err.message);
        return false;
    }
}

/**
 * Commits active in-memory operational states cleanly back down to target disk paths.
 * @param {string} dbFilePath - Destination target configuration workspace location path.
 * @returns {void}
 */
function saveDatabaseFile(dbFilePath) {
    fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2));
}

/**
 * Compiles structural route parsing blocks maps mapping custom target mock datasets.
 * @param {express.Application} app - Active instantiated express system process framework.
 * @param {string} dbFilePath - Explicit data map tracking destination location path coordinate.
 * @returns {void}
 */
function mountDynamicRouterEndpoints(app, dbFilePath) {
    app.use((req, res) => {
        const urlParts = req.path.split('/').filter(Boolean);
        if (urlParts.length === 0) {
            return res.json({ message: 'mock is running', endpoints: Object.keys(db) });
        }

        const resourceName = urlParts[0];
        const resourceId = urlParts[1];

        if (!db[resourceName]) {
            return res.status(404).json({ error: `Resource '/${resourceName}' not found in db.json` });
        }

        if (!Array.isArray(db[resourceName])) {
            if (req.method === 'GET') return res.json(db[resourceName]);
            return res.status(405).json({ error: 'Method not allowed on non-array resources' });
        }

        const collection = db[resourceName];

        switch (req.method) {
            case 'GET':
                if (resourceId) {
                    const item = collection.find((i) => String(i.id) === String(resourceId));
                    if (item) return res.json(item);
                    return res.status(404).json({ error: 'Item not found' });
                }
                return res.json(collection);

            case 'POST':
                const newItem = req.body;
                if (!newItem.id) {
                    const maxId = collection.reduce((max, item) => Math.max(max, parseInt(item.id || 0)), 0);
                    newItem.id = String(maxId + 1);
                }
                collection.push(newItem);
                saveDatabaseFile(dbFilePath);
                return res.status(201).json(newItem);

            case 'PUT':
                if (!resourceId) return res.status(400).json({ error: 'Missing ID for PUT request' });
                const putIndex = collection.findIndex((i) => String(i.id) === String(resourceId));
                if (putIndex !== -1) {
                    collection[putIndex] = { id: collection[putIndex].id, ...req.body };
                    saveDatabaseFile(dbFilePath);
                    return res.json(collection[putIndex]);
                }
                return res.status(404).json({ error: 'Item not found' });

            case 'DELETE':
                if (!resourceId) return res.status(400).json({ error: 'Missing ID for DELETE request' });
                const initialLength = collection.length;
                db[resourceName] = collection.filter((i) => String(i.id) !== String(resourceId));
                if (db[resourceName].length !== initialLength) {
                    saveDatabaseFile(dbFilePath);
                    return res.status(204).send();
                }
                return res.status(404).json({ error: 'Item not found' });

            default:
                return res.status(405).json({ error: 'Method Not Allowed' });
        }
    });
}

/**
 * Creates live connection listener handles and registers interface event triggers.
 * @param {express.Application} app - Active express application context layer.
 * @param {number} port - Network socket assignment interface number.
 * @param {number} delay - Artificial processing sleep duration threshold value.
 * @param {boolean} requireKey - Toggles custom security map verification lookups.
 * @param {string|null} apiKey - Active validation authorization credential block.
 * @param {string} dbFilePath - Target file configuration pathway mapping variables.
 * @param {Readline} rl - Core process shell fallback context line reader handle.
 * @returns {Promise<void>}
 */
function startServerInstance(app, port, delay, requireKey, apiKey, dbFilePath, rl) {
    return new Promise((resolve) => {
        const server = app.listen(port, DEFAULT_HOST, () => {
            console.log(chalk.green(chalk.bold(`\n</> tridev-mock is running!`)));
            console.log(chalk.gray(chalk.bold('--------------------------------------------------')));
            console.log(`Serving data from ${chalk.cyan(dbFilePath)}`);
            console.log(`Listening on ${chalk.yellow(`http://${DEFAULT_HOST}:${port}`)}`);
            if (requireKey && apiKey) {
                console.log(`API key protection enabled. Use ${chalk.green('x-api-key')} header or ${chalk.green('?key=')} query param.`);
            }
            if (delay > 0) {
                console.log(`Simulating network delay of ${chalk.red(`${delay}ms`)}`);
            }
            console.log(chalk.gray('--------------------------------------------------'));
            console.log('Press ' + chalk.bold('s') + ' to pause/resume incoming requests.');
            console.log('Press ' + chalk.bold('r') + ' to reload the JSON file.');
            console.log('Press ' + chalk.bold('Backspace') + ' or ' + chalk.bold('Esc') + ' to stop the server and return to shell.\n');
        });

        const onData = (data) => {
            const key = data.toString().toLowerCase();
            if (data[0] === 8 || data[0] === 127 || data[0] === 27) {
                server.close(() => {
                    console.log(chalk.yellow('\nMock server stopped.'));
                    if (process.stdin.isTTY) {
                        process.stdin.removeListener('data', onData);
                    } else if (rl) {
                        rl.removeListener('SIGINT', onSigInt);
                    }
                    resolve();
                });
            } else if (key === 's') {
                isPaused = !isPaused;
                if (isPaused) {
                    console.log(chalk.yellow(`\n[${new Date().toISOString()}]  Server paused. Requests will be blocked.`));
                } else {
                    console.log(chalk.green(`\n[${new Date().toISOString()}]  Server resumed. Processing requests.`));
                }
            } else if (key === 'r') {
                if (loadDatabaseFile(dbFilePath)) {
                    console.log(chalk.green(`\n[${new Date().toISOString()}]  Database reloaded successfully!`));
                }
            }
        };

        const onSigInt = () => {
            server.close(() => {
                console.log(chalk.yellow('\nMock server stopped.'));
                rl.removeListener('SIGINT', onSigInt);
                resolve();
            });
        };

        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.on('data', onData);
        } else if (rl) {
            rl.on('SIGINT', onSigInt);
        } else {
            process.on('SIGINT', () => {
                server.close(() => resolve());
            });
        }
    });
}


//==============================
//* Action Help Displays
//==============================
/** Prints baseline summaries describing general usage syntax documentation flags. */
function showMockHelpMenu() {
    console.log(`
${chalk.cyan('api / mock')} - A lightweight, high-performance mock API server

${chalk.yellow('Usage:')}
  api <path-to-db.json> [options]

${chalk.yellow('Options:')}
  --port <number>    Set the port for the server (default: 3000)
  --delay <ms>       Simulate network latency in milliseconds (default: 0)
  -key, --key        Generate and require an API key for access
  --help, -h         Show this help menu
  -codes             Show explanations of common HTTP status codes

${chalk.yellow('Hotkeys:')}
  s                  Pause/resume the server (blocks with 503)
  r                  Hot-reload JSON database files

${chalk.yellow('Examples:')}
  api db.json -key
  mock data.json --port 8080 --delay 2000
`);
}

/** Prints standard status dictionary index parameters across stdout. */
function showHttpStatusCodes() {
    console.log(chalk.hex('#0284c7')('\n--- HTTP Status Codes ---'));
    console.log(chalk.green('  200 OK') + chalk.gray('               : The request succeeded.'));
    console.log(chalk.green('  201 Created') + chalk.gray('          : Resource was successfully created.'));
    console.log(chalk.green('  204 No Content') + chalk.gray('       : Request succeeded, but no data is returned.'));
    console.log(chalk.yellow('  400 Bad Request') + chalk.gray('      : The server cannot process the request (e.g. invalid syntax).'));
    console.log(chalk.yellow('  401 Unauthorized') + chalk.gray('     : You need to authenticate to get the requested response.'));
    console.log(chalk.yellow('  403 Forbidden') + chalk.gray('        : You don\'t have rights to the content.'));
    console.log(chalk.yellow('  404 Not Found') + chalk.gray('        : The requested resource was not found.'));
    console.log(chalk.yellow('  405 Method Not Allowed') + chalk.gray(': The request method is known by the server but not supported.'));
    console.log(chalk.red('  500 Internal Error') + chalk.gray('   : The server encountered an unexpected condition.\n'));
}


//==============================
//* Module Export
//==============================
module.exports = mockCommand;