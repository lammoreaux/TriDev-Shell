/**
 * @fileoverview System Device Controls for TriDev Shell
 * @author Schlaffer Benjamin
 * @version 2.1.0
 * @description
 * COMMANDS:
 * device -shutdown : Initiates a safe system shutdown sequence.
 * device -status   : Shows device runtime hardware statuses.
 */

//==============================
//* Module Imports
//==============================
const { spawn } = require('child_process');
const chalk = require('chalk');
const os = require('os');
const { Readline } = require('readline');


//==============================
//* Main Command Handler
//==============================
/**
 * Main switchboard router for local computer environment actions.
 * @param {string[]} args - Sequential parameters array passed from the main loop.
 * @param {Readline} rl - Active Readline interface context for reading confirmation input.
 * @returns {Promise<void>}
 */
async function deviceCommand(args, rl) {
    const action = args[0]?.toLowerCase();

    switch (action) {
        case '-shutdown':
            await shutDown(rl); 
            break;
        case '-status':    
            await status();
            break;
        default:
            showDeviceHelp();
            break;
    }
}


//==============================
//* Command Functions
//==============================
/**
 * Prompts for confirmation before spawning a detached native system power sequence.
 * @param {Readline} rl - Active Readline interface context.
 * @returns {Promise<void>}
 */
async function shutDown(rl) {
    return new Promise((resolve) => {
        rl.question(chalk.red('⚠️  Are you sure you want to shut down the device? (y/n) '), (answer) => {
            const confirmation = answer.trim().toLowerCase();
            if (confirmation === 'y' || confirmation === 'yes') {
                console.log(chalk.red('Shutting down in 5 seconds...'));
                // Windows shutdown command: shutdown /s /t 5
                spawn('shutdown', ['/s', '/t', '5'], { stdio: 'inherit', shell: true });
                resolve();
            } else {
                console.log(chalk.green('Shutdown cancelled.'));
                resolve();
            }
        });
    });
}

/**
 * Reads local hardware matrices and prints environment metrics dynamically.
 * @returns {Promise<void>}
 */
async function status() {
    console.log(chalk.hex('#0284c7')('\n--- System Status ---'));
    
    const userInfo = os.userInfo();
    console.log(chalk.hex('#00fcf8ff')('  User      : ') + chalk.gray(userInfo.username));
    console.log(chalk.hex('#00fcf8ff')('  OS        : ') + chalk.gray(`${os.type()} ${os.release()} (${os.arch()})`));
    
    const uptime = os.uptime();
    const hrs = Math.floor(uptime / 3600);
    const mins = Math.floor((uptime % 3600) / 60);
    console.log(chalk.hex('#00fcf8ff')('  Uptime    : ') + chalk.gray(`${hrs}h ${mins}m`));
    
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    const usedMem = (totalMem - freeMem).toFixed(2);
    console.log(chalk.hex('#00fcf8ff')('  Memory    : ') + chalk.gray(`${usedMem} GB / ${totalMem} GB (Free: ${freeMem} GB)`));
    
    const cpus = os.cpus();
    console.log(chalk.hex('#00fcf8ff')('  CPU       : ') + chalk.gray(`${cpus[0].model} (${cpus.length} Cores)`));
    console.log('');
}


//==============================
//* Helper Functions
//==============================
/** Displays clear operational guide blocks across the shell output context. */
function showDeviceHelp() {
    console.log(chalk.cyanBright('\nDevice Command Help:'));
    console.log(chalk.green('  device -shutdown  ') + chalk.gray(' : Shuts the computer down.'));
    console.log(chalk.green('  device -logout    ') + chalk.gray(' : Logs out from the account on the computer.'));
    console.log(chalk.green('  device -status    ') + chalk.gray(' : Shows device runtime statuses.\n'));
}


//==============================
//* Module Export
//==============================
module.exports = deviceCommand;