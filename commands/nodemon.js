'use strict'

/**
 * Dependencies
 */

const fs = require('fs');
const path = require('path');
const meow = require('meow');
const chalk = require('chalk');
const fse = require('fs-extra');
const chokidar = require('chokidar');
const child_process = require('child_process');
const showHelp = require('../helpers/showHelp');
const pkill = require('../helpers/pkill');
const ps = require('../helpers/ps');
const mkdir = require('../helpers/mkdir');
const symlink = require('../helpers/symlink');

/**
 * Constants
 */

const CONFIG_DIR = path.join(process.env.HOME, '.nodemon');

/**
 * Define helpers
 */

async function bootstrapNodemon() {
  const p = child_process.spawn('cast', ['nodemon', '--start'], {
    detached: true,
    stdio: 'ignore'
  });

  p.unref();
}

function startNodemon() {
  const pid_file = path.join(CONFIG_DIR, '.pid');

  if (fs.existsSync(pid_file)) {
    const pid = fs.readFileSync(pid_file);

    if (ps(pid) !== 0) {
      fs.writeFileSync(pid_file, process.pid);
    } else {
      return;
    }
  } else {
    fs.writeFileSync(pid_file, process.pid);
  }

  chokidar
    .watch(`${CONFIG_DIR}/*.js`)
    .on('add', file => startProcess(file))
    .on('unlink', file => stopProcess(file))
    .on('change', file => restartProcess(file));
}

function startProcess(file) {
  const basename = path.basename(file, path.extname(file));
  child_process.fork(file, { execArgv: [`--title=nodemon--${basename}`] });
}

function stopProcess(file) {
  const basename = path.basename(file, path.extname(file));
  pkill(['--exact', `nodemon--${basename}`]);
}

function restartProcess(file) {
  stopProcess(file);
  startProcess(file);
}

function requireFile(file) {
  if (!fse.pathExistsSync(file)) throw new Error(`Missing file ${file}`);
}

function requireExtname(file, ext) {
  if (path.extname(file) !== ext)
    throw new Error('Invalid file missing .js extension.');
}

function requireFileFormat(file) {
  requireFile(file);
  requireExtname(file, '.js');
}

function buildScriptList() {
  return fs
    .readdirSync(CONFIG_DIR, { withFileTypes: true })
    .filter(f => f.isSymbolicLink())
    .map(f => [
      f.name,
      path.resolve(CONFIG_DIR, fs.readlinkSync(path.join(CONFIG_DIR, f.name)))
    ]);
}

function printScripts(files) {
  console.log('\n  Listing active nodemon scripts...\n');
  for (let i = 0; i < files.length; i++) {
    console.log(`    ${chalk.bold.green(files[i][0])}`);
    console.log(`    ${files[i][1]}`);
    console.log('');
  }
}

const printNoScriptsFound = () =>
  console.log('\n  No monitoring scripts found. Add your first one.');

const printUsageRef = () =>
  console.log('\n  To see usage run "cast nodemon -h"\n');

function runListCommand() {
  const files = buildScriptList();
  files.length > 0 ? printScripts(files) : printNoScriptsFound();
  printUsageRef();
}

function runAddCommand() {
  const file = cli.flags.add;
  const dst = path.join(CONFIG_DIR, path.basename(file));
  requireFileFormat(file);

  console.log(chalk.white.bold(`\n  Adding script: ${dst}\n`));

  // Create a symlink from the target monitoring script
  // to the centralized nodemon directory at ~/.nodemon
  symlink(file, dst);
}

function runRemoveCommand() {
  const file = cli.flags.remove;
  // const dst = path.join(CONFIG_DIR, file);
  // requireFileFormat(dst);

  // console.log(chalk.white.bold(`\n  Removing script: ${dst}\n`));
  // fs.unlinkSync(dst);

  const basename = path.basename(file, path.extname(file));
  const status = pkill(['--exact', `nodemon--${basename}`]);
}

/**
 * Parse args
 */

const cli = meow(`
  Usage
    $ cast nodemon
  
  Options:
    -l, --list       Print all active scripts (Default).
    -a, --add FILE   Add a new monitoring script.
    --remove FILE    Remove a monitoring script.
    --start          Start the nodemon daemon.
`, {
  description: 'Filesystem monitoring scripts.',
  flags: {
    add: { type: 'string', alias: 'a' },
    remove: { type: 'string' },
  }
});

/**
 * Define script
 */

function nodemon(command = null) {
  showHelp(cli);

  process.title = 'nodemon';

  const flags = Object.keys(cli.flags);
  const cmd = command || flags.pop() || 'list';

  mkdir(CONFIG_DIR);

  switch(cmd) {
    case 'list':
    case 'l':
      runListCommand();
      break;
    case 'add':
    case 'a':
      runAddCommand();
      break;
    case 'remove':
      runRemoveCommand();
      break;
    case 'start':
      startNodemon();
      break;
  }

  // bootstrapNodemon();
}

/**
 * Export script
 */

module.exports = nodemon;
