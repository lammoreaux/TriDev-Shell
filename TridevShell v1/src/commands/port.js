/**
 * @fileoverview Network Socket and Process Intercept Utility for TriDev Shell
 * @author Schlaffer Benjamin
 * @version 3.7.1
 * @description
 * COMMANDS:
 * port -list        : Lists all system processes currently in a LISTEN state.
 * port -list [port] : Checks specific socket boundaries to find a targeted active port.
 * port -kill [port] : Targets socket processes to forcibly teardown specific network bindings.
 */

//==============================
//* Util Imports
//==============================
const { runWithTimer } = require('../utils/timer.js');

//==============================
//* Module Imports
//==============================
const { exec } = require('child_process');
const chalk = require('chalk');


//==============================
//* Main Command Handler
//==============================
/**
 * Routing switchboard wrapping low-level Windows command shell network monitors.
 * @param {string[]} args - Parameter flags and string arguments passed after core call.
 * @returns {void}
 */
function portCommand(args) {
    if (args.length === 0) {
        showPortHelp();
        return;
    }

    const action = args[0]?.toLowerCase();

    switch (action) {
        case '-list':
            runWithTimer("Port List", () => handleListAction(args));
            break;
        case '-kill':
            runWithTimer("Port Kill", () => handleKillAction(args));
            break;
        default:
            showPortHelp();
            break;
    }
}


//==============================
//* Command Actions
//==============================
/** Prints organized usage guidelines describing system port queries. */
function showPortHelp() {
    console.log(chalk.hex('#0284c7')('\n--- Port Command Help ---'));
    console.log(chalk.yellow('  port -list') + chalk.gray('           : List all active listening sockets'));
    console.log(chalk.yellow('  port -list [port]') + chalk.gray('    : Check status tracking on a specific port'));
    console.log(chalk.yellow('  port -kill [port]') + chalk.gray('    : Terminate processes holding a port bound\n'));
}

/**
 * Spawns netstat tasks filtering out current active listening interface channels.
 * @param {string[]} args - Target console tracking parameters.
 * @returns {void}
 */
function handleListAction(args) {
    const specificPort = args[1];

    // Use netstat -ano to list all listening ports and their PIDs
    let command = 'netstat -ano | findstr "LISTEN"';
    if (specificPort) {
        // Find specific port boundary matching exact token strings
        command = `netstat -ano | findstr "LISTEN" | findstr ":${specificPort}\\>"`;
    }

    exec(command, (error, stdout, stderr) => {
        if (error) {
            // 'findstr' returns exit code 1 if nothing matches the query strings
            if (error.code === 1) {
                if (specificPort) {
                    console.log(chalk.yellow(`No process is currently listening on port ${specificPort}.`));
                } else {
                    console.log(chalk.yellow('No listening ports found.'));
                }
            } else {
                console.log(chalk.red(`Error: ${error.message}`));
            }
            return;
        }
        if (stderr) {
            console.log(chalk.red(`Error: ${stderr}`));
            return;
        }

        // Format nice human-readable terminal table blocks
        console.log(chalk.hex('#0284c7')(`\n--- Listening Ports ${specificPort ? `(:${specificPort}) ` : ''}---`));
        console.log(chalk.gray('  Proto  Local Address          State          PID'));
        
        const lines = stdout.trim().split('\n').filter(Boolean);
        lines.forEach(line => {
            const cleanLine = line.trim().replace(/\s+/g, ' ');
            console.log(chalk.green(`   ${cleanLine}`));
        });
        console.log('');
    });
}

/**
 * Sweeps active socket logs to isolate and execute forced termination taskkills on active PIDs.
 * @param {string[]} args - Target console tracking parameters.
 * @returns {void}
 */
function handleKillAction(args) {
    if (!args[1]) {
        console.log(chalk.red('Please provide a port number!'));
        return;
    }
    const port = args[1];

    // 1. Isolate target process ID mappings using native netstat searches
    exec(`netstat -ano | findstr "LISTEN" | findstr ":${port}\\>"`, (error, stdout) => {
        if (error || !stdout) {
            console.log(chalk.yellow(`No matching process found running on port ${port}.`));
            return;
        }

        // Parse individual line streams down to unique process references
        const lines = stdout.trim().split('\n');
        const pids = new Set();

        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length > 0) {
                const pid = parts[parts.length - 1]; // Process ID lives in the final column block
                if (!isNaN(pid) && pid !== '0') {
                    pids.add(pid);
                }
            }
        });

        if (pids.size === 0) {
            console.log(chalk.yellow(`Could not determine the PID for port ${port}.`));
            return;
        }

        // 2. Clear out located system task connections asynchronously
        pids.forEach(pid => {
            exec(`taskkill /F /PID ${pid}`, (killErr) => {
                if (killErr) {
                    console.log(chalk.red(`Failed to kill process (PID: ${pid}) on port ${port}. Try running as Administrator.`));
                } else {
                    console.log(chalk.green(`✔ Successfully killed process (PID: ${pid}) on port ${port}.`));
                }
            });
        });
    });
}


//==============================
//* Module Exporter
//==============================
module.exports = portCommand;