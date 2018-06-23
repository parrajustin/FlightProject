/**
 * Makes easier to see difference between my custom errors and the actual ones
 *
 * @class UserError
 * @extends {Error}
 */
export class UserError extends Error {
    public isUser = true;

    constructor(error: string) {
        super(error);
    }
}