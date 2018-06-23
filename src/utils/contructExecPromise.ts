import { exec } from 'child_process';

/**
 * Wraps the nodejs exec in a promise
 *
 * @param {*} command command to execute
 * @returns promise
 */
export function contructExecPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}