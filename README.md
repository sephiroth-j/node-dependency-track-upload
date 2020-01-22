# node-dependency-track-upload

[![Build Status](https://travis-ci.com/sephiroth-j/node-dependency-track-upload.svg?branch=master)](https://travis-ci.com/sephiroth-j/node-dependency-track-upload) [![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=de.sephiroth-j%3Anode-dependency-track-upload&metric=alert_status)](https://sonarcloud.io/dashboard?id=de.sephiroth-j%3Anode-dependency-track-upload) [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Node.js plugin to integrate with [Dependency-Track](https://dependencytrack.org/) server to submit dependency manifests and gather project metrics.

## Features
1. upload a CycloneDX Software Bill-of-Materials (SBOM) file to Dependency-Track and create the project if needed
2. get a list of projects, their version and their UUID

## Requirements
- Node.js 12.4 or newer
- [CycloneDX Node.js Module](https://www.npmjs.com/package/@cyclonedx/bom) to create the SBOM
- [Dependency-Track](https://dependencytrack.org/) server

## Install
```
npm install -g @cyclonedx/bom @sephiroth-j/node-dependency-track-upload
```

## Usage
### Configuration

Add the base URL to the Dependency-Track server and an API key to your npm config (`.npmrc`). This is the recommended way but both values can be provided as command line arguments as well (see below).

```bash
npm config set @sephiroth-j/node-dependency-track-upload:url http://localhost:8080
npm config set @sephiroth-j/node-dependency-track-upload:apiKey 1234-456879...
```

### Dependency-Track Permissions

The following permissions for the given API key are required:

- `BOM_UPLOAD`: for uploading a bom file
- `VIEW_PORTFOLIO`: for project listing
- `VULNERABILITY_ANALYSIS`: to run an analysis e.g. after uploading a bom
- `PROJECT_CREATION_UPLOAD`: for automatic creation of project during the upload process. Without, the UUID of the project must be provided for uploading a bom!

### Commands and Options
In general, the working directory when executing the command should be your project root directory with the `package.json`.

#### Global Options
- `--url`: specify an alternate url to the Dependency-Track server
- `--api-key`: specify an alternate API key
- `-h, --help`: show global help or for a command using `<command> --help`
- `-v, --version`: show version

#### list-projects
Get a list of known projects. The list can be limited to active projects only (_off by default_) and to projects where the name contains a given string.

By default the output is an ASCII table. This can be disabled by giving the option `--no-table`.

**Output Examples**

```bash
# output as table
$ dtrack-upload list-projects
┌────────────────────────────────┬────────────┬────────────────────────────────┐
│ Project Name                   │ Version    │ UUID                           │
├────────────────────────────────┼────────────┼────────────────────────────────┤
│ @sephiroth-j/node-dependency-t │ 0.1.0-alph │ 1aec8e9d-3024-42fd-ad28-2a35bc │
│ rack-upload                    │ a          │ b8d282                         │
└────────────────────────────────┴────────────┴────────────────────────────────┘

# plain output
$ dtrack-upload list-projects --no-table
@sephiroth-j/node-dependency-track-upload, 0.1.0-alpha, 1aec8e9d-3024-42fd-ad28-2a35bcb8d282
```

Filtering by name is done with the option `--filter` followed by the search string, e.g. `dtrack-upload list-projects --filter foo`.

Hiding inactive projects can be done with the option `--active-only`.

#### upload-bom
Upload a CycloneDX Software Bill-of-Materials (SBOM) file to Dependency-Track and create the project if needed.

The default name for the bom file is `bom.xml` and it is assumed to be located in the current working directory (just as the `package.json`). An alternative name/path can be provided with the option `-b, --bom`. Likewise it is possible to specify an alternative path to the `package.json` using the option `--pj, --package-json`.

If the `package.json` was not found, the name and the version of the project can be given using the options `--pn, project-name` and `--pv, --project-version`.

Use the option `-p, --project-id` to specify the UUID the project directly.

**Upload Examples**

```bash
# using default options and settings provided in .npmrc
$ dtrack-upload upload-bom

# with alternative path to bom and package.json
$ dtrack-upload upload-bom --bom sub/dir/foo.xml --package-json sub/dir/package.json

# giving the UUID
$ dtrack-upload upload-bom -p 1aec8e9d-3024-42fd-ad28-2a35bcb8d282
```
