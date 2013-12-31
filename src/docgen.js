var fs = require('fs');
var ejs = require('ejs');
var _ = require('underscore');
var utils = require('./utils');
var path = require('path');
var mkdirp = require('mkdirp');

var templateDir = '';

var viewObjectHelpers = {
    render: function (templateFile, obj) {
        var templateFilePath = path.resolve(templateDir, templateFile);

        var template = fs.readFileSync(templateFilePath, 'utf-8');
        _.extend(obj, viewObjectHelpers);
        // console.log(obj);
        return ejs.render(template, obj);
    },
    linkify: function(options) {
        return '<a href=' + (options.href || '#') + '>' + options.text + '</a>';
    }
}

exports.generate = function(tree, _templateDir, _outputDir, outputExt) {
    var layoutTemplate = '',
        layoutTemplatePath = _templateDir + '/' + 'layout.ejs';

    templateDir = _templateDir; 

    var viewOptions = _.extend({
        tree: tree
    }, viewObjectHelpers);

    if(!fs.existsSync(layoutTemplatePath)) {
        fatalError('Layout template missing!');
    }

    layoutTemplate = fs.readFileSync(layoutTemplatePath, 'utf-8');

    var renderList = tree.findAllClassNames();

    renderList = ['index'].concat(renderList);

    for(var _i=0; _i<renderList.length; _i++) {
        viewOptions.currentClass = renderList[_i];

        var layoutHTML = ejs.render(layoutTemplate, viewOptions);
        var outputPath = _outputDir + '/' + renderList[_i] + '.' + outputExt;
        if(!fs.existsSync(path.dirname(outputPath))) {
            mkdirp.sync(path.dirname(outputPath));
        }

        fs.writeFileSync(outputPath, layoutHTML, 'utf-8');
    }

    

    // console.log(renderList);
    // console.log(tree.classes[0].methods);
};


function fatalError(msg) {
    console.error(msg);
    process.exit(0);
}