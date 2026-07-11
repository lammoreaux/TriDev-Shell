/**
 * @fileoverview Directory Navigation Manager for TriDev Shell
 * @author Schlaffer Benjamin
 * @version 4.2.6
 * @description
 * COMMANDS:
 * path <alias>       : Jump to a saved directory path alias.
 * path -save <name>  : Save current directory or explicit path as a shortcut.
 * path -home         : Return directly to your designated home folder.
 * path -list         : Previews all saved alias mappings inside the console.
 * path -remove <name>: Delete a folder shortcut from your config registry.
 * path -explore      : Open your active working directory in File Explorer.
 * path -explorePlugin: Open your localized plugin sandbox in File Explorer.
 */

//==============================
//* Module Imports
//==============================
const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");
const chalk = require("chalk");

//==============================
//* Constants & Configuration
//==============================
const { conf, paths, plug } = require("../utils/pathManager.js");

/**
 * @typedef {Object.<string, string>} PathMap
 * @description A collection of user-defined shortcuts mapped to absolute disk paths.
 */

//==============================
//* Main Command Handler
//==============================
/**
 * Routing switchboard validating navigation shortcuts and system explorer commands.
 * @param {string[]} args - Parameter flags and string arguments passed after core call.
 * @param {string} currentDir - The active working directory context of the shell.
 * @returns {Promise<string|null>} Resolves to a new directory path string if navigating, otherwise null.
 */
async function pathCommand(args, currentDir) {
  const action = args[0];

  // Handle generic empty executions
  if (!action) {
    showPathHelp();
    return null;
  }

  // 1. Process administrative configuration utilities
  switch (action) {
    case "-explore":
      console.log(chalk.yellow("Opening File Explorer..."));
      exec("start .", { cwd: currentDir });
      return null;

    case "-explorePlugin":
      ensurePluginDir();
      console.log(chalk.yellow("Opening Plugin Directory..."));
      exec("start .", { cwd: plug });
      return null;

    case "-sethome":
      savePathAlias("home", currentDir);
      return null;

    case "-save":
      handleSaveAction(args, currentDir);
      return null;

    case "-remove":
      handleRemoveAction(args);
      return null;

    case "-list":
      listPaths();
      return null;

    case "-help":
      showPathHelp();
      return null;
  }

  // 2. Fall-through navigation routing logic
  let targetAlias = action;

  if (action === "-home") {
    targetAlias = "home";
  }

  const paths = loadPaths();
  const targetPath = paths[targetAlias];

  if (targetPath) {
    if (fs.existsSync(targetPath)) {
      console.log(chalk.green(`\n➜ Jumping to '${targetAlias}'...`));
      return targetPath; // Stream updated coordinate out to index.js
    } else {
      console.log(chalk.red(`\nPath not found on disk: ${targetPath}`));
      return null;
    }
  } else {
    console.log(chalk.red(`\nUnknown alias: '${targetAlias}'`));
    console.log(chalk.gray('Use "path -list" to see available aliases.'));
    return null;
  }
}

//==============================
//* Main Command Helpers
//==============================
/** Ensures that fundamental workspace configuration directories exist cleanly on disk. */
function ensureConfig() {
  if (!fs.existsSync(conf)) {
    fs.mkdirSync(conf, { recursive: true });
  }
  if (!fs.existsSync(conf)) {
    fs.writeFileSync(conf, JSON.stringify({}, null, 2));
  }
}

/** Ensures that the plugin system sandbox subdirectory folder is mounted safely. */
function ensurePluginDir() {
  if (!fs.existsSync(plug)) {
    fs.mkdirSync(plug, { recursive: true });
  }
}

/**
 * Parses and returns saved shortcut profiles safely from local disk targets.
 * @returns {PathMap} Object containing alphanumeric alias properties pointing to target directory strings.
 */
function loadPaths() {
  ensureConfig();
  try {
    const data = fs.readFileSync(paths, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
}

/**
 * Overwrites individual alias string values inside persistent database configurations.
 * @param {string} alias - User chosen text key label.
 * @param {string} targetPath - Normalized destination directory pathway.
 * @returns {void}
 */
function savePathAlias(alias, targetPath) {
  const paths = loadPaths();
  paths[alias] = targetPath;
  fs.writeFileSync(conf, JSON.stringify(paths, null, 2));
  console.log(chalk.green(`✔ Path saved: '${alias}' -> ${targetPath}`));
}

/**
 * Removes individual shortcut configurations from our active lookup registry profiles.
 * @param {string} alias - Target property token name to delete.
 * @returns {void}
 */
function removePathAlias(alias) {
  const paths = loadPaths();
  if (paths[alias]) {
    delete paths[alias];
    fs.writeFileSync(conf, JSON.stringify(paths, null, 2));
    console.log(chalk.green(`✔ Path removed: '${alias}'`));
  } else {
    console.log(chalk.red(`Path not found: '${alias}'`));
  }
}

//==============================
//* Command Actions
//==============================
/** Prints cleanly aligned guidelines detailing standard parameter usage criteria. */
function showPathHelp() {
  console.log(chalk.hex("#0284c7")("\n--- Path Manager ---"));
  console.log(
    chalk.yellow("  path -sethome") +
      chalk.gray("           : Save current dir as home"),
  );
  console.log(
    chalk.yellow("  path -home") +
      chalk.gray("              : Jump to home location"),
  );
  console.log(
    chalk.yellow("  path -save <alias>") +
      chalk.gray("      : Save current dir as alias"),
  );
  console.log(
    chalk.yellow("  path <alias>") +
      chalk.gray("            : Jump to dynamic alias"),
  );
  console.log(
    chalk.yellow("  path -list") +
      chalk.gray("              : List all aliases"),
  );
  console.log(
    chalk.yellow("  path -remove <alias>") +
      chalk.gray("    : Remove dynamic alias"),
  );
  console.log(
    chalk.yellow("  path -explore") +
      chalk.gray("           : Open current directory in OS Explorer"),
  );
  console.log(
    chalk.yellow("  path -explorePlugin") +
      chalk.gray("     : Open the plugin directory in OS Explorer\n"),
  );
}

/**
 * Renders all stored navigation configurations neatly to stdout.
 * @returns {void}
 */
function listPaths() {
  const paths = loadPaths();
  const keys = Object.keys(paths);

  if (keys.length === 0) {
    console.log(
      chalk.gray('No saved paths. Use "path -save <alias>" to add one.'),
    );
    return;
  }

  console.log(chalk.hex("#0284c7")("\n--- Saved Paths ---"));
  keys.forEach((key) => {
    console.log(
      chalk.yellow(`  ${key.padEnd(12)}`) + chalk.gray(`-> ${paths[key]}`),
    );
  });
  console.log("");
}

/**
 * Pre-validates save settings and resolves directory targets before executing disk commits.
 * @param {string[]} args - Target console input array.
 * @param {string} currentDir - Dynamic root tracking context path location.
 * @returns {void}
 */
function handleSaveAction(args, currentDir) {
  const alias = args[1];
  if (!alias) {
    console.log(chalk.red("Usage: path -save <alias> [optional_path]"));
    return;
  }

  let target = args[2];
  if (!target || target === ".") {
    target = currentDir;
  } else {
    target = path.resolve(currentDir, target);
  }

  savePathAlias(alias, target);
}

/**
 * Formats parameter verification states before passing requests down to deletion engines.
 * @param {string[]} args - Target console input array.
 * @returns {void}
 */
function handleRemoveAction(args) {
  const alias = args[1];
  if (!alias) {
    console.log(chalk.red("Usage: path -remove <alias>"));
    return;
  }
  removePathAlias(alias);
}

//==============================
//* Module Exporter
//==============================
module.exports = pathCommand;
module.exports.loadPaths = loadPaths;
