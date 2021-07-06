/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Typefox. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { URI } from 'vs/base/common/uri';
import { whenDeleted } from 'vs/base/node/pfs';
import { localize } from 'vs/nls';
import { NativeParsedArgs } from 'vs/platform/environment/common/argv';
import { buildHelpMessage, buildVersionMessage, ErrorReporter, OptionDescriptions, OPTIONS as ALL_OPTIONS, parseArgs } from 'vs/platform/environment/node/argv';
import { createWaitMarkerFile } from 'vs/platform/environment/node/wait';
import product from 'vs/platform/product/common/product';
import type { PipeCommand } from 'vs/workbench/api/node/extHostCLIServer';

const OPTIONS_KEYS: (keyof typeof ALL_OPTIONS)[] = [
	'help',

	'diff',
	'add',
	'goto',
	'new-window',
	'reuse-window',
	'folder-uri',
	'file-uri',
	'wait',

	'list-extensions',
	'show-versions',
	'category',
	'install-extension',
	'uninstall-extension',
	'force',

	'version',
	'status',
	'verbose'
];
interface GitpodNativeParsedArgs extends NativeParsedArgs {
	command?: boolean
	'open-external'?: string[]
}
const OPTIONS: OptionDescriptions<GitpodNativeParsedArgs> = {
	_: ALL_OPTIONS['_'],
	command: {
		type: 'boolean',
	},
	'open-external': {
		type: 'string[]'
	}
};
for (const key of OPTIONS_KEYS) {
	Object.assign(OPTIONS, { [key]: ALL_OPTIONS[key] });
}

const devMode = !!process.env['VSCODE_DEV'];

async function main(processArgv: string[]): Promise<any> {
	let args: GitpodNativeParsedArgs;

	try {
		const errorReporter: ErrorReporter = {
			onUnknownOption: (id) => {
				console.warn(localize('unknownOption', "Warning: '{0}' is not in the list of known options.", id));
			},
			onMultipleValues: (id, val) => {
				console.warn(localize('multipleValues', "Option '{0}' is defined more than once. Using value '{1}.'", id, val));
			}
		};

		args = parseArgs(processArgv.slice(2), OPTIONS, errorReporter);
		if (args.goto) {
			args._.forEach(arg => assert(/^(\w:)?[^:]+(:\d*){0,2}$/.test(arg), localize('gotoValidation', "Arguments in `--goto` mode should be in the format of `FILE(:LINE(:CHARACTER))`.")));
		}
	} catch (err) {
		console.error(err.message);
		return;
	}

	// Help
	if (args.help) {
		const executable = `${product.applicationName}`;
		console.log(buildHelpMessage(product.nameLong, executable, product.version, OPTIONS));
	}

	// Version Info
	else if (args.version) {
		console.log(buildVersionMessage(product.version, product.commit));
	}

	// Status
	else if (args.status) {
		console.log(await sendCommand({
			type: 'status'
		}));
	}

	// Command
	else if (args.command) {
		const command = args._.shift();
		assert(command, 'Arguments in `--command` mode should be in the format of `COMMAND ARG1 ARG2 ARGN`.');
		await sendCommand({
			type: 'command',
			command,
			args: args._
		});
	}

	// open external URIs
	else if (args['open-external']) {
		await sendCommand({
			type: 'openExternal',
			uris: args['open-external']
		});
	}

	// Extensionst Management
	else if (args['list-extensions'] || args['install-extension'] || args['uninstall-extension']) {
		console.log(await sendCommand({
			type: 'extensionManagement',
			list: args['list-extensions'] ? {
				category: args.category,
				showVersions: args['show-versions']
			} : undefined,
			install: args['install-extension'],
			uninstall: args['uninstall-extension'],
			force: args['force']
		}));
	}

	// Just Code
	else {
		const waitMarkerFilePath = args.wait ? createWaitMarkerFile(args.verbose) : undefined;
		const fileURIs: string[] = [...args['file-uri'] || []];
		const folderURIs: string[] = [...args['folder-uri'] || []];
		const pendingFiles: Promise<void>[] = [];
		for (const arg of args._) {
			if (arg === '-') {
				// don't support reading from stdin yet
				continue;
			}
			const filePath = path.resolve(process.cwd(), arg);
			pendingFiles.push(fs.promises.stat(filePath).then(stat => {
				const uris = stat.isFile() ? fileURIs : folderURIs;
				uris.push(URI.parse(filePath).toString());
			}, e => {
				if (e.code === 'ENOENT') {
					// open a new file
					fileURIs.push(URI.parse(filePath).toString());
				} else {
					console.log(`failed to resolve '${filePath}' path:`, e);
				}
			}));
		}
		await Promise.all(pendingFiles);
		await sendCommand({
			type: 'open',
			fileURIs,
			folderURIs,
			forceNewWindow: args['new-window'],
			diffMode: args.diff,
			addMode: args.add,
			gotoLineMode: args.goto,
			forceReuseWindow: args['reuse-window'],
			waitMarkerFilePath
		});
		if (waitMarkerFilePath) {
			// Complete when wait marker file is deleted
			await whenDeleted(waitMarkerFilePath);
		}
	}
}

async function sendCommand(command: PipeCommand): Promise<string> {
	let port = 3000;
	if (!devMode && process.env.GITPOD_THEIA_PORT) {
		port = Number(process.env.GITPOD_THEIA_PORT);
	}
	const http = await import('http');
	return new Promise<string>((resolve, reject) => {
		const req = http.request({
			hostname: 'localhost',
			port,
			protocol: 'http:',
			path: '/cli',
			method: 'POST',
			timeout: 5000
		}, res => {
			const chunks: string[] = [];
			res.setEncoding('utf8');
			res.on('data', d => chunks.push(d));
			res.on('end', () => {
				const result = chunks.join('');
				if (res.statusCode !== 200) {
					reject(new Error(`Bad status code: ${res.statusCode}: ${result}`));
				} else {
					resolve(result);
				}
			});
		});

		req.on('error', err => reject(err));
		req.write(JSON.stringify(command));
		req.end();
	});
}

function eventuallyExit(code: number): void {
	setTimeout(() => process.exit(code), 0);
}

main(process.argv)
	.then(() => eventuallyExit(0))
	.then(null, err => {
		console.error(err.message || err.stack || err);
		eventuallyExit(1);
	});
