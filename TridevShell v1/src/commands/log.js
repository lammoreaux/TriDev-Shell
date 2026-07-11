//=============================
//* Module Imports
//=============================
const os = require('os');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs');

const { conf: CONFIG_DIR, logs: LOG_FILE } = require('../utils/pathManager.js');
const { Console } = require('console');

const file_template = {
    "shellOpen": 0,
    "commandsUsed" : {
        "ai": 0, "alias": 0, "attack": 0, "color": 0, "connect": 0,
        "device": 0, "doctor": 0, "file": 0, "log": 0, "mock": 0,
        "path": 0, "plugin": 0, "port": 0, "scaffold": 0, "settings": 0,
        "task": 0, "tdinfo": 0, "tds": 0, "template": 0, "update": 0, "work": 0
    }
};

ensureConfig();

const logJson = require("../utils/jsonParser.js").ParseJsonFile(LOG_FILE);

//==============================
//* Log Main Command
//==============================
function logCommand(args){
    //<-log> without subcommand logs out the infos
    //<-log> [--write] [command] writes the log to the file
    ensureConfig();

    if (args.length === 0) return logInfo(logJson);
    if (args[0] === '--write') return logWrite(args[1], logJson);

    showLogHelp();
}

//==============================
//* Log Command Functions
//==============================
/**
 * Logs the current statistics of the user for TriDev Shell 
 * @param {JSON} json 
 */
function logInfo(json){

    const commands = json.commandsUsed;

    console.log(chalk.white('===-- User TDS Statistics --==='));
    console.log(chalk.bold(`${chalk.blue(`TriDev Shell opening amount:`)} ${chalk.inverse(`${json.shellOpen} times`)}`));
    console.log(chalk.bold(chalk.blue('Commands used times: ')));
    console.log(chalk.bold(chalk.blue('--------------------')));

    Object.entries(commands).forEach(([commandName, useCount]) => {
        const paddedName = commandName.padEnd(12, ' ');
        console.log(`${chalk.yellow(paddedName)} : ${chalk.white(useCount)} times`);
    });
}


function logWrite(commandName, json) {
    const commands = json.commandsUsed;

    if (commandName === 'ShellStart'){
        json.shellOpen++;
    } else {
        if (commands[commandName] !== undefined) {
            commands[commandName]++;
        } else {
            return;
        }
    }

    //Saves the new version of the json
    fs.writeFileSync(LOG_FILE, JSON.stringify(json, null, 4));
}

//==============================
//* Helper Functions
//==============================
/**
 * Shows the usage of the log command
 */
function showLogHelp(){
    console.log(chalk.cyan('===-- Log Command Help --===\n'));
    console.log(`${chalk.yellowBright('-log')} : Prints out all the information inside the log file`)
}


/**
 * Ensures that the save files exists and creates them if they don't exist
 */
function ensureConfig(){
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR);
    }
    if (!fs.existsSync(LOG_FILE)) {
        console.log(chalk.red('The log file was corrupted and had to be remade!'));
        console.log(chalk.red('This means that the informations will be reset'))
        fs.writeFileSync(LOG_FILE, JSON.stringify(file_template, null, 4));
    }
};


//=============================
//* Module Exports
//=============================
module.exports = logCommand;


