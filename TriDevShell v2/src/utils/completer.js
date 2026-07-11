const fs = require('fs');
const path = require('path');
const PATH_MAP = require('./pathManager.js');

// Load the core command blueprint definitions map
let COMMANDS_SPEC = {};
try {
    COMMANDS_SPEC = require('../JSON/commands.json');
} catch (e) {
    COMMANDS_SPEC = { 'exit': [], 'clear': [], 'cls': [] };
}

/**
 * Universal Context-Aware Data-Driven Tab Completer Engine
 */
function shellCompleter(line, currentDir) {
    const parts = line.split(/\s+/);
    const tokens = parts.filter(p => p.length > 0);
    const lastToken = parts[parts.length - 1] || '';

    const rootCommands = Object.keys(COMMANDS_SPEC);

    // CASE 1: User is typing the initial root-level command (e.g., 'pa' -> 'path')
    if (tokens.length <= 1 && !line.endsWith(' ')) {
        const matches = rootCommands.filter(cmd => cmd.startsWith(lastToken.toLowerCase()));
        return [matches.length ? matches : rootCommands, lastToken];
    }

    const rootCommand = tokens[0].toLowerCase();

    // Guard boundary: If the typed string is an unknown process command, step out quietly
    if (!COMMANDS_SPEC.hasOwnProperty(rootCommand)) {
        return [[], lastToken];
    }

    // Pull the static core subcommands list from commands.json
    const staticSubs = COMMANDS_SPEC[rootCommand] || [];

    // Gather dynamic items based specifically on what the command needs
    let dynamicItems = [];

    if (rootCommand === 'path') {
        // ONLY your user saved profile paths from paths.json (no local workspace clutter)
        dynamicItems = getRawUserSaves('paths');
    } else if (rootCommand === 'connect') {
        // ONLY user saved servers
        dynamicItems = getRawUserSaves('servr');
    } else if (rootCommand === 'alias') {
        // ONLY user saved aliases
        dynamicItems = getRawUserSaves('alias');
    } else if (rootCommand === 'cd') {
        // ONLY physical local directories in the active folder (no saved paths file)
        dynamicItems = getLocalDirectoriesOnly(currentDir);
    }

    const combinedPool = [...staticSubs, ...dynamicItems];

    // CASE 2: User hits Tab right after a trailing space (e.g., "path ") -> Flash full pool
    if (tokens.length === 1 && line.endsWith(' ')) {
        return [combinedPool, ''];
    }

    // CASE 3: User is filtering typed text strings (e.g., "path myP")
    if (tokens.length === 2 && !line.endsWith(' ')) {
        const lowerLast = lastToken.toLowerCase();
        const matches = combinedPool.filter(item => item.toLowerCase().startsWith(lowerLast));
        return [matches, lastToken];
    }

    return [[], lastToken];
}

/**
 * Reads your JSON configuration files from .tridev strictly WITHOUT blending local workspace items
 */
function getRawUserSaves(contextType) {
    try {
        const targetFilePath = PATH_MAP[contextType];

        if (targetFilePath && fs.existsSync(targetFilePath)) {
            const rawContent = fs.readFileSync(targetFilePath, 'utf8');
            const parsedData = JSON.parse(rawContent || '{}');

            if (Array.isArray(parsedData)) {
                return parsedData;
            } else if (typeof parsedData === 'object' && parsedData !== null) {
                return Object.keys(parsedData);
            }
        }
    } catch (e) {
        // Fallback quietly if file is empty or missing
    }
    return [];
}

/**
 * Scans the filesystem for physical folders only—strictly used for the 'cd' command context
 */
function getLocalDirectoriesOnly(currentDir) {
    try {
        return fs.readdirSync(currentDir, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);
    } catch (err) {
        return [];
    }
}

module.exports = { shellCompleter };