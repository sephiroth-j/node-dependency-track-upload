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
const expect = require('chai').expect;
const {
	of,
	throwError
} = require('rxjs');
const sinon = require('sinon');
const fs = require('fs');
const CLI = require('../src/CLI.js');
const url = 'http://foo', apiKey = 'api-key';
const {
	stdout
} = require('process');


describe('CLI', function () {
	describe('command listProjects', function () {
		let logSpy, stdoutSpy, errorSpy, exitStub;
		beforeEach(function () {
			logSpy = sinon.spy(console, 'log');
			stdoutSpy = sinon.spy(stdout, 'write');
			errorSpy = sinon.spy(console, 'error');
			exitStub = sinon.stub(process, 'exit');
		});
		afterEach(function () {
			logSpy.restore();
			stdoutSpy.restore();
			errorSpy.restore();
			exitStub.restore();
		});
		it('should print projects as table', function () {
			const apiMock = {
				check() {
					return of({});
				},
				getProjectList() {
					return of({
						name: 'name1',
						version: 'v1',
						uuid: 'uuid-1'
					});
				},
				getVulnerabilities(uuid) {
					return of([]);
				}
			};
			const argv = {
				url: url,
				apiKey: apiKey,
				table: true
			};

			const uut = new CLI(() => apiMock);
			uut.listProjects(argv);
			sinon.assert.notCalled(logSpy);
			sinon.assert.calledThrice(stdoutSpy);
			expect(stdoutSpy.firstCall.args[0]).to.include('Project Name').and.to.include('Version').and.to.include('UUID').and.to.include('Vulnerabilities');
		});
		it('option --no-table should print simple list', function () {
			const apiMock = {
				check() {
					return of({});
				},
				getProjectList() {
					return of({
						name: 'name1',
						version: 'v1',
						uuid: 'uuid-1'
					});
				},
				getVulnerabilities(uuid) {
					return of([]);
				}
			};
			const argv = {
				url: url,
				apiKey: apiKey,
				table: false
			};

			const uut = new CLI(() => apiMock);
			uut.listProjects(argv);
			sinon.assert.calledOnce(logSpy);
			expect(logSpy.firstCall.args[0]).to.include('name1, v1, uuid-1, 0/0/0/0/0');
		});
		it('option --filter should filter items', function () {
			const apiMock = {
				check() {
					return of({});
				},
				getProjectList() {
					return of({
						name: 'name1',
						version: 'v1',
						uuid: 'uuid-1'
					}, {
						name: 'foo',
						version: 'v2',
						uuid: 'uuid-2'
					});
				},
				getVulnerabilities(uuid) {
					return of(uuid === 'uuid-1' ? [] : [{severity: 'CRITICAL'}]);
				}
			};
			const argv = {
				url: url,
				apiKey: apiKey,
				table: false,
				filter: 'foo'
			};

			const uut = new CLI(() => apiMock);
			uut.listProjects(argv);
			sinon.assert.calledOnce(logSpy);
			expect(logSpy.firstCall.args[0]).to.include('foo, v2, uuid-2, 1/0/0/0/0');
		});
		it('should exit with code 3 on failure', function () {
			const apiMock = {
				check() {
					return throwError({});
				},
				getProjectList() {
					return throwError({});
				}
			};
			const getProjectListSpy = sinon.spy(apiMock, 'getProjectList');
			const argv = {
				url: url,
				apiKey: apiKey,
				table: true,
			};

			const uut = new CLI(() => apiMock);
			uut.listProjects(argv);
			sinon.assert.notCalled(getProjectListSpy);
			sinon.assert.calledOnce(errorSpy);
			expect(errorSpy.firstCall.args[0]).to.include(`failed to fetch project list.`);
			sinon.assert.calledOnce(exitStub);
			sinon.assert.calledWithExactly(exitStub.firstCall, 3);
		});
	});
	describe('command uploadBom', function () {
		let logSpy, warnSpy, errorSpy, exitStub;
		beforeEach(function () {
			logSpy = sinon.spy(console, 'log');
			warnSpy = sinon.spy(console, 'warn');
			errorSpy = sinon.spy(console, 'error');
			exitStub = sinon.stub(process, 'exit');
		});
		afterEach(function () {
			logSpy.restore();
			warnSpy.restore();
			errorSpy.restore();
			exitStub.restore();
		});
		it('missing bom should be an error', function () {
			const apiMock = {
				check() {
					return of({});
				},
				uploadBom() {
					return of('token');
				}
			};
			const argv = {
				url: url,
				apiKey: apiKey,
				b: 'bom-not-found',
				pj: 'json-not-found',
				p: 'uuid-1',
				pn: 'name-1',
				pv: 'v1',
			};

			const uut = new CLI(() => apiMock);
			uut.uploadBom(argv);
			sinon.assert.notCalled(logSpy);
			sinon.assert.calledOnce(warnSpy);
			expect(warnSpy.firstCall.args[0]).to.include(`could not find package.json at "${argv.pj}".`);
			sinon.assert.calledOnce(errorSpy);
			expect(errorSpy.firstCall.args[0]).to.include(`bom "${argv.b}" does not exists`);
			sinon.assert.calledOnce(exitStub);
			sinon.assert.calledWithExactly(exitStub.firstCall, 1);
		});
		it('project name and version should be taken from package.json if found', function () {
			const apiMock = {
				check() {
					return of({});
				},
				uploadBom(bom, projectUuid, projectName, projectVersion) {
					return of('token');
				}
			};
			const uploadBomSpy = sinon.spy(apiMock, 'uploadBom');
			const bomLocation = './test/testbom.xml', uuid = 'uuid-1';
			const argv = {
				url: url,
				apiKey: apiKey,
				b: bomLocation,
				pj: './test/testdata.json',
				p: uuid,
			};

			const uut = new CLI(() => apiMock);
			uut.uploadBom(argv);
			sinon.assert.calledOnce(uploadBomSpy);
			sinon.assert.calledWith(uploadBomSpy.firstCall, sinon.match.instanceOf(Buffer).and(sinon.match(v => Buffer.compare(v, fs.readFileSync(bomLocation)) === 0)), uuid, 'project-1', 'v1');
			sinon.assert.calledOnce(logSpy);
			expect(logSpy.firstCall.args[0]).to.include('upload succeeded');
			sinon.assert.notCalled(warnSpy);
			sinon.assert.notCalled(errorSpy);
			sinon.assert.notCalled(exitStub);
		});
		it('should exit with code 2 on failure', function () {
			const apiMock = {
				check() {
					return throwError({});
				},
				getProjectList() {
					return throwError({});
				}
			};
			const getProjectListSpy = sinon.spy(apiMock, 'getProjectList');
			const argv = {
				url: url,
				apiKey: apiKey,
				b: './test/testbom.xml'
			};

			const uut = new CLI(() => apiMock);
			uut.uploadBom(argv);
			sinon.assert.notCalled(getProjectListSpy);
			sinon.assert.calledOnce(errorSpy);
			expect(errorSpy.firstCall.args[0]).to.include(`failed to upload bom.`);
			sinon.assert.calledOnce(exitStub);
			sinon.assert.calledWithExactly(exitStub.firstCall, 2);
		});
	});
});
