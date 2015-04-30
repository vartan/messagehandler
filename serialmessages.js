"use strict";
var serialport = require("serialport");
var events = require("events");
var util = require("util");
var Q = require("q");

/** @type {Number} Number of bytes which describe command */
var MESSAGE_ID_BYTES = 1;


/**
 * MessageHandler Constructor
 * @param {Object} info  Object including ID, name, length
 */
function MessageHandler(info) {
  var id = info.id || 0,
      name = info.name || "Unnamed Message",
      length = info.length || 1;
  events.EventEmitter.call(this);


  if(id < 0 || id > Math.pow(2, 8 * MESSAGE_ID_BYTES)) {
    throw new Error("Message #" + id + " \"" + name + "\" does not fit" +
      " inside of " + MESSAGE_ID_BYTES + " bytes.");
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
  // required to wrap this function because the scope called by q isn't
  // the MessageHandler scope.
  var that = this;
  return function () {
    var deferred = Q.defer();
    that.once("message", function receiveQCallback(event) {
      deferred.resolve(event);
    });
    return deferred.promise;
  };
};

module.exports = function(serialFile, serialSettings) {
  var message_handlers = [],
      data = new Buffer(0),
      length = MESSAGE_ID_BYTES,
      messageHandler,
      serialPort,
      openPromise;

  /**
   * Add handler generator
   *
   * Creates new handler and adds it to the list of handlers
   * @param {[type]} id      [description]
   * @param {[type]} name    [description]
   * @param {[type]} handler [description]
   */
  function addHandler(info) {
      var handler = new MessageHandler(info);
      message_handlers[handler.id] = handler;
      return handler;
  }
  /**
   * Get Handler
   * @param  {Number}      id Handler ID
   * @return {MessageHandler} Handler for the ID
   */
  function getHandler(id) {
      if(message_handlers.hasOwnProperty(id)) {
          return message_handlers[id];
      }
      return undefined;
  }
  /**
   * Variable length message parser
   * @return {parser} Parses the messages to be dispatched 
   */
  function variableLengthMessageParser(emitter, buffer) {
    var out;
    data = Buffer.concat([data, buffer]);
    while (data.length >= length) {
      out = data.slice(0,length);
      data = data.slice(length);

      if(messageHandler === undefined) {
        messageHandler = getHandler(out[0]);
        if(messageHandler) {
          length = messageHandler.length;
          messageHandler.emit("data", out);
        }

      } else {
        messageHandler.emit("message", 
          {data:out, messageHandler:messageHandler});
        messageHandler.emit("data", out);

        length = MESSAGE_ID_BYTES;
        messageHandler = undefined;
      }
    }
    emitter.emit("data", buffer);

  }

  /**
   * Open Serial
   * @param  {SerialPort} node-serialport object     
   * @return {Promise}    promise when it is opened
   */
  function openSerial(serial) {
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
  /**
   * Send Message over serial
   * @param  {String || Buffer} message String/buffer to send over serialport
   * @return {Promise}          Promise which will resolve when the message is
   *                            finished sending
   */
  function sendMessage(message) {
    return function() {
      // defer return to promise
      var deferred = Q.defer();
      // asynchronous serial write
      serialPort.write(message, function(err,results) {
          if(err) {
            deferred.reject(err);
          } else {
            deferred.resolve(results);
          }
      });
      // return promise
      return deferred.promise;
    };
  }

  serialSettings = serialSettings || {
    baudRate: 9600
  };
  serialSettings.parser = variableLengthMessageParser;

  serialPort = new serialport.SerialPort(serialFile, serialSettings, false); 

  // Automatically open serial port
  // May consider making this optional later.
  openSerial(serialPort);

  return {
    MessageHandler    : MessageHandler,
    addHandler        : addHandler,
    getHandler        : getHandler,
    open              : function() { return openPromise; },
    serialPort        : serialPort,
    sendMessage       : sendMessage,
    write             : serialPort.write
  };
};
