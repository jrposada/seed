#! /usr/bin/env node

import inquirer from 'inquirer';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const nameRegex = /^(?!-)(?!.*-$)[a-zA-Z-]+$/;
const versionRegex =
    /^[<>]?(?:(\^|~)?(0|[1-9]\d*)(\.(0|[1-9]\d*))?(\.(0|[1-9]\d*))?(-(0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(\.(0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(\+[0-9a-zA-Z-]+(\.[0-9a-zA-Z-]+)*)?)$/;

const templates = {
    'node-cli': 'node-cli',
};

async function run() {
    const {
        authorEmail,
        authorName,
        nodeVersion,
        npmVersion,
        projectName,
        scopeName,
        templateName,
        useHusky,
    } = await promptConfig();

    if (!templateName) {
        console.error(`Template "${templateName}" not found.`);
        process.exit(1);
    }

    const projectDirectory = path.join(process.cwd(), projectName);

    if (fs.existsSync(projectDirectory)) {
        console.error(`Folder "${projectName}" already exists.`);
        process.exit(1);
    }

    console.log(`Scaffolding project "${templateName}"...`);
    scaffoldTemplate({
        authorEmail,
        authorName,
        nodeVersion,
        npmVersion,
        projectDirectory,
        projectName,
        scopeName,
        templateName,
        useHusky,
    });
}

async function promptConfig() {
    return inquirer.prompt([
        {
            type: 'input',
            name: 'projectName',
            message: 'Enter the project name:',
            validate: (input) =>
                !input
                    ? 'Project name is required'
                    : !nameRegex.test(input)
                      ? 'Invalid project name'
                      : true,
        },
        {
            type: 'input',
            name: 'scopeName',
            message: '(Optional) Enter the project scope name:',
            validate: (input) =>
                input && !nameRegex.test(input) ? 'Invalid scope name' : true,
        },
        {
            type: 'input',
            name: 'authorEmail',
            message: '(Optional) Enter the author email:',
        },
        {
            type: 'input',
            name: 'authorName',
            message: '(Optional) Enter the author name:',
        },
        {
            type: 'input',
            name: 'nodeVersion',
            message: '(Optional) Node version:',
            validate: (input) =>
                input && !versionRegex.test(input) ? 'Invalid version' : true,
        },
        {
            type: 'input',
            name: 'npmVersion',
            message: '(Optional) NPM version:',
            validate: (input) =>
                input && !versionRegex.test(input) ? 'Invalid version' : true,
        },
        {
            type: 'confirm',
            name: 'useHusky',
            message: 'Setup Husky?',
            default: true,
        },
        {
            type: 'list',
            name: 'templateName',
            message: 'Choose a project template:',
            choices: Object.keys(templates),
        },
    ]);
}

function scaffoldTemplate({
    authorEmail,
    authorName,
    nodeVersion,
    npmVersion,
    projectDirectory,
    projectName,
    scopeName,
    templateName,
    useHusky,
}) {
    // Copy main template
    const templateDirectory = path.resolve(
        url.fileURLToPath(import.meta.url),
        `../templates/${templateName}`,
    );
    copyDirectory({
        destinationDirectory: projectDirectory,
        sourceDirectory: templateDirectory,
    });

    if (useHusky) {
        const huskyTemplateDirectory = path.resolve(
            url.fileURLToPath(import.meta.url),
            `../templates/husky`,
        );
        const huskyDestinationDirectory = path.resolve(
            projectDirectory,
            `.husky`,
        );
        copyDirectory({
            destinationDirectory: huskyDestinationDirectory,
            sourceDirectory: huskyTemplateDirectory,
        });

        generatePreCommit({ nodeVersion, npmVersion, projectDirectory });
    }

    generatePackageJson({
        authorEmail,
        authorName,
        nodeVersion,
        npmVersion,
        projectDirectory,
        projectName,
        scopeName,
        templateDirectory,
        useHusky,
    });
}

function copyDirectory({ destinationDirectory, sourceDirectory }) {
    if (!fs.existsSync(destinationDirectory)) {
        fs.mkdirSync(destinationDirectory);
    }

    fs.readdirSync(sourceDirectory, { withFileTypes: true }).forEach((item) => {
        const itemSourcePath = path.join(sourceDirectory, item.name);
        const itemDestinationPath = path.join(
            destinationDirectory,
            /.\.hidden$/.test(item.name)
                ? `.${item.name.slice(0, item.name.length - 7)}`
                : item.name,
        );

        if (item.isDirectory()) {
            copyDirectory({
                destinationDirectory: itemDestinationPath,
                sourceDirectory: itemSourcePath,
            });
        } else {
            fs.copyFileSync(itemSourcePath, itemDestinationPath);
        }
    });
}

function generatePackageJson({
    authorEmail,
    authorName,
    nodeVersion,
    npmVersion,
    projectDirectory,
    projectName,
    scopeName,
    templateDirectory,
    useHusky,
}) {
    const pkg = JSON.parse(
        fs.readFileSync(path.join(templateDirectory, `package.json`), 'utf-8'),
    );

    pkg.name = scopeName ? `@${scopeName}/${projectName}` : projectName;

    if (pkg.bin) {
        pkg.bin[projectName] = 'index.js';
    }

    if (authorEmail || authorName) {
        pkg.repository = {};

        if (authorEmail) {
            pkg.repository.email = authorEmail;
        }

        if (authorName) {
            pkg.repository.name = authorName;
        }
    }

    if (nodeVersion || npmVersion) {
        pkg.engines = {};

        if (nodeVersion) {
            pkg.engines.node = nodeVersion;
        }

        if (npmVersion) {
            pkg.engines.npm = npmVersion;
        }
    }

    if (useHusky) {
        pkg.devDependencies.husky = '^8.0.3';
        pkg.scripts.postinstall = 'husky install';
    }

    fs.writeFileSync(
        path.join(projectDirectory, `package.json`),
        JSON.stringify(pkg, null, 2) + '\n',
    );
}

function generatePreCommit({ nodeVersion, npmVersion, projectDirectory }) {
    const preCommitPath = path.resolve(
        url.fileURLToPath(import.meta.url),
        `../templates/husky/pre-commit`,
    );
    let preCommit = fs.readFileSync(preCommitPath).toString();

    if (!(nodeVersion || npmVersion)) {
        preCommit = preCommit.replace('\n<node-checks>\n', '\n');
    } else {
        preCommit = preCommit.replace(
            '\n<node-checks>\n',
            '\n. "$(dirname "$0")/node-checks.sh"\n',
        );
    }

    fs.writeFileSync(
        path.join(projectDirectory, `.husky/pre-commit`),
        preCommit,
    );
}

run();
