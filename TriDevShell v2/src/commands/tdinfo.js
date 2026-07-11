//==============================
//*      Module Imports
//==============================
const { version } = require('../../package.json');
const chalk = require('chalk');

//==============================
//*      Devlog Import
//==============================
const devLogArr = require('../devlog/devlog.json');

//==============================
//*   Main Command Handler
//==============================
/**
 * Handles the infoCommand and calls function according to user imput
 * @param {string[]} args Passed down parameters
 */
function infoCommand(args) {
    switch(args){
        default:
            showAllInfo();
            showLatestDevLogOnly();
            console.log(chalk.gray('<tdinfo -all> for the whole devlog'));
            break;
        case '-all':
            showDevLog();
            break;
    }
}
//==============================
//*   Main Command Functions
//==============================
/**
 * Shows all the devlog of the TriDev Shell
 */
function showDevLog() {
    console.log(chalk.cyan('\n--- TriDev Shell Development history ---'));
    devLogArr.forEach(entry => printEntry(entry));
}

/**
 * Shows only the last devlog of the TriDev Shell
 */
function showLatestDevLogOnly() {
    const latest = devLogArr[0];
    if (latest) {
        console.log(chalk.cyan('\n--- Latest Update ---'));
        printEntry(latest);
    }
}

/**
 * Shows all the important information of the TriDev Shell 
 */
function showAllInfo() {
    console.log(chalk.cyan('\n--- TriDev Shell Information ---'));
    console.log(chalk.white('Author: Schlaffer Benjamin'));
    console.log(chalk.white('Version: ' + version));
    console.log(chalk.gray('A custom shell environment focused on productivity and workflow automation.\n'));
}

//==============================
//*     Helper Functions
//==============================
function printEntry(entry) {
    console.log(chalk.gray(`ˇ-------------------------------ˇ`));
    console.log(chalk.yellow(`Version: ${entry.version}`));
    console.log(chalk.white(`${entry.date ? `Date: ${entry.date}` : ''}\n`));
    if (entry.changes && entry.changes.length > 0) {
        entry.changes.forEach(change => {
            console.log(chalk.gray(` - ${change}`));
        });
    }
    console.log(chalk.gray(`^-------------------------------^`));
}

//==============================
//*      Module Exports
//==============================
module.exports = infoCommand;

