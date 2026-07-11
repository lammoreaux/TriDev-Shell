/**
 * @fileoverview Template handler for TriDev Shell
 * @author Schlaffer Benjamin
 * @version 5.7.1
 */

//==============================
//* Util Imports
//==============================
const { runWithTimer } = require('../utils/timer.js');


const chalk = require('chalk');
const os = require('os');
const fs = require('fs');
const path = require('path');

//==============================
//* Config configuration
//==============================
const { conf: CONFIG_DIR, temp: TEMPLATES_DIR, templ: CONFIG_FILE } = require('../utils/pathManager.js');

//==============================
//* Main command handler
//==============================
async function templateCommand(args, rl) {
    if (args.length > 1) {
        console.log(chalk.red('The argument can only be 1 command long.'));
        return;
    }

    const commandOrTemplate = args[0] || '';

    switch (commandOrTemplate) {
        case '-list':
            listTemplates();
            return;
        case '-create':
            await runWithTimer("Template Create", async () => createTemplate(rl));
            return;
        case '-delete':
            await runWithTimer("Template Delete", async () => deleteTemplate(rl));
            return;
        case '-help':
        case '':
            showTemplateHelp();
            return;
        default:
            await runWithTimer("Copy Template", async () => copyTemplateToCurrentDir(commandOrTemplate));
            return;
    }
}

//==============================
//*  Main Command Functions
//==============================

/**
 * Lists all the saved templates
 */
function listTemplates() {
    ensureConfig();
    try {
        const templatesRaw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const templatesJSON = JSON.parse(templatesRaw || '{}');
        const templates = Object.entries(templatesJSON);

        if (templates.length === 0) {
            console.log(chalk.gray(' No templates saved yet. Use -create to add one.'));
            return;
        }

        for (const [name, storedPath] of templates) {
            const fileName = path.basename(storedPath);
            console.log(chalk.yellow(`  ${name.padEnd(15)}`) + chalk.gray(`-> ${fileName}`));
        }
    }
    catch (error) {
        console.log(chalk.red('Failed to read templates: ' + error.message));
    }
}

/**
 * Shows all the template command help
 */
function showTemplateHelp() {
    console.log(chalk.cyan("\n==-- Template Command Help --=="));
    console.log(chalk.white(" template -create ") + chalk.gray(" : Prompts to save a new file template"));
    console.log(chalk.white(" template -list   ") + chalk.gray(" : Lists all saved templates"));
    console.log(chalk.white(" template -delete ") + chalk.gray(" : Deletes a saved template"));
    console.log(chalk.white(" template [name]  ") + chalk.gray(" : Copies the template to your current directory\n"));
}

/**
 * Creates a new template and copies the target file securely into the storage folder
 */
async function createTemplate(rl) {
    ensureConfig();

    const ask = (q) => new Promise(resolve => 
        rl.question(chalk.yellow(q), ans => resolve((ans || '').trim().replace(/^["']|["']$/g, '')))
    );

    const name = await ask('Enter the name of the template: ');
    if (!name) {
        console.log(chalk.red('Template name cannot be empty!'));
        return;
    }

    const objectPath = await ask('Enter the path of the file you want as a template: ');
    if (!objectPath) {
        console.log(chalk.red('Template path cannot be empty!'));
        return;
    }

    const resolvedPath = path.resolve(objectPath);
    if (!fs.existsSync(resolvedPath) || !fs.lstatSync(resolvedPath).isFile()) {
        console.log(chalk.red(`Could not find a valid file at path: "${objectPath}"`));
        return;
    }

    try {
        const templateSubDir = path.join(TEMPLATES_DIR, name);
        if (!fs.existsSync(templateSubDir)) {
            fs.mkdirSync(templateSubDir, { recursive: true });
        }

        const baseName = path.basename(resolvedPath);
        const destPath = path.join(templateSubDir, baseName);

        fs.copyFileSync(resolvedPath, destPath);

        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const json = JSON.parse(raw || '{}');
        json[name] = destPath;
        
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(json, null, 2));
        console.log(chalk.green(`Template "${name}" saved successfully as "${baseName}"!`));
    }
    catch (err) {
        console.log(chalk.red('Failed to create template: ' + err.message));
    }
}

/**
 * Deletes a template by name and removes its file from storage
 */
async function deleteTemplate(rl) {
    ensureConfig();

    const ask = (q) => new Promise(resolve => 
        rl.question(chalk.yellow(q), ans => resolve((ans || '').trim().replace(/^["']|["']$/g, '')))
    );

    const name = await ask('Enter the name of the template to delete: ');
    if (!name) {
        console.log(chalk.red('Template name cannot be empty!'));
        return;
    }

    try {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const json = JSON.parse(raw || '{}');

        if (!json[name]) {
            console.log(chalk.red(`Template "${name}" not found!`));
            return;
        }

        const filePath = json[name];
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            
            const parentDir = path.dirname(filePath);
            if (fs.existsSync(parentDir) && fs.readdirSync(parentDir).length === 0) {
                fs.rmdirSync(parentDir);
            }
        }

        delete json[name];
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(json, null, 2));

        console.log(chalk.green(`Template "${name}" deleted successfully.`));
    }
    catch (err) {
        console.log(chalk.red('Failed to delete template: ' + err.message));
    }
}

/**
 * Copies a template from storage into the user's current working directory
 */
function copyTemplateToCurrentDir(templateName) {
    ensureConfig();

    try {
        const currentDir = process.cwd(); 

        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const json = JSON.parse(raw || '{}');

        if (!json[templateName]) {
            console.log(chalk.red(`Template "${templateName}" does not exist. Type 'template -list' to see options.`));
            return;
        }

        const sourcePath = json[templateName];
        if (!fs.existsSync(sourcePath)) {
            console.log(chalk.red(`The source file for template "${templateName}" is missing from storage.`));
            return;
        }

        const baseName = path.basename(sourcePath);
        const destinationPath = path.join(currentDir, baseName);

        fs.copyFileSync(sourcePath, destinationPath);
        console.log(chalk.green(`Successfully deployed template "${templateName}" as "${baseName}" to current directory.`));
    } 
    catch (err) {
        console.log(chalk.red('Failed to copy template: ' + err.message));
    }
}

//==============================
//* Command Function Helpers
//==============================
/**
 * Ensures that the configuration directories and files exist
 */
function ensureConfig() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    if (!fs.existsSync(TEMPLATES_DIR)) {
        fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
    }
    if (!fs.existsSync(CONFIG_FILE)) {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({}, null, 2));
    }
}

/**
 * Loads all saved template names from storage.
 * @returns {string[]} Template names.
 */
function loadTemplates() {
    ensureConfig();
    try {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const json = JSON.parse(raw || '{}');
        return Object.keys(json);
    } catch (err) {
        return [];
    }
}

//==============================
//*     Module Exports
//==============================
templateCommand.loadTemplates = loadTemplates;
module.exports = templateCommand;