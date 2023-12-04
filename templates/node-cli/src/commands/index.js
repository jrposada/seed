import { program } from 'commander';
import run from './run.js';

program
    .command(run.name, { isDefault: true })
    .description(run.description)
    .action(run.action);

program.parse();
