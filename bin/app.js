#!/usr/local/bin/node

var fs = require('fs');
var fileparser = require('../src/fileparser');
var docgen = require('../src/docgen');
var objectifyTree = require('../src/objectifyTree');
var articlesGenerator = require('../src/articlesgen');
var utils = require('util');
var path = require('path');
var _ = require('underscore');

// Slice and get only the arguments passed to jsar
var args = process.argv.slice(2);

// If no args are passed show the usage signature and quit
if(!args.length) {
    console.log('Usage: razordoc <config-file.json>');
    process.exit(-1);
}

if(!fs.existsSync(args[0])) {
    console.log('Config file not found!');
    process.exit(-1);
}

var config = JSON.parse(fs.readFileSync(args[0], 'utf-8'));
var configDir = path.dirname(fs.realpathSync(args[0]));
var filenames = config.sources;
var templateDir = config.templates;
var articlesDir = config.articles;
var outputDir = config.outputDir;
var outputExt = config.outputFileExt;

var files = [];

for(var i=0; i<filenames.length; i++) {
    var filename = filenames[i];

    var file = path.basename(filename);

    // Check for a wildcard
    if(file.match(/\*/g)) {
        var fileRegex = new RegExp(file.replace('*', '[a-zA-Z\\-]*').replace('.', '\\.'));

        var dir = path.resolve(configDir, path.dirname(filename));

        var filesInDir = fs.readdirSync(dir);

        for(var j=0; j<filesInDir.length; j++) {
            var f = filesInDir[j];

            if(fileRegex.test(f)) {
                files.push(dir + '/' + f);
            }
        }
        // console.log(files);
    } else {
        files.push(filename)
    }
}

var templateDir = path.resolve(configDir, config.templates);
var outputDir = path.resolve(configDir, config.outputDir);
var articlesDir = path.resolve(configDir, config.articles);
var examplesDir = path.resolve(configDir, config.examples);
var examplesExt = config.examplesExt;
var articlesOutput = path.resolve(configDir, config.articlesOutput);
var apiOutput = path.resolve(configDir, config.apiOutput);

var tree = {classes:[]};

for(var i=0; i<files.length; i++) {
    var file = files[i];

    if(!fs.existsSync(file)) {
        console.log(file + ' file not found!');
        process.exit(-1);
    }

    var fileContents = fs.readFileSync(file, 'utf-8');

    fileparser.parse(fileContents, tree);
}

if(config.onlyJSON) {
    fs.writeFileSync(outputDir + '/' + 'intermediate.json', JSON.stringify(tree, null, 4));    
} else {
    tree = objectifyTree(tree);

    // console.log(tree.classes[0].methods);

    // console.log(_.flatten(tree));

    docgen.generate(tree, templateDir, apiOutput, outputExt);    
}

var articlesFolder = fs.readdirSync(articlesDir);
var articlesPartialsDir = articlesDir + '/_partials';
var articlesPartials = [];
articlesFolder = _.without(articlesFolder, '_partials');

if(fs.existsSync(articlesPartialsDir)) {
    articlesPartials = fs.readdirSync(articlesPartialsDir);
}

var articles = _.flatten(folderWalker(articlesFolder, articlesDir));

function folderWalker(dirArray, dirPath) {
    var dirList = [];
    for(var i=0; i<dirArray.length; i++) {
        var item = dirArray[i];
        var itemPath = dirPath + '/' + item;
        var stats = fs.statSync(itemPath);
        if(stats.isDirectory()) {
            // dirList.push({
            //     'name': item,
            //     'path': itemPath.replace(articlesDir, '').replace(/\/*/, ''),
            //     'type': 'directory',
            //     'content': folderWalker(fs.readdirSync(itemPath), itemPath)
            // });
            
            dirList.push(folderWalker(fs.readdirSync(itemPath), itemPath));
        } else if(stats.isFile()) {
            dirList.push({
                'name': item,
                'path': itemPath.replace(articlesDir, '').replace(/\/*/, '')
                // 'type': 'file',
            });
        }
    }

    return dirList;
}

var articleTree = {
    articles: articles,
    partials: articlesPartials
};

var examples = _.map(fs.readdirSync(examplesDir), function(item) {
    return item.replace('.' + examplesExt, '');
});


if(config.onlyJSON) {
    fs.writeFileSync(outputDir + '/articleTree.json' ,JSON.stringify(articleTree, null, 4), 'utf-8');    
} else {
    articlesGenerator.generate({
        articleTree: articleTree, 
        apiTree: tree, 
        exampleTree: examples,
        articlesDir: articlesDir,
        examplesDir: examplesDir,
        outputDir: outputDir,
        articlesOutput: articlesOutput, 
        apiOutput: apiOutput,
        examplesExt: examplesExt,
        outputFileExt: outputExt
    });
}




    





