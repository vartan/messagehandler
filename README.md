# MessageHandler
MessageHandler is a tool that sits between node and a serial port in order to asynchronously and synchronously respond to messages over UART

## Installation
Type the following into your commandline if you have `npm` installed

    npm install messagehandler

## Usage

    var messageHandler = require("./messagehandler.js")("/dev/tty.usbserial-A7027DGF");
    var Q = require("q"); // for synchronous messages
    // Add message with ID 0x61 (ASCII 'a'). 
    var testHandler = messageHandler.addHandler({
      id:       0x61,
      name:     "'a' handler", 
      length:   4, 
    }).on("message", function(event) {
        console.log("Received message 'a' asynchronously with payload "+event.data);    
    });
    var testHandler2 = messageHandler.addHandler({
      id:       0x61,
      name:     "'b' handler", 
      length:   5, 
    }).on("message", function(event) {
        console.log("Received message 'b' asynchronously with payload "+event.data);    
    });
    Q.when(messageHandler.open())
    .then(testHandler.receive())
    .then(function(event) {
        console.log("Received handler a asynchronously: "+event.data);
    });



## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## History

    0.0.1 - Added

## License
[![WTFPL](http://www.wtfpl.net/wp-content/uploads/2012/12/wtfpl-badge-4.png)](http://www.wtfpl.net/) Licensed by WTFPL