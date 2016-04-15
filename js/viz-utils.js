var users = {
    gcochard: '#00A708',
    kwren: '#FF6CF2',
    ryanbmilbourne: '#E9F109',
    jobratt: '#D90909',
    mmacfreier: '#0E12B8',
    tanleach1001: '#06DBEE',
    johnsgill3: '#131313'
};

var users_tc = {
    Neutral: 'tc-0',
    gcochard: 'tc-1',
    kwren: 'tc-4',
    ryanbmilbourne: 'tc-8',
    jobratt: 'tc-3',
    mmacfreier: 'tc-2',
    tanleach1001: 'tc-9',
    johnsgill3: 'tc-7'
};

var turnOrder;

function getGameData(cb) {
    if(typeof intID !== 'undefined') {
        clearInterval(intID);
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
    var gameId = $('#game').val();

    if(gameId == "All") {
        // TODO: Game in progress
        return; // TODO
    }
    d3.json('https://hubot-gregcochard.rhcloud.com/hubot/d12log/'+gameId, function (error, gdata) {
        d3.json('data/d12maps.json', function (error, mdata) {
            mdata = d3.entries(mdata).filter(function (d) { return (d.value.gid.indexOf(gameId) > -1); });
            cb(gameId, gdata, mdata[0]);
        });
    });
}

function setGameIds(data, chg_cb) {
    $('#game').change(function() {
        window.history.pushState({}, null, window.location.origin + window.location.pathname + '?' + $(this).val());
    });
    d3.select('#game')
        .on('change', function () { getGameData(chg_cb); })
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
        });
}

// Text Patterns
var territoriesPattern = /(\w+)\s+received\s+(\d+)\s+troops\s+for\s+(\d+)\s+territor(?:ies|y)\./;
var holdingPattern     = /(\w+)\s+received\s+(\d+)\s+troop(?:s)?\s+for\s+holding\s+(.*?)\./;
var cardGetPattern     = /(\w+)\s+received\s+a\s+card/;
var cardsTurnPattern   = /(\w+)\s+received\s+(\d+)\s+troops\s+for\s+turning\s+in\s+cards\s+(.*?),\s+(.*?),\s+and\s+(.*?)\./;
var cardsPlusPattern   = /(\w+)\s+received\s+(\d+)\s+troops\s+on\s+(.*?)$/;
var defeatedPattern    = /(\w+)\s+was\s+defeated\s+by\s+(\w+)/;
var fightPattern       = /(.*?)\s+\((\w+)\)\s+attacked\s+(.*?)\s+\((\w+)\)\s+(.*?)killing\s+(\d+),\s+losing\s+(\d+)\./;
var missedPattern      = /(\w+)\s+missed\s+the\s+turn/;
var deployPattern      = /(.*?)\s+\((\w+)\)\s+was\s+reinforced\s+by\s+(\w+)\s+with\s+(\d+)\s+troops?\./;
var fortifyPattern     = /(.*?)\s+\((\w+)\)\s+was\s+fortified\s+from\s+(.*?)\s+\((\w+)\)\s+with\s+(\d+)\s+troops?\./;
var occupyPattern      = /(.*?)\s+\((\w+)\)\s+occupied\s+(.*?)\s+with\s+(\d+)\s+troops?./;
var winnerPattern      = /(\w+) won the game\./
var gameStartPattern   = /Game started\./

// Patterns that will be ignored
var roundPattern       = /Round\s+(\d+)\s+started/;
var joinPattern        = /(\w+)\s+joined\s+the\s+game\./;
var turnStartPattern   = /(\w+)\s+started\s+the\s+turn\./;
var turnEndPattern     = /(\w+)\s+ended\s+the\s+turn\./;
var tokenRatingPattern = /\s(tokens|rating)\.$/;

function matchD12(e) {
    switch (true) {
        case territoriesPattern.test(e.message):
            var caps = e.message.match(territoriesPattern);
            e.type = 'territory';
            if(e.player != caps[1]) {
                console.log("ERROR - Mismatch user. Updating",e.player,'to',caps[1]);
                e.player = caps[1];
            }
            e.ntroops = Number(caps[2]);
            e.nterritories = Number(caps[3]);
            break;
        case holdingPattern.test(e.message):
            var caps = e.message.match(holdingPattern);
            e.type = 'holding';
            if(e.player != caps[1]) {
                console.log("ERROR - Mismatch user. Updating",e.player,'to',caps[1]);
                e.player = caps[1];
            }
            e.ntroops = Number(caps[2]);
            e.area = caps[3];
            break;
        case cardsTurnPattern.test(e.message):
            var caps = e.message.match(cardsTurnPattern);
            e.type = 'cardsT';
            if(e.player != caps[1]) {
                console.log("ERROR - Mismatch user. Updating",e.player,'to',caps[1]);
                e.player = caps[1];
            }
            e.ntroops = Number(caps[2]);
            e.territories = [caps[3], caps[4], caps[5]];
            break;
        case cardsPlusPattern.test(e.message):
            var caps = e.message.match(cardsPlusPattern);
            e.type = 'cardsP';
            if(e.player != caps[1]) {
                console.log("ERROR - Mismatch user. Updating",e.player,'to',caps[1]);
                e.player = caps[1];
            }
            e.ntroops = Number(caps[2]);
            e.territory = caps[3];
            break;
        case cardGetPattern.test(e.message):
            var caps = e.message.match(cardGetPattern);
            e.type = 'cardsR';
            if(e.player != caps[1]) {
                console.log("ERROR - Mismatch user. Updating",e.player,'to',caps[1]);
                e.player = caps[1];
            }
            e.timestamp.setSeconds(e.timestamp.getSeconds() + 1);
            break;
        case defeatedPattern.test(e.message):
            var caps = e.message.match(defeatedPattern);
            e.type = 'killed';
            if(e.player != caps[2]) {
                // These are backwards. Updating
                // console.log("ERROR - Mismatch user. Updating",e.player,'to',caps[2]);
                e.player = caps[2];
            }
            e.dplayer = caps[1];
            // As a defeat often occurs in the same time as the attack
            // Add a few seconds to make sure it ends up after the attack.
            e.timestamp.setSeconds(e.timestamp.getSeconds() + 1);
            break;
        case fightPattern.test(e.message):
            var caps = e.message.match(fightPattern);
            e.type = 'attack';
            if(e.player != caps[2]) {
                console.log("ERROR - Mismatch user. Updating",e.player,'to',caps[2]);
                e.player = caps[2];
            }
            e.source_t = caps[1];
            e.target_t = caps[3];
            e.dplayer = caps[4];
            e.conquer = /conquering/.test(caps[5]);
            e.killed = Number(caps[6]);
            e.lost = Number(caps[7]);
            break;
        case missedPattern.test(e.message):
            var caps = e.message.match(missedPattern);
            e.type = 'missed';
            if(e.player != caps[1]) {
                console.log("ERROR - Mismatch user. Updating",e.player,'to',caps[1]);
                e.player = caps[1];
            }
            break;
        case deployPattern.test(e.message):
            var caps = e.message.match(deployPattern);
            e.type = 'deploy';
            if(e.player != caps[3]) {
                console.log("ERROR - Mismatch user. Updating",e.player,'to',caps[3]);
                e.player = caps[3];
            }
            e.ntroops = Number(caps[4]);
            e.territory = caps[1];
            break;
        case fortifyPattern.test(e.message):
            var caps = e.message.match(fortifyPattern);
            e.type = 'foritfy';
            if(e.player != caps[2]) {
                console.log('ERROR - Mismatch user. Updating',e.player,'to',caps[2]);
                e.player = caps[2];
            }
            e.source_t = caps[3];
            e.target_t = caps[1];
            e.ntroops = Number(caps[5]);
            break;
        case occupyPattern.test(e.message):
            var caps = e.message.match(occupyPattern);
            e.type = 'occupy';
            if(e.player != caps[2]) {
                console.log('ERROR - Mismatch user. Updating',e.player,'to',caps[2]);
                e.player = caps[2];
            }
            e.source_t = caps[1];
            e.target_t = caps[3];
            e.ntroops = Number(caps[4]);
            break;
        case winnerPattern.test(e.message):
            var caps = e.message.match(winnerPattern);
            e.type = 'win';
            if(e.player != caps[1]) {
                console.log('ERROR - Mismatch user. Updating',e.player,'to',caps[1]);
                e.player = caps[1];
            }
            // As win occurs often in the same timestamp as the final defeat
            // Add a few seconds to make sure it ends up last
            e.timestamp.setSeconds(e.timestamp.getSeconds() + 3);
            break;
        case gameStartPattern.test(e.message):
            break;
        default:
            console.log('Couldn\'t match message: "'+e.message+'"');
            break;
    }
}

function calcTurnOrder(gdata) {
    var pOrder = [];
    // Determine the turn order
    r1 = gdata.filter(function (d) {
        if(turnStartPattern.test(d.message))
            return true;

        return false;
    });

    r1.sort(function (a, b) { return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(); });

    var i = 0;
    while(r1[i].round == 1) {
        pOrder.push(r1[i].player)
        i++;
    }
    return pOrder;
}
