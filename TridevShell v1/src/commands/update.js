/**
 * @fileoverview Remote Binary Synchronization and Environment Path Updater for TriDev Shell
 * @author Schlaffer Benjamin
 * @version 1.0.0
 * @description
 * COMMANDS:
 * update -allow : Spawns an isolated administrative PowerShell sub-process to patch shell binaries.
 */

//==============================
//* Module Imports
//==============================
const { exec } = require('child_process');
const chalk = require('chalk');

//==============================
//* Constants & Configuration
//==============================
const DOWNLOAD_URL = 'https://tridevhungary.com/downloads/tridevshell.exe';

// Multi-line PowerShell deployment script block handled via base64 pipeline encoding
const downloadScript = [
    "Write-Host 'Optimization: v1.0';",
    "$p = \"$env:LOCALAPPDATA\\TDS\";",
    "New-Item -ItemType Directory -Path $p -Force;",
    "Start-Sleep -Seconds 5;",
    `iwr -Uri '${DOWNLOAD_URL}' -OutFile \"$p\\tds.exe\";`,
    "if ($?) {",
    "  $old = [Environment]::GetEnvironmentVariable('Path', 'User');",
    "  if ($old -notlike \"*$p*\") { [Environment]::SetEnvironmentVariable('Path', \"$old;$p\", 'User') };",
    "  Write-Host 'Installation Complete! Restart your terminal and type TDS' -ForegroundColor Green",
    "} else {",
    "  Write-Host 'Installation Failed: Could not download the file.' -ForegroundColor Red",
    "}"
].join(' ');


//==============================
//* Main Command Handler
//==============================
/**
 * Validation switchboard executing external platform installations and managing thread death sequences.
 * @param {string[]} args - Parameter flags and string arguments passed after core call.
 * @returns {void}
 */
function updateCommand(args) {
    const action = args[0]?.toLowerCase();

    switch (action) {
        case '-allow':
            executeSystemUpdate();
            break;
        case '-help':
        default:
            showUpdateHelp();
            break;
    }
}


//==============================
//* Command Actions
//==============================
/** Prints baseline safety warnings detailing explicit execution permissions criteria. */
function showUpdateHelp() {
    console.log(chalk.yellow('\n⚠ To perform a shell update, you must explicitly allow it:'));
    console.log(chalk.cyan('  update -allow\n'));
}

/**
 * Encodes script strings into target UTF-16LE Base64 blobs to safely spawn detached system updaters.
 * @returns {void}
 */
function executeSystemUpdate() {
    console.log(chalk.cyan('\nInitializing update sequence in a new terminal window...'));

    try {
        // Encode text to base64 to completely eliminate character escaping collisions between Node/CMD/PowerShell
        const encodedCommand = Buffer.from(downloadScript, 'utf16le').toString('base64');
        const fullCommand = `start "TriDev Shell Update" powershell.exe -NoProfile -EncodedCommand ${encodedCommand}`;

        // Fire detached shell wrapper execution task
        exec(fullCommand);
        
        console.log(chalk.green('Update process started successfully.'));
        console.log(chalk.gray('The updater will pause briefly, then patch binaries after this process terminates.'));

        // Delay exiting slightly to let the OS mount window allocations safely
        setTimeout(() => {
            process.exit(0);
        }, 2000);

    } catch (err) {
        console.log(chalk.red(`\n❌ Failed to launch update sub-process: ${err.message}\n`));
    }
}


//==============================
//* Module Exporter
//==============================
module.exports = updateCommand;