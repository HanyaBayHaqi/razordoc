var ejs = require('ejs');
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var _ = require('underscore');
var marked = require('marked');
var util = require('util');

var articleTree,
    apiTree,
    exampleTree,
    articlesDir,
    examplesDir,
    outputDir,
    tempDir,
    examplesExt,
    outputFileExt,
    articlesOutput,
    apiOutput,
    articleTemplatesDir;

var helperFunctions = ['partial', 'embedExample', 'linkApi', 'linkArticle', 'ref', 'anchor'];

var preProcessHelpers = {
    anchor: function(id, title) {
        this.anchors.push({
            id: id,
            title: title
        });
    },
    anchors: []
};

var markdownHelpers = {
    partial: function(filename, obj) {
        if(_.indexOf(articleTree.partials, filename + '.md') >= 0) {
            var partialPath = path.resolve(articlesDir + '/_partials/' + filename + '.md');
            var content = fs.readFileSync(partialPath, 'utf-8');

            return ejs.render(content, obj);
        } else {
            throw "Partial [" + filename + "] not found!";
            return '';
        }
    },
    embedExample: function(filename) {
        if(_.indexOf(exampleTree, filename) >= 0) {
            var examplePath = path.resolve(examplesDir + '/' + filename + '.' + examplesExt);
            var content = fs.readFileSync(examplePath, 'utf-8');
            return '<pre><code>' + content + '</code></pre>';
        } else {
            throw "Example [" + filename + "] not found!";
            return '';   
        }
    },
    linkApi: function(classname, methodname) {
        var filename = classname + '.' + outputFileExt + '#' + methodname;
        var apiRoot = '/' + path.basename(outputDir) + '/' + apiOutput.replace(outputDir, '') + '/' + filename;

        return '<a href="' + apiRoot + '">' + methodname + '</a>';
    },
    linkArticle: function(filename) {
        var articleNode = _.where(articleTree.articles, {path: filename + '.md'});
        articleNode = (!articleNode.length) ? _.where(articleTree.articles, {id: filename}) : articleNode;

        var articleRoot = '/' + path.basename(articlesOutput) + '/' +  articleNode[0].path.replace('.md', '') + '.' + outputFileExt;
        // var articleRoot = articlesOutput.replace(outputDir, '') + '/' + filename + '.' + outputFileExt;
        if(!articleNode.length) {
            throw "Article " + filename + " not found!";
        } else {
            return '<a href="' + articleRoot + '">' + articleNode[0].title + '</a>';
        }
        
    },
    ref: function(anchor) {
        var anchorNode = _.where(anchors, {id: anchor});
        var path = anchorNode[0].path.replace('.md', '.' + outputFileExt);
        var articleRoot = articlesOutput.replace(outputDir, '') + '/' + path;
        if(anchorNode.length == 0) {
            throw 'No anchors with the id [' + anchor + ']';
        } else if(anchorNode.length > 1) {
            throw 'Multiple anchors with the id [' + anchor + ']';
        } else {
            
            return '<a href="' + articleRoot + '">' + anchorNode[0].title + '</a>';
        }
    },
    anchor: function(id, title) {
        return '<div id="'+id+'"></div>';
    }
};

var anchors = [];

exports.generate = function(options) {
    articleTree = options.articleTree;
    apiTree = options.apiTree;
    exampleTree = options.exampleTree;
    articlesDir = options.articlesDir;
    examplesDir = options.examplesDir;
    outputDir = options.outputDir;
    tempDir = outputDir + '/_temp';
    examplesExt = options.examplesExt;
    outputFileExt = options.outputFileExt;
    articlesOutput = options.articlesOutput;
    apiOutput = options.apiOutput;
    articleTemplatesDir = options.articleTemplatesDir;


    if(!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);    
    }
    

    preprocessMD(articleTree, articlesDir, outputDir, tempDir);

    processMD(articleTree, tempDir);

    renderMD(articleTree, tempDir, articleTemplatesDir);

    rmdir(tempDir);
    // console.log(articleTree);
};

var rmdir = function(dir) {
    var list = fs.readdirSync(dir);
    for(var i = 0; i < list.length; i++) {
        var filename = path.join(dir, list[i]);
        var stat = fs.statSync(filename);
        
        if(filename == "." || filename == "..") {
            // pass these files
        } else if(stat.isDirectory()) {
            // rmdir recursively
            rmdir(filename);
        } else {
            // rm fiilename
            fs.unlinkSync(filename);
        }
    }
    fs.rmdirSync(dir);
};


function getArticleTitle(path) {
    return _.where(articleTree.articles, {path: path})[0].title;
}

function linkify(title, _path) {
    _path = _path.replace('.md', '.' + outputFileExt);
    var articleRoot = '/' + path.basename(articlesOutput) + '/' +  _path;
    // console.log(articleRoot);
    return '<a href="'+articleRoot+'">'+title+'</a>';
}

function walkTree(tree, makeUL, makeLI) {
    var str = '';

    for(var i=0; i<tree.length; i++) {
        var item = tree[i];


        if(item.type === 'file' && !(path.basename(item.path, '.md') === 'index')) {
            str += makeLI(linkify(getArticleTitle(item.path), item.path));
        } else if(item.type === 'directory') {
            str += walkTree(item.content, makeUL, makeLI);
        }
    }
    var index = _.where(tree, {name: 'index.md'})[0];
    return makeLI(linkify(getArticleTitle(index.path), index.path) + makeUL(str));
}
function makeLI (str) {
        return '<li>' + str + '</li>';
    }

    function makeUL (str) {
        return '<ul>' + str + '</ul>';
    }

function articleTreeGen() {
    var tree = articleTree.articleStruct;
    
    return walkTree(tree, makeUL, makeLI);
}

function articleBreadcrumbGen(fpath) {
    var components = fpath.split('/');
    var breadcrumb = '';
    var minus = 1;
    if(path.basename(fpath, '.md') === 'index') minus = 2;

    for(var i=0; i<components.length - minus; i++) {
        var c = components[i];
        var p = components.slice(0, i + 1).join('/');
        
        if(c.match('.md')) {
            if(path.basename(c, '.md') !== 'index') {
                breadcrumb += makeLI(linkify(getArticleTitle(p), p));    
            }
        } else {
            // console.log(p + '/index.md');
            breadcrumb +=  makeLI(linkify(getArticleTitle(p+'/index.md'), p+'/index.md'));
        }
    }
    if(components.length > 1) {
        breadcrumb += makeLI(getArticleTitle(components.join('/')));
        return makeLI(linkify(getArticleTitle('index.md'), 'index.md')) + breadcrumb;
    } else {
        return makeLI(getArticleTitle('index.md')) + breadcrumb;    
    }
    
}

function renderMD (articleTree, tempDir) {
    var articles = articleTree.articles;
    var layout = fs.readFileSync(articleTemplatesDir + '/layout.ejs', 'utf-8');
    // console.log(articleTemplatesDir);
    for(var i=0; i<articles.length; i++) {
        var article = articles[i];
        var filePath = path.resolve(tempDir + '/' + article.path);
        var newPath = path.resolve(articlesOutput + '/' + article.path.replace('.md', '.' + outputFileExt));
        var str = fs.readFileSync(filePath, 'utf-8');

        var processed = marked(str, markdownHelpers);

        if(!fs.existsSync(path.dirname(newPath))) {
            mkdirp.sync(path.dirname(newPath));
        }
        
        var breadcrumb = articleBreadcrumbGen(article.path);

        // console.log(breadcrumb);

        var articleNav = articleTreeGen();

        var file = ejs.render(layout, {articleNav: articleNav, content: processed, breadcrumb: breadcrumb, title: article.title});
        // console.log(articleTreeGen());
        // 
        
        fs.writeFileSync(newPath, file, 'utf-8');
    }
}

function processMD (articleTree, tempDir) {
    var articles = articleTree.articles;

    for(var i=0; i<articles.length; i++) {
        var article = articles[i];
        var filePath = path.resolve(tempDir + '/' + articles[i].path);
        var str = fs.readFileSync(filePath, 'utf-8');
        var processed = ejs.render(str, markdownHelpers);
        
        fs.writeFileSync(filePath, processed, 'utf-8');
    }
}


function preprocessMD (articleTree, articlesDir, outputDir, tempDir) {
    var articles = articleTree.articles;

    

    for(var i=0; i<articles.length; i++) {
        var article = articles[i],
            str = fs.readFileSync(articlesDir + '/' + article.path, 'utf-8'),
            meta = readMetaTag(str, article),
            _anchors = processAnchor(meta),
            preProcessed = meta,
            dirname = path.dirname(article.path),
            crdr = tempDir + '/' + dirname,
            crPath = path.resolve(tempDir + '/' + article.path);

        if(_anchors.anchors.length) {
            for(var j=0; j<_anchors.anchors.length; j++) {
                anchors.push({
                    id: _anchors.anchors[j].id,
                    title: _anchors.anchors[j].title,
                    path: article.path + '#' + _anchors.anchors[j].id
                });
            }
        }

        if(!fs.existsSync(crdr)) {
            mkdirp.sync(crdr);
        }

        fs.writeFileSync(crPath, preProcessed, 'utf-8');
    }
}

function readMetaTag(str, node) {
    var matched = str.match(/<meta>([\s\S]*)<\/meta>/),
        json = matched ? matched[1] : '{}';
        obj = JSON.parse(json);

    for(var key in obj) {
        node[key] = obj[key];
    }

    return str.replace(/<meta>([\s\S]*)<\/meta>/, '');
}

function helperGen(hf) {
    var obj = {};

    for(var i=0; i<helperFunctions.length; i++) {
        obj[helperFunctions[i]] = new Function();
    }

    return _.extend(obj, hf);
}

function processAnchor(str) {
    var helpers = helperGen(preProcessHelpers);

    helpers.anchors = [];
    str = ejs.render(str, helpers);

    return {
        str: str,
        anchors: helpers.anchors
    };
}