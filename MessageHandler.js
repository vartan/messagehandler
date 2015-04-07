"use strict";
var serialport = require("serialport");
var events = require("events");
var util = require('util');
var Q = require("q");


var MESSAGE_ID_BYTES = 1;


/**
 * MessageHandler Constructor
 * @param {Object} info  Object including ID, name, length
 */
function MessageHandler(info) {
    var id = info.id || 0;
    var name = info.name || "Unnamed Message"
    var length = info.length || 1;


    if(id < 0 || id > Math.pow(2,8*MESSAGE_ID_BYTES)) {
        throw new Error("Message #"+id+" \""+name+"\" does not fit inside of "+ 
            "of "+MESSAGE_ID_BYTES+" bytes.");
    }
    this.id = id;
    this.name = name;
    this.length = length;

}
util.inherits(MessageHandler, events.EventEmitter);

/**
 * Receive Promise
 * @return {Promise} Promise for receiving the message
 */
MessageHandler.prototype.receive = function() {
  var that = this;
  return function() {
    var deferred = Q.defer();

    that.once("message", function(data) {
      deferred.resolve(data);
    });
    //that.pendingDeferred.push(deferred);

    return deferred.promise;
  }
}
  
module.exports = function(serialFile) {
  var message_handlers = [];

  /**
   * Variable length message parser
   * @return {parser} Parses the messages to be dispatched 
   */
  var data = new Buffer(0);
  var length = MESSAGE_ID_BYTES;
  var messageHandler = undefined;
  var variableLengthMessageParser = function(emitter, buffer){
      data = Buffer.concat([data, buffer]);
      while (data.length >= length) {
        var out = data.slice(0,length)
        data = data.slice(length);

        if(messageHandler === undefined) {
          messageHandler = getHandler(out[0]);
          if(messageHandler) {
            length = messageHandler.length;
            messageHandler.emit('data', out);
          }

        } else {
          messageHandler.emit("message", out);
          messageHandler.emit('data', out);

          length = MESSAGE_ID_BYTES;
          messageHandler = undefined;
        }
      }
      emitter.emit('data', buffer);

    };
  /**
   * Add handler generator
   *
   * Creates new handler and adds it to the list of handlers
   * @param {[type]} id      [description]
   * @param {[type]} name    [description]
   * @param {[type]} handler [description]
   */
  var addHandler = function (info) {
      var handler = new MessageHandler(info);
      message_handlers[handler.id] = handler;
      return handler;
  }
  /**
   * Get Handler
   * @param  {Number}      id Handler ID
   * @return {MessageHandler} Handler for the ID
   */
  var getHandler = function(id) {
      if(message_handlers.hasOwnProperty(id)) {
          return message_handlers[id];
      } else {
          //throw Error("Handler #"+id+" doesn't exist.")
          return undefined;
      }
  }

  var serialPort = new serialport.SerialPort(serialFile, {
    baudRate: 9600,
    parser: variableLengthMessageParser
  }, false); 

  /**
   * Open serial via promise
   * @param  {SerialPort} serial Serial port to open
   * @return {Promise}    
   */
  var openPromise;
  var openSerial = function(serial) {
    // defer return to promise
    var deferred = Q.defer();
    // asynchronous serial open
    serial.open(function (error) {
      // once serial port is open, reject if error, otherwise resolve.
      if (error) {
        deferred.reject(error);
      } else {
        deferred.resolve();
      }
    });
    openPromise = deferred.promise;
    // return promise
    return deferred.promise;
  }
  var sendMessage = function(message) {
    return function() {
      // defer return to promise
      var deferred = Q.defer();
      // asynchronous serial write
      serialPort.write(message, function(err,results) {
          if(err)
            deferred.reject(error);
          else
            deferred.resolve(results);
      });
      // return promise
      return deferred.promise;
    }
  }
  openSerial(serialPort);
  return {
    MessageHandler    : MessageHandler,
    addHandler        : addHandler,
    getHandler        : getHandler,
    open              : function(){return openPromise},
    serialPort        : serialPort,
    sendMessage       : sendMessage,
    write             : serialPort.write
  };
}
