var challonge = require('challonge');
var friends = require("../../core/friends");
var fs = require('fs');

var config = require('./config.json');

var client = challonge.createClient({
    apiKey: config.apiKey
});

exports.save = function() {
  fs.writeFileSync('config.json',  JSON.stringify(config));
}

//Helper to set current tournament
function setTournament(subdomain) {
  config.currentTournament = subdomain;
}

//get tournament info from challonge
function getTournament() {
  client.tournaments.show({
    tournament : config.currentTournament,
    callback: function(err, data) {
      if (err) { console.log(err); return; }
      return data;
    }
  });
}

//get informations about the tournament for output
function getTournamentInfo() {
  tournament = getTournament();
  return tournament;
}

//Helper to check for permissions
function hasPermission(source) {
  var admin = friends.get(source, 'chllg-admin');

  if(admin) return true;

  return false;
}

exports.handle = function(input, source) {
  input = input.split(' ');
  if(input[0] == 'chllg') {
    if(input.length > 2 && input[1].toLowerCase() == 'set' && hasPermission(source)) {
      setTournament(input[2]);
    }
    else if (input.length > 1 && input[1].toLowerCase() == 'info') {
      friends.messageUser(source, getTournamentInfo());
    }
    exports.save();
    return true;
  }
}

exports.onExit = function() {
  exports.save();
}

exports.getHelp = function(isAdmin) {
  return "CHALLONGE\n" +
    "chllg set _____ - sets the tournament subdomain\n" +
    "chllg info - get info about the tournament\n";
}
