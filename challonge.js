var challonge = require('challonge');
var friends = require("../../core/friends");
var logger = require("../../core/logger");
var fs = require('fs');

var config = require('./config.json');

var client = challonge.createClient({
    apiKey: config.apiKey
});

//string repeater
String.prototype.repeat = function( num )
{
    return new Array( num + 1 ).join( this );
};

//Helper to set current tournament
function setTournament(subdomain) {
  config.currentTournament = subdomain;
}

//send informations about the tournament for output
function sendTournamentInfo(target) {
  client.tournaments.show({
    id : config.currentTournament,
    callback: function(err,data) {
      if (err) { logger.log(err); return 'Error'; }
      var tournament = data.tournament;
      var response = 'ID: ' + tournament.id + '\n' +
        'Name: ' + tournament.name + '\n' +
        'Game: ' + tournament.gameName + '\n' +
        'Participants: ' + tournament.participantsCount + '\n' +
        'URL: ' + tournament.fullChallongeUrl + '\n' +
        'Description: ' + tournament.description + '\n';
      progress = tournament.progressMeter;
      if(progress === undefined) progress = 0;
      progressPart = Math.floor(progress / 10);
      response += 'Progress: |' + '#'.repeat(progressPart) + '-'.repeat(10 - progressPart) + '| - ' + progress + '%\n';
      friends.messageUser(target,response);
  }});
}

//send the user his next match
function sendParticipantNextMatch(source, id) {
  client.matches.index({
    id: config.currentTournament,
    participantId: id,
    state: 'open',
    callback: function(err, data) {
      if (err) { logger.log(err); return; }
      if(data.length === 0) {
        friends.messageUser(source, 'You currently have no open match');
        return;
      }
      match = data[0].match;
      var response = 'Next Match:\nMatch ID: ' + match.id + '\n' +
        'Identifier: ' + match.identifier + '\n';

      client.participants.show({
        id: config.currentTournament,
        participantId: (match.player1Id == id ? match.player2Id : match.player1Id),
        callback:  function(err, data) {
          if (err) { logger.log(err); return; }
          response += 'Enemy Name: ' + data.participant.name + '\n';
          friends.messageUser(source, response);
      }});

  }});
}

//not really useful atm
function sendUserStatus(source) {
  client.participants.index({
    id: config.currentTournament,
    callback: function(err, data) {
      if (err) { logger.log(err); return; }
      participantId = undefined;
      data.forEach(function(entry) {
        if(participantId === undefined && (entry.participant.name == friends.nameOf(source) ||entry.participant.challongeUsername == friends.nameOf(source))) {
          participantId = entry.participant.id;
        }
      });
      if (participantId === undefined) {
        friends.messageUser(source, "You're currently no participant");
        return;
      }
      sendParticipantNextMatch(source, participantId);
  }});
}

//send match result to challonge
function updateMatchResult(source, scoreU, scoreO) {
  client.participants.index({
    id: config.currentTournament,
    callback: function(err, data) {
      if (err) { logger.log(err); return; }
      participantId = undefined;
      data.forEach(function(entry) {
        if(participantId === undefined && (entry.participant.name == friends.nameOf(source) ||entry.participant.challongeUsername == friends.nameOf(source))) {
          participantId = entry.participant.id;
        }
      });
      if (participantId === undefined) {
        friends.messageUser(source, "You're currently no participant");
        return;
      }
      client.matches.index({
        id: config.currentTournament,
        participantId: participantId,
        state: 'open',
        callback: function(err, data) {
          if (err) { logger.log(err); return; }
          if(data.length === 0) {
            friends.messageUser(source, 'You currently have no open match');
            return;
          }
          match = data[0].match;
            client.matches.update({
              id: config.currentTournament,
              matchId: match.id,
              match: {
                scoresCsv: (match.player1Id == participantId ? scoreU : scoreO) + '-' + (match.player1Id == participantId ? scoreO : scoreU),
                winnerId: scoreU > scoreO ? participantId : match.player1Id == participantId ? match.player2Id : match.player1Id
              },
              callback: function(err,data){
                if (err) { logger.log(err); return; }
                logger.log(data);
            }
            });
      }});
  }});
}

//Helper to check for permissions
function hasPermission(source) {
  var admin = friends.get(source, 'chllg-admin') || friends.isAdmin(source);

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
      sendTournamentInfo(source);
    }
    else if (input.length > 1 && input[1].toLowerCase() == 'ustat') {
      sendUserStatus(source);
    }
    else if (input.length > 2 && input[1].toLowerCase() == 'rep') {
      updateMatchResult(source, input[2], input[3]);
    }
    exports.save();
    return true;
  }
};

exports.save = function() {
  fs.writeFileSync('./config.json',  JSON.stringify(config));
};

exports.onExit = function() {
  exports.save();
};

exports.getHelp = function(isAdmin) {
  return "CHALLONGE\n" +
    "chllg set _____ - sets the tournament subdomain\n" +
    "chllg cfg - get config\n" +
    "chllg ustat - get your status in the tournament\n" +
    "chllg rep __ __ - set result for your current match, your score first\n" +
    "chllg info - get info about the tournament\n";
};
