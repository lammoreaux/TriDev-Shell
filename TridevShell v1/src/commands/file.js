/**
 * @fileoverview File Management Utilities for TriDev Shell
 * @author Schlaffer Benjamin
 * @version 2.1.0
 * @description
 * COMMANDS:
 * file -sort [path]                             : Organizes files into folders by extension.
 * -deep                                       : Recursive sort including subdirectories.
 * -allow                                      : Include code/script files in sorting.
 * file -zip <name> [-src <dir>] [-out <dir>]    : Archives folder structures into a zip file.
 * file -unzip <name> [-out <dir>]               : Unpacks a zip archive file with cleanup prompts.
 * file -list <name>                             : Previews all internal entries of a zip file.
 * file -find <name>                             : Recursively crawls directories to locate a filename match.
 */

//==============================
//* Util Imports
//==============================
const { runWithTimer } = require('../utils/timer.js');

//==============================
//* Module Imports
//==============================
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const AdmZip = require('adm-zip');
const { Readline } = require('readline');
const extensionsJson = require('../JSON/extensionMap.json');

//==============================
//* Constants & Configuration
//==============================
/** 
 * @type {Object.<string, string[]>} 
 */
const EXTENSION_MAP = extensionsJson;

/**
 * @typedef {Object} SortStats
 * @property {number} movedCount - Incremental tracking number of successfully relocated files.
 */


//==============================
//* Main Command Handler
//==============================
/**
 * Routing switchboard for general filesystem manipulation utilities.
 * @param {string[]} args - Parameter flags and string arguments passed after core call.
 * @param {string} currentDir - The active working directory context of the shell.
 * @param {Readline} rl - Active Readline interface context for confirmation prompts.
 * @returns {Promise<void>}
 */
async function fileCommand(args, currentDir, rl) {
    const action = args[0]?.toLowerCase();

    switch (action) {
        case '-sort':
        case 'sort':
            runWithTimer("File Sort", () => handleSort(args, currentDir));
            break;
        case '-zip':
        case 'zip':
            runWithTimer("File Zip", () => handleZip(args, currentDir));
            break;
        case '-unzip':
        case 'unzip':
            runWithTimer("File Unzip", () => handleUnzip(args, currentDir, rl));
            break;
        case '-list':
        case 'list':
            runWithTimer("File List", () => handleList(args, currentDir));
            break;
        case '-find':
        case 'find':
            runWithTimer("File Find", () => handleFind(args, currentDir));
            break;
        default:
            showFileHelp();
            break;
    }
}


//==============================
//* Main Command Helpers
//==============================
/** Prints organized usage guidelines describing structural option formatting flags. */
function showFileHelp() {
    console.log(chalk.hex('#0284c7')('\n--- File Manager ---'));
    console.log(chalk.yellow('  file -sort [path]') + chalk.gray('       : Sort files into category folders'));
    console.log(chalk.yellow('    -deep') + chalk.gray('                 : Recursive sort (flatten subfolders)'));
    console.log(chalk.yellow('    -allow') + chalk.gray('                : Include code/script files'));
    console.log(chalk.yellow('  file -zip <filename> [-src <dir>] [-out <dir>]') + chalk.gray(' : Zip directory'));
    console.log(chalk.yellow('  file -unzip <filename> [-out <dir>]') + chalk.gray('            : Unzip file'));
    console.log(chalk.yellow('  file -list <filename>') + chalk.gray('                          : List zip contents'));
    console.log(chalk.yellow('  file -find <name>') + chalk.gray('                              : Search for a file\n'));
}
/**
 * Maps an explicit file extension back to its grouping category title string.
 * @param {string} ext - The parsed fallback dot-notation extension string.
 * @param {boolean} allowCode - Override flag to permit moving structural code/script files.
 * @returns {string|null} The category key title name or null if target skipped or unmatched.
 */
function getCategory(ext, allowCode) {
    const lowerExt = ext.toLowerCase();

    for (const [category, exts] of Object.entries(EXTENSION_MAP)) {
        if (exts.includes(lowerExt)) {
            if (!allowCode && (category === 'Code' || category === 'Scripts')) {
                return null; 
            }
            return category;
        }
    }
    return null;
}

/**
 * Moves individual single asset items directly into assigned configuration sub-folders.
 * @param {string} filePath - Absolute platform location of target asset.
 * @param {string} rootPath - The target processing destination boundary root.
 * @param {string} category - Destination category directory folder match name.
 * @param {SortStats} stats - References parent metric profile counters.
 * @returns {void}
 */
function processFile(filePath, rootPath, category, stats) {
    const fileName = path.basename(filePath);
    const categoryDir = path.join(rootPath, category);

    if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir);
    }

    const destPath = path.join(categoryDir, fileName);

    if (fs.existsSync(destPath)) {
        return;
    }

    try {
        fs.renameSync(filePath, destPath);
        stats.movedCount++;
        console.log(chalk.gray(`Moved ${fileName} -> ${category}`));
    } catch (err) {
        console.log(chalk.red(`Error moving ${fileName}: ${err.message}`));
    }
}

/**
 * Recursive workspace directory scanner mapping local files down to target criteria sweeps.
 * @param {string} currentPath - Dynamic operational folder workspace traversal pathway.
 * @param {string} rootPath - Root anchor target location tracking destination coordinates.
 * @param {boolean} deep - Toggles whether subdirectories are scanned recursively.
 * @param {boolean} allowCode - Toggles sorting rules for technical execution blocks.
 * @param {SortStats} stats - Global workspace counter context object.
 * @returns {void}
 */
function processDirectory(currentPath, rootPath, deep, allowCode, stats) {
    let items;
    try {
        items = fs.readdirSync(currentPath);
    } catch (e) { return; }

    items.forEach(item => {
        const itemPath = path.join(currentPath, item);
        let stat;
        try {
            stat = fs.lstatSync(itemPath);
        } catch (e) { return; }

        if (stat.isDirectory()) {
            if (currentPath === rootPath && Object.keys(EXTENSION_MAP).includes(item)) {
                return;
            }
            if (deep) {
                processDirectory(itemPath, rootPath, deep, allowCode, stats);
            }
        } else if (stat.isFile()) {
            const ext = path.extname(item);
            if (!ext) return;

            const category = getCategory(ext, allowCode);
            if (category) {
                processFile(itemPath, rootPath, category, stats);
            }
        }
    });
}

/**
 * Inner operational walker verifying matches against runtime wildcard strings.
 * @param {string} currentPath - Dynamic operational traversal pathway location.
 * @param {string} searchName - Case-insensitive term used to evaluate dynamic matches.
 * @param {string[]} matches - Tracking references collecting matching path output strings.
 * @returns {void}
 */
function processFind(currentPath, searchName, matches) {
    let items;
    try {
        items = fs.readdirSync(currentPath);
    } catch (e) { return; }

    items.forEach(item => {
        const itemPath = path.join(currentPath, item);
        let stat;
        try {
            stat = fs.lstatSync(itemPath);
        } catch (e) { return; }

        if (stat.isDirectory()) {
            if (item === 'node_modules' || item === '.git') return; 
            processFind(itemPath, searchName, matches);
        } else if (stat.isFile()) {
            if (item.toLowerCase().includes(searchName.toLowerCase())) {
                matches.push(itemPath);
            }
        }
    });
}


//==============================
//* Command Actions
//==============================

/**
 * Handles sort setup execution and argument normalization routines.
 * @param {string[]} args - Parameter tracking configuration flags.
 * @param {string} currentDir - The active execution home location folder pathway.
 * @returns {void}
 */
function handleSort(args, currentDir) {
    const deep = args.includes('-deep');
    const allow = args.includes('-allow');

    let targetPathStr = args.find(arg => !arg.startsWith('-') && arg !== 'file' && arg !== 'sort' && arg !== '-sort');
    let targetPath;

    if (!targetPathStr) {
        targetPath = currentDir;
    } else {
        targetPath = path.resolve(currentDir, targetPathStr);
    }

    if (!fs.existsSync(targetPath) || !fs.lstatSync(targetPath).isDirectory()) {
        console.log(chalk.red(`Invalid directory: ${targetPath}`));
        return;
    }

    console.log(chalk.yellow(`Sorting files in: ${targetPath}`));
    if (deep) console.log(chalk.gray('Mode: Recursive (-deep)'));
    if (allow) console.log(chalk.gray('Mode: Allow Code (-allow)'));

    const stats = { movedCount: 0 };
    processDirectory(targetPath, targetPath, deep, allow, stats);

    console.log(chalk.green(`✔ Sorting complete. Moved ${stats.movedCount} files.`));
}

/**
 * Packs explicit workspace sources cleanly down into compressed zip wrappers.
 * @param {string[]} args - Target parameters and path tokens list arrays.
 * @param {string} currentDir - Active runtime execution folder baseline path location.
 * @returns {void}
 */
function handleZip(args, currentDir) {
    const actionIndex = args.indexOf('-zip') !== -1 ? args.indexOf('-zip') : args.indexOf('zip');
    let filename = args[actionIndex + 1];
    if (filename && filename.startsWith('-')) filename = null;

    let directory = null;
    const srcIndex = args.indexOf('-src');
    if (srcIndex !== -1 && args[srcIndex + 1]) {
        directory = args[srcIndex + 1];
    } else if (actionIndex !== -1 && args[actionIndex + 2] && !args[actionIndex + 2].startsWith('-')) {
        directory = args[actionIndex + 2];
    }

    let targetDir = null;
    const outIndex = args.indexOf('-out');
    if (outIndex !== -1 && args[outIndex + 1]) {
        targetDir = args[outIndex + 1];
    } else if (srcIndex === -1 && actionIndex !== -1 && args[actionIndex + 3] && !args[actionIndex + 3].startsWith('-')) {
        targetDir = args[actionIndex + 3];
    }

    if (!directory) {
        directory = '.';
    }

    if (!filename) {
        console.log(chalk.red('Usage: file -zip <filename> [-src <directory>] [-out <target directory>]'));
        return;
    }

    const sourcePath = path.resolve(currentDir, directory);
    let outDir = currentDir;
    if (targetDir) {
        outDir = path.resolve(currentDir, targetDir);
    }

    if (!fs.existsSync(sourcePath)) {
        console.log(chalk.red(`Source directory not found: ${sourcePath}`));
        return;
    }

    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    const outName = filename.endsWith('.zip') ? filename : filename + '.zip';
    const outPath = path.resolve(outDir, outName);

    try {
        const zip = new AdmZip();
        zip.addLocalFolder(sourcePath);
        zip.writeZip(outPath);
        console.log(chalk.green(`✔ Created zip file at: ${outPath}`));
    } catch (err) {
        console.log(chalk.red(`Error creating zip: ${err.message}`));
    }
}

/**
 * Extracts compression containers and fires interactive cleanup confirmation loops.
 * @param {string[]} args - Target configuration argument tracking arrays.
 * @param {string} currentDir - Active runtime baseline execution environment path location.
 * @param {Readline} rl - Active Readline input capture instance.
 * @returns {Promise<void>}
 */
async function handleUnzip(args, currentDir, rl) {
    const actionIndex = args.indexOf('-unzip') !== -1 ? args.indexOf('-unzip') : args.indexOf('unzip');
    let filename = args[actionIndex + 1];
    if (filename && filename.startsWith('-')) filename = null;

    let targetDir = null;
    const outIndex = args.indexOf('-out');
    if (outIndex !== -1 && args[outIndex + 1]) {
        targetDir = args[outIndex + 1];
    } else if (actionIndex !== -1 && args[actionIndex + 2] && !args[actionIndex + 2].startsWith('-')) {
        targetDir = args[actionIndex + 2];
    }

    if (!filename) {
        console.log(chalk.red('Usage: file -unzip <filename> [-out <target directory>]'));
        return;
    }

    const targetName = filename.endsWith('.zip') ? filename : filename + '.zip';
    const zipPath = path.resolve(currentDir, targetName);
    if (!fs.existsSync(zipPath)) {
        console.log(chalk.red(`Zip file not found: ${zipPath}`));
        return;
    }

    let outDir = currentDir;
    if (targetDir) {
        outDir = path.resolve(currentDir, targetDir);
    }

    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    try {
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(outDir, true);
        console.log(chalk.green(`✔ Extracted to: ${outDir}`));

        const deleteZip = await new Promise((resolve) => {
            if (!rl) return resolve(false); 
            rl.question(chalk.yellow(`? Do you want to delete the original zip archive (${targetName})? (y/N) `), (answer) => {
                const response = answer.trim().toLowerCase();
                resolve(response === 'y' || response === 'yes');
            });
        });

        if (deleteZip) {
            fs.unlinkSync(zipPath);
            console.log(chalk.gray(`Deleted: ${targetName}`));
        }
    } catch (err) {
        console.log(chalk.red(`Error extracting zip: ${err.message}`));
    }
}

/**
 * Unpacks summary table entries representing internal content arrays for target zip logs.
 * @param {string[]} args - Operational verification flag arrays.
 * @param {string} currentDir - Active runtime execution folder directory path.
 * @returns {void}
 */
function handleList(args, currentDir) {
    const actionIndex = args.indexOf('-list') !== -1 ? args.indexOf('-list') : args.indexOf('list');
    const filename = args[actionIndex + 1];
    
    if (!filename) {
        console.log(chalk.red('Usage: file -list <filename>'));
        return;
    }

    const targetName = filename.endsWith('.zip') ? filename : filename + '.zip';
    const zipPath = path.resolve(currentDir, targetName);
    if (!fs.existsSync(zipPath)) {
        console.log(chalk.red(`Zip file not found: ${zipPath}`));
        return;
    }

    try {
        const zip = new AdmZip(zipPath);
        const entries = zip.getEntries();
        console.log(chalk.hex('#0284c7')(`\n--- Contents of ${filename} ---`));
        entries.forEach((entry) => {
            console.log(chalk.gray(`  ${entry.entryName}`));
        });
        console.log('');
    } catch (err) {
        console.log(chalk.red(`Error reading zip: ${err.message}`));
    }
}

/**
 * Searches directory tree paths displaying matching files relative to baseline locations.
 * @param {string[]} args - Wildcard processing parameters argument strings.
 * @param {string} currentDir - Active directory execution environment path.
 * @returns {void}
 */
function handleFind(args, currentDir) {
    const actionIndex = args.indexOf('-find') !== -1 ? args.indexOf('-find') : args.indexOf('find');
    const filename = args[actionIndex + 1];

    if (!filename) {
        console.log(chalk.red('Usage: file -find <name>'));
        return;
    }

    console.log(chalk.yellow(`Searching for "${filename}" in ${currentDir}...`));
    const matches = [];
    processFind(currentDir, filename, matches);

    if (matches.length > 0) {
        console.log(chalk.green(`\n✔ Found ${matches.length} matching file(s):`));
        matches.forEach(m => {
            const relativePath = path.relative(currentDir, m);
            console.log(chalk.gray(`  .\\${relativePath}`));
        });
        console.log('');
    } else {
        console.log(chalk.red(`\nNo files found matching "${filename}".\n`));
    }
}


//==============================
//* Module Exporter
//==============================
module.exports = fileCommand;