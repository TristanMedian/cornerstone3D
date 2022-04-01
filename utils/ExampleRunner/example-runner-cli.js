#! /usr/bin/env node

/* eslint-disable */
var { program } = require('commander');
var path = require('path');
var shell = require('shelljs');
var fs = require('fs');
var examples = {};
var basePath = path.resolve('./Documentation');
var webpackConfigPath = path.join(
  __dirname,
  './webpack-AUTOGENERATED.config.js'
);
var distDir = path.join(__dirname, 'dist');
var buildConfig = require('./template-config.js');
const rootPath = path.resolve(path.join(__dirname, '../..'));

program
  .option('-c, --config [file.js]', 'Configuration file')
  .option('--no-browser', 'Do not open the browser')
  .parse(process.argv);

const options = program.opts();
//var configFilePath = path.join(process.cwd(), options.config.replace(/\//g, path.sep));
//var configuration = require(configFilePath);

function getSplitedPath(filePath) {
  var a = filePath.split('/');
  var b = filePath.split('\\');
  return a.length > b.length ? a : b;
}

function validPath(str) {
  return str.replaceAll("\\", "/");
}

// ----------------------------------------------------------------------------
// Find examples
// ----------------------------------------------------------------------------

const configuration = {
  examples: [{ path: '../examples', regexp: 'index.ts' }],
};

if (configuration.examples) {
  var filterExamples = [].concat(program.args).filter((i) => !!i);
  var buildExample = filterExamples.length === 1;
  var exampleCount = 0;

  console.log('\n=> Extract examples\n');
  configuration.examples.forEach(function (entry) {
    const regexp = entry.regexp
      ? new RegExp(entry.regexp)
      : /example\/index.ts$/;
    let fullPath = path.join(basePath, entry.path ? entry.path : entry);

    console.warn(fullPath);

    // Single example use case
    examples[fullPath] = {};
    var currentExamples = examples[fullPath];
    shell.cd(fullPath);
    shell
      .find('.')
      .filter(function (file) {
        console.warn(file);
        return file.match(regexp);
      })
      .forEach(function (file) {
        var fullPath = getSplitedPath(file);
        var exampleName = fullPath.pop();

        console.warn(exampleName);
        while (['index.ts', 'example'].indexOf(exampleName) !== -1) {
          exampleName = fullPath.pop();
        }

        if (!buildExample || filterExamples.indexOf(exampleName) !== -1) {
          currentExamples[exampleName] = './' + file;
          console.log(' -', exampleName, ':', file);
          exampleCount++;
        } else {
          console.log(' -', exampleName, ': SKIPPED');
        }
      });
  });

  if (exampleCount === 0) {
    examples = null;
    if (buildExample) {
      console.error(
        `=> Error: Did not find any examples matching ${filterExamples[0]}`
      );
      process.exit(1);
    }
  }

  if (buildExample) {
    var exBasePath = null;
    const exampleName = filterExamples[0];
    Object.keys(examples).forEach((exampleBasePath) => {
      if (examples[exampleBasePath][exampleName]) {
        exBasePath = exampleBasePath;
      }
    });

    const conf = buildConfig(
      exampleName,
      validPath(examples[exBasePath][exampleName]),
      distDir,
      validPath(rootPath),
      validPath(exBasePath)
    );
    // console.log('buildConfig result', conf);
    shell.ShellString(conf).to(webpackConfigPath);
    shell.cd(exBasePath);
    shell.exec(`webpack serve --progress --config ${webpackConfigPath}`);
  } else {
    console.log('=> To run an example:');
    console.log('  $ npm run example -- PUT_YOUR_EXAMPLE_NAME_HERE\n');
  }
}
