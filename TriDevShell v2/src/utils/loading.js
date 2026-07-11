const updateCheck = require('./updateCheck.js');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let isUpdateAvailable = false;

function renderFrame(frame) {
    process.stdout.write('\x1b[2J\x1b[H');
    process.stdout.write(frame);
}

function glitchFrame(frame, intensity = 0.03) {
    const lines = frame.split('\n');
    return lines.map((line, index) => {
        if (index < 2 || index > 8) return line;

        return line.split('').map((char, charIndex) => {
            const shouldGlitch = Math.random() < intensity && /[█▓▒░▄▀│╭╮╰╯─]/.test(char);
            if (!shouldGlitch) return char;

            const replacements = ['█', '▓', '▒', '░', '▄', '▀', '│', ' '];
            const replacement = replacements[Math.floor(Math.random() * replacements.length)];
            return replacement;
        }).join('');
    }).join('\n');
}

function buildFrame(template, updateStatus) {
    return template
        .replace('{update}', updateStatus)
}

const bootFrames = [
`
tridev-init :: booting environment...
┌──────────────────────────────────────────────────┐
│  ▓▓▓▓▓█░  ██▀▀▀█  █  ████▀▀  ██████  ██████  █  █░░▓ │
│  ░░░██░   ██▄▄▄█  █  ██  ▄▄  ██▄▄    ██  ██  █  █▒▒▓ │
│  ▓▓▓██░   ██  ▀█  █  ████▄▄  ██████  ██████  ▀▄▄▀░░▓ │
└──────────────────────────────────────────────────┘
[ Update: {update} ] [ Env: {env} ]
`,
`
tridev-core :: syncing runtime hooks...
┌──────────────────────────────────────────────────┐
│  ████▓▓  ▒▒███░  █  ▒▒▓▓██  ██████  ██▓▓█  █  █▓██ │
│  ██░░██  ░░██▓█  █  ██▓▒▒  ██▄▄    ████▓  █  █▒▒▓ │
│  ██▓▓██  ░░███▓  █  ████▓█  ██████  ██████  ▀▄▄▀░░▓ │
└──────────────────────────────────────────────────┘
[ Update: {update} ] [ Env: {env} ]
`,
`
tridev-cli :: Welcome to TDS...
┌──────────────────────────────────────────────────┐
│  ██████  ██████  ██  ██████  ██████  ██    ██    │
│    ██    ██  ██  ██  ██  ██  ██▄▄    ██    ██    │
│    ██    ██  ██  ██  ██████  ██████   ██▄▄██     │
└──────────────────────────────────────────────────┘
[ tds: ready ]   [ env: loaded ]
`
];

async function AnimatedLoading() {
    process.stdout.write('\x1b[?25l');

    renderFrame(buildFrame(bootFrames[0], 'Checking...', 'Checking...'));
    for (let i = 0; i < 2; i++) {
        await sleep(70);
        renderFrame(glitchFrame(buildFrame(bootFrames[0], 'Checking...', 'Testing...'), 0.11));
    }

    isUpdateAvailable = await updateCheck();
    const updateStatus = isUpdateAvailable ? 'NEW' : 'OK';

    renderFrame(buildFrame(bootFrames[1], 'Scanning...', 'Loading...'));
    await sleep(140);

    renderFrame(buildFrame(bootFrames[1], updateStatus, 'OK'));
    await sleep(400);

    renderFrame(buildFrame(bootFrames[2], updateStatus, 'OK'));
    await sleep(1800);

    process.stdout.write('\x1b[?25h');
    process.stdout.write('\x1b[2J\x1b[H');
}

module.exports = { AnimatedLoading };