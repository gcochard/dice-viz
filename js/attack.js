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


function vizAttackData() {
    var boxWH = 75,
        margins = {top: 80, left: 100, right: 30, bottom: 10};

    var game_id = d3.select("#game").property("value");
    var type = d3.select('input[name="atype"]:checked').property("value");
    var gData = [];
    if(game_id == 'All') {
        gameIds.forEach(function (g) { gData = gData.concat(allGameData[g]); });
        u_nodes = d3.entries(users);
    } else {
        gData = allGameData[game_id];
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

    var edgeHash = {};
    gData.forEach(function (e) {
        var id = e.player + "-" + e.dplayer;
        if (edgeHash[id]) {
            edgeHash[id].weight += (type == 'attacked' ? 1 : (type == 'killed' ? e.killed : e.lost))
        } else {
            edgeHash[id] = {
                source: e.player,
                target: e.dplayer,
                weight: (type == 'attacked' ? 1 : (type == 'killed' ? e.killed : e.lost))
            };
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
            colors.length - 1,
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
        vizAttackData();
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
        .on('change', vizAttackData)
        .attr('disabled', '');

    // Get the list of gameIds we found to process all the files
    gameIds = d3.selectAll('#game option').data().filter(function (d) { return d != 'All'; });

    allGameData = gameIds.reduce(function (o, g, i) { o[g] = null; return o; }, {});
    gameIds.forEach(function (g) { d3.json('data/'+g+'.json', function (error, data) { collectData(error, data, g); }) });
}

d3.json('https://hubot-gregcochard.rhcloud.com/hubot/dice', getAllGameData);
