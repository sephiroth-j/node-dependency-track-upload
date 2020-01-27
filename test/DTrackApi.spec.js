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
const DTrackApi = require('../src/DTrackApi.js');
const {
	Observable
} = require('rxjs');
const nock = require('nock');

describe('DTrackApi', function () {
	describe('constructor', function () {
		it('should throw error if url is missing or invalid', function () {
			expect(DTrackApi).to.throw(TypeError);

			let fn = () => new DTrackApi('', 'test');
			expect(fn).to.throw(TypeError);
			fn = () => new DTrackApi(null, 'test');
			expect(fn).to.throw(TypeError);
			fn = () => new DTrackApi('foo://asd', 'test');
			expect(fn).to.throw(TypeError);
			fn = () => new DTrackApi('foo', 'test');
			expect(fn).to.throw(TypeError);
			fn = () => new DTrackApi({}, 'test');
			expect(fn).to.throw(TypeError);
		});
		it('should throw error if api-key is missing', function () {
			let fn = () => new DTrackApi('http://foo', null);
			expect(fn).to.throw(TypeError);
			fn = () => DTrackApi('http://foo', '');
			expect(fn).to.throw(TypeError);
			fn = () => DTrackApi('http://foo', {});
			expect(fn).to.throw(TypeError);
		});
	});
	it('getter "url" should return url from constructor', function () {
		const url = 'http://foo';
		const api = new DTrackApi(url, 'test');
		expect(api.url).to.equal(url);
	});
	it('getter "apiKey" should return apiKey from constructor', function () {
		const apiKey = 'test';
		const api = new DTrackApi('http://foo', apiKey);
		expect(api.apiKey).to.equal(apiKey);
	});

	describe('check()', function () {
		let api, url = 'http://foo', apiKey = 'api-key';
		beforeEach(function () {
			api = new DTrackApi(url, apiKey);
		});
		it('should return Observable', function () {
			expect(api.check()).to.be.an.instanceof(Observable);
		});
		it('should make GET request to <url>/api/version', function (done) {
			const scope = nock(url).matchHeader('X-Api-Key', apiKey).get('/api/version').reply(200, {
				application: 'Dependency-Track',
				version: '3.7.1'
			});

			api.check().subscribe(undefined, undefined, () => {
				expect(scope.isDone()).to.be.true;
				done();
			});
		});
		it('should throw if api response is invalid', function (done) {
			const scope = nock(url).matchHeader('X-Api-Key', apiKey).get('/api/version').reply(200, {});

			api.check().subscribe(undefined, () => {
				expect(scope.isDone()).to.be.true;
				done();
			});
		});
	});

	describe('getProjectList()', function () {
		let api, url = 'http://foo', apiKey = 'api-key';
		beforeEach(function () {
			api = new DTrackApi(url, apiKey);
		});
		it('should return Observable', function () {
			expect(api.getProjectList()).to.be.an.instanceof(Observable);
		});
		it('should make GET request to <url>/api/v1/project', function (done) {
			const scope = nock(url).matchHeader('X-Api-Key', apiKey).get('/api/v1/project').query({excludeInactive: false}).reply(200, []);

			api.getProjectList().subscribe(undefined, () => {
				expect.fail('should not have thrown');
			}, () => {
				expect(scope.isDone()).to.be.true;
				done();
			});
		});
		it('should unwrap and map response items', function (done) {
			const scope = nock(url).matchHeader('X-Api-Key', apiKey).get('/api/v1/project').query({excludeInactive: true}).reply(200, [
				{
					name: 'name1',
					version: 'v1',
					uuid: '1',
					more: {}
				},
				{
					name: 'name2',
					version: 'v2',
					uuid: '2',
					more: {}
				}
			]);

			let items = [];
			api.getProjectList(true).subscribe(item => {
				items.push(item);
			}, () => {
				expect.fail('should not have thrown');
			}, () => {
				expect(scope.isDone()).to.be.true;
				expect(items[0]).to.be.frozen;
				expect(items[1]).to.be.frozen;
				expect(items).to.deep.equal([
					{
						name: 'name1',
						version: 'v1',
						uuid: '1'
					},
					{
						name: 'name2',
						version: 'v2',
						uuid: '2'
					}
				]);
				done();
			});
		});
	});

	describe('uploadBom()', function () {
		let api, url = 'http://foo', apiKey = 'api-key';
		beforeEach(function () {
			api = new DTrackApi(url, apiKey);
		});
		it('should throw if bom is not a Buffer', function () {
			expect(api.uploadBom).to.throw(TypeError);
		});
		it('should return Observable', function () {
			expect(api.uploadBom(Buffer.from('test'))).to.be.an.instanceof(Observable);
		});
		it('should make PUT request to <url>/api/v1/bom', function (done) {
			const bom = Buffer.from('test');
			const scope = nock(url).matchHeader('X-Api-Key', apiKey).put('/api/v1/bom', {
				project: null,
				autoCreate: true,
				bom: bom.toString('base64')
			}).reply(400);

			api.uploadBom(bom).subscribe(() => {
				expect.fail('should not have emitted a value');
			}, () => {
				expect(scope.isDone()).to.be.true;
				done();
			});
		});
		it('should make PUT request to <url>/api/v1/bom and return token', function (done) {
			const bom = Buffer.from('test'), id = 'an id', name = 'test project', version = 'v1';
			const scope = nock(url).matchHeader('X-Api-Key', apiKey).put('/api/v1/bom', {
				project: id,
				autoCreate: true,
				projectName: name,
				projectVersion: version,
				bom: bom.toString('base64')
			}).reply(200, {
				token: 'token-value'
			});

			let actual;
			api.uploadBom(bom, id, name, version).subscribe(token => {
				actual = token;
			}, undefined, () => {
				expect(scope.isDone()).to.be.true;
				expect(actual).to.equal('token-value');
				done();
			});
		});
	});
});