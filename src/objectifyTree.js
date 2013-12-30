var _ = require('underscore');

var treeObject = {
    findAllClassNames: function() {
        var nodes = [];
        for(var i=0; i<this.classes.length; i++) {
            var cls = this.classes[i];    
            nodes.push(cls.class.name);
        }

        return nodes;
    },
    findNodeByClassName: function(name) {

        for(var i=0; i<this.classes.length; i++) {
            var cls = this.classes[i];
            
            if(name === cls.class.name) {
                return cls;
            }
        }
        return null;
    },
    hasClass: function(classname) {
        var classes = this.findAllClassNames();

        return _.indexOf(classes, classname) !== -1;
    }
};
module.exports = function objectifyTree(tree) {
    var tree = _.extend(tree, treeObject);

    postProcess(tree);

    return tree;
}

function postProcess (tree) {
    var classes = tree.classes;

    for(var i=0; i<classes.length; i++) {
        var classNode = classes[i];

        if(!_.isArray(classNode.param)) {
            classNode.params = [classNode.param];
            delete classNode.param;
        } else {
            classNode.params = classNode.param;
            delete classNode.param;
        }

        var methods = classNode.methods;

        for(var j=0; j<methods.length; j++) {
            var methodNode = methods[j];

            if(!_.isArray(methodNode.param)) {
                methodNode.params = [methodNode.param];
                delete methodNode.param;
            } else {
                methodNode.params = methodNode.param;
                delete methodNode.param;
            }

        }
    }
}