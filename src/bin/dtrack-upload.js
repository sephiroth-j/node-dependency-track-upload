#!/usr/bin/env node
/* 
 * Copyright 2020 Ronny "Sephiroth" Perinke <sephiroth@sephiroth-j.de>.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
const configPrefix = require('../../package.json').name;
const DTrackApi = require('../DTrackApi.js');
const npmConf = require('npm-conf')();
const fs = require('fs');
const clc = require('cli-color');
const {
	createStream,
	getBorderCharacters,
} = require('table');
const {
	mergeMap,
	startWith,
	filter,
} = require('rxjs/operators');

const success = clc.green;
const error = clc.red.bold;
const warning = clc.yellow;
const notice = clc.blue;

require('yargs')
	.usage('Usage: $0 <command> [options]')
	.example('$0 list-projects')
	.example('$0 upload-bom -b /path/to/bom.xml')
	.help('h').alias('h', 'help')
	.alias('v', 'version')
	.parserConfiguration({
		'set-placeholder-key': true
	})
	.epilog(`Providing URL and API Key:
The URL to Dependency-Track and the API key can be specified through your .npmrc (default) or by passing them as argument. The config name for the url is '${configPrefix}:url' and '${configPrefix}:apiKey' for the api key.`)
	.options({
		'url': {
			requiresArg: true,
			demandOption: true,
			'default': npmConf.get(`${configPrefix}:url`),
			desc: 'URL to Dependency-Track',
			type: 'string'
		},
		'api-key': {
			requiresArg: true,
			demandOption: true,
			'default': npmConf.get(`${configPrefix}:apiKey`),
			desc: 'API key for Dependency-Track',
			type: 'string'
		}
	})
	.command('list-projects', 'list all known projects', {
		'active-only': {
			desc: 'show only active projects',
			'default': false,
			type: 'boolean'
		},
		'filter': {
			requiresArg: true,
			desc: 'show only projects where their name contains the given string',
			type: 'string'
		},
		'table': {
			'default': true,
			desc: 'output as ASCII table',
			type: 'boolean'
		}
	}, listProjects)
	.command('upload-bom', 'upload bom.xml', {
		'b': {
			alias: 'bom',
			requiresArg: true,
			'default': './bom.xml',
			desc: 'Location of CycloneDX bom.xml',
			type: 'string'
		},
		'p': {
			alias: 'project-id',
			requiresArg: true,
			desc: 'UUID of the project',
			type: 'string'
		},
		'pj': {
			alias: 'package-json',
			requiresArg: true,
			'default': './package.json',
			desc: 'Location of the projects package.json',
			type: 'string',
			conflicts: 'p'
		},
		'pn': {
			alias: 'project-name',
			requiresArg: true,
			desc: 'Name of the project (fallback for missing UUID or missing package.json)',
			type: 'string',
			conflicts: ['p', 'pj'],
			implies: 'pv'
		},
		'pv': {
			alias: 'project-version',
			requiresArg: true,
			desc: 'Version of the project (fallback for missing UUID or missing package.json)',
			type: 'string',
			conflicts: ['p', 'pj'],
			implies: 'pn'
		}
	}, uploadBom)
	.parse();

function listProjects(argv) {
	const api = new DTrackApi(argv.url, argv.apiKey);
	const projectStream = argv.table ? createStream({
		columnDefault: {
			width: 30
		},
		columnCount: 3,
		border: getBorderCharacters('norc'),
		columns: {
			1: {
				width: 10
			}
		}
	}) : null;
	const tabHeader = argv.table ? [{
		name: 'Project Name',
		version: 'Version',
		uuid: 'UUID'
	}] : [];

	api.check().pipe(
		mergeMap(() => api.getProjectList(argv.activeOnly)),
		// apply name filter if needed
		filter(project => !argv.filter || project.name.indexOf(argv.filter) >= 0),
		// insert table header row
		startWith(...tabHeader)
	).subscribe(project => {
		if (argv.table) {
			projectStream.write([notice(project.name), notice(project.version), notice(project.uuid)]);
		} else {
			console.log(notice(`${project.name}, ${project.version}, ${project.uuid}`));
		}
	}, () => {
		if (argv.table) {
			process.stdout.write("\n");
		}
		console.error(error('failed to fetch project list. check if url "%s" and api-key "%s" are valid.'), argv.url, argv.apiKey);
		process.exit(3);
	}, () => {
		if (argv.table) {
			process.stdout.write("\n");
		}
	});
}

function uploadBom(argv) {
	let bom = argv.b;
	let projectUuid = argv.p;
	let packageJsonLoc = argv.pj;
	let projectName = argv.pn;
	let projectVersion = argv.pv;
	if (fs.existsSync(packageJsonLoc)) {
		const packageJson = JSON.parse(fs.readFileSync(packageJsonLoc, 'utf-8'));
		projectName = packageJson.name;
		projectVersion = packageJson.version;
	} else {
		console.warn(warning(`could not find package.json at "${packageJsonLoc}". be sure to provide "projectName" and "projectVersion"`));
	}
	if (fs.existsSync(bom)) {
		const buf = fs.readFileSync(bom);
		const api = new DTrackApi(argv.url, argv.apiKey);
		api.check().pipe(
			mergeMap(() => api.uploadBom(buf, projectUuid, projectName, projectVersion))
		).subscribe(() => {
			console.log(success('upload succeeded'));
		}, () => {
			console.error(error('failed to upload bom. check if url "%s" and api-key "%s" are valid.'), argv.url, argv.apiKey);
			process.exit(2);
		});
	} else {
		console.error(error(`bom "${bom}" does not exists`));
		process.exit(1);
	}
}