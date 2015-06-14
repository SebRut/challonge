var challonge = require('challonge');
var friends = require("../../core/friends");
var fs = require('fs');

var config = require('./config.json');

var client = challonge.createClient({
    apiKey: config.apiKey
});

exports.save = function() {
  fs.writeFileSync('./config.json',  JSON.stringify(config));
}

//string repeater
String.prototype.repeat = function( num )
{
    return new Array( num + 1 ).join( this );
}

//Helper to set current tournament
function setTournament(subdomain) {
  config.currentTournament = subdomain;
}

//get tournament info from challonge
function getTournament(callback) {
  client.tournaments.show({
    tournament : config.currentTournament,
    callback: callback
  });
}

//get informations about the tournament for output
function getTournamentInfo() {
  getTournament(function(err,data) {
    if (err) { console.log(err); return 'Error' }
    var tournament = data.tournament;
    var response = 'ID: ' + tournament.id + '\n' +
      'Name: ' + tournament.name + '\n' +
      'Participants: ' + tournament.participants_count + '\n' +
      'Progress: |' + '#'.repeat(tournament.progress_meter / 10) + '-'.repeat((100-tournament.progress_meter) / 10) + '|\n';
    return response;
  });
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
    if(input.length > 1 && input[1].toLowerCase() == 'cfg' && hasPermission(source)) {
      friends.messageUser(source, JSON.stringify(config));
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
    "chllg cfg - get config\n" +
    "chllg info - get info about the tournament\n";
}
