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
const { of } = require('rxjs');
const satisfies = require('semver/functions/satisfies'); 
const { map, pluck, filter, throwIfEmpty, mergeMap, tap } = require('rxjs/operators');
const dataAttributeName = 'data';
// semver of the supported Dependency-Track version(s)
const supportedVersion = '^3.7.0';

function isValidUrl(url) {
	try {
		const u = new URL(url);
		return /https?:/.test(u.protocol);
	} catch(e) {
		return false;
	}
}

module.exports = class DTrackApi {
	#url;
	#apiKey;
	#axios;
	
	/**
	 * @param {string} url
	 * @param {string} apiKey
	 */
	constructor(url, apiKey) {
		if (!url || typeof url !== 'string' || !isValidUrl(url)) {
			throw new TypeError('"url" missing or not a valid URL');
		}
		if (!apiKey || typeof apiKey !== 'string') {
			throw new TypeError('"apiKey" missing or not of type string');
		}
		this.#url = url;
		this.#apiKey = apiKey;
		this.#axios = require('axios-observable').Axios.create({
			baseURL: `${url}/api`,
			headers: { 'X-Api-Key': apiKey },
		});
	}
	
	get url() {
		return this.#url;
	}
	
	get apiKey() {
		return this.#apiKey;
	}
	
	/**
	 * checks the connection
	 * 
	 * @returns {Observable<Object>}
	 */
	check() {
		return this.#axios.get('/version').pipe(
			pluck(dataAttributeName),
			filter(data => data.application && data.application === 'Dependency-Track' && satisfies(data.version, supportedVersion)),
			throwIfEmpty()
		);
	}
	
	/**
	 * get a list of all known project, their version and thei uuid
	 * 
	 * @param {boolean} [activeOnly=false] get only active projects aka exclude inactive
	 * @returns {Observable<{name:string, version:string, uuid:string}[]>}
	 */
	getProjectList(activeOnly) {
		return this.#axios.get('/v1/project', {
			params: {
				excludeInactive: !!activeOnly
			}
		}).pipe(
			pluck(dataAttributeName),
			mergeMap(data => of(...data)),
			map(project => Object.freeze({
				name: project.name,
				version: project.version,
				uuid: project.uuid,
			}))
		);
	}
	
	/**
	 * uploads the given bom file for the given project or creates a new project
	 * 
	 * @param {Buffer} bom the contents of the bom file (bom.xml)
	 * @param {string} [projectUuid] the uuid of the project this bom is meant for. if missing, a new project with name {@code projectName} and version {@code projectVersion} is created
	 * @param {string} [projectName] the name of the project this bom is meant for (only if {@code projectUuid} is absent)
	 * @param {string} [projectVersion] the version of the project this bom is meant for (only if {@code projectUuid} is absent)
	 * @returns {Observable<string>}
	 */
	uploadBom(bom, projectUuid, projectName, projectVersion) {
		if (!(bom instanceof Buffer)) {
			throw new TypeError('"bom" must be an instance of Buffer');
		}
		return this.#axios.put('/v1/bom', {
			project: projectUuid ? projectUuid : null,
			autoCreate: true,
			projectName: projectName,
			projectVersion: projectVersion,
			bom: bom.toString('base64')
		}).pipe(
			pluck(dataAttributeName),
			pluck('token')
		);
	}
}

