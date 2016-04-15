var isNaN = function(value) {
    return Number.isNaN(Number(value));
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
                    e.values.ntroops += d.ntroops;
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
                    e.values.tdelta += 1;
                }
                var eD = vals[getPlayerIdx(d.dplayer, vals)];
                if(eD != undefined) {
                    if(eD.key != d.dplayer) {
                        console.log("ERROR -",d.type,"dplayer mismatch",eD, d);
                    }
                    eD.values.ntroops -= d.killed;
                    if(d.conquer) {
                        eD.values.tdelta -= 1;
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
                'tdelta' : 0,
                // Total Troop Bonus at beginning of round
                'bonus' : d3.sum(l.filter(function(d) { return d.type == 'territory' || d.type == 'holding'; }), function (d) { return d.ntroops; }),
                // All Card Bonuses in the round
                'cbonus' : d3.sum(l.filter(function(d) { return d.type == 'cardsT' || d.type == 'cardsP'; }), function (d) { return d.ntroops; }),
                // Number of areas held at the beginning of a round
                'areas' : l.filter(function (d) { return d.type == 'holding'; }).length
            };
        })
        .entries(gdata);

    calcTroops(gdata, g_gdata);

    console.log(g_gdata)
}

d3.json('https://hubot-gregcochard.rhcloud.com/hubot/dice', function (d) { setGameIds(d, drawSummaryGraphs); getGameData(drawSummaryGraphs); });
