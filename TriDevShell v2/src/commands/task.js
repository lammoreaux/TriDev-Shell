/**
 * @fileoverview Task manager for TriDev Shell
 * @author Schlaffer Benjamin
 * @version 5.7.1
 * @description
 * COMMANDS:
 * task -help => Lists out all the option for the task command
 * task -list => Lists out all unfinished tasks
 * task -list -a => Lists out all unfinihsed and finished tasks
 * task -list -f => Lists out all finished tasks
 * task -create => creates a task
 * task -template => creates a template of the devtask json
 * task -scan [path] => checks if the working cwd or the given path has a devtask json and reads the tasks in for working 
 * task -tick => marks a task complete or incomplete if it was already ticked
 * task --clear-cache => clears the stored completed tasks in the save file
 */

//==============================
//*      Module Imports
//==============================
const chalk = require('chalk');
const fs = require('fs');
const os = require('os');
const path = require('path');
const inquirer = require('inquirer');

//========= Directories =========
const WORKING_DIR = process.cwd();
const { conf: CONFIG_DIR, task: TASK_DIR } = require('../utils/pathManager.js')

//========= Jsons =========
const TASKS_JSON = path.join(TASK_DIR, 'tasks.json');
const UNFINISHED_JSON = path.join(TASK_DIR, 'unfinished.json');
const FINSIHED_JSON = path.join(TASK_DIR, 'finished.json');


//==============================
//*    Main Command Helper
//==============================
/**
 * Ensures that the configuration files exist.
 */
function ensureConfig() {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
    if (!fs.existsSync(TASK_DIR)) fs.mkdirSync(TASK_DIR, { recursive: true });

    const defaultStructure = JSON.stringify({ toFix: [], toOptimise: [], toRework: [] }, null, 2);

    [TASKS_JSON, UNFINISHED_JSON, FINSIHED_JSON].forEach(file => {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, defaultStructure);
        }
    });
}

/**
 * Separates tasks from the buffer (tasks.json) into finished/unfinished JSONs
 * and clears the buffer.
 */
function separateTasks() {
    // Read files
    const rawTasks = JSON.parse(fs.readFileSync(TASKS_JSON, 'utf8'));
    const unfinished = JSON.parse(fs.readFileSync(UNFINISHED_JSON, 'utf8'));
    const finished = JSON.parse(fs.readFileSync(FINSIHED_JSON, 'utf8'));

    const newUnfinished = { toFix: [], toOptimise: [], toRework: [] };
    const newFinished = { toFix: [], toOptimise: [], toRework: [] };

    const processTask = (category, task) => {
        const list = task.state ? newFinished[category] : newUnfinished[category];
        const exists = list.some(t => t.file === task.file && (category !== 'toFix' || t.problem === task.problem));
        if (!exists) {
            list.push(task);
        }
    };

    ['toFix', 'toOptimise', 'toRework'].forEach(cat => {
        if (rawTasks[cat] && Array.isArray(rawTasks[cat])) {
            rawTasks[cat].forEach(task => processTask(cat, task));
        }
        if (unfinished[cat] && Array.isArray(unfinished[cat])) {
            unfinished[cat].forEach(task => processTask(cat, task));
        }
        if (finished[cat] && Array.isArray(finished[cat])) {
            finished[cat].forEach(task => processTask(cat, task));
        }
    });

    // Save changes
    fs.writeFileSync(UNFINISHED_JSON, JSON.stringify(newUnfinished, null, 2));
    fs.writeFileSync(FINSIHED_JSON, JSON.stringify(newFinished, null, 2));

    // Clear buffer
    fs.writeFileSync(TASKS_JSON, JSON.stringify({ toFix: [], toOptimise: [], toRework: [] }, null, 2));
}

/**
 * Shows the help for the task command
 */
function showTaskHelp() {
    console.log(chalk.cyan("\n===-- TriDev Task Manager Help --==="));

    console.log(chalk.yellow("\n[Commands]"));
    const commands = [
        { cmd: "task -help", desc: "Show this help menu" },
        { cmd: "task -list [-a|-f]", desc: "List unfinished (default), finished (-f), or all (-a) tasks" },
        { cmd: "task -create", desc: "Interactively create a new task" },
        { cmd: "task -template [path?]", desc: "Create a devtask.json template in the current or specified directory" },
        { cmd: "task -scan [path]", desc: "Scan a directory for devtask.json and merge into buffer" },
        { cmd: "task -tick", desc: "Toggle the completion state of a task" },
        { cmd: "task --clear-cache", desc: "Clear all completed (finished) tasks" }
    ];

    commands.forEach(c => console.log(`  ${chalk.green(c.cmd.padEnd(25))} ${c.desc}`));

    console.log(chalk.yellow("\n[Task Types Reference]"));
    console.log(`  ${chalk.bold('toFix')}:      Immediate action required for critical bugs.`);
    console.log(`  ${chalk.bold('toOptimise')}: Resource-heavy issues affecting performance.`);
    console.log(`  ${chalk.bold('toRework')}:   Code quality improvements/refactoring.`);

    console.log("\n" + chalk.gray("Tip: Use 'toFix' for high-priority items that break runtime functionality.\n"));
}


//==============================
//*    Main Command Handler
//==============================
/**
 * The main command handler
 * @param {string[]} args - The passed arguments 
 * @param {ReadLine} rl - Active Readline interface context for reading interactive questions.
 * @returns {void}
 */
async function taskCommand(args, rl) {
    const command = args[0];
    const subCommand = args[1];
    const bothTaskJson = {
        UNFINISHED_JSON,
        FINSIHED_JSON
    };

    switch (command) {
        case '-list':
            listTasks(subCommand, bothTaskJson); //Done
            return;
        case '-create':
            await createTask(rl, UNFINISHED_JSON);
            return;
        case '-tick':
            await checkTask(rl, UNFINISHED_JSON, bothTaskJson);
            return;
        case '-template':
            copyTemplate(WORKING_DIR, subCommand); //Done
            return;
        case '-scan':
            scanDir(subCommand, rl); //Done
            return;
        case '--clear-cache':
            clearTaskCache(FINSIHED_JSON); //Done
            return;
        default:
            showTaskHelp(); //Done
            return;
    }
}

//==============================
//*   Main Command Functions
//==============================
/**
 * 
 * @param {string} option - The sub-command
 * @param {string[]} jsons - The json file paths
 * @returns 
 */
function listTasks(option, jsons) {
    ensureConfig();

    let unfinishedData, finishedData;

    //Checks for the subcommand and only reads in the nessesarry files
    if (option === '-a' || !option || option === '-u') {
        try {
            const fileContent = fs.readFileSync(jsons.UNFINISHED_JSON, 'utf8');
            unfinishedData = JSON.parse(fileContent);
        } catch (err) {
            console.log(chalk.red("Error reading or parsing unfinished.json"));
            return;
        }
    }

    if (option === '-a' || option === '-f') {
        try {
            const fileContent = fs.readFileSync(jsons.FINSIHED_JSON, 'utf8');
            finishedData = JSON.parse(fileContent);
        } catch (err) {
            console.log(chalk.red("Error reading or parsing finished.json"));
            return;
        }
    }

    //If one of them is not read than it becomes a empty json
    unfinishedData = unfinishedData || { toFix: [], toOptimise: [], toRework: [] };
    finishedData = finishedData || { toFix: [], toOptimise: [], toRework: [] };


    //Unfinished jsons
    const unfinishedToFix = unfinishedData.toFix;
    const unfinishedToOptimise = unfinishedData.toOptimise;
    const unfinishedToRework = unfinishedData.toRework;

    //Finished jsons
    const finishedToFix = finishedData.toFix;
    const finishedToOptimise = finishedData.toOptimise;
    const finishedToRework = finishedData.toRework;

    //Lists out both unfinished and finished tasks
    if (option === '-a') {
        console.log(chalk.cyan("Unfinished tasks: "));
        console.log('-------------\n\n');
        listHelper(unfinishedToFix, unfinishedToOptimise, unfinishedToRework);

        console.log(chalk.cyan("Finished tasks: "));
        console.log('-------------\n\n');
        listHelper(finishedToFix, finishedToOptimise, finishedToRework);
        return;
    }

    //Lists out only the finsihed tasks
    if (option === '-f') {
        listHelper(finishedToFix, finishedToOptimise, finishedToRework);
        return;
    }

    //If no sub-command were entered. lists out all unfinished tasks

    listHelper(unfinishedToFix, unfinishedToOptimise, unfinishedToRework);
}
/**
 * Lists out all the tasks in importance hierarchy
 * @param {json} toFixList - The fix json
 * @param {json} toOptimiseList - The optimise json
 * @param {json} toReworkList - The rework json
 */
function listHelper(toFixList, toOptimiseList, toReworkList) {

    if (Array.isArray(toFixList) && toFixList.length > 0) {
        console.log(chalk.red("\nTo Fix: "));
        console.log(chalk.gray("---------"));
        let i = 0;
        toFixList.forEach(t => {
            console.log(`${chalk.bold(`ID: ${++i}`)}\n ${chalk.blueBright('File:')} ${t.file}\n ${chalk.yellowBright('Problem')}: ${t.problem}\n ${chalk.yellowBright('Possible Solution')}: ${t.possible}\n ${chalk.yellowBright('Feedback')}: ${t.feedback || 'None'} \n`);
        });
    } else {
        console.log(chalk.green("No tasks to fix found!"));
    }

    if (Array.isArray(toOptimiseList) && toOptimiseList.length > 0) {
        console.log(chalk.yellow("\nTo Optimise: "));
        console.log(chalk.gray("---------"));
        let i = 0;
        toOptimiseList.forEach(t => {
            console.log(`${chalk.bold(`ID: ${++i}`)}\n ${chalk.blueBright('File:')} ${t.file}\n ${chalk.yellowBright('Feedback')}: ${t.feedback || 'None'} \n`);
        });
    } else {
        console.log(chalk.green("No tasks to optimise found!"));
    }

    if (Array.isArray(toReworkList) && toReworkList.length > 0) {
        console.log(chalk.greenBright("\nTo Rework: "));
        console.log(chalk.gray("---------"));
        let i = 0;
        toReworkList.forEach(t => {
            console.log(`${chalk.bold(`ID: ${++i}`)}\n ${chalk.blueBright('File:')} ${t.file}`);
        });
    } else {
        console.log(chalk.green("No tasks to rework found!"));
    }
}

/**
 * Checks a specific type and id unfinished task
 * @param {ReadLine} rl - Active Readline interface context
 * @param {string} json - The unfinished_json's file path
 * @param {string} bothTaskJson - The unfinished and finished json so the listTask can work properly
 */
async function checkTask(rl, json, bothTaskJson) {
    ensureConfig();
    listTasks('-u', bothTaskJson);

    let data;
    try {
        data = JSON.parse(fs.readFileSync(json, 'utf8'));
    } catch (err) {
        console.log(chalk.red("Error reading JSON"));
        return;
    }

    const { category } = await inquirer.prompt([{
        type: 'list',
        name: 'category',
        message: 'Select the task category:',
        choices: ['toFix', 'toOptimise', 'toRework', 'Exit']
    }]);

    if (category === 'Exit') {
        return;
    }

    if (!data[category] || data[category].length === 0) {
        console.log(chalk.yellow(`No tasks found in category: ${category}`));
        return;
    }

    const { id } = await inquirer.prompt([{
        type: 'input',
        name: 'id',
        message: `Enter the Issue ID (1 - ${data[category].length}):`,
        validate: (input) => {
            const val = parseInt(input);
            return (val > 0 && val <= data[category].length) ? true : "Invalid ID";
        }
    }]);

    const index = parseInt(id) - 1;

    data[category][index].state = !data[category][index].state;

    fs.writeFileSync(json, JSON.stringify(data, null, 2));

    console.log(chalk.green(`Successfully toggled task ${id} in ${category}!`));
    console.log(chalk.red('!ATTENTION!: ') + "Please list the tasks again before ticking another one. ID's will differ!");
    separateTasks();
}

/**
 * Interactively creates a new task and saves it to the unfinished JSON.
 * @param {ReadLine} rl - Active Readline interface context
 * @param {string} json - The unfinished JSON file path.
 */
async function createTask(rl, json) {
    ensureConfig();

    let data;
    try {
        data = JSON.parse(fs.readFileSync(json, 'utf8'));
    } catch (err) {
        console.log(chalk.red("Error reading JSON"));
        return;
    }

    const { category } = await inquirer.prompt([{
        type: 'list',
        name: 'category',
        message: 'Select the task category:',
        choices: ['toFix', 'toOptimise', 'toRework', 'Exit']
    }]);

    if (category === "Exit") return;

    const questions = [
        {
            type: 'input',
            name: 'file',
            message: 'Enter the file path/name:',
            validate: (input) => input.trim() !== '' ? true : 'File path/name cannot be empty.'
        }
    ];

    if (category === 'toFix') {
        questions.push(
            {
                type: 'input',
                name: 'problem',
                message: 'Enter the problem description:',
                validate: (input) => input.trim() !== '' ? true : 'Problem description cannot be empty.'
            },
            {
                type: 'input',
                name: 'possible',
                message: 'Enter the possible cause/solution:',
                default: 'Unknown'
            },
            {
                type: 'input',
                name: 'feedback',
                message: 'Enter feedback (optional):',
                default: 'None'
            }
        );
    } else if (category === 'toOptimise') {
        questions.push({
            type: 'input',
            name: 'feedback',
            message: 'Enter feedback (optional):',
            default: 'None'
        });
    }

    const answers = await inquirer.prompt(questions);

    const newTask = {
        state: false,
        file: answers.file,
        ...answers
    };
    delete newTask.category;

    data[category].push(newTask);

    fs.writeFileSync(json, JSON.stringify(data, null, 2));

    console.log(chalk.green(`Successfully created new task under ${category}!`));
    separateTasks();
}


/**
 * Creates a devtask.json file in the specified directory.
 * @param {string} dir - The default directory path to use if no specific folderPath is provided.
 * @param {string} [folderPath] - The optional target directory path.
 * @returns {void}
 */
function copyTemplate(dir, folderPath) {
    const fileName = "devtask.json";
    const targetDir = folderPath ? folderPath : dir;

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const destination = path.join(targetDir, fileName);

    fs.writeFileSync(destination, baseTaskTemplate);
    console.log(chalk.green(`Successfully created: ${destination}`));
}

/**
 * Empties the finished task json by overwriting it with an empty structure
 * @returns {void}
 */
function clearTaskCache(fileToClear) {
    ensureConfig();
    const emptyTasks = JSON.stringify({ toFix: [], toOptimise: [], toRework: [] }, null, 2);

    fs.writeFileSync(fileToClear, emptyTasks);

    console.log(chalk.yellow("Finished tasks cache cleared."));
}

/**
 * Scans a directory for devtask.json and merges it into the task buffer.
 * @param {string} filePath - The path to scan.
 * @param {object} rl - The Readline interface.
 */
function scanDir(filePath, rl) {
    ensureConfig();

    const fileName = 'devtask.json';
    const searchDest = path.join(filePath, fileName);

    if (!fs.existsSync(searchDest)) {
        return console.log(chalk.red("File in given destination was not found"));
    }

    console.log(chalk.green("File found in given destination!"));

    rl.question("Do you wish to merge the tasks from the found folder? (y/n) ", (answer) => {
        if (answer.toLowerCase() !== 'y') {
            return console.log(chalk.gray(`Merge cancelled. Directory: ${filePath}`));
        }

        try {
            const foundData = JSON.parse(fs.readFileSync(searchDest, 'utf8'));

            const bufferData = JSON.parse(fs.readFileSync(TASKS_JSON, 'utf8'));

            ['toFix', 'toOptimise', 'toRework'].forEach(category => {
                if (foundData[category] && Array.isArray(foundData[category])) {
                    bufferData[category].push(...foundData[category]);
                }
            });

            fs.writeFileSync(TASKS_JSON, JSON.stringify(bufferData, null, 2));

            separateTasks();

            console.log(chalk.green("Successfully merged and separated tasks!"));
        } catch (error) {
            console.error(chalk.red("Failed to merge tasks. Ensure devtask.json is valid JSON."));
        }
    });
}

//==============================
//*      Command Export
//==============================
module.exports = taskCommand;


//==============================
//*    Base Task Template
//==============================
const baseTaskTemplate = `
{
    "toFix": [],
    "toOptimise": [],
    "toRework": [],
    "howtheywork": [
        {
            "toFix": {
                "state": "is a boolean that shows if the issue has been resolved or not",
                "file": "is what the dev has to inspect for fixing",
                "problem": "is a message that explains what the problem is",
                "possible": "is a message of what might cause the issue",
                "feedback": "is a message left by a tester/dev/user about the known issue to help locate the problem",
                "infoOfThisAction": "The fix one is the most important out of all the actions here. The fix is where crucial bugs are listed, letting the dev know that they need to fix it immediately or the app won't work"
            },
            "toOptimise": {
                "state": "is a boolean that shows if the issue has been resolved or not",
                "file": "is what the dev has to optimise",
                "feedback": "is a message left by tester/dev/user",
                "infoOfThisAction": "The optimise is the second most crucial action. The need for optimisation is when the app is using too many resources for an action/actions and it makes the app cost effective or slow."
            },
            "toRework": {
                "state": "is a boolean that shows if the issue has been resolved or not",
                "file": "is what the dev has to rework",
                "infoOfThisAction": "The rework is the least crucial action category. It's not a user side problem or a runtime problem. Mainly it's a programmer problem where the dev has to make the code easier to read and use. None effecting the userbase or the server/backend"
            }
        }
    ]
}
`;