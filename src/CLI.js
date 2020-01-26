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
const fs = require('fs');
const {
	EOL
} = require('os');
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

module.exports = class CLI {
	#apiFactory;
	
	/**
	 * 
	 * @param {Function(string, string):DTrackApi} apiFactory a factory-function/supplier that creates a new instance of DTrackApi
	 * @returns {CLI}
	 */
	constructor(apiFactory) {
		this.#apiFactory = apiFactory;
	}

	listProjects(argv) {
		const api = this.#apiFactory(argv.url, argv.apiKey);
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
			/* istanbul ignore else */
			if (argv.table) {
				process.stdout.write(EOL);
			}
			console.error(error('failed to fetch project list. check if url "%s" and api-key "%s" are valid.'), argv.url, argv.apiKey);
			process.exit(3);
		}, () => {
			if (argv.table) {
				process.stdout.write(EOL);
			}
		});
	}

	uploadBom(argv) {
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
			const api = this.#apiFactory(argv.url, argv.apiKey);
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
}
