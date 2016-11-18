#!/usr/bin/env node

var cheerio = require('cheerio'),
    request = require('request'),
    _ = require('underscore')
    d3 = require('d3');

var game_maps = {},
    num_gid = 0;

function writeToFile(mn, gm) {
    if(mn in game_maps) {
        game_maps[mn]['gid'].push(gm['gid'][0]);
        t = game_maps[mn]["territories"]
        for(var k in t) {
            if(k in gm['territories']) {
                if(t[k]['name'] == '' && gm["territories"][k]['name'] != '') {
                    t[k]['name'] = gm["territories"][k]['name'];
                } else if (gm['territories'][k]['name'] != '' && t[k]['name'] != gm['territories'][k]['name']) {
                    console.log('ERROR - Mismatch Name: ', mn, k)
                }
            } else {
                console.log('ERROR - Missing Key: ', mn, k);
            }
        }
        num_gid -= 1;
    } else {
        game_maps[mn] = gm;
    }

    if(num_gid == d3.keys(game_maps).length) {
        console.log(JSON.stringify(game_maps, null, 2));
    }
}

function getGameMap(gid, body, cb) {
    var $ = cheerio.load(body)
    var game_map = {};
    game_map['gid'] = [gid];

    $("div.map").each(function() {
        game_map['url'] = $(this).attr('style').match(/url\('(.*?)'\)/)[1];
    });

    game_map['territories'] = {};
    $("a.js_territory").each(function () {
        game_map['territories'][$(this).attr('data-territory')] = {
            'x': $(this).attr('data-x'),
            'y': $(this).attr('data-y'),
            'name':''
        };
    });

    request.post({
        url: 'https://dominating12.com/game/'+gid+'/play/load-full-log',
            form: { before: 99999999 }
        }, function (err, res, body) {
            data = JSON.parse(body);
            _.map(data.log, function (e) {
                var $ = cheerio.load(e);

                $('a[onclick]').each(function (a) {
                    t_nm = $(this).text();
                    t_id = $(this).attr('onclick').match(/highlightTerritory\((\d+)\)/)[1];

                    if(t_id in game_map['territories']) {
                        game_map['territories'][t_id]['name'] = t_nm;
                    } else {
                        console.log(t_id,t_nm);
                    }
                });
            });
            map_no = game_map['url'].match(/maps\/(\d+)\.large.jpg/)[1];
            cb(map_no, game_map)
        }
    );
}

// Get the initial set of GameIds based on the Dice.
// Call out to get all the maps
request.get({
    url: 'https://hubot-gregcochard.rhcloud.com/hubot/dice'
}, function(err, res, body) {
    if(err || res.statusCode !== 200){
        console.dir(err || new Error('non-200 status code: '+res.statusCode))
        process.exit(1)
    }
    var data = JSON.parse(body);
    var gameIds = [692173]; //d3.keys(data).filter(function(d) { return d != "undefined"; }).sort();
    num_gid = gameIds.length;
    gameIds.forEach(function (d) {
        request.get({
            url: 'https://dominating12.com/game/'+d
        }, function(err, res, body) {
            if(err || res.statusCode !== 200){
                console.dir(err || 'non-200 status code: '+res.statusCode+'GameId: '+d);
                //process.exit(1)
            }
            getGameMap(d, body, writeToFile);
        });
    });
});
