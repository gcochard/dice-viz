var users = {
    gcochard: '#00A708',
    kwren: '#FF6CF2',
    ryanbmilbourne: '#E9F109',
    jobratt: '#D90909',
    mmacfreier: '#0E12B8',
    tanleach1001: '#06DBEE',
    johnsgill3: '#131313'
};
var margin = {
        top: 20,
        right: 20,
        bottom: 30,
        left: 40
    },
    width = 800 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

var x = d3.scale.ordinal()
    .domain(d3.range(1, 7))
    .rangeRoundBands([0, width], .2);
var y = d3.scale.linear()
    .range([height, 0]);
var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");
var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickFormat(d3.format(".2s"))
var svg = d3.select('#freqGraph')
    .attr("width", 120 + width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
        return '<span class="label">Player:</span> '+d.name+'<br />'+
               '<span class="label">All '+d.die+'\'s:</span> '+d.d_perc+'%<br />'+
               '<span class="label">All '+d.name+'\'s Rolls:</span> '+d.all_perc+'%<br />'
    });

svg.call(tip);

svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);
var cur_players

function calcDiceRolls(player) {
    var data = JSON.parse(window.sessionStorage.getItem('diceData'));
    var type = d3.select('input[name="rtype"]:checked').property("value")
    var types
    if (type == 'all') {
        types = ['attack', 'defend']
    } else {
        types = [type]
    }
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
    var game_id = d3.select("#game").property("value")
    var players = (game_id == 'All' ? d3.keys(users) :
        d3.set(data[game_id].map(function(d) {
            return d.player;
        })).values()).reduce(function(o, v, i) {
        o[v] = 0
        return o;
    }, {});
    cur_players = (player == "" ? d3.keys(players) : [player])

    var dice_cnt = d3.range(0, 6).map(function(d) {
        return $.extend({}, players)
    })

    function countGame(g) {
        g.forEach(function(r) {
            if ($.isEmptyObject(r) || !('player' in r))
                return

            types.forEach(function(t) {
                if (r[t].constructor === Array) {
                    r[t].forEach(function(d) {
                        dice_cnt[d - 1][r.player]++
                    })
                } else {
                    dice_cnt[r[t] - 1][r.player]++
                }
            })
        })
    }

    if (game_id == "All") {
        for (var gid in data) {
            countGame(data[gid]);
        }
    } else
        countGame(data[game_id]);

    dice_cnt.forEach(function(d, i) {
        var y0 = 0;
        d.total = d3.sum(d3.entries(d), function(d) {
            return d.value;
        })
        d.bars = cur_players.map(function(name) {
            return {
                die:i+1,
                name: name,
                y0: y0,
                y1: y0 += d[name],
                d_perc: ((d[name] / d.total) * 100).toFixed(2),
                all_perc: ((d[name] / d3.sum(dice_cnt.map(function(d) {
                        return d[name];
                    }))) * 100).toFixed(2)
            };
        });
    });
    return dice_cnt;

}

function updateDiceData() {
    var player
    if (this.nodeName == 'text')
        player = this.textContent
    else {
        player = ""
    }
    dice_cnts = calcDiceRolls(player);

    y.domain([0, d3.max(dice_cnts, function(d) {
        return d.total;
    })]);

    svg.select('.y.axis')
        .transition()
        .duration(500)
        .call(yAxis)

    var dice = svg.selectAll(".dice")
        .data(dice_cnts, function(d, i) {
            return i + "|" + d.total
        })

    dice.exit()
        .transition()
        .duration(500)
        .style("fill-opacity", 0)
        .remove();

    dice.enter().append("g")
        .attr('class', 'dice')
        .attr("transform", function(d, i) {
            return "translate(" + x(i + 1) + ",0)";
        });

    dice.selectAll('rect')
        .data(function(d) {
            return d.bars;
        })
        .enter().append('rect')
        .attr('width', x.rangeBand())
        .attr('y', y(0))
        .attr('height', height - y(0))
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide)
        .transition()
        .duration(500)
        .attr('y', function(d) {
            return y(d.y1);
        })
        .attr('height', function(d) {
            return y(d.y0) - y(d.y1);
        })
        .style('fill', function(d) {
            return users[d.name];
        })

    svg.selectAll(".legend").remove();

    legend = svg.selectAll(".legend")
        .data(d3.entries(users).filter(function(u) {
            return cur_players.indexOf(u.key) != -1;
        }))

    legend.enter().append('g')
        .attr('class', 'legend')
        .attr('transform', function(d, i) {
            return 'translate(115,' + i * 20 + ')';
        })

    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", function(d) {
            return d.value;
        })

    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) {
            return d.key;
        })
        //.on('click', updateDiceData)
}

function vizDiceData(error, data) {
    window.sessionStorage.setItem('diceData', JSON.stringify(data))

    $('#game').change(function() {
        window.history.pushState({}, null, window.location.origin + window.location.pathname + '?' + $(this).val());
    });
    d3.select('#game')
        .on('change', updateDiceData)
        .selectAll('option')
        .data(['All'].concat(d3.keys(data).filter(function(d) {
            return d != "undefined";
        }).sort()))
        .enter().append('option')
        .attr('value', function(d) {
            return d
        })
        .text(function(d) {
            return d
        })

    dice_cnts = calcDiceRolls("");

    y.domain([0, d3.max(dice_cnts, function(d) {
        return d.total;
    })]);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    var dice = svg.selectAll(".dice")
        .data(dice_cnts)
        .enter().append("g")
        .attr("class", "dice")
        .attr("transform", function(d, i) {
            return "translate(" + x(i + 1) + ",0)";
        });

    dice.selectAll('rect')
        .data(function(d) {
            return d.bars;
        })
        .enter().append('rect')
        .attr('width', x.rangeBand())
        .attr('y', function(d) {
            return y(d.y1);
        })
        .attr('height', function(d) {
            return y(d.y0) - y(d.y1);
        })
        .style('fill', function(d) {
            return users[d.name];
        })
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide)

    var legend = svg.selectAll(".legend")
        .data(d3.entries(users).filter(function(u) {
            return cur_players.indexOf(u.key) != -1;
        }))
        .enter().append('g')
        .attr('class', 'legend')
        .attr('transform', function(d, i) {
            return 'translate(115,' + i * 20 + ')';
        })

    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", function(d) {
            return d.value;
        });

    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) {
            return d.key;
        })
        //.on('click', updateDiceData)
}

d3.json('https://hubot-gregcochard.rhcloud.com/hubot/dice', vizDiceData);
