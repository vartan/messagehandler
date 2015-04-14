- [MessageHandler](#messagehandler)
    - [Installation](#installation)
    - [Usage](#usage)
        - [example.js](#examplejs)
            - [output](#example-output)
    - [Contributing](#contributing)
    - [History](#history)
    - [License](#license)

# SerialMessages
SerialMessages is a module that sits between node and a serial port in order to 
asynchronously and synchronously respond to messages over UART

## Installation
Type the following into your commandline if you have `npm` installed

    npm install serialmessages

## Usage
This is how you instantiate up the serial message handler
```javascript
var messageHandler = require("serialmessages")("/dev/tty.usbserial-FTE6C8SO");
messageHandler.serialPort.on("data", function(){});
var Q = require("q"); // (optional) for synchronous messages
```
To create message handlers:
```javascript
// Add message with ID 0x61 (ASCII 'a'). 
var testHandler = messageHandler.addHandler({
  id:       0x61,
  name:     "'a' handler", 
  length:   4, 
});

var testHandler2 = messageHandler.addHandler({
  id:       0x62,
  name:     "'b' handler", 
  length:   5, 
});
```

To perform asynchronous handling:
```javascript
testHandler1.on("message", function(event) {
    console.log("Received message 'a' asynchronously with payload "+event.data);    
});
testHandler2.on("message", function(event) {
    console.log("Received message 'b' asynchronously with payload "+event.data);    
});
```

To perform synchronous handling:
```javascript
Q.when(messageHandler.open())
.then(testHandler.receive())
.then(function(event) {
    console.log("Received handler a synchronously: "+event.data);
})
.catch(function(error) {
    console.log("ERROR! "+error);
})
.finally(function() {
    console.log("Done.");
});
```

### example.js
Here is a larger example, with simultaneous asynchronous/synchronous handlers:
```javascript
#!/usr/bin/env node
"use strict";
var Q = require("q");

// Open a new message handler
var serialIdentifier = process.argv[2] || "/dev/tty.usbserial-A7027DGF";
var messageHandler = require("serialmessages")(serialIdentifier);

// echo all received characters back to command line
messageHandler.serialPort.on("data", echo(messageHandler.serialPort));

// Add message with ID 0x61 (ASCII 'a'). 
var testHandler = messageHandler.addHandler({
  id:       ascii('a'),
  name:     "'a' handler", 
  length:   4, 
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
testHandler3.on("message", function(event) {
  if (event.data.toString() === "xit") {
    Q.fcall(messageHandler.sendMessage("Exiting...\r\n"))
    .delay(10)
    .then(process.exit);

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
  .then(function handleSentMessage(messageLength) {                          //3
    console.log("sent message which was "+messageLength+" characters long.");
  })
  .then(testHandler.receive())                                               //4
  .then(function handleFirstMessage(event) {                                 //5
    console.log("Finally received expected message 1: "+event.data);               
  })
  .then(testHandler2.receive())                                              //6
  .then(function handleSecondMessage(event) {                                //7
    console.log("Finally received expected message 2: "+event.data);            
  })  
  .finally(function logFinished() {                                          //8
    console.log("Finished!");
  })
  .catch(function(error){console.log(error);});


/*************************** Misc. Functions Below ***************************/

/**
 * Log received messages to command line, and notify user via bell.
 * @param  {Buffer} event Event received over serial
 */
function logMessageHandler(event) {
  console.log("(" + event.messageHandler.name + ": " + event.data + ")\u0007");
}

/**
 * Used to echo received data back over serial.
 * @param  {Buffer} serialPort SerialPort to echo to
 */
function echo(serialPort) {
  /**
   * Echo to serial port
   * @param  {Buffer} data Data to send over port
   */
  return function echoToPort(data) {
    var i;
    for (i = 0; i < data.length; i += 1) {
      var char = data[i];
      if (char === "\r".charCodeAt(0)) {
        serialPort.write("\r\n", function(){});
      } else if (char === 0x7f) {
        serialPort.write("\b \b", function(){});
      } else {
        serialPort.write(String.fromCharCode(char),function(){});
      }
    }
  };
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

```
####Example Output
![example.js output](https://raw.githubusercontent.com/vartan/serialmessages/master/example.js.png)
## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## History

    0.0.1 - Added

## License
[![WTFPL](http://www.wtfpl.net/wp-content/uploads/2012/12/wtfpl-badge-4.png)
](http://www.wtfpl.net/) Licensed by WTFPL