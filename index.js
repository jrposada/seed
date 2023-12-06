#! /usr/bin/env node

import inquirer from 'inquirer';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const regex = /^(?!-)(?!.*-$)[a-zA-Z-]+$/;

const templates = {
    'node-cli': 'node-cli',
};

async function run() {
    const { projectName, scopeName, templateName, authorEmail, authorName } =
        await promptConfig();

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
        projectDirectory,
        projectName,
        scopeName,
        templateName,
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
                    : !regex.test(input)
                    ? 'Invalid project name'
                    : true,
        },
        {
            type: 'input',
            name: 'scopeName',
            message: '(Optional) Enter the project scope name:',
            validate: (input) =>
                input && !regex.test(input) ? 'Invalid scope name' : true,
        },
        {
            type: 'list',
            name: 'templateName',
            message: 'Choose a project template:',
            choices: Object.keys(templates),
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
    ]);
}

function scaffoldTemplate({
    authorEmail,
    authorName,
    projectDirectory,
    projectName,
    scopeName,
    templateName,
}) {
    const templateDirectory = path.resolve(
        url.fileURLToPath(import.meta.url),
        `../templates/${templateName}`
    );

    copyDirectory({
        destinationDirectory: projectDirectory,
        sourceDirectory: templateDirectory,
    });

    generatePackageJson({
        authorEmail,
        authorName,
        projectDirectory,
        projectName,
        scopeName,
        templateDirectory,
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
                : item.name
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
    projectDirectory,
    projectName,
    scopeName,
    templateDirectory,
}) {
    const pkg = JSON.parse(
        fs.readFileSync(path.join(templateDirectory, `package.json`), 'utf-8')
    );

    pkg.name = scopeName ? `@${scopeName}/${projectName}` : projectName;

    if (pkg.bin) {
        pkg.bin[projectName] = 'index.js';
    }

    if (authorName || authorEmail) {
        pkg.repository = {
            email: authorEmail,
            name: authorName,
        };
    }

    fs.writeFileSync(
        path.join(projectDirectory, `package.json`),
        JSON.stringify(pkg, null, 2) + '\n'
    );
}

run();
