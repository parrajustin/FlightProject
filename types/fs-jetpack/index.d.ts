declare module 'fs-jetpack/imports' {
	export const file: {
	    write_atomic: any;
	};
	export const json: {
	    parse: (text: string, reviver?: (key: any, value: any) => any) => any;
	    serialize: {
	        (value: any, replacer?: (key: string, value: any) => any, space?: string | number): string;
	        (value: any, replacer?: (string | number)[], space?: string | number): string;
	    };
	};

}
declare module 'fs-jetpack/interfaces' {
	/// <reference types="node" />
	export enum ENodeType {
	    FILE,
	    DIR,
	    SYMLINK,
	    OTHER,
	    BLOCK,
	}
	/**
	 * Native errors.
	 * @todo : replace with errno.
	 */
	export let EError: any;
	export interface INode {
	    name: string;
	    type: ENodeType | string;
	    size?: number;
	    accessTime?: Date;
	    modifyTime?: Date;
	    changeTime?: Date;
	    absolutePath?: string;
	    mode?: number;
	    pointsAt?: string;
	    relativePath?: string;
	    children?: INode[];
	    total?: number;
	    checksum?: string;
	    mime?: string;
	}
	/**
	 * The options for "inspect".
	 *
	 * @export
	 * @interface IInspectOptions
	 */
	export interface IInspectOptions {
	    checksum?: string;
	    mode?: boolean;
	    times?: boolean;
	    absolutePath?: boolean;
	    symlinks?: boolean;
	    size?: boolean;
	    mime?: boolean;
	}
	export interface INodeReport {
	    node: IProcessingNode;
	    error: string;
	    resolved: IConflictSettings;
	}
	/**
	 * The accepted types for write and read as union.
	 */
	export type ReadWriteDataType = string | Buffer | Object;
	/**
	 * An extented version of Error to make typescript happy. This has been copied from
	 * the official Node typings.
	 *
	 * @export
	 * @class ErrnoException
	 * @extends {Error}
	 */
	export class ErrnoException extends Error {
	    errno?: number;
	    code?: string;
	    path?: string;
	    syscall?: string;
	    stack?: string;
	}
	/**
	 * Structure for file operations.
	 */
	export interface IProcessingNode {
	    path: string;
	    item: INode;
	    status?: ENodeOperationStatus;
	    dst?: string;
	}
	/**
	 * Basic flags during a file operation.
	 *
	 * @export
	 * @enum {number}
	 */
	export enum EBaseFlags {
	    /**
	     * When copying, don't copy symlinks but resolve them instead.
	     */
	    FOLLOW_SYMLINKS = 8,
	}
	/**
	 * Flags to determine certain properties during inspection.
	 *
	 * @export
	 * @enum {number}
	 */
	export enum EInspectFlags {
	    MODE = 2,
	    TIMES = 4,
	    SYMLINKS = 8,
	    FILE_SIZE = 16,
	    DIRECTORY_SIZE = 32,
	    CHECKSUM = 64,
	    MIME = 128,
	}
	/**
	 * Basic options for file operations: used by cp, mv, rename and rm.
	 *
	 * @export
	 * @interface IBaseOptions
	 */
	export interface IBaseOptions {
	    /**
	     * Array of glob minimatch patterns
	     *
	     * @type {string[]}
	     * @memberOf IBaseOptions
	     */
	    matching?: string[];
	    /**
	     * A function called to reject or accept nodes. This is used only when matching
	     * has been left empty.
	     * @memberOf IBaseOptions
	     */
	    filter?: (from: string) => boolean;
	    /**
	     * Flags to determine properties per node
	     *
	     * @type {EInspectFlags}
	     * @memberOf IBaseOptions
	     */
	    flags?: EInspectFlags;
	}
	/**
	 * Callback prototype signature when an item has been copied.
	 * This is used to abort the copy process when returning false.
	 *
	 * @param {string} path The path of the item.
	 * @param {number} current The current index of the item.
	 * @param {number} total The total of all items.
	 * @param {INode} [item] The node data for the item.
	 * @returns {boolean}
	 */
	export type ItemProgressCallback = (path: string, current: number, total: number, item?: INode) => boolean;
	/**
	 * Callback prototype signature when an item conflict occurs.
	 * It's async since the conflict might be resolved in an client application and hence
	 * we have to wait til the user decided.
	 *
	 * This is not being called if:
	 * - a previous callback returned with IConflictSettings#mode == ALWAYS
	 * - the options object already contains pre-defined conflict settings.
	 *
	 * @param {string} path The path of the item.
	 * @param {INode} item The node data.
	 * @param {string} err The native error code of the conflict (EEXIST,...)
	 * @returns {Promise<IConflictSettings>}
	 */
	export type ResolveConflictCallback = (path: string, item: INode, err: string) => Promise<IConflictSettings>;
	/**
	 * Callback prototype signature when a file with at least 5MB size is being copied.
	 *
	 * @param {string} path The path of the item.
	 * @param {number} current The current copied bytes.
	 * @param {number} total The total size in bytes.
	 * @returns {Promise<IConflictSettings>}
	 */
	export type WriteProgressCallback = (path: string, current: number, total: number) => void;
	/**
	 * Status of a node operation.
	 *
	 * @export
	 * @enum {number}
	 */
	export enum ENodeOperationStatus {
	    COLLECTED = 0,
	    CHECKED = 1,
	    PROCESSING = 2,
	    PROCESS = 3,
	    ASKING = 4,
	    ANSWERED = 5,
	    DONE = 6,
	}
	/**
	 * The possible modes to resolve a conflict during copy and move.
	 *
	 * @export
	 * @enum {number}
	 */
	export enum EResolveMode {
	    SKIP = 0,
	    OVERWRITE = 1,
	    IF_NEWER = 2,
	    IF_SIZE_DIFFERS = 3,
	    APPEND = 4,
	    THROW = 5,
	    RETRY = 6,
	    ABORT = 7,
	}
	/**
	 * Additional flags for copy
	 *
	 * @export
	 * @enum {number}
	 */
	export enum ECopyFlags {
	    /**
	     * Transfer atime and mtime of source to target
	     */
	    PRESERVE_TIMES = 2,
	    /**
	     * Empty the target folder
	     */
	    EMPTY = 4,
	    /**
	     * When copying, don't copy symlinks but resolve them instead.
	     */
	    FOLLOW_SYMLINKS = 8,
	    /**
	     * Collect errors & success
	     */
	    REPORT = 16,
	}
	/**
	 * Copy options
	 *
	 * @export
	 * @interface ICopyOptions
	 */
	export interface ICopyOptions {
	    /**
	     * @type {boolean}
	     * @deprecated Use conflict callback instead.
	     * @memberOf ICopyOptions
	     */
	    overwrite?: boolean;
	    /**
	     * Array of glob minimatch patterns
	     *
	     * @type {string[]}
	     * @memberOf ICopyOptions
	     */
	    matching?: string[];
	    /**
	     * A function called to reject or accept nodes to be copied. This is used only when matching
	     * has been left empty.
	     * @memberOf ICopyOptions
	     */
	    filter?: (from: string) => boolean;
	    /**
	     * A progress callback for any copied item. Only excecuted in async.
	     */
	    progress?: ItemProgressCallback;
	    /**
	     * A progress function called for async and larger files only.
	     *
	     * @type {WriteProgressCallback}
	     * @memberOf ICopyOptions
	     */
	    writeProgress?: WriteProgressCallback;
	    /**
	     * A callback when a conflict or error occurs. This is being called only if the user
	     * didn't provide conflictSettings.
	     *
	     * @type {ResolveConflictCallback}
	     * @memberOf ICopyOptions
	     */
	    conflictCallback?: ResolveConflictCallback;
	    /**
	     * Ability to set conflict resolver settings in advance, so that no callback will be called.
	     *
	     * @type {IConflictSettings}
	     * @memberOf ICopyOptions
	     */
	    conflictSettings?: IConflictSettings;
	    /**
	     * Throttel copy for larger files. This will be only used when writeProgress is set and the file is at least 5MB.
	     *
	     * @type {number}
	     * @memberOf ICopyOptions
	     */
	    throttel?: number;
	    /**
	     * Print some debug messages.
	     *
	     * @type {boolean}
	     * @memberOf ICopyOptions
	     */
	    debug?: boolean;
	    /**
	     * The copy flags.
	     *
	     * @type {ECopyFlags}
	     * @memberOf ICopyOptions
	     */
	    flags?: ECopyFlags;
	}
	/**
	 * An enumeration to narrow a conflict resolve to a single item or for all following conflicts.
	 *
	 * @export
	 * @enum {number}
	 */
	export enum EResolve {
	    /**
	     * Always will use the chose conflict settings for all following conflicts.
	     */
	    ALWAYS = 0,
	    /**
	     * 'This' will use the conflict settings for a single conflict so the conflict callback will be triggered again for the next conflict.
	     */
	    THIS = 1,
	}
	/**
	 * A composite conflict settings and it's scope. This is the result type
	 * for the conflict callback.
	 *
	 * @export
	 * @interface IConflictSettings
	 */
	export interface IConflictSettings {
	    /**
	     * How to resolve this conflict/error.
	     *
	     * @type {EResolveMode}
	     * @memberOf IConflictSettings
	     */
	    overwrite: EResolveMode;
	    /**
	     * The scope of this conflict resolver: always or this.
	     *
	     * @type {EResolve}
	     * @memberOf IConflictSettings
	     */
	    mode: EResolve;
	    /**
	     * Track the origin error type for this settings.
	     *
	     * @type {string}
	     * @memberOf IConflictSettings
	     */
	    error?: string;
	}
	export type TCopyResult = void | INodeReport[];
	/**
	 * fs/write options.
	 *
	 * @export
	 * @interface IWriteOptions
	 */
	export interface IWriteOptions {
	    atomic?: boolean;
	    jsonIndent?: number;
	    mode?: string;
	}
	export type TDeleteResult = void | INodeReport[];
	/**
	 * Additional flags for delete
	 *
	 * @export
	 * @enum {number}
	 */
	export enum EDeleteFlags {
	    REPORT = 16,
	}
	/**
	 * Delete options
	 *
	 * @export
	 * @interface IDeleteOptions
	 */
	export interface IDeleteOptions {
	    /**
	     * Array of glob minimatch patterns
	     *
	     * @type {string[]}
	     * @memberOf IDeleteOptions
	     */
	    matching?: string[];
	    /**
	     * A callback when a conflict or error occurs. This is being called only if the user
	     * didn't provide conflictSettings.
	     *
	     * @type {ResolveConflictCallback}
	     * @memberOf IDeleteOptions
	     */
	    conflictCallback?: ResolveConflictCallback;
	    /**
	     * Ability to set conflict resolver settings in advance, so that no callback will be called.
	     *
	     * @type {IConflictSettings}
	     * @memberOf IDeleteOptions
	     */
	    conflictSettings?: IConflictSettings;
	    /**
	     *
	     * A progress callback for any deleted item. Only excecuted in async.
	     * @type {ItemProgressCallback}
	     * @memberOf IDeleteOptions
	     */
	    progress?: ItemProgressCallback;
	    /**
	     * Print some messages.
	     *
	     * @type {boolean}
	     * @memberOf IDeleteOptions
	     */
	    debug?: boolean;
	    /**
	     * A function called to reject or accept nodes to be copied. This is used only when matching
	     * has been left empty.
	     * @memberOf IDeleteOptions
	     */
	    filter?: (from: string) => boolean;
	    /**
	     * Move files to system's trash/recycle-bin
	     *
	     * @type {boolean}
	     * @memberOf IDeleteOptions
	     */
	    trash?: boolean;
	    flags?: EDeleteFlags;
	}

}
declare module 'fs-jetpack/utils/validate' {
	export function validateArgument(methodName: string, argumentName: string, argumentValue: string | any, argumentMustBe: any): boolean;
	export function validateOptions(methodName: string, optionsObjName: string, obj: any, allowedOptions: any): void;

}
declare module 'fs-jetpack/write' {
	import { IWriteOptions, ReadWriteDataType } from 'fs-jetpack/interfaces';
	export function validateInput(methodName: string, path: string, data: ReadWriteDataType, options: IWriteOptions): void;
	export function sync(path: string, data: ReadWriteDataType, options?: IWriteOptions): void;
	export function async(path: string, data: ReadWriteDataType, options?: IWriteOptions): Promise<null>;

}
declare module 'fs-jetpack/append' {
	/// <reference types="node" />
	export interface Options {
	    mode: string;
	    encoding?: string;
	    flag?: string;
	}
	export function validateInput(methodName: string, path: string, data: any, options?: Options): void;
	export function sync(path: string, data: any, options: Options): void;
	export function async(path: string, data: string | Buffer | Object, options?: Options): Promise<null>;

}
declare module 'fs-jetpack/utils/mode' {
	export function normalizeFileMode(mode: string | number): string;

}
declare module 'fs-jetpack/errors' {
	export function ErrNoFileOrDir(path: string): Error;
	export function ErrCantDelete(path: string): Error;
	export function ErrNotFile(path: string): Error;
	export function ErrNoDirectory(path: string): Error;
	export function ErrDoesntExists(path: string): Error;
	export function ErrDestinationExists(path: string): Error;
	export function ErrIsNotDirectory(path: string): Error;

}
declare module 'fs-jetpack/promisify' {
	export function promisify<T>(f: (cb: (err: any, res: T) => void) => void, thisContext?: any): () => Promise<T>;
	export function promisify<A, T>(f: (arg: A, cb: (err: any, res: T) => void) => void, thisContext?: any): (arg: A) => Promise<T>;
	export function promisify<A, A2, T>(f: (arg: A, arg2: A2, cb: (err: any, res: T) => void) => void, thisContext?: any): (arg: A, arg2: A2) => Promise<T>;
	export function promisify<A, A2, A3, T>(f: (arg: A, arg2: A2, arg3: A3, cb: (err: any, res: T) => void) => void, thisContext?: any): (arg: A, arg2: A2, arg3: A3) => Promise<T>;
	export function promisify<A, A2, A3, A4, T>(f: (arg: A, arg2: A2, arg3: A3, arg4: A4, cb: (err: any, res: T) => void) => void, thisContext?: any): (arg: A, arg2: A2, arg3: A3, arg4: A4) => Promise<T>;
	export function promisify<A, A2, A3, A4, A5, T>(f: (arg: A, arg2: A2, arg3: A3, arg4: A4, arg5: A5, cb: (err: any, res: T) => void) => void, thisContext?: any): (arg: A, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => Promise<T>;
	export function map<T, U>(elts: PromiseLike<PromiseLike<T>[]>, f: (t: T) => U | PromiseLike<U>): Promise<U[]>;
	export function map<T, U>(elts: PromiseLike<T[]>, f: (t: T) => U | PromiseLike<U>): Promise<U[]>;
	export function map<T, U>(elts: PromiseLike<T>[], f: (t: T) => U | PromiseLike<U>): Promise<U[]>;
	export function map<T, U>(elts: T[], f: (t: T) => U | PromiseLike<U>): Promise<U[]>;
	export function _try<T>(f: () => T): Promise<T>;
	export function _try<T>(f: (arg: any) => T, arg: any): Promise<T>;
	export function _try<T>(f: (arg: any, arg2: any) => T, arg: any, arg2: any): Promise<T>;
	export function _try<T>(f: (arg: any, arg2: any, arg3: any) => T, arg: any, arg2: any, arg3: any): Promise<T>;
	export function _try<T>(f: (arg: any, arg2: any, arg3: any, arg4: any) => T, arg: any, arg2: any, arg3: any, arg4: any): Promise<T>;

}
declare module 'fs-jetpack/dir' {
	export interface IOptions {
	    empty?: boolean;
	    mode?: number | string;
	}
	export const validateInput: (methodName: string, path: string, options?: IOptions) => void;
	export function sync(path: string, options?: IOptions): void;
	export function async(path: string, passedCriteria?: IOptions): Promise<{}>;

}
declare module 'fs-jetpack/file' {
	/// <reference types="node" />
	export interface IOptions {
	    content: string | Buffer | Object | Array<any>;
	    jsonIndent: number;
	    mode: string;
	}
	export function validateInput(methodName: string, path: string, options?: IOptions): void;
	export function defaults(passedCriteria: IOptions | null): IOptions;
	export function sync(path: string, options: IOptions): void;
	export function async(path: string, options: IOptions): Promise<{}>;

}
declare module 'fs-jetpack/inspect' {
	import { INode, IInspectOptions } from 'fs-jetpack/interfaces';
	export const supportedChecksumAlgorithms: string[];
	export function DefaultInspectOptions(): IInspectOptions;
	export function validateInput(methodName: string, path: string, options?: IInspectOptions): void;
	export function createItem(path: string, options?: IInspectOptions): INode;
	export function sync(path: string, options?: IInspectOptions): INode;
	export function async(path: string, options?: IInspectOptions): Promise<INode>;

}
declare module 'fs-jetpack/utils/platform' {
	export enum Platform {
	    Web = 0,
	    Mac = 1,
	    Linux = 2,
	    Windows = 3,
	}
	export let _platform: Platform;
	export const isWindows: boolean;
	export const isMacintosh: boolean;
	export const isLinux: boolean;
	export const isRootUser: boolean;
	export const isNative: boolean;
	export const isWeb: boolean;
	export const isQunit: boolean;
	export const platform: Platform;

}
declare module 'fs-jetpack/utils/strings' {
	export let canNormalize: boolean;
	export function normalizeNFC(str: string): string;

}
declare module 'fs-jetpack/list' {
	export function validateInput(methodName: string, path: string): void;
	export function _readdirSync(path: string): string[];
	export function sync(path: string): string[];
	export function async(path: string): Promise<string[]>;

}
declare module 'fs-jetpack/utils/tree_walker' {
	/// <reference types="node" />
	import { Readable } from 'stream';
	import { IInspectOptions, INode } from 'fs-jetpack/interfaces';
	export interface IOptions {
	    inspectOptions: IInspectOptions;
	    maxLevelsDeep?: number;
	    user?: any;
	}
	export function sync(path: string, options: IOptions, callback: (path: string, item: INode) => void, currentLevel?: number): void;
	export function stream(path: string, options: IOptions): Readable;

}
declare module 'fs-jetpack/utils/matcher' {
	export interface IOptions {
	    matchBase: boolean;
	    nocomment: boolean;
	    dot: boolean;
	}
	export function create(basePath: string, patterns: string[], options?: IOptions): (absolutePath: string) => boolean;

}
declare module 'fs-jetpack/find' {
	export interface IOptions {
	    matching?: string[];
	    files?: boolean;
	    directories?: boolean;
	    recursive?: boolean;
	    cwd?: string;
	}
	export function validateInput(methodName: string, path: string, options?: IOptions): void;
	export function sync(path: string, options: IOptions): string[];
	export function async(path: string, options: IOptions): Promise<string[]>;

}
declare module 'fs-jetpack/inspect_tree' {
	import { INode } from 'fs-jetpack/interfaces';
	export interface Options {
	    checksum: string;
	    relativePath: boolean;
	    symlinks: boolean;
	}
	export function validateInput(methodName: string, path: string, options: Options): void;
	export function sync(path: string, options?: any): any | undefined;
	export function async(path: string, options?: Options): Promise<INode>;

}
declare module 'fs-jetpack/exists' {
	export function validateInput(methodName: string, path: string): void;
	export function sync(path: string): boolean | string;
	export function async(path: string): Promise<boolean | string>;

}
declare module 'fs-jetpack/iterator' {
	import { IProcessingNode, IBaseOptions } from 'fs-jetpack/interfaces';
	// import { ArrayIterator } from '@xblox/core/iterator';
	// export function async(from: string, options: IBaseOptions): Promise<ArrayIterator<IProcessingNode>>;

}
declare module 'fs-jetpack/remove' {
	import { IDeleteOptions } from 'fs-jetpack/interfaces';
	import { TDeleteResult, EResolveMode } from 'fs-jetpack/interfaces';
	export function validateInput(methodName: string, path: string): void;
	export function sync(path: string, options?: IDeleteOptions): void;
	export function resolveConflict(path: string, resolveMode: EResolveMode): boolean;
	export function async(path: string, options?: IDeleteOptions): Promise<TDeleteResult>;

}
declare module 'fs-jetpack/copy' {
	import { ICopyOptions, EResolveMode, TCopyResult } from 'fs-jetpack/interfaces';
	export function validateInput(methodName: string, from: string, to: string, options?: ICopyOptions): void;
	export function sync(from: string, to: string, options?: ICopyOptions): void;
	export function copySymlinkAsync(from: string, to: string): Promise<string>;
	export function resolveConflict(from: string, to: string, options: ICopyOptions, resolveMode: EResolveMode): boolean;
	/**
	 * Final async copy function.
	 * @export
	 * @param {string} from
	 * @param {string} to
	 * @param {ICopyOptions} [options]
	 * @returns
	 */
	export function async(from: string, to: string, options?: ICopyOptions): Promise<TCopyResult>;

}
declare module 'fs-jetpack/move' {
	export function validateInput(methodName: string, from: string, to: string): void;
	export function sync(from: string, to: string): void;
	export function async(from: string, to: string): Promise<null>;

}
declare module 'fs-jetpack/rename' {
	export function validateInput(methodName: string, path: string, newName: string): void;
	export function sync(path: string, newName: string): void;
	export function async(path: string, newName: string): Promise<null>;

}
declare module 'fs-jetpack/symlink' {
	export function validateInput(methodName: string, symlinkValue: string, path: string): void;
	export function sync(symlinkValue: string, path: string): void;
	export function async(symlinkValue: string, path: string): Promise<{}>;

}
declare module 'fs-jetpack/streams' {
	export { createWriteStream } from 'fs';
	export { createReadStream } from 'fs';

}
declare module 'fs-jetpack/read' {
	import { ReadWriteDataType } from 'fs-jetpack/interfaces';
	export function validateInput(methodName: string, path: string, returnAs: string): void;
	export function sync(path: string, returnAs?: string): ReadWriteDataType;
	export function async(path: string, returnAs?: string): Promise<ReadWriteDataType>;

}
declare module 'fs-jetpack' {
	/// <reference types="node" />
	import { Options as AppendOptions } from 'fs-jetpack/append';
	import { IOptions as DirOptions } from 'fs-jetpack/dir';
	import { IOptions as FileOptions } from 'fs-jetpack/file';
	import { IOptions as FindOptions } from 'fs-jetpack/find';
	import { Options as InspectTreeOptions } from 'fs-jetpack/inspect_tree';
	import { IWriteOptions } from 'fs-jetpack/interfaces';
	import { ICopyOptions, INode, IInspectOptions } from 'fs-jetpack/interfaces';
	import { ReadWriteDataType } from 'fs-jetpack/interfaces';
	export interface IJetpack {
	    cwd(w?: any): IJetpack | string;
	    path(): string;
	    append(path: string, data: string | Buffer | Object, options?: AppendOptions): void;
	    appendAsync(path: string, data: string | Buffer | Object, options?: AppendOptions): Promise<null>;
	    copy(from: string, to: string, options?: ICopyOptions): void;
	    copyAsync(from: string, to: string, options?: ICopyOptions): Promise<void>;
	    createWriteStream(path: string, options?: {
	        flags?: string;
	        encoding?: string;
	        fd?: number;
	        mode?: number;
	        autoClose?: boolean;
	        start?: number;
	    }): any;
	    createReadStream(path: string, options?: {
	        flags?: string;
	        encoding?: string;
	        fd?: number;
	        mode?: number;
	        autoClose?: boolean;
	        start?: number;
	        end?: number;
	    }): any;
	    dir(path: string, criteria?: DirOptions): IJetpack;
	    dirAsync(path: string, criteria?: DirOptions): Promise<IJetpack>;
	    exists(path: string): boolean | string;
	    existsAsync(path: string): Promise<boolean | string>;
	    file(path: string, criteria?: FileOptions): void;
	    fileAsync(path: string, criteria?: FileOptions): Promise<null>;
	    find(startPath: string, options: FindOptions): string[];
	    findAsync(startPath: string, options: FindOptions): Promise<string[]>;
	    inspect(path: string, fieldsToInclude: IInspectOptions): INode;
	    inspectAsync(path: string, fieldsToInclude: IInspectOptions): Promise<INode>;
	    inspectTree(path: string, options?: InspectTreeOptions): INode;
	    inspectTreeAsync(path: string, options?: InspectTreeOptions): Promise<INode>;
	    list(path: string): string[];
	    listAsync(path: string): Promise<string[]>;
	    move(from: string, to: string): void;
	    moveAsync(from: string, to: string): Promise<null>;
	    read(path: string, returnAs?: string): ReadWriteDataType;
	    readAsync(path: string, returnAs?: string): Promise<ReadWriteDataType>;
	    remove(path: string): void;
	    removeAsync(path: string): Promise<null>;
	    rename(path: string, newName: string): void;
	    renameAsync(path: string, newName: string): Promise<null>;
	    symlink(symlinkValue: string, path: string): void;
	    symlinkAsync(symlinkValue: string, path: string): Promise<null>;
	    write(path: string, data: string | Buffer | Object, options?: IWriteOptions): void;
	    writeAsync(path: string, data: string | Buffer | Object, options?: IWriteOptions): Promise<null>;
	}
	export function cwd(w?: any):  | string;
	export function path(): string;
	export function append(path: string, data: string | Buffer | Object, options?: AppendOptions): void;
	export function appendAsync(path: string, data: string | Buffer | Object, options?: AppendOptions): Promise<null>;
	export function copy(from: string, to: string, options?: ICopyOptions): void;
	export function copyAsync(from: string, to: string, options?: ICopyOptions): Promise<void>;
	export function createWriteStream(path: string, options?: {
	        flags?: string;
	        encoding?: string;
	        fd?: number;
	        mode?: number;
	        autoClose?: boolean;
	        start?: number;
	    }): any;
	export function createReadStream(path: string, options?: {
	        flags?: string;
	        encoding?: string;
	        fd?: number;
	        mode?: number;
	        autoClose?: boolean;
	        start?: number;
	        end?: number;
	    }): any;
	export function dir(path: string, criteria?: DirOptions): IJetpack;
	export function dirAsync(path: string, criteria?: DirOptions): Promise<IJetpack>;
	export function exists(path: string): boolean | string;
	export function existsAsync(path: string): Promise<boolean | string>;
	export function file(path: string, criteria?: FileOptions): void;
	export function fileAsync(path: string, criteria?: FileOptions): Promise<null>;
	export function find(startPath: string, options: FindOptions): string[];
	export function findAsync(startPath: string, options: FindOptions): Promise<string[]>;
	export function inspect(path: string, fieldsToInclude: IInspectOptions): INode;
	export function inspectAsync(path: string, fieldsToInclude: IInspectOptions): Promise<INode>;
	export function inspectTree(path: string, options?: InspectTreeOptions): INode;
	export function inspectTreeAsync(path: string, options?: InspectTreeOptions): Promise<INode>;
	export function list(path: string): string[];
	export function listAsync(path: string): Promise<string[]>;
	export function move(from: string, to: string): void;
	export function moveAsync(from: string, to: string): Promise<null>;
	export function read(path: string, returnAs?: string): ReadWriteDataType;
	export function readAsync(path: string, returnAs?: string): Promise<ReadWriteDataType>;
	export function remove(path: string): void;
	export function removeAsync(path: string): Promise<null>;
	export function rename(path: string, newName: string): void;
	export function renameAsync(path: string, newName: string): Promise<null>;
	export function symlink(symlinkValue: string, path: string): void;
	export function symlinkAsync(symlinkValue: string, path: string): Promise<null>;
	export function write(path: string, data: string | Buffer | Object, options?: IWriteOptions): void;
	export function writeAsync(path: string, data: string | Buffer | Object, options?: IWriteOptions): Promise<null>;
}