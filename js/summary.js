var headers = {
    'ntroops' : 'Number of Troops (round end)',
    'nterritories' : 'Number of Territories (round start)',
    'tdelta' : 'Territory Delta',
    'bonus' : 'Total Troop Bonus (round start)',
    'cbonus' : 'Card Bonuses',
    'areas' : 'Number of Areas (round start)'
};

function getTeamColor(name) {
    if(name in users) {
        return users[name];
    } else {
        return '#959595';
    }
}

function drawLineCharts(gdata) {
    var margin = {top: 20, right: 5, bottom: 30, left: 25},
        width = (window.innerWidth*0.25) - margin.left - margin.right,
        height = (width*0.7) - margin.top - margin.bottom,
        attrGraphW = ((width+margin.left+margin.right)*2);
    var x = d3.scale.linear().range([0, width]);
    var y = d3.scale.linear().range([height, 0]);
    var xAxis = d3.svg.axis().scale(x).orient("bottom");
    var yAxis = d3.svg.axis().scale(y).orient("left").outerTickSize(0);
    var line = d3.svg.line()
        .interpolate("linear")
        .x(function(d) { return x(d.x); })
        .y(function(d) { return y(d.y); });

    d3.selectAll('#attrGraph svg').remove();

    d3.select('#attrGraph')
        .style('width', attrGraphW+'px');
    d3.select('#focusBar')
        .style('width', (window.innerWidth - attrGraphW)+'px')

    for(var k in gdata) {
    // k = 'ntroops';
        x.domain([0, d3.max(gdata[k], function(d) { return d.values.length; })]);
        xAxis.ticks(x.domain()[1]);
        y.domain([
            d3.min(gdata[k], function(p) { return d3.min(p.values, function(s) { return s.y; }); }),
            d3.max(gdata[k], function(p) { return d3.max(p.values, function(s) { return s.y; }); }),
        ]);
        var svg = d3.select("#attrGraph")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr('id', k)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        svg.append("text")
            .attr("x", (width / 2))
            .attr("y", 0 - (margin.top / 2))
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("text-decoration", "underline")
            .text(headers[k]);

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end");
            // .text("Temperature (ºF)");

        var lines = svg.selectAll(".line-"+k)
            .data(gdata[k])
            .enter()
            .append("g")
            .attr("class", 'line-'+k);

        lines.append("path")
            .attr("class", "line")
            .attr("d", function(d) { return line(d.values); })
            .style("stroke", function(d) { return getTeamColor(d.key); });
    }
}

function getPlayerIdx(p, vals) {
    for(var i = 0; i < vals.length; i++)
        if(vals[i].key == p)
            return i;
}

function calcTroops(d, gd) {
    d.forEach(function (d) {
        var vals = gd[d.round-1].values,
            e = vals[getPlayerIdx(d.player, vals)];
        if(e.key != d.player) {
            console.log("ERROR -",d.type,"player mismatch",e, d);
        }
        switch(d.type) {
            case 'territory':
                // Initialize the number of troops for the first round
                if(d.round == 1) {
                    e.values.ntroops = (3 * d.nterritories) + d.ntroops;
                } else {
                    pvals = gd[d.round-2].values,
                    pe = pvals[getPlayerIdx(d.player, pvals)];
                    e.values.ntroops += (pe.values.ntroops + d.ntroops);
                }
                break;
            case 'holding':
            case 'cardsT':
            case 'cardsP':
                e.values.ntroops += d.ntroops;
                break;
            case 'attack':
                e.values.ntroops -= d.lost;
                if(d.conquer) {
                    // e.values.tdelta += 1;
                }
                var eD = vals[getPlayerIdx(d.dplayer, vals)];
                if(eD != undefined) {
                    if(eD.key != d.dplayer) {
                        console.log("ERROR -",d.type,"dplayer mismatch",eD, d);
                    }
                    eD.values.ntroops -= d.killed;
                    if(d.conquer) {
                        // eD.values.tdelta -= 1;
                    }
                }
                break;
        }
    });
}

function drawSummaryGraphs(gameId, gdata) {
    turnOrder = calcTurnOrder(gdata);
    var nplayers = turnOrder.length;

    gdata = gdata.filter(function (d) {
        if(d.player == "unknown") {
            return false;
        }

        if(roundPattern.test(d.message) ||
           joinPattern.test(d.message) ||
           turnStartPattern.test(d.message) ||
           turnEndPattern.test(d.message) ||
           tokenRatingPattern.test(d.message) ||
           winnerPattern.test(d.message) ||
           gameStartPattern.test(d.message)) {
            return false;
        }

        return true;
    });

    gdata.forEach(function (d) {
        d.otime = d.timestamp;
        d.timestamp = new Date(d.timestamp);
        matchD12(d);
    });

    gdata.sort(function (a, b) { return a.timestamp - b.timestamp; })

    g_gdata = d3.nest()
        .key(function (d) { return d.round; })
        .key(function (d) { return d.player; }).sortKeys(function (a, b) { return turnOrder.indexOf(a) - turnOrder.indexOf(b); })
        .rollup(function (l) {
            return {
                // Number of troops at end of round
                'ntroops' : 0,
                // Number of territories at beginning of round
                'nterritories' : d3.sum(l.filter(function(d) { return d.type == 'territory'; }), function (d) { return d.nterritories; }),
                // Number of territories won/lost in round
                // 'tdelta' : 0,
                // Total Troop Bonus at beginning of round
                'bonus' : d3.sum(l.filter(function(d) { return d.type == 'territory' || d.type == 'holding'; }), function (d) { return d.ntroops; }),
                // All Card Bonuses in the round
                // 'cbonus' : d3.sum(l.filter(function(d) { return d.type == 'cardsT' || d.type == 'cardsP'; }), function (d) { return d.ntroops; }),
                // Number of areas held at the beginning of a round
                'areas' : l.filter(function (d) { return d.type == 'holding'; }).length
            };
        })
        .entries(gdata);

    calcTroops(gdata, g_gdata);

    // Pivot the data to organize by stat type
    var gstats = {};
    for(var s in g_gdata[0].values[0].values) {
        gstats[s] = []
        for(var p = 0; p < g_gdata[0].values.length; p++) {
            gstats[s].push({
                key : g_gdata[0].values[p].key,
                values : []
            });
        }
    }

    // Stat_Type -> { player: <name>, values: [<by round>]}
    for(var r = 0; r < g_gdata.length; r++) {
        var rvals = g_gdata[r].values;
        for(var p = 0; p < rvals.length; p++) {
            var pdata = rvals[p];
            for(s in gstats) {
                gstats[s][getPlayerIdx(pdata.key, gstats[s])].values.push({
                    x:r,
                    y:pdata.values[s]
                });
            }
        }
    }
    console.log(gstats);
    drawLineCharts(gstats);
}

getGD = true;
d3.json('https://hubot-gregcochard.rhcloud.com/hubot/dice', function (d) {
    setGameIds(d, 'Select Game', drawSummaryGraphs);
    getGameData(drawSummaryGraphs);
});
