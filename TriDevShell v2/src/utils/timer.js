/**
 * @fileoverview Timer utility for TriDev Shell
 * @author Schlaffer Benjamin
 * @version 6.0.1
 * @description
 */

//==============================
//* Module Imports
//==============================
const { performance } = require('perf_hooks');
const chalk = require('chalk');
const notifier = require('node-notifier');
const os = require('os');
const path = require('path');
const fs = require('fs');

//==============================
//* Dependency Imports
//==============================
const adminJsonPath = path.join(os.homedir(), '.tridev', 'admin.json');

//==============================
//* Main Functionality
//==============================
/**
 * Runs the provided function and measures its execution time. If performance is enabled, it logs the duration to the console. If notification is enabled, it sends a desktop notification after completion with the duration.
 * @param {string} commandName - The name of the command being excecuted, used for logging and notifications.
* @param {Function} taskFn - The function to execute and measure.
 */
async function runWithTimer(commandName,taskFn){
    const defaults = { "showProcessTimeInfo": false, "returnNotification": false };

    let adminJson = require("../utils/jsonParser.js").ParseJsonFile(adminJsonPath);
    adminJson = {...defaults, ...adminJson}


    const shouldNotify = adminJson.returnNotification;
    const shouldLogPerformance = adminJson.showProcessTimeInfo;

    const start = performance.now();

    try {
        await taskFn();
    } catch (error){
        console.error(chalk.red(`\n[${commandName}] encountered an error.`));
        throw error;
    } finally {
            const end = performance.now();
            const duration = ((end - start)/1000).toFixed(2);
            
        if (shouldLogPerformance){
            console.log(chalk.yellowBright("\n\n===-- Performance Monitor --==="));
            console.log(chalk.gray(`[${commandName}] finished in ${duration} seconds.`));
        }

        if (shouldNotify) {
            notifier.notify({
                title: 'TriDev Shell',
                message: `${commandName} completed in ${duration}s`,
                sound: true,
                wait: true
            });
        }
        
    }
}

//==============================
//* Module Exports
//==============================
module.exports = { runWithTimer };