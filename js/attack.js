var allGameData,
    gameIds;

var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-5, 100])
    .html(function(d, i) {
        var A = d.id.split('-')[0];
        var B = d.id.split('-')[1];
        var type = d3.select('input[name="atype"]:checked').property("value");
        if(type == 'attacked')
            return '<span class="label">'+A+'</span> has '+type+' <span class="label">'+B+'</span> '+d.weight+' times';
        else if(type == 'lost')
            return '<span class="label">'+A+'</span> has '+type+' '+d.weight+' troops to <span class="label">'+B+'</span>';
        else
            return '<span class="label">'+A+'</span> has '+type+' '+d.weight+' of <span class="label">'+B+'</span> troops';

    });

function gridOver(d,i) {
    d3.selectAll("rect").style("stroke-width", function (p) {return p.x == d.x && p.y == d.y ? "3px" : "1px"});
    tip.show(d, i);
}

function gridOut(d,i) {
    d3.selectAll("rect").style("stroke-width", "1px");
    tip.hide();
}

function vizAttackData(redrawSlider) {
    var boxWH = 75,
        margins = {top: 80, left: 100, right: 30, bottom: 10};

    var game_id = d3.select("#game").property("value");
    var type = d3.select('input[name="atype"]:checked').property("value");
    var gData = [], nTurn;
    if(game_id == 'All') {
        gameIds.forEach(function (g) { gData = gData.concat(allGameData[g]); });
        u_nodes = d3.entries(users);
        nTurn = 0;
    } else {
        gData = allGameData[game_id];
        nTurn = d3.max(gData, function (d) { return d.round; });
        // This is some really kludgy code to create a dictionary similar to the
        // users dictionary based on the specific players in the game.
        u_nodes = d3.set(gData.map(function (d) {
                return d.player
            })).values().reduce(function(o, v, i) {
                o[v] = true;
                return o;
            }, {});
        u_nodes = d3.entries(u_nodes);
    }
    u_nodes.sort(function (a, b) { return a.key.localeCompare(b.key); });

    if(!redrawSlider) {
        if($('#rslider a').length) {
            $('#sval1').html('').appendTo('#rselect');
            $('#sval2').html('').appendTo('#rselect');
            $('#rslider').slider("destroy");
            $('#slabel').hide();
        }

        if(game_id != 'All') {
            $('#rslider').slider( {
                range: true,
                min: 1,
                max: nTurn,
                values: [0, nTurn],
                orientation:"vertical",
                create: function() {
                    $('#sval1').appendTo($('#rslider a').get(0));
                    $('#sval2').appendTo($('#rslider a').get(1));
                },
                slide : function (event, ui) {
                    $(ui.handle).find('#sval1').html(ui.values[0]);
                    $(ui.handle).find('#sval2').html(ui.values[1]);
                    vizAttackData(true);
                },
                change : function (event, ui) {
                    $(ui.handle).find('#sval1').html(ui.values[0]);
                    $(ui.handle).find('#sval2').html(ui.values[1]);
                }
            });
            d3.select('#rslider').style('height', boxWH*(u_nodes.length-1)+'px');
            $("#sval1").html($("#rslider").slider('values')[0]).position({
                my: 'left center',
                at: 'right center',
                of: $('#rslider a:eq(0)'),
                collision: 'none none'
            });
            $("#sval2").html($("#rslider").slider('values')[1]).position({
                my: 'left center',
                at: 'right center',
                of: $('#rslider a:eq(1)'),
                collision: 'none none'
            });
            $('#slabel').show().position({
                my: 'left center',
                at: 'right center',
                of: $('#rslider'),
                collision: 'none none'
            })
        }
    }

    var edgeHash = {},
         // Have to use the sval as the slider has not finished update
        min_r = Number($('#sval1').html()),
        max_r = Number($('#sval2').html());
    gData.forEach(function (e) {
        var id = e.player + "-" + e.dplayer;
        if(game_id == 'All' || (min_r <= e.round && e.round <= max_r)) {
            if (edgeHash[id]) {
                edgeHash[id].weight += (type == 'attacked' ? 1 : (type == 'killed' ? e.killed : e.lost))
            } else {
                edgeHash[id] = {
                    source: e.player,
                    target: e.dplayer,
                    weight: (type == 'attacked' ? 1 : (type == 'killed' ? e.killed : e.lost))
                };
            }
        }
    });
    matrix = [];

    //create all possible edges
    for (a in u_nodes)
    {
        for (b in u_nodes)
        {
            var grid = {id: u_nodes[a].key + "-" + u_nodes[b].key, x: b, y: a, weight: 0};
            if (edgeHash[grid.id])
            {
                grid.weight = +edgeHash[grid.id].weight;
            }
            matrix.push(grid);
        }
    }

    var colors = ['#a50026','#d73027','#f46d43','#fdae61','#fee08b','#ffffbf','#d9ef8b','#a6d96a','#66bd63','#1a9850','#006837'].reverse()
    var colorScale = d3.scale.quantile()
        .domain([d3.min(matrix, function (d) { return d.weight; }),
                 d3.max(matrix, function (d) { return d.weight; })])
        .range(colors);
    var svg = d3.select("svg");
    svg.call(tip);
    svg.select('#adjacencyG').remove(); // Clear out any existing adjacenty matrix
    svg.attr('width', boxWH*u_nodes.length+margins.left+margins.right)
       .attr('height', boxWH*u_nodes.length+margins.top+margins.bottom)

    svg.append("g")
        .attr("transform", "translate("+margins.left+","+margins.top+")")
        .attr("id", "adjacencyG")
        .selectAll("rect")
        .data(matrix)
        .enter()
        .append("rect")
        .attr('id', function(d) { return d.id })
        .attr("width", boxWH)
        .attr("height", boxWH)
        .attr("x", function(d) {return d.x * boxWH})
        .attr("y", function(d) {return d.y * boxWH})
        .style("stroke", "black")
        .style("stroke-width", "1px")
        .style("fill", function(d) { return d.weight == 0 ? "white" : colorScale(d.weight); })
        .on("mouseover", gridOver)
        .on('mouseout', gridOut)

    var scaleSize = u_nodes.length * boxWH;
    var nameScale = d3.scale.ordinal()
        .domain(u_nodes.map(function (el) {return el.key}))
        .rangePoints([0,scaleSize],1);

    xAxis = d3.svg.axis().scale(nameScale).orient("top").tickSize(4);
    yAxis = d3.svg.axis().scale(nameScale).orient("left").tickSize(4);
    d3.select("#adjacencyG")
        .append("g")
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "start")
        .style("font-size", "80%")
        .attr("transform", "translate(0,-5) rotate(-45)");
    d3.select("#adjacencyG")
        .append("g")
        .call(yAxis)
        .selectAll("text")
        .style("font-size", "80%");
}

function collectData(error, data, gid) {
    if(error) {
        if(allGameData[gid] == 1) {
            delete allGameData[gid];
            gameIds.splice(gameIds.indexOf(gid), 1);
            $('#game option[value="'+gid+'"]').remove();
        } else {
            d3.json('https://hubot-gregcochard.rhcloud.com/hubot/d12log/'+gid, function (error, data) { collectData(error, data, gid); });
            allGameData[gid] = 1;
        }
    } else {
        allGameData[gid] = data.filter(function (e) {
            if(fightPattern.test(e.message)) {
                e.otime = e.timestamp;
                e.timestamp = new Date(e.timestamp);
                matchD12(e);
                return true;
            }
            return false;
        });
    }
    var done = true;
    gameIds.forEach(function (d) { done = done && (allGameData[d] !== null && allGameData[d] != 1); });
    if(done) {
        vizAttackData(false);
        // The initial display has been loaded, go ahead and allow user to change it
        d3.select('#game').attr('disabled', null);
    }
}

function getAllGameData(error, data) {
    setGameIds(data, 'All');
    if (window.location.search) {
        var parts = window.location.search.split('=');
        if (parts.length == 2) {
            // handle the form ?game=234234
            $('#game').val(parts[1]);
        } else {
            // handle the form ?234324
            $('#game').val(parts.join().split('?')[1]);
        }
    }
    // Modify the on change action, also disable changing until all data has been loaded
    d3.select('#game')
        .on('change', function () { vizAttackData(false); })
        .attr('disabled', '');

    // Get the list of gameIds we found to process all the files
    gameIds = d3.selectAll('#game option').data().filter(function (d) { return d != 'All'; });

    allGameData = gameIds.reduce(function (o, g, i) { o[g] = null; return o; }, {});
    gameIds.forEach(function (g) { d3.json('data/'+g+'.json', function (error, data) { collectData(error, data, g); }) });
}

d3.json('https://hubot-gregcochard.rhcloud.com/hubot/dice', getAllGameData);
