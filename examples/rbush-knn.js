'use strict';

// REVIEW ME: THIS  CAN BE SERIOUS PERFORMANCE ISSUE!
function tryPeek(queue) {
    var p = queue.peek();

    return p && p._knnItem;
}

function knn(tree, queryPoint, n) {
    var node = tree.data,
        result = [],
        toBBox = tree.toBBox,
        child;

    var queue = new Queue(null, function (a, b) {
        return boxDist(queryPoint, a.bbox) - boxDist(queryPoint, b.bbox);
    });

    while (node) {
        for (var i = 0; i < node.children.length; i++) {
            child = node.children[i];
            queue.push(node.leaf ? {item: child, bbox: toBBox(child), _knnItem: true} : child);
        }

        while (tryPeek(queue) && result.length < n) {
            result.push(queue.pop().item);
        }

        if (result.length === n) break;

        node = queue.pop();
    }

    return result;
}

function boxDist(p, box) {
    var dx = axisDist(p[0], box[0], box[2]),
        dy = axisDist(p[1], box[1], box[3]);
    return dx * dx + dy * dy;
}

function axisDist(k, min, max) {
    return k < min ? min - k :
           k <= max ? 0 :
           k - max;
}
