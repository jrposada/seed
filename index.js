#! /usr/bin/env node

import inquirer from 'inquirer';
import {
    copyFileSync,
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

    const projectPath = join(process.cwd(), projectName);

    if (existsSync(projectPath)) {
        console.error(`Folder "${projectName}" already exists.`);
        process.exit(1);
    }

    console.log(`Scaffolding project "${templateName}"...`);
    scaffoldTemplate({
        authorEmail,
        authorName,
        projectName,
        projectPath,
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
    projectName,
    projectPath,
    scopeName,
    templateName,
}) {
    mkdirSync(projectPath, { recursive: true });

    const templateDir = resolve(
        fileURLToPath(import.meta.url),
        `../templates/${templateName}`
    );

    const write = (file, content) => {
        const targetPath = join(projectPath, file);
        if (content) {
            writeFileSync(targetPath, content);
        } else {
            copy(join(templateDir, file), targetPath);
        }
    };

    const files = readdirSync(templateDir);
    for (const file of files.filter((f) => f !== 'package.json')) {
        write(file);
    }

    const pkg = JSON.parse(
        readFileSync(join(templateDir, `package.json`), 'utf-8')
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

    write('package.json', JSON.stringify(pkg, null, 2) + '\n');
}

function copy(src, dest) {
    const stat = statSync(src);
    if (stat.isDirectory()) {
        copyDir(src, dest);
    } else {
        copyFileSync(src, dest);
    }
}

function copyDir(srcDir, destDir) {
    mkdirSync(destDir, { recursive: true });
    for (const file of readdirSync(srcDir)) {
        const srcFile = resolve(srcDir, file);
        const destFile = resolve(destDir, file);
        copy(srcFile, destFile);
    }
}

run();
