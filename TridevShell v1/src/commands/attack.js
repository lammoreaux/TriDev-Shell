/**
 * @fileoverview Network diagnostic, discovery, and testing tool for TriDev Shell.
 * @author Schlaffer Benjamin
 * @version 3.3.0
 * @description
 * COMMANDS:
 * attack -ping <ip> <bytes> <instances> : Sends parallel ICMP echo requests.
 * attack -sweep [<ip>]                 : Sweeps subnets using concurrency to locate live hosts.
 * attack -arp <ip>                    : Queries the local Address Resolution Protocol cache map.
 * attack -dns <ip>                    : Performs a reverse lookup domain name server verification.
 * attack -traceroute <ip>              : Traces network hop route boundaries.
 * attack -whois <ip>                   : Retrieves domain administrative registration information.
 * attack -nmap <ip>                   : Invokes an external Nmap system port query.
 */

//==============================
//* Util Imports
//==============================
const { runWithTimer } = require('../utils/timer.js');

//==============================
//* Imports
//==============================
const chalk = require('chalk');
const { exec } = require('child_process');
const os = require('os');
const util = require('util');
const execAsync = util.promisify(require('child_process').exec);
const inquirer = require('inquirer');
const cliProgress = require('cli-progress');

/**
 * @typedef {Object} NetworkDeviceChoice
 * @property {string} name - Clear human-readable display string containing interface or label data.
 * @property {string} value - Explicit target IP address string passed downstream to workers.
 */


//==============================
//* Main command handler
//==============================
/**
 * Main switchboard router prioritizing networking validation actions.
 * @param {string[]} args - Sequential parameters array passed post core action call.
 * @returns {Promise<void>}
 */
async function attackCommand(args) {
    if (args.length === 0) {
        showHelp();
        return;
    }

    const action = args[0];
    const subcommandArgs = args.slice(1);

    switch (action) {
        case '-ping':
            await runWithTimer('Ping Device', async () => await pingDevice(subcommandArgs));
            break;
        case '-sweep':
            await runWithTimer('Network Sweep', async () => await networkPingSweep(subcommandArgs));
            break;
        case '-arp':
            await runWithTimer('ARP Scan', async () => await arpScan(subcommandArgs));
            break;
        case '-dns':
            await runWithTimer('DNS Scan', async () => await dnsScan(subcommandArgs));
            break;
        case '-traceroute':
            await runWithTimer('Traceroute', async () => await traceroute(subcommandArgs));
            break;
        case '-whois':
            await runWithTimer('WHOIS Lookup', async () => await whois(subcommandArgs));
            break;
        case '-nmap':
            await runWithTimer('Nmap Scan', async () => await nmapScan(subcommandArgs));
            break;
        case '-help':
        default:
            showHelp();
            break;
    }
}


//==============================
//* Main Command Functions
//==============================
/** Renders cleanly aligned interface details across the terminal standard output stream. */
function showHelp() {
    console.log(chalk.hex('#0284c7')('\n--- Attack Command Help ---'));
    console.log(chalk.yellow('  attack -ping <ip> <bytes> <instances>') + chalk.gray(' : Ping a device concurrently.'));
    console.log(chalk.yellow('  attack -sweep [<ip>]                 ') + chalk.gray(' : Discover active hosts across local subnets.'));
    console.log(chalk.yellow('  attack -arp <ip>                     ') + chalk.gray(' : Fetch active ARP map details.'));
    console.log(chalk.yellow('  attack -dns <ip>                     ') + chalk.gray(' : Resolve nslookup DNS names.'));
    console.log(chalk.yellow('  attack -traceroute <ip>              ') + chalk.gray(' : Route pathways details to target.'));
    console.log(chalk.yellow('  attack -whois <ip>                   ') + chalk.gray(' : Lookup registration WHOIS indices.'));
    console.log(chalk.yellow('  attack -nmap <ip>                    ') + chalk.gray(' : Run deep target system port scanner.\n'));
}

/**
 * Spawns concurrent shell threads executing system pings.
 * @param {string[]} args - Arguments list matching structure: [ipAddress, executionBytes, threadCount].
 * @returns {void}
 */
function pingDevice(args) {
    if (!args[0]) {
        console.log(chalk.red('Please provide an IP address!'));
        return;
    }
    if (!args[1] || args[1] < 1 || args[1] > 65500) {
        console.log(chalk.red('Please provide a ping packet load amount (1 - 65500 bytes)!'));
        return;
    }
    
    const ip = args[0];
    const pingAmount = args[1];
    const dataAmount = parseInt(args[2], 10);

    if (isNaN(dataAmount) || dataAmount < 1 || dataAmount > 1000) {
        console.log(chalk.red('Please provide a valid concurrent check limit (1 - 1000 threads).'));
        return;
    }

    console.log(chalk.yellow(`Starting ${dataAmount} concurrent ping(s) to ${ip} with ${pingAmount} bytes...`));

    for (let i = 0; i < dataAmount; i++) {
        if (process.platform === 'win32') {
            exec(`start cmd /k "ping ${ip} -t -l ${pingAmount}"`);
        } else {
            exec(`ping ${ip} -s ${pingAmount}`, (error) => {
                if (error) console.log(chalk.red(`Instance ${i + 1} Error: ${error.message}`));
            });
        }
    }
    console.log(chalk.green(`Successfully initiated ${dataAmount} ping processes.`));
}

/**
 * Executes rapid multi-threaded network discovery loops mapping live local hosts.
 * @param {string[]} args - Optional index containing a baseline seed anchor IP string.
 * @returns {Promise<void>}
 */
async function networkPingSweep(args) {
    let anchorIp = args[0];

    if (!anchorIp) {
        const interfaces = os.networkInterfaces();
        /** @type {NetworkDeviceChoice[]} */
        const devices = [];

        for (const [name, info] of Object.entries(interfaces)) {
            if (!info) continue;
            for (const details of info) {
                if (details.family === 'IPv4' && !details.internal) {
                    devices.push({ name: `${name} (${details.address})`, value: details.address });
                }
            }
        }

        if (devices.length === 0) {
            devices.push({ name: 'Default Localhost (127.0.0.1)', value: '127.0.0.1' });
        }

        console.clear();
        const { selectedIp } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedIp',
                message: 'Select Anchor Device:',
                choices: [...devices, { name: 'Back', value: 'Back' }]
            }
        ]);

        if (selectedIp === 'Back') return;
        anchorIp = selectedIp;
    }

    console.clear();
    console.log(chalk.yellow('=== Sweep Scope Configuration ==='));
    const { choice } = await inquirer.prompt([
        {
            type: 'list',
            name: 'choice',
            message: 'Choose network discover range boundary depth:',
            choices: [
                { name: '1. Fast Scan (Current subnet: x.x.x.1-254)', value: 'fast' },
                { name: '2. Scan      (Current network: x.x.0.1-x.x.255.254)', value: 'scan' },
                { name: '3. Deep Scan (Everything except first IP: x.0.0.1-x.255.255.254)', value: 'deep' }
            ]
        }
    ]);

    // Split anchor IP only after selection has successfully settled asynchronously
    const parts = anchorIp.split('.');
    /** @type {string[]} */
    const onlineDevices = [];
    const concurrencyLimit = 100;

    let customPercentForScan = '0';
    let percentPrecision = 0;

    function* getFastScanIps() {
        for (let fourth = 1; fourth < 255; fourth++) {
            yield `${parts[0]}.${parts[1]}.${parts[2]}.${fourth}`;
        }
    }

    function* getScanIps() {
        for (let third = 0; third <= 255; third++) {
            for (let fourth = 1; fourth < 255; fourth++) {
                yield `${parts[0]}.${parts[1]}.${third}.${fourth}`;
            }
        }
    }

    function* getDeepScanIps() {
        for (let second = 0; second <= 255; second++) {
            for (let third = 0; third <= 255; third++) {
                for (let fourth = 1; fourth < 255; fourth++) {
                    yield `${parts[0]}.${second}.${third}.${fourth}`;
                }
            }
        }
    }

    let totalIps = 0;
    let ipGenerator;

    if (choice === 'fast') {
        customPercentForScan = '0';
        percentPrecision = 0;
        totalIps = 254;
        ipGenerator = getFastScanIps();
    } else if (choice === 'scan') {
        customPercentForScan = '0.00';
        percentPrecision = 2;
        totalIps = 256 * 254;
        ipGenerator = getScanIps();
    } else if (choice === 'deep') {
        customPercentForScan = '0.00000';
        percentPrecision = 5;
        totalIps = 256 * 256 * 254;
        ipGenerator = getDeepScanIps();
    }

    console.clear();
    console.log(chalk.cyan(`Starting network scan... Total IPs to scan: ${totalIps}`));

    const progressBar = new cliProgress.SingleBar({
        format: 'Scanning |' + chalk.cyan('{bar}') + '| {customPercentage}% || {value}/{total} IPs',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    });
    progressBar.start(totalIps, 0, { customPercentage: `${customPercentForScan}` });

    const executing = new Set();
    let completed = 0;

    async function pingDeviceAsync(ip) {
        try {
            if (process.platform === 'win32') {
                await execAsync(`ping -n 1 -w 300 ${ip}`);
            } else {
                await execAsync(`ping -c 1 -W 1 ${ip}`);
            }
            onlineDevices.push(ip);
        } catch {
            // Target offline or request timed out
        }
    }

    for (const ip of ipGenerator) {
        const task = pingDeviceAsync(ip);
        executing.add(task);

        task.finally(() => {
            executing.delete(task);
            completed++;
            progressBar.update(completed, { 
                customPercentage: ((completed / totalIps) * 100).toFixed(percentPrecision) 
            });
        });

        if (executing.size >= concurrencyLimit) {
            await Promise.race(executing);
        }
    }

    await Promise.all(executing);
    progressBar.stop();

    console.log(chalk.yellow('\nScan Complete!\n'));
    console.log(chalk.yellow('=== Network Online Devices ==='));

    onlineDevices.sort((a, b) => {
        const numA = Number(a.split('.').map((num) => (`000${num}`).slice(-3)).join(''));
        const numB = Number(b.split('.').map((num) => (`000${num}`).slice(-3)).join(''));
        return numA - numB;
    });

    let displayCounter = 1;
    for (const device of onlineDevices) {
        process.stdout.write(chalk.magenta('[Found] '));
        process.stdout.write(`Device-${displayCounter.toString().padEnd(3)} (${device.padEnd(15)}) `);
        console.log(chalk.green(`          [Online]`));
        displayCounter++;
    }

    console.log(chalk.white('\nPress ENTER to return to the menu...'));
    await inquirer.prompt([{ type: 'input', name: 'wait', message: 'Return' }]);
}

/**
 * Pulls operational ARP map tables.
 * @param {string[]} args - Target arguments array.
 * @returns {Promise<void>}
 */
async function arpScan(args) {
    if (!args[0]) {
        console.log(chalk.red('Please provide an IP address!'));
        return;
    }
    const ip = args[0];
    console.log(chalk.yellow(`Starting ARP cache query to ${ip}...`));
    const { stdout } = await execAsync(`arp -a ${ip}`);
    console.log(chalk.green(stdout));
}

/**
 * Checks reverse mapping records for explicit IPs.
 * @param {string[]} args - Target arguments array.
 * @returns {Promise<void>}
 */
async function dnsScan(args) {
    if (!args[0]) {
        console.log(chalk.red('Please provide an IP address!'));
        return;
    }
    const ip = args[0];
    console.log(chalk.yellow(`Starting DNS scan to ${ip}...`));
    const { stdout } = await execAsync(`nslookup ${ip}`);
    console.log(chalk.green(stdout));
}

/**
 * Traces consecutive intermediate path hop targets.
 * @param {string[]} args - Target arguments array.
 * @returns {Promise<void>}
 */
async function traceroute(args) {
    if (!args[0]) {
        console.log(chalk.red('Please provide an IP address!'));
        return;
    }
    const ip = args[0];
    console.log(chalk.yellow(`Starting traceroute to ${ip}...`));
    const cmd = process.platform === 'win32' ? `tracert ${ip}` : `traceroute ${ip}`;
    const { stdout } = await execAsync(cmd);
    console.log(chalk.green(stdout));
}

/**
 * Looks up administrative asset registrations via dynamic WHOIS endpoints.
 * @param {string[]} args - Target arguments array.
 * @returns {Promise<void>}
 */
async function whois(args) {
    if (!args[0]) {
        console.log(chalk.red('Please provide an IP address!'));
        return;
    }
    const ip = args[0];
    console.log(chalk.yellow(`Starting WHOIS lookup to ${ip}...`));
    try {
        const { stdout } = await execAsync(`whois ${ip}`);
        console.log(chalk.green(stdout));
    } catch (error) {
        console.log(chalk.red(`Error executing whois.`));
        console.log(chalk.yellow(`Please ensure 'whois' is installed and added to your system PATH.`));
    }
}

/**
 * Invokes system level deep queries using full external Nmap engines.
 * @param {string[]} args - Target arguments array.
 * @returns {Promise<void>}
 */
async function nmapScan(args) {
    if (!args[0]) {
        console.log(chalk.red('Please provide an IP address!'));
        return;
    }
    const ip = args[0];
    console.log(chalk.yellow(`Starting Nmap scan to ${ip}...`));
    try {
        const { stdout } = await execAsync(`nmap ${ip}`);
        console.log(chalk.green(stdout));
    } catch (error) {
        console.log(chalk.red(`Error executing nmap.`));
        console.log(chalk.yellow(`Please ensure 'nmap' is installed and added to your system PATH.`));
    }
}


//==============================
//* Command Exports
//==============================
module.exports = attackCommand;