var headers = {
    'ntroops' : 'Number of Troops (round end)',
    'nterritories' : 'Number of Territories (turn start)',
    'tdelta' : 'Territory Delta',
    'bonus' : 'Total Troop Bonus (turn start)',
    'cbonus' : 'Card Bonuses',
    'areas' : 'Number of Areas (turn start)'
};

var gstats, nTurn;

// Bar Chart variables
var bmargin = {top: 20, right: 5, bottom: 30, left: 25},
    bwidth = (window.innerWidth*0.46) - bmargin.left - bmargin.right,
    bheight = (bwidth*0.75) - bmargin.top - bmargin.bottom;
var by = d3.scale.linear().range([bheight, 0]);
var bx = d3.scale.ordinal().rangeRoundBands([0, bwidth], .2);

// Line Chart variables
var lmargin = {top: 20, right: 5, bottom: 30, left: 25},
    lwidth = ((window.innerWidth*0.46)*0.5) - lmargin.left - lmargin.right,
    lheight = (lwidth*0.72) - lmargin.top - lmargin.bottom;
var lx = d3.scale.linear().range([0, lwidth]);
var ly = d3.scale.linear().range([lheight, 0]);
var xAxis = d3.svg.axis().orient("bottom").outerTickSize(0);
var yAxis = d3.svg.axis().orient("left").outerTickSize(0);

function getTeamColor(name) {
    if(name in users) {
        return users[name];
    } else {
        return '#959595';
    }
}

function pivotType(sdata) {
    var bdata = []
    for(var t = 0; t < nTurn; t++) {
        bdata.push([]);
        for(var p = 0; p < sdata.length; p++) {
            if(sdata[p].values.length > t) {
                bdata[t].push({
                    key : sdata[p].key,
                    y : sdata[p].values[t].y
                });
            }
        }
    }
    return bdata;
}

function updateBarChart(dtype, round) {
    round -= 1; // Rounds are 0 indexed, but passed as 1 based
    var svg = d3.select('#focusBar svg g');

    var bdata = pivotType(gstats[dtype]);

    by.domain([0, Math.max(1, d3.max(bdata[round], function (d) { return d.y; }))])
    bx.domain(bdata[round].map(function (d) { return d.key; }));
    xAxis.scale(bx);
    xAxis.tickValues(null);
    yAxis.scale(by);

    svg.select('.y.axis')
        .transition()
        .duration(500)
        .call(yAxis)

    svg.select('.x.axis')
        .transition()
        .duration(500)
        .call(xAxis)

    svg.select("text.title")
        .data([dtype])
        .text(headers[dtype]);

    var bars = svg.selectAll('.bars')
        .data(bdata[round], function(d, i) {
            return d.key+'|'+d.y;
        });

    bars.exit().remove();

    bars.transition()
        .duration(500)
        .attr("transform", function(d) {
            return "translate(" + bx(d.key) + ",0)";
        })
    bars.selectAll('rect')
        .attr('width', bx.rangeBand())
        .transition()
        .duration(500)
        .attr('y', function(d) {
            return by(d.y)-1;
        })
        .attr('height', function(d) {
            return bheight - by(d.y);
        })

    bars.enter()
        .append("g")
        .attr("class", "bars")
        .attr("transform", function(d) {
            return "translate(" + bx(d.key) + ",0)";
        })
        .append('rect')
        .attr('width', bx.rangeBand())
        .style('fill', function(d) {
            return getTeamColor(d.key);
        })
        .attr('y', by(0))
        .attr('height', bheight - by(0))
        .transition()
        .duration(500)
        .attr('y', function(d) {
            return by(d.y)-1;
        })
        .attr('height', function(d) {
            return bheight - by(d.y);
        })
    $("#slider").slider('value', round);

    for(var k in gstats) {
        lx.domain([0, d3.max(gstats[k], function(d) { return d.values.length; })]);
        ly.domain([
            d3.min(gstats[k], function(p) { return d3.min(p.values, function(s) { return s.y; }); }),
            d3.max(gstats[k], function(p) { return d3.max(p.values, function(s) { return s.y; }); }),
        ]);
        d3.select('#rl-'+k)
            .attr("y1", ly(ly.domain()[0]))
            .attr("y2", ly(ly.domain()[1]))
            .attr("x1", lx(round))
            .attr("x2", lx(round))
    }
}

function drawBarChart(sdata, dtype) {
    nTurn = d3.max(sdata, function (d) {  return d.values.length; });
    bdata = pivotType(sdata);

    by.domain([
        Math.min(0, d3.min(bdata[0], function (d) { return d.y; })),
        Math.max(1, d3.max(bdata[0], function (d) { return d.y; }))
    ]);
    bx.domain(bdata[0].map(function (d) { return d.key; }));
    xAxis.scale(bx);
    xAxis.tickValues(null);
    yAxis.scale(by);

    d3.selectAll('#focusBar svg').remove();
    d3.selectAll('#slider').remove();

    var svg = d3.select("#focusBar")
        .append("svg")
        .attr("width", bwidth + bmargin.left + bmargin.right)
        .attr("height", bheight + bmargin.top + bmargin.bottom)
        .append("g")
        .attr("transform", "translate(" + bmargin.left + "," + bmargin.top + ")");

    svg.append("text")
        .data([dtype])
        .attr('class', 'title')
        .attr("x", (bwidth / 2))
        .attr("y", 0 - (bmargin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text(headers[dtype]);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + bheight + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    svg.selectAll('.bars')
        .data(bdata[0])
        .enter()
        .append("g")
        .attr("class", "bars")
        .attr("transform", function(d) {
            return "translate(" + bx(d.key) + ",0)";
        })
        .append('rect')
        .attr('width', bx.rangeBand())
        .attr('y', function(d) {
            return by(d.y)-1;
        })
        .attr('height', function(d) {
            return bheight - by(d.y);
        })
        .style('fill', function(d) {
            return getTeamColor(d.key);
        })

    var slider = d3.select("#focusBar").append('div').attr('id', 'slider');
    var sval = slider.append('span').attr('id', 'sval');
    $('#slider').slider( {
        min: 1,
        max: nTurn,
        value: 0,
        orientation: "horizontal",
        create: function() {
            $('#sval').appendTo($('#slider a').get(0));
        },
        slide : function (event, ui) {
            $(ui.handle).find('span').html(ui.value);
            updateBarChart(d3.select('text.title').data()[0], ui.value);
        },
        change : function (event, ui) {
            $(ui.handle).find('span').html(ui.value);
        }
    });
    $("#sval").html($("#slider").slider('value')).position({
        my: 'center top',
        at: 'center bottom',
        of: $('#slider a:eq(0)'),
        offset: "0, 10"
    });
}

function drawLineCharts() {
    xAxis.scale(lx);
    yAxis.scale(ly);
    var line = d3.svg.line()
        .interpolate("linear")
        .x(function(d) { return lx(d.x); })
        .y(function(d) { return ly(d.y); });

    d3.selectAll('#attrGraph svg').remove();

    for(var k in gstats) {
        lx.domain([1, d3.max(gstats[k], function(d) { return d.values.length+1; })]);
        ly.domain([
            d3.min(gstats[k], function(p) { return d3.min(p.values, function(s) { return s.y; }); }),
            d3.max(gstats[k], function(p) { return d3.max(p.values, function(s) { return s.y; }); }),
        ]);
        var svg = d3.select("#attrGraph")
            .append("svg")
            .attr("width", lwidth + lmargin.left + lmargin.right)
            .attr("height", lheight + lmargin.top + lmargin.bottom)
            .attr('id', k)
            .append("g")
            .attr("transform", "translate(" + lmargin.left + "," + lmargin.top + ")");

        svg.append("text")
            .data([k])
            .attr("x", (lwidth / 2))
            .attr("y", 0 - (lmargin.top / 2))
            .attr("text-anchor", "middle")
            .attr('class', 'ltitle')
            .style("font-size", "14px")
            .style("text-decoration", "underline")
            .text(headers[k])
            .on('click', function (d) {
                updateBarChart(d, 1);
            });

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + lheight + ")")
            .call(xAxis);

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end");

        svg.append("line")
            .attr('class', 'r-line')
            .attr('id', 'rl-'+k)
            .attr("y1", ly(ly.domain()[0]))
            .attr("y2", ly(ly.domain()[1]))
            .attr("x1", lx(1))
            .attr("x2", lx(1))

        var lines = svg.selectAll(".line-"+k)
            .data(gstats[k])
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
    gstats = {};
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
                    x:r+1,
                    y:pdata.values[s]
                });
            }
        }
    }
    drawLineCharts();
    drawBarChart(gstats['ntroops'], 'ntroops');
}

getGD = true;
d3.json('https://hubot-gregcochard.rhcloud.com/hubot/dice', function (d) {
    setGameIds(d, 'Select Game', drawSummaryGraphs);
    getGameData(drawSummaryGraphs);
});


/* TODO:
    - Vertical bar on line graphs to match Slider
*/
