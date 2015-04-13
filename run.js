#!/usr/bin/env node
"use strict";
var Q = require("q");

// Open a new message handler
var serialIdentifier = process.argv[2] || "/dev/tty.usbserial-A7027DGF";
var messageHandler = require("./MessageHandler.js")(serialIdentifier);

// echo all received characters back to command line
messageHandler.serialPort.on("data", echo);

// Add message with ID 0x61 (ASCII 'a'). 
var testHandler = messageHandler.addHandler({
  id:       ascii('a'),
  name:     "'a' handler", 
  length:   4, // payload length is 4, therefore the 4 characters sent after 'a'
               // get sent to the message handler(s)
}).on("message", logMessageHandler).on("message", sendNewLine);

// Add message with ID 0x62 (ASCII 'b')
var testHandler2 = messageHandler.addHandler({
  id:       ascii('b'), 
  name:     "'b' handler",
  length:   5, 
}).on("message", logMessageHandler).on("message", sendNewLine);

// Add message with ID 0x65 (ascii 'e')
var testHandler3 = messageHandler.addHandler({
  id:       ascii('e'), 
  name:     "exit handler",
  length:   3, 
}).on("message", sendNewLine);

// Add to message handler, if the payload is "xit", then send a newline, then
// exit the program.
testHandler3.on("message", function(data) {
  if (data.toString() === "xit") {
    sendNewLine().then(process.exit);
  }
});




//Example sequence of events:
//1. ensure message handler is open
//2. send "test" message
//3. report how many characters were sent 
//4. receive 'a' message
//5. console log a message back to user
//6. receive 'b' message.
//7. console log b message back to user
//8. log "finished"

Q.when(messageHandler.open())                                                //1
  .then(messageHandler.sendMessage("test\r\n"))                              //2
  .then(function(messageLength) {                                            //3
    console.log("sent message which was "+messageLength+" characters long.");
  })
  .then(testHandler.receive())                                               //4
  .then(function(data) {                                                     //5
    console.log("Finally received expected message 1: "+data);               
  })
  .then(testHandler2.receive())                                              //6
  .then(function(data) {                                                     //7
    console.log("Finally received expected message 2: "+data);            
  })  
  .finally(function() {                                                      //8
    console.log("Finished!");
  })
  .catch(function(error){console.log(error);});


/*********************** Helper Functions Below *************************/

/**
 * Log received messages to command line, and notify user via bell.
 * @param  {Buffer} data Data received over serial
 */
function logMessageHandler(data) {
  console.log("(" + this.name + ": " + data + ")\u0007");
}

/**
 * Used to echo received data back over serial.
 * @param  {Buffer} data Data being echoed back
 */
function echo(data) {
  var i;
  for (i = 0; i < data.length; i += 1) {
    var char = data[i];
    if (char === "\r".charCodeAt(0)) {
      this.write("\r\n", function(){});
    } else if (char === 0x7f) {
      this.write("\b \b", function(){});
    } else {
      this.write(String.fromCharCode(char),function(){});
    }
  }
}
/**
 * Send New Line
 * Sends a line break over serial, for debugging purposes
 * @return {Promise} Promise to send new newline character
 */
function sendNewLine() {
  return Q.fcall(messageHandler.sendMessage("\r\n")); 
}

function ascii (char){
  return char.charCodeAt(0);
}

