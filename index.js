var MaxCube = require('maxcube');
var Thermostat = require('./thermostat');

/** Sample platform outline
 *  based on Sonos platform
 */
function MaxCubePlatform(log, config){
  this.log = log;
  this.config = config;
  this.refreshed = false;
  this.myAccessories = [];
  if (this.config) {
    this.cube = new MaxCube(this.config.ip, this.config.port);
  }
};
MaxCubePlatform.prototype = {
  accessories: function(callback) {
    var that = this;
    this.cube.maxCubeLowLevel.on('error', function (error) {
      that.log("Max! Cube Error:", error);
      if(!that.refreshed){
        // We didn't connect yet and got an error,
        // probably the Cube couldn't be reached,
        // fulfill the callback so HomeBridge can initialize.
        callback(that.myAccessories);
      }
    });
    this.cube.on('connected', function () {
      if (that.refreshed) return;
      that.cube.getDeviceStatus().then(function (devices) {
        that.refreshed = true;
        devices.forEach(function (device) {
          var deviceInfo = that.cube.getDeviceInfo(device.rf_address);
          var wall = that.config.allow_wall_thermostat && (deviceInfo.device_type == 3);
          if (deviceInfo.device_type == 1 || deviceInfo.device_type == 2 || wall) {
            that.myAccessories.push(new Thermostat(that.log, that.config, device, deviceInfo, that.cube, Service, Characteristic));
          }
        });
        setTimeout(that.updateThermostatData.bind(that),300000);
        callback(that.myAccessories);
      });
    });
  },
  updateThermostatData: function(){
    var that = this;
    this.cube.getConnection().then(function () {
      that.cube.getDeviceStatus().then(function (devices) {
        devices.forEach(function (device) {
          that.myAccessories.forEach(function(thermostat){
            thermostat.refreshDevice(device);
          });
        });
      });
    });
    setTimeout(this.updateThermostatData.bind(this),300000);
  }
};

var Service;
var Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerPlatform('homebridge-platform-maxcube', 'MaxCubePlatform', MaxCubePlatform, true);
}
