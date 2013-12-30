var fs = require('fs');
var _ = require('underscore');
var utils = require('./utils');

/**
 * Parses the contents of the file
 * @param  {[type]} str [description]
 * @return {[type]}     [description]
 */
exports.parse = function (str, tree) {
    var docTags = str.match(/\/\*\*[\s\S]*?\*\//g);

    var doc = [];

    for(var i = 0; i<docTags.length; i++) {
        doc.push(tagBreaker(sanitizeDocTag(docTags[i])));
        // console.log(tagBreaker(sanitizeDocTag(docTags[i])));    
    }

    // console.log('----------------------------');
    // console.log(docTags);
    // console.log('----------------------------');

    var classes = findNodesWhere(doc, {type: 'class'});
    var methods = findNodesWhere(doc, {type: 'method'});

    for(var i=0; i<classes.length; i++) {
        var classObj = {};
        wrappify(classes[i], classObj);

        addExtraParams(classObj);

        if(classObj.access && classObj.access.name === 'private') continue;

        tree.classes.push(classObj);
    }

    for(var i=0; i<methods.length; i++) {
        var methodObj = {};

        wrappify(methods[i], methodObj);
        
        addExtraParams(methodObj);

        if(!methodObj.memberOf) continue;


        var classNode = utils.findNodeByClassName(tree, methodObj.memberOf.name);

        if(!classNode) continue;


        if(typeof classNode.methods === 'undefined') {
            classNode.methods = [];
        }

        classNode.methods.push(methodObj);
    }

    return doc;
}
 
function wrappify (list, obj) {
    for(var i=0; i<list.length; i++) {
        if(obj[list[i].type]) {
            if(!_.isArray(obj[list[i].type])) {
                var temp = obj[list[i].type];
                obj[list[i].type] = [];    
                obj[list[i].type].push(temp);
            }
            
            obj[list[i].type].push(_.omit(list[i], 'type'));
        } else {
            obj[list[i].type] = _.omit(list[i], 'type');    
        }
    }
}

function paramList(param) {
    var str;
    if(param) {
        if(_.isArray(param)) {
            str = param[0].name;
            for(var i=1; i<param.length; i++) {
                str += (', ' + param[i].name);
            }
        } else {
            str = param.name;
        }
        return str;
    }
        
    return '';
}

function addExtraParams (node) {
    
    if(node.class) {
        node.signature = 'new ' + node.class.name + '(' + paramList(node.param) + ')';
    } else if(node.method) {
        node.signature = node.method.name + '(' + paramList(node.param) + ')';
    }
}

function findNodesWhere(tree, obj) {
    var items = [];
    for(var i=0; i<tree.length; i++) {
        var item = tree[i];
        var tag = _.where(item, obj);

        if(tag.length) {
            items.push(item);    
        }
    }
    return items;
}

/**
 * Sanitizes a doc tag by removing the comment symbols and unwanted whitespaces
 * @param  {[type]} str [description]
 * @return {[type]}     [description]
 */
function sanitizeDocTag (str) {
    return str.replace('/**', '').replace('*/','').replace(/\s*\*\s/g, '\n');
}

/**
 * Breaks each doc tag into different params
 * @param  {[type]} str [description]
 * @return {[type]}     [description]
 */
function tagBreaker (str) {
    var obj = {};
    var tags = [];
    var tree = [];
    var desc = str.substr(0, str.indexOf('@')).trim();
    var prevIndex = str.indexOf('@');
        str = str.substr(str.indexOf('@') + 1, str.length);
    
    if(desc) {
        tree.push({
            type: 'desc',
            content: desc
        });
    }

    while(str.indexOf('@') >= 0) {
        var index = str.indexOf('@');
        tags.push('@' + str.substr(0, index));
        str = str.substr(index + 1, str.length);
    }

    tags.push('@' + str);
    
    for(var i=0; i<tags.length; i++) {
        tagProcessor(tree, tags[i]);
    }

    // console.log(str.indexOf('@'));
    // var matches = str.match(/\s*\*\s*@([a-zA-Z0-9_$]*)([\s\w\W\n]*)(?:@)/g);

    // console.log(matches);
    
    return tree;
}

var tagGrammer = {
    '@class\\s*([a-zA-Z0-9_$]*)': function(tree, matchedString, savedArray) {
        // console.log(matchedString, savedArray);
        tree.push({
            type: 'class',
            name: savedArray[0]
        });
    },

    '@augments\\s*\\{*([a-zA-Z0-9_$]*)\\}*': function(tree, matchedString, savedArray) {
        // console.log(matchedString, savedArray);
        tree.push({
            type: 'augments',
            name: savedArray[0]
        });
    },
    '@param\\s*\\{([a-zA-Z0-9_$|]*)\\}\\s+(\\[*[a-zA-Z0-9_$]*\\]*)([\\s\\S]*)': function(tree, matchedString, savedArray) {
        // console.log(matchedString, savedArray);
        var optional = savedArray[1].match(/\[[a-zA-Z0-9_$]*\]/) !== null;
        if(optional) savedArray[1] = savedArray[1].replace(/\[/g, '').replace(/\]/g, '');
        tree.push({
            type: 'param',
            paramType: savedArray[0],
            name: savedArray[1],
            desc: savedArray[2].trim(),
            optional: optional
        });
    },
    '@example\\s*([\\s\\S]*)': function(tree, matchedString, savedArray) {
        // console.log(matchedString, savedArray);   
        tree.push({
            type: 'example',
            code: savedArray[0].trim(),
        });
    },
    '@method\\s*([a-zA-Z0-9_$]*)': function(tree, matchedString, savedArray) {
        // console.log(matchedString, savedArray);   
        tree.push({
            type: 'method',
            name: savedArray[0].trim(),
        });  
    },
    '@access\\s*(private|public|protected)': function(tree, matchedString, savedArray) {
        // console.log(matchedString, savedArray);
        tree.push({
            type: 'access',
            name: savedArray[0],
        });  
    },
    '@memberOf\\s*([a-zA-Z0-9_$]*)': function(tree, matchedString, savedArray) {
        // console.log(matchedString, savedArray);
        tree.push({
            type: 'memberOf',
            name: savedArray[0],
        });  
    },
    '@returns\\s*\\{([a-zA-Z0-9_$|]*)\\}\\s+([\\s\\S]*)': function(tree, matchedString, savedArray) {
        // console.log(matchedString, savedArray);
        tree.push({
            type: 'returns',
            returnType: savedArray[0],
            desc: savedArray[1].trim(),
        });  
    }
}

function tagProcessor (tree, tag) {
    for(var grammer in tagGrammer) {
        var regex = new RegExp(grammer);

        match = regex.exec(tag);
        // console.log(tag);
        if(match) {
            var func = tagGrammer[grammer];

            func(tree, match[0], match.slice(1, match.length));

            // console.log(tree);
        }
            
    }
}


