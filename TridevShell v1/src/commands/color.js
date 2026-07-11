/**
 * @fileoverview Color Utilities for TriDev Shell
 * @author Schlaffer Benjamin
 * @version 1.0.0
 * @description Lets the user choose from color palettes for the shell.
 */

//==============================
//* Module Imports
//==============================
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const os = require('os');

//==============================
//* File Imports
//==============================
const palettesJSON = require('../JSON/colorPalettes.json');
const { conf: CONFIG_DIR, theme: THEME_FILE} = require('../utils/pathManager.js');

/**
 * @typedef {Object} PaletteColors
 * @property {string} primary
 * @property {string} secondary
 * @property {string} tertiary
 * @property {string} accent
 */

/**
 * @typedef {Object} ThemeConfig
 * @property {string} name - The registered lowercase identifier key of the chosen theme.
 * @property {PaletteColors} colors - The hex value mapping profile for the theme.
 */


//==============================
//* Unified Palette Initialization
//==============================
const colorPalettes = { 
    ...palettesJSON.gradientPalettes,
    ...palettesJSON.solidPalettes
};


//==============================
//* Main Command Handler
//==============================
/**
 * Processes user color configuration selections or routes helper listings.
 * @param {string[]} args - Parameter items passed from the command wrapper loop.
 * @returns {ThemeConfig|null} The newly stored layout file map or null if helper routed.
 */
function changeColor(args) {
    const paletteName = args[0]?.toLowerCase();
    
    if (paletteName === '-list' || paletteName === 'list') {
        listAction();
        return null;
    }

    if (!paletteName || !colorPalettes[paletteName]) {
        console.log(chalk.red(`\nInvalid or missing palette name.`));
        console.log(chalk.gray(`Usage: color <palette_name> or color -list`));
        return null;
    }
    
    const theme = { name: paletteName, colors: colorPalettes[paletteName] };
    ensureConfig();
    fs.writeFileSync(THEME_FILE, JSON.stringify(theme, null, 2));
    console.log(chalk.green(`\n✔ Theme changed to '${paletteName}'.`));
    return theme;
}


//==============================
//* Main Functions
//==============================
/**
 * Resolves saved profile settings or returns factory fallback states safely.
 * @returns {ThemeConfig} The dynamic user selection map or standard shell defaults.
 */
function getTheme() {
    ensureConfig();
    try {
        if (fs.existsSync(THEME_FILE)) {
            const data = fs.readFileSync(THEME_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error(chalk.red('Error reading theme file:'), error);
        return null;
    }
    return { name: 'tridev', colors: colorPalettes.tridev };
}


//==============================
//* Helper Functions
//==============================
/** Ensures that the configuration directory environment layer exists on disk. */
function ensureConfig() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
}

/**
 * Iterates across active JSON imports to render graphic terminal blocks representing colors.
 * @returns {null}
 */
function listAction(){
    console.log(chalk.hex('#0284c7')('\n--- Gradient Palettes ---'));
    Object.keys(palettesJSON.gradientPalettes).forEach(key => {
        const colors = palettesJSON.gradientPalettes[key];
        const primary = chalk.hex(colors.primary)('██');
        const secondary = chalk.hex(colors.secondary)('██');
        const tertiary = chalk.hex(colors.tertiary)('██');
        const accent = chalk.hex(colors.accent)('██');
        console.log(`  ${key.padEnd(16)}: ${primary} ${secondary} ${tertiary} ${accent}`);
    });

    console.log(chalk.hex('#0284c7')('\n--- Solid Colors ---'));
    Object.keys(palettesJSON.solidPalettes).forEach(key => {
        const colors = palettesJSON.solidPalettes[key];
        const primary = chalk.hex(colors.primary)('██ ██ ██ ██');
        console.log(`  ${key.padEnd(16)}: ${primary}`);
    });
    console.log('');
    return null;
}


//==============================
//* Module Export
//==============================
module.exports = { changeColor, getTheme, colorPalettes };