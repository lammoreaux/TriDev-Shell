/**
 * @fileoverview Remote Version Verification Layer for TriDev Shell Startup Checks
 * @author Schlaffer Benjamin
 * @version 1.0.0
 * @description
 * Scrapes the primary web service landing page to pull live production version tokens 
 * and compare them against local manifest data. Used to safely toggle notification badges.
 */

//===================
//* Module Imports
//===================
const https = require('https');
const { version:currentVersion } = require('../../package.json');

const WEBSITE_URL = 'https://tridevhungary.com/downloads/version.json';


async function updateCheck() {
    return new Promise((resolve) => {
        const url = `${WEBSITE_URL}?t=${Date.now()}`;
        const options = {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        };

        const request = https.get(url, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const latestVersion = parsed && parsed.version ? parsed.version : null;

                    if (latestVersion) {
                        const comparison = compareVersions(latestVersion, currentVersion);
                        resolve(comparison > 0);
                    } else {
                        resolve(false);
                    }
                } catch (e) {
                    resolve(false);
                }
            });
        });

        request.on('error', () => resolve(false));

        request.setTimeout(2500, () => {
            request.destroy();
            resolve(false);

        });
    });
};



//==============================
//* Math & Version Helpers
//==============================
/**
 * Splices dot-notation string tokens to run mathematical boundary comparisons.
 * @param {string} version1 - Remote release version identifier string to test.
 * @param {string} version2 - Local environment package version identifier string.
 * @returns {number} Returns 1 if v1 is newer, -1 if older, or 0 if completely identical.
 */
function compareVersions(version1, version2) {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const v1Part = v1Parts[i] || 0;
        const v2Part = v2Parts[i] || 0;

        if (v1Part > v2Part) return 1;
        if (v1Part < v2Part) return -1;
    }

    return 0;
}


//==============================
//* Module Export
//==============================
module.exports = updateCheck;