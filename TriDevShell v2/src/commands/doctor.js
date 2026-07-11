/**
 * @fileoverview Doctor manager for TriDev Shell
 * @author Schlaffer Benjamin
 * @version 5.8.1
 * @description
 * COMMANDS:
 * doc -main : Checks if the main folder structure is correct
 * doc -diagnose : Checks if the main folder structure is correct and if all dependencies are installed.
 * doc -help : Shows help for the command.
 */

//==============================
//* Util Imports
//==============================
const { runWithTimer } = require('../utils/timer.js');

//==============================
//*      Module Imports
//==============================
const os = require("os");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

//==============================
//*      Path Variables
//==============================
const configPaths = {
    main: path.join(os.homedir(), '.tridev'),
    plugins: path.join(os.homedir(), '.tridev', 'plugins'),
    task: path.join(os.homedir(), '.tridev', 'task'),
    templates: path.join(os.homedir(), '.tridev', 'templates'),
    aliasesJson: path.join(os.homedir(), '.tridev', 'aliases.json'),
    adminJson: path.join(os.homedir(), '.tridev', 'admin.json'),
    pathsJson: path.join(os.homedir(), '.tridev', 'paths.json'),
    serversJson: path.join(os.homedir(), '.tridev', 'servers.json'),
    templateJson: path.join(os.homedir(), '.tridev', 'template.json'), 
    themeJson: path.join(os.homedir(), '.tridev', 'theme.json'),
    uiJson: path.join(os.homedir(), '.tridev', 'ui_settings.json'),
    workJson: path.join(os.homedir(), '.tridev', 'work_config.json'),
};

//Error Array
const errors = new Set();

//==============================
//*    Main Command Handler
//==============================
function doctorCommand(args) {

    switch (args[0]) {
        case '-main':
          runWithTimer('Doctor - Main Check', () => { 
            checkStructure(true, errors, configPaths); 
          });
          return;
        case '-diagnose':
          runWithTimer('Doctor - Diagnose', () => {
              checkStructure(false, errors, configPaths);
          });
          return;
        case '-fix':
          runWithTimer('Doctor - Fix Problems', () => {
            fixProblems(errors);
          });
          return;
        default:
          helpCommand(); 
          return;
    }
}

//==============================
//*   Main Command Functions
//==============================
/**
 * Checks the structure of the configuration folder
 * @param {boolean} checkMainOnly - Only checks if the .tridev folder exists
 * @param {Array} errors -The error array to push errors to
 * @param {Array} paths -The paths to check
 */
function checkStructure(checkMainOnly, errors, paths){
    errors.clear();

    if (!fs.existsSync(paths.main)) {
        errors.add({ type: 'folder', path: paths.main});
    }

    if (checkMainOnly) {
        showResults(errors);
        return;
    }

    Object.keys(paths).forEach(key => {
        if (key === 'main') return;

        const p = paths[key];
        if (!fs.existsSync(p)) {
            const type = p.endsWith('.json') ? 'file' : 'folder';
            errors.add({ type, path: p, name: key });
        }
    });
    showResults(errors);
}

/**
 * Fixes the problems identified by the diagnose command
 * @param {Array} errors - The error array containing missing files/folders
 */
function fixProblems(errors){
    errors.forEach(error => {
        if (error.type === 'folder'){
            fs.mkdirSync(error.path, { recursive: true });
            console.log(chalk.greenBright(`Created missing folder: ${error.path}`));
        }

        if (error.type === 'file'){
            const template = jsonTemplates[error.name];
            if (template) {
                fs.writeFileSync(error.path, JSON.stringify(template), 'utf8');
            } else {
                fs.writeFileSync(error.path, '{}', 'utf8');
            }
            console.log(chalk.greenBright(`Created missing file: ${error.path}`));
        }
    })
}

//==============================
//*     Helper Functions
//==============================
function helpCommand(){
    console.log(chalk.cyanBright("TriDev Shell Doctor Command Help\n"));
    console.log(`${chalk.yellow("doc -main")} : ${chalk.gray("Checks if the main folder structure is correct")}`);
    console.log(`${chalk.yellow("doc -diagnose")} : ${chalk.gray("Gives feedback on what folders/files are missing")}`);
    console.log(`${chalk.yellow("doc -fix")} : ${chalk.gray("Fixes the issues given by the diagnose command")}`);
    console.log(`${chalk.yellow("doc -help")} : ${chalk.gray("Shows help for the command.")}`);
}

function showResults(errors){
    if (errors.size === 0) {
        console.log(chalk.greenBright("All required folders and files are present."));
        return;
    }

    console.log(chalk.redBright("The following files/folders are missing:"));
    errors.forEach(error => {
        console.log(`- ${chalk.blue(error.type)}: ${error.path}`);
    });
}

//==============================
//*    Main Command Export
//==============================
module.exports = doctorCommand;



//==============================
//*     Json templates
//==============================
const uiSettingsTemplate = 
    [
  {
    "id": "line_endings",
    "name": "Line Endings",
    "command": "settings -line",
    "description": "Customize the shell prompt's line ending.",
    "selected": 1,
    "options": [
      {
        "example": "C:\\Users/> ",
        "value": "/> "
      },
      {
        "example": "C:\\Users: ",
        "value": ": "
      },
      {
        "example": "C:\\Users> ",
        "value": "> "
      },
      {
        "example": "C:\\Users} ",
        "value": "} "
      },
      {
        "example": "C:\\Users] ",
        "value": "] "
      },
      {
        "example": "C:\\Users$ ",
        "value": "$ "
      },
      {
        "example": "C:\\Users# ",
        "value": "# "
      },
      {
        "example": "C:\\Users:~$ ",
        "value": ":~$ "
      },
      {
        "example": "> ",
        "value": "none> "
      },
      {
        "example": "$ ",
        "value": "none$ "
      },
      {
        "example": ":~$ ",
        "value": "none:~$ "
      }
    ]
  },
  {
    "id": "header_style",
    "name": "Header Style",
    "command": "settings -header",
    "description": "Customize the shell's header.",
    "selected": 1,
    "options": [
      {
        "example": "retro",
        "value": "retro"
      },
      {
        "example": "basic",
        "value": "basic"
      },
      {
        "example": "alpha",
        "value": "alpha"
      }
    ]
  }
]

const adminSettingsTemplate =
{
    "aiEnabled": false,
    "loadingScreen": true,
    "commitsShown": 2,
    "ai": false,
    "loading": true,
    "showProcessTimeInfo": true,
    "returnNotification": true
}

const logJsonTemplate = {
    "shellOpen": 0,
    "commandsUsed" : 
    {
        "ai": 0,
        "alias": 0,
        "attack": 0,
        "color": 0,
        "connect": 0,
        "device": 0,
        "doctor": 0,
        "file": 0,
        "log": 0,
        "mock/api": 0,
        "path": 0,
        "plugin": 0,
        "port": 0,
        "scaffold": 0,
        "settings": 0,
        "task": 0,
        "tdinfo": 0,
        "tds": 0,
        "template": 0,
        "update": 0,
        "work": 0
    }
}

const jsonTemplates = {
    uiJson: uiSettingsTemplate,
    adminJson: adminSettingsTemplate,
    logJson: logJsonTemplate
}