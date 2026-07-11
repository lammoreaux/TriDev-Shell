const os = require('os');
const path = require('path');

const BASE = path.join(os.homedir(), '.tridev');

const PATH_MAP = {
    conf: BASE,
    plug: path.join(BASE, 'plugins'),
    task: path.join(BASE, 'task'),
    temp: path.join(BASE, 'templates'),
    admin: path.join(BASE, 'admin.json'),
    alias: path.join(BASE, 'aliases.json'),
    paths: path.join(BASE, 'paths.json'),
    servr: path.join(BASE, 'servers.json'),
    templ: path.join(BASE, 'template.json'),
    theme: path.join(BASE, 'theme.json'),
    uiset: path.join(BASE, 'ui_settings.json'),
    workc: path.join(BASE, 'work_config.json'),
    logs: path.join(BASE, 'logs.json')
};

module.exports = PATH_MAP;