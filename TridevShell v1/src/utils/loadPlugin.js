const path = require('path');
const os = require('os');
const fs = require('fs');
const Module = require('module');

/**
 * Resolves local plug-in execution directories and injects missing path nodes into runtime memory maps.
 * @returns {void}
 */
function loadPlugins() {
    const pluginDir = path.join(os.homedir(), '.tridev', 'plugins');
    if (!fs.existsSync(pluginDir)) return;

    // Bridge the shell's own node_modules matrix directly across plugin compilation paths
    const shellModulesPath = path.resolve(__dirname, '..', 'node_modules');
    const originalNodePath = process.env.NODE_PATH || '';
    process.env.NODE_PATH = shellModulesPath + path.delimiter + originalNodePath;
    Module._initPaths();

    const pluginFiles = fs.readdirSync(pluginDir).filter(f => f.endsWith('.js'));

    for (const file of pluginFiles) {
        try {
            const pluginPath = path.join(pluginDir, file);

            // Wipe internal node require caches so dynamic restarts reload code variables freshly
            delete require.cache[require.resolve(pluginPath)];
            const plugin = require(pluginPath);

            if (!plugin.name || typeof plugin.execute !== 'function') {
                console.log(chalk.yellow(`! Skipping invalid plugin ${file}: missing 'name' or 'execute' properties.`));
                continue;
            }

            activePlugins.push(plugin);

            // Register extension definitions dynamically inside auto-complete matrix maps
            if (!COMMANDS.includes(plugin.name)) {
                COMMANDS.push(plugin.name);
            }
            if (Array.isArray(plugin.subcommands) && plugin.subcommands.length) {
                SUBCOMMANDS[plugin.name] = plugin.subcommands;
            }
        } catch (err) {
            console.log(chalk.red(`❌ Failed to instantiate plugin module ${file}: ${err.message}`));
        }
    }
}

module.exports = { loadPlugins };