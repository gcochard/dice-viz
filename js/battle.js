function calcDiceOdds(ddata, game, player) {
    var odds = {}
    for(var a = 3; a > 0; a--) {
        for(var d = 2; d > 0; d--) {
            odds[a+'_'+d] = {
                total: 0,
                a_win: 0,
                a_win_p: 0,
                d_win: 0,
                d_win_p: 0,
                split: 0,
                split_p: 0
            };
            if(a == 1 || d == 1) {
                delete odds[a+'_'+d].split;
                delete odds[a+'_'+d].split_p;
            }
        }
    }
    ddata.forEach(function (g) {
        if(game != 'All' && g.key != game) {
            return;
        }
        g.value.forEach(function (r) {
            var num_a = 0, num_d = 0,
                a_rolls, d_rolls, idx = 0;
            if(player != 'All' && r.player != player) {
                return;
            }
            if(r['attack'].constructor == Array) {
                num_a = r['attack'].length;
                a_rolls = r['attack']
            } else {
                num_a = 1;
                a_rolls = [r['attack']];
            }

            if(r['defend'].constructor == Array) {
                num_d = r['defend'].length;
                d_rolls = r['defend'];
            } else {
                num_d = 1;
                d_rolls = [r['defend']];
            }
            odds[num_a+'_'+num_d].total += 1;

            if(a_rolls[0] <= d_rolls[0]) {
                idx++;
            }
            if(num_a == 1 || num_d == 1) {
                odds[num_a+'_'+num_d][idx?'d_win':'a_win'] += 1;
                return;
            }
            if(a_rolls[1] <= d_rolls[1]) {
                idx++;
            }
            if(idx == 1) {
                odds[num_a+'_'+num_d].split += 1;
            } else {
                odds[num_a+'_'+num_d][idx?'d_win':'a_win'] += 1;
            }
        })
    });
    for(var k in odds) {
        odds[k].a_win_p = ((odds[k].a_win / odds[k].total)*100).toFixed(2);
        odds[k].d_win_p = ((odds[k].d_win / odds[k].total)*100).toFixed(2);
        if('split' in odds[k]) {
            odds[k].split_p = ((odds[k].split / odds[k].total)*100).toFixed(2);
        }
    }
    return odds;
}

function updatePlayerList(players) {
    var options = d3.select('#players')
        .on('change', updateOdds)
        .selectAll('.player')
        .data(players);

    options.exit().remove();

    options.enter()
        .append('option')
        .attr('value', function (d) { return d; })
        .attr('class', 'player')
        .text(function (d) { return d; });
}

function updateOdds() {
    var data = JSON.parse(window.sessionStorage.getItem('diceData'));
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
    var game_id = d3.select("#game").property("value");
    var players = (game_id == 'All') ? ['All'].concat(d3.keys(users)) :
        ['All'].concat(d3.set(data[game_id].map(function(d) { return d.player; })).values());
    updatePlayerList(players);
    var sel_player = d3.select('#players').property('value');

    dodds = calcDiceOdds(d3.entries(data).filter(function (d) { return d.key != 'undefined'; }), game_id, sel_player);
    for(var k in dodds) {
        for(var t in dodds[k]) {
            if(/_p$/.test(t)) {
                continue;
            }
            d3.select('#'+t+'_'+k)
                .text(dodds[k][t])
            d3.select('#'+t+'_'+k)
                .append('br')
            if(dodds[k][t] > 0) {
                d3.select('#'+t+'_'+k)
                    .append('span')
                    .attr('class', function () {
                        if(t == 'a_win') {
                            if(dodds[k].a_win > dodds[k].d_win) {
                                return 'win';
                            } else {
                                return 'lose';
                            }
                        } else if(t == 'd_win') {
                            if(dodds[k].d_win > dodds[k].a_win) {
                                return 'win';
                            } else {
                                return 'lose';
                            }
                        }
                        return '    ';
                    })
                    .text(dodds[k][t+'_p']);
            }
        }
    }

    d3.selectAll('th')
        .style('background-color', users[sel_player])
        .style('color', sel_player == 'ryanbmilbourne' ? 'black' : 'white')
}
