#!/usr/bin/env node
var Q = require("q");


var messageHandler = require("./MessageHandler.js")("/dev/tty.usbserial-A7027DGF");
var serialPort = messageHandler.serialPort;
function logMessageHandler(data){
  console.log(this.name+": every time receive: " + data);
}

var ascii = function(char){return char.charCodeAt(0)};

var testHandler = messageHandler.addHandler({
  id:       ascii('a'),
  name:     "'a' handler", 
  length:   4, 
}).on("message", logMessageHandler);

var testHandler2 = messageHandler.addHandler({
  id:       ascii('b'), 
  name:     "'b' handler", 
  length:   5, 
}).on("message", logMessageHandler);

var echo = function(data) {
  if(data.toString()=="\r")
    this.write("\r\n", function(){});
  else 
    this.write(data,function(){})
}

messageHandler.serialPort.on("data", echo);
Q.when(messageHandler.open())
  .then(messageHandler.sendMessage("test"))
  .then(function(messageLength){
    console.log("sent message which was "+messageLength+" characters long.");
  })
  .then(testHandler.receive())
  .then(function(data) {
    console.log("Finally received expected message 1: "+data);
  })
  .then(testHandler2.receive())
  .then(function(data) {
    console.log("Finally received expected message 2: "+data);
  })
  .then(function(){
    process.exit();
  })
  .catch(function(error){console.log(error);});
