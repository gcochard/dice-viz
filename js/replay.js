// Update Variables
var curState, curRound, curPlayer,
    intID, gameState,
    intTime = 500,
    territorySize='large';

function getTIDbyName(t, n) {
    for(var k in t) {
        if(t[k].name == n) {
            return k;
        }
    }
    return null;
}

function calcInitial(mdata, gdata) {
    var t = mdata.value.territories,
        i, e, k;
    for(i = 0; i < gdata.length; i++) {
        e = gdata[i];
        switch(e.type) {
            case "win":
                for(k in t) {
                    t[k].owner = e.player;
                    t[k].ntroops = 3;
                }
                break;
            case "attack":
                t[getTIDbyName(t,e.source_t)].owner = e.player;
                t[getTIDbyName(t,e.target_t)].owner = e.dplayer;
                break;
            case 'deploy':
                t[getTIDbyName(t,e.territory)].owner = e.player;
                break;
            case 'cardsP':
                t[getTIDbyName(t,e.territory)].owner = e.player;
                break;
            default:
                break;
        }
    }
}

function assignGameMaps(mdata, gdata) {
    var i, e, pmap = $.extend(true, {}, mdata.value.territories);
    for(i = 0; i < gdata.length; i++) {
        e = gdata[i];
        e.map = $.extend(true, {}, pmap);
        switch(e.type) {
            case "attack":
                var tar_k = getTIDbyName(e.map, e.target_t),
                    sor_k = getTIDbyName(e.map, e.source_t)
                e.map[sor_k].ntroops -= e.lost;
                if(e.map[sor_k].ntroops < 0) {
                    console.log("ERROR - 0 Troops", sor_k, e);
                }
                e.map[tar_k].ntroops -= e.killed;
                if(e.map[tar_k].ntroops < 0) {
                    console.log("ERROR - 0 Troops", tar_k, e);
                }
                if(e.conquer) {
                    e.map[tar_k].owner = e.player;
                    // Do accounting NOW for conquer, then if there is an occupy subtract 1
                    e.map[sor_k].ntroops -= 1;
                    if(e.map[sor_k].ntroops < 0) {
                        console.log("ERROR - 0 Troops", sor_k, e);
                    }
                    e.map[tar_k].ntroops = 1;
                }
                break;
            case "deploy":
                e.map[getTIDbyName(e.map, e.territory)].ntroops += e.ntroops;
                break;
            case "cardsP":
                e.map[getTIDbyName(e.map, e.territory)].ntroops += e.ntroops;
                break;
            case "foritfy":
                e.map[getTIDbyName(e.map, e.source_t)].ntroops -= e.ntroops;
                if(e.map[getTIDbyName(e.map, e.source_t)].ntroops < 0) {
                    console.log("ERROR - 0 Troops", getTIDbyName(e.map, e.source_t), e);
                }
                e.map[getTIDbyName(e.map, e.target_t)].ntroops += e.ntroops;
                break;
            case "occupy":
                e.map[getTIDbyName(e.map, e.source_t)].ntroops -= (e.ntroops-1);
                if(e.map[getTIDbyName(e.map, e.source_t)].ntroops < 0) {
                    console.log("ERROR - 0 Troops", getTIDbyName(e.map, e.source_t), e);
                }
                e.map[getTIDbyName(e.map, e.target_t)].ntroops += (e.ntroops-1);
                break;
            default:
                break;
        }
        pmap = e.map
    }
}

function getTeamColor(name) {
    if(name in users_tc) {
        return users_tc[name];
    } else {
        return 'tc-0';
    }
}

function drawGameBoard(mdata) {
    if(window.innerWidth < 1600) {
        territorySize = 'small';
        mdata.value.url = mdata.value.url.replace('large', 'small')
    }
    d3.select('div.map').remove();
    var map = d3.select('div#static')
        .append('div')
        .attr('class', 'map')
        .style("background-image", "url('"+mdata.value.url+"')");

    map.selectAll('div.territory-'+territorySize)
        .data(d3.entries(mdata.value.territories))
        .enter()
        .append('div')
        .attr('class', function (d) { return 'territory-'+territorySize+' '+getTeamColor(d.value.owner); })
        .style('left', function (d) { return ((territorySize == 'large' ? 1 : 0.75) * d.value.x)+'px'; })
        .style('top', function (d) { return ((territorySize == 'large' ? 1 : 0.75) * d.value.y)+'px'; })
        .append('a')
        .attr('href', function (d) { return '#'+d.key; })
        .attr('id', function (d) { return 't-'+d.key })
        .text(function(d) { return d.value.ntroops; });
}

function toggleList() {
    $(this).parent().children('ul').toggle();
}

function setGState() {
    var caps = this.id.match(/r(\d+)-p-(\w+)-e(\d+)/);
    stopUpdateGameBoard();
    curRound = caps[1];
    curPlayer = caps[2];
    curState = caps[3];
    updateGame();
}

function drawList(parent, level) {
    var item = parent
        .append('li')
        .text(function(d) {
            if(level == 0) {
                return 'Round: '+d.key;
            } else if (level == 1) {
                return d.key;
            } else if (level == 2) {
                return '- '+d.message;
            }
            return '';
        })
        .attr('id', function (d) {
            if(level == 0) {
                return 'r'+d.key;
            } else if (level == 1) {
                return 'r'+d.values[0].round+'-p-'+d.key;
            } else if (level == 2) {
                return 'r'+d.round+'-p-'+d.player+'-e'+d.eventID;
            }
            return '';
        })
        .attr('class', function (d) {
            return 'l'+(level+1);
        }).on('click', level < 2 ? toggleList : setGState);

    var children = parent.selectAll('ul')
        .data(function(d) {
            return ('values' in d) ? d.values : [] ;
        })
        .enter()
        .append('ul')
        .attr('id', function (d) {
            if(level == 0) {
                return 'r'+d.values[0].round+'-p-'+d.key;
            } else if (level == 1) {
                return 'r'+d.round+'-p-'+d.player+'-e'+d.eventID;
            }
            return '';
        })
        .attr('class', function (d) {
            return 'l'+(level+1);
        });

    // Make sure that order is correct for elements
    if(level == 0) {
        children.sort(function (a, b) {
            return turnOrder.indexOf(a.key) - turnOrder.indexOf(b.key);
        });
    } else if(level == 1) {
        children.sort(function (a, b) {
            return a.eventID - b.eventID;
        });
    }
    if (!children.empty()) {
        drawList(children, level+1);
    }
}

function stopUpdateGameBoard() {
    $('#stop-upd').prop("disabled",true);
    $('#start-upd').prop("disabled",false);
    clearInterval(intID);
}

function continueUpdateGameBoard() {
    // Restarting - reset the list for scrolling
    $('ul.l0, ul.l1').each(function () {
        var caps = this.id.match(/r(\d+)(?:-p-(\w+))?/);
        if(this.className == 'l0') {
            if(caps[1] != curRound) {
                $(this).children('ul').hide();
            } else {
                $(this).children('ul').show();
            }
        } else if (this.className == 'l1') {
            if(caps[1] != curRound || caps[2] != curPlayer) {
                $(this).children('ul').hide();
            } else {
                $(this).children('ul').show();
            }
        } else {
            console.log("ERROR - Unknown ul class", this.className);
        }
    })
    $('#stop-upd').prop("disabled",false);
    $('#start-upd').prop("disabled",true);
    intTime = $('form#speed input[type="radio"]:checked').val();
    intID = setInterval(updateGame, intTime);
}

function changeSpeed(button) {
    clearInterval(intID);
    intTime = button.value;
    if($('#start-upd').is(':disabled')) {
        intID = setInterval(updateGame, intTime);
    }
}

function updateGame() {
    var cturn = gameState[curState];

    if(cturn.round != curRound) {
        $('ul#r'+curRound+'-p-'+curPlayer).children('ul').hide();
        $('ul#r'+curRound).children('ul').hide();
        curRound = cturn.round;
        $('ul#r'+curRound).children('ul').show();
    }
    if(cturn.player != curPlayer) {
        $('ul#r'+curRound+'-p-'+curPlayer).children('ul').hide();
        curPlayer = cturn.player;
        $('ul#r'+curRound+'-p-'+curPlayer).children('ul').show();
    }

    $('li.cturn').toggleClass('cturn');
    var curEvent = $('li#r'+curRound+'-p-'+curPlayer+'-e'+cturn.eventID)
    curEvent.toggleClass('cturn');
    window.scrollTo(curEvent.position().left, curEvent.position().top);

    // Join data with old elements
    var divs = d3.select('div.map').selectAll('div.territory-'+territorySize)
        .data(d3.entries(cturn.map), function (d) { return d.key + "" + d.value.owner + "" + d.value.ntroops; })

    // Update current elements
    divs.attr('class', function (d) { return 'territory-'+territorySize+' '+getTeamColor(d.value.owner); })
    divs.selectAll('a').text(function(d) { return d.value.ntroops; })

    // Create New Elements
    divs.enter()
        .append('div')
        .attr('class', function (d) { return 'territory-'+territorySize+' '+getTeamColor(d.value.owner); })
        .style('left', function (d) { return ((territorySize == 'large' ? 1 : 0.75) * d.value.x)+'px'; })
        .style('top', function (d) { return ((territorySize == 'large' ? 1 : 0.75) * d.value.y)+'px'; })
        .append('a')
        .attr('href', function (d) { return '#'+d.key; })
        .attr('id', function (d) { return 't-'+d.key })
        .text(function(d) { return d.value.ntroops; });

    // Remove Old Elements
    divs.exit().remove();

    curState++;

    if(curState == gameState.length) {
        // Finished reset everything so if user click starts will begin from beginning
        $('#stop-upd').prop("disabled",true);
        $('#start-upd').prop("disabled",false);
        $('ul#r'+curRound+'-p-'+curPlayer).children('ul').hide();
        $('ul#r'+curRound).children('ul').hide();
        curState = 1;
        curRound = 0;
        curPlayer = '';
        clearInterval(intID);
    }
}

function drawGameData(gid, gdata, mdata) {
    turnOrder = calcTurnOrder(gdata);
    // Move map to top of the window
    d3.select('#static')
        .style('top', '0px');

    var nplayers = turnOrder.length,
        nterritories = d3.entries(mdata.value.territories).length;

    console.log(Math.floor(nterritories/nplayers), nterritories%nplayers);

    gdata = gdata.filter(function (d) {
        // Include the game start message to attach initial board state
        if(d.player == "unknown" && d.message == "Game started.") {
            d.round = 0;
            return true;
        }

        if(d.player == "unknown") {
            return false;
        }

        if(roundPattern.test(d.message) ||
           joinPattern.test(d.message) ||
           turnStartPattern.test(d.message) ||
           turnEndPattern.test(d.message) ||
           tokenRatingPattern.test(d.message)){// ||
        //    winnerPattern.test(d.message)) {
            return false;
        }

        return true;
    });


    gdata.forEach(function (d) {
        d.otime = d.timestamp;
        d.timestamp = new Date(d.timestamp);
        matchD12(d)
    });
    // Can't do in the same loop as above as some timestamp get munged
    var eid = 0;
    gdata.sort(function (a, b) { return a.timestamp - b.timestamp; }).forEach(function (d) {
        d.eventID = eid;
        eid++;
    })

    // Use the reverse game history to determine all the initial starting points
    gdata.sort(function (a, b) { return b.eventID - a.eventID; });
    calcInitial(mdata, gdata);

    // Now go through history to attach the game board state to each event
    gdata.sort(function (a, b) { return a.eventID - b.eventID; });
    assignGameMaps(mdata, gdata);

    g_gdata = d3.nest()
        .key(function (d) { return d.round; })
        .key(function (d) { return d.player; })
        .entries(gdata);

    drawGameBoard(mdata);

    d3.select('div.gameLog').remove();
    var rootList = d3.select('body')
        .append('div')
        .attr('class', 'gameLog')
        .selectAll('ul')
        .data(g_gdata.filter(function (d) { return d.key != 0; }))
        .enter()
        .append('ul')
        .attr('class','l0')
        .attr('id', function (d) {
            return 'r'+d.key;
        });

    drawList(rootList, 0);

    var subNodes = d3.selectAll('ul.l1, ul.l2');
    $(subNodes[0]).hide();

    $('<img/>').attr('src',mdata.value.url).load(function () {
        d3.select('div.map')
            .style('width', this.width+'px')
            .style('height', this.height+'px')

        var left = ((window.innerWidth - this.width-23) / window.innerWidth)*100;
        d3.select('div#static').style('left', left+'%')

        d3.select('div.gameLog')
            .style('width', left+'%');
    });

    // Begin the updates
    $('#stop-upd').prop("disabled",false);
    $('#start-upd').prop("disabled",true);
    intTime = $('form#speed input[type="radio"]:checked').val();
    curState = 1;
    curRound = 0;
    curPlayer = '';
    gameState = gdata;
    intID = setInterval(updateGame, intTime);
}

getGD = true;
d3.json('https://hubot-gregcochard.rhcloud.com/hubot/dice', function (d) {
    setGameIds(d, 'Select Game', drawGameData);
    getGameData(drawGameData);
});
