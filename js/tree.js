

treeJSON = d3.json("js/demo.json", function(error, treeData) {
    // 计算总共的节点，最大标签的长度
    var totalNodes = 0;
    var maxLabelLength = 0;

    // 其他变量
    var i = 0;
    var duration = 600; //控制过渡动画时间
    var root;

    // 图表的宽高
    var viewerWidth = $('#tree-container').width();
    var viewerHeight = $('#tree-container').height();

    //初始化数图，设置宽高
    var tree = d3.layout.tree()
        .size([viewerHeight, viewerWidth]);

    var diagonal = d3.svg.diagonal()
        .projection(function(d) {
            return [d.y, d.x];
        });

    // 递归遍历json数据
    function visit(parent, visitFn, childrenFn) {
        if (!parent) return;

        visitFn(parent);
       
        var children = childrenFn(parent);
        if (children) {
            var count = children.length; //子节点的个数
            for (var i = 0; i < count; i++) { // 遍历子节点
                visit(children[i], visitFn, childrenFn);
            }
        }
    }

    // Call visit function to establish maxLabelLength
    visit(treeData, function(d) {
        // console.log(d);
        totalNodes++; //遍历一个总节点+1
        maxLabelLength = Math.max(d.name.length, maxLabelLength);
       
    }, function(d) {
        return d.children && d.children.length > 0 ? d.children : null;
    });

    // 定义同级节点上下排列顺序这是按照英文顺序排列的
    function sortTree() {
        tree.sort(function(a, b) {
            return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1;
        });
    }

    //sortTree();

    //定义用户是否可以缩放节点图
    function zoom() {
        svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }

    var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

    var baseSvg = d3.select("#tree-container").append("svg")
        .attr("width", viewerWidth)
        .attr("height", viewerHeight)
        .attr("class", "overlay")
        .call(zoomListener);

    // Helper functions for collapsing and expanding nodes.

    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    }

    function expand(d) {
        if (d._children) {
            d.children = d._children;
            d.children.forEach(expand);
            d._children = null;
        }
    }
    // Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children.

    function centerNode(source) {
        scale = zoomListener.scale();
        x = -source.y0;
        y = -source.x0;
        //控制根节点的位置
        x = x * scale + viewerWidth / 2;
        y = /* y * scale + viewerHeight / 2 */0;
        d3.select('g').transition()
            .duration(duration)
            .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
        zoomListener.scale(scale);
        zoomListener.translate([x, y]);
    }

    function getNode(uid){       //自定义的一个新的以同步方式从后台取数据的ajax函数
        var mynodes = null;
        $.ajax({
            url : "users_graph.php?act=single_users_graph",
            async : false, // 注意此处需要同步
            type : "POST",
            data :{"uid":uid},
            dataType : "json",
            success : function(data) {
                mynodes = data;
                
                //nodes = JSON.parse(nodes);
            }
        });
        return mynodes;
    }
    // Toggle children function
    //查看一下当前点是否有子元素
    function toggleChildren(d,uid) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else if (d._children) {
            d.children = d._children;
            d._children = null;
        }else{
            var mnodes = getNode(uid);
            
           d.children = mnodes;
        }
        return d;
    }

    // Toggle children on click. 单击事件

    function click(d) {
        
        if (d3.event.defaultPrevented) return; // click suppressed
        d = toggleChildren(d,d.uid);
        update(d);
        centerNode(d);
    }

    function update(source) {
        var levelWidth = [1];
        var childCount = function(level, n) {
            if (n.children && n.children.length > 0) {
                if (levelWidth.length <= level + 1) levelWidth.push(0);
                levelWidth[level + 1] += n.children.length;
                n.children.forEach(function(d) {
                    childCount(level + 1, d);
                });
            }
        };
        childCount(0, root);
        var newHeight = d3.max(levelWidth) * 200; // 25 pixels per line 每个节点竖直方向之间的距离
        tree = tree.size([newHeight, viewerWidth]);

        var nodes = tree.nodes(root).reverse(),
            links = tree.links(nodes);

        // Set widths between levels based on maxLabelLength.
        nodes.forEach(function(d) {
            d.y = (d.depth * (maxLabelLength * 30)); //maxLabelLength * 10px 每层节点之间的横向宽度
        });

        // 返回节点 id
        node = svgGroup.selectAll("g.node")
            .data(nodes, function(d) {
                return d.id || (d.id = ++i);
            });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
           // .call(dragListener)
            .attr("class", "node")
            .attr("transform", function(d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .on('click', click);

        nodeEnter.append("circle") //用户头像显示外框圆
            .attr("r",30)
            .attr("class","radiusImage")
            .attr("fill",function(d){
                return "url(#"+d.id+")";
            });
        nodeEnter.append("pattern") //填充图片
                .attr("patternUnits","userSpaceOnUse")
                .attr("id",function(d){
                    return d.id
                })
                .attr("x",function(d) {
                    return d.children || d._children ? -40 : -30;
                })
                .attr("y",function(d) {
                    return d.children || d._children ? -30 : -30;
                })
                .attr("width","100%")
                .attr("height","100%")
                .append("image")
                .attr("width",100)
                .attr("height",100)
                .attr("x",function(d) {
                    return d.children || d._children ? -8 : -20;
                })
                .attr("y",'-1.35em')
                .attr("xlink:href",function(d){

                   /*  if(d.img){ */
                        return './../images/demo.png';
                    /* }else{
                        return "../../"+d.img;
                     } */
                });
        nodeEnter.append("text")
            .attr("x", function(d) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("dy", ".1em")
            .attr('class', 'nodeText')
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(function(d) {
                return d.name;
            })
            .style("fill-opacity", 0);
        nodeEnter.append("text")  // 页面显示等级
            .attr("x", function(d) {
                return d.children || d._children ? -150 : 40;
            })
            .attr("dy",'1.8em')
            .attr("class","level")
        node.select('.level')
            .attr("class",function(d){
                if(d.level == "微客"){
                   return 'vk'
                }
                if(d.level == "创客"){
                    return 'ck'
                }
                if(d.level == "普通会员"){
                    return 'pt'
                }
                if(d.level == "合伙人"){
                    return 'hhr'
                }
                if(d.level == "金牌合伙人"){
                    return 'jphhr'
                }
                if(d.level == "钻石合伙人"){
                    return 'zshhr'
                }
                if(d.level == "公司股东"){
                    return 'gsgd'
                }
                if(d.level == "公司"){
                    return 'gs'
                }
            })
            .text(function(d) {
                if(d.level){
                    return "等级 -- "+d.level;
                }// 页面节点显示的会员等级

            });
            nodeEnter.append("text")  // 页面显示直属下级个数
            .attr("x", function(d) {
                return d.children || d._children ? -150 : 40;
            })
            .attr("dy",function(d){
                return d.level === '公司' ? "4.5em" : "3.8em"
            })
            .attr("class","childText")
            .text(function(d){
                if(d.childLength){
                    return "直属下级："+ d.childLength + "个";
                }
            });
            /* nodeEnter.append("text")  // 页面显示手机号
            .attr("x", function(d) {
                return d.children || d._children ? -120 : 40;
            })
            .attr("dy",'4.8em')
            .attr("class","phoneText")
            .text(function(d){
                if(d.mobile_phone){
                    return "手机号："+ d.mobile_phone;
                }
            }); */
        // Update the text to reflect whether node has children or not.
        node.select('text')
            .attr("x", function(d) {
                return d.children || d._children ? -40 : 40;
            })
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(function(d) {
                return d.name; // 页面节点显示的名称
            });
        // Change the circle fill depending on whether it has children and is collapsed
        node.select("circle.nodeCircle")
            .attr("r", 4.5)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        // Fade the text in
        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + source.y + "," + source.x + ")";
            })
            .remove();

        nodeExit.select("circle")
            .attr("r", 0);

        nodeExit.select("text")
            .style("fill-opacity", 0);

        // Update the links…
        var link = svgGroup.selectAll("path.link")
            .data(links, function(d) {
                return d.target.id;
            });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = {
                    x: source.x0,
                    y: source.y0
                };
                return diagonal({
                    source: o,
                    target: o
                });
            });

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function(d) {
                var o = {
                    x: source.x,
                    y: source.y
                };
                return diagonal({
                    source: o,
                    target: o
                });
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    // Append a group which holds all nodes and which the zoom Listener can act upon.
    var svgGroup = baseSvg.append("g");

    // Define the root
    root = treeData;
    root.x0 = viewerHeight / 2;
    root.y0 = 0;

    // Layout the tree initially and center on the root node.
    update(root);
    centerNode(root);
});