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
const exec = require('child_process').execFile;
const cli = './src/bin/dtrack-upload.js';

describe('dtrack-upload', function () {
	describe('basics', function () {
		it('should do nothing without args', function (done) {
			exec('node', [cli], (error, stdout) => {
				expect(error).to.be.null;
				expect(stdout).to.be.empty;
				done();
			});
		});
		it('global help should contain --url and --api-key and all known commands', function (done) {
			exec('node', [cli, '--help'], (error, stdout) => {
				expect(error).to.be.null;
				expect(stdout).to.include(' --url ')
						.and.to.include(' --api-key ')
						.and.to.include(' dtrack-upload.js list-projects ')
						.and.to.include(' dtrack-upload.js upload-bom ');
				done();
			});
		});
	});
	describe('command list-projects', function () {
		it('should have options', function (done) {
			exec('node', [cli, 'list-projects', '--help'], (error, stdout) => {
				expect(error).to.be.null;
				expect(stdout).to.include(' --active-only ')
						.and.to.include(' --filter ')
						.and.to.include(' --table ');
				done();
			});
		});
	});
	describe('command upload-bom', function () {
		it('should have options', function (done) {
			exec('node', [cli, 'upload-bom', '--help'], (error, stdout) => {
				expect(error).to.be.null;
				expect(stdout).to.include(' -b, --bom ')
						.and.to.include(' -p, --project-id ')
						.and.to.include(' --pv, --project-version ')
						.and.to.include(' --pn, --project-name ')
						.and.to.include(' --pj, --package-json ');
				done();
			});
		});
	});
});