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
/* istanbul ignore next */
const cli = new (require('../CLI.js'))((url, apiKey) => new DTrackApi(url, apiKey));

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
	}, cli.listProjects.bind(cli))
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
	}, cli.uploadBom.bind(cli))
	.parse();
