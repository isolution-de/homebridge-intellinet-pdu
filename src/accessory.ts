import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  Characteristic,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service
} from "homebridge";

type ConfigSwitch = {
  position: number;
  name: string;
  enabled: boolean;
};


type Switch = {
  position: number;
  name: string;
  enabled: boolean;
  isOn: boolean;
  service?: Service;
};

let hap: HAP;

const http = require('http');
import { ClientRequest, IncomingMessage } from "http";
import { hostname } from "os";
import Poller from "./Poller";


export = (api: API) => {
  hap = api.hap;
  api.registerAccessory("IntellinetPDU", IntellinetPDU);
};

class IntellinetPDU implements AccessoryPlugin {
  private readonly log: Logging;
  private readonly name: string;
  private readonly api: API;
  private readonly host: string;
  private readonly username: string;
  private readonly password: string;

  private readonly informationService: Service;
  private readonly temperatureService: Service;
  private readonly humidityService: Service;

  private switches: Switch[] = [];

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.api = api;
    this.name = config.name;
    this.host = config.host;
    this.username = config.username;
    this.password = config.password;
    
    // create switch array with default values
    for (let i=0; i<8; i++) {
      let sw: Switch = {
        position: i,
        name: "Switch " + i,
        enabled: false,
        isOn: false
      }
      this.switches.push(sw);
    }

    // applay configuration values to switch array
    let confSwitches: ConfigSwitch[] = config.switchNames;
    if (confSwitches !== undefined) {
      confSwitches.forEach(item => {
        let sw = this.switches[item.position];
        sw.name = item.name;
        sw.enabled = item.enabled;
        if (sw.enabled) {
          sw.service = this.createSwitchService(sw.position, sw.isOn);
        }
      });
    }

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, "Custom Manufacturer")
      .setCharacteristic(hap.Characteristic.Model, "Custom Model");

    this.temperatureService = new hap.Service.TemperatureSensor(this.name);
    this.humidityService = new hap.Service.HumiditySensor(this.name);
    this.startPoller();

    log.info("Switch finished initializing!");
  }

  getSwitchName(pos: number): string {
    let name = `Switch ${pos}`;
    if (typeof this.switches !== 'undefined') {
      name = this.switches[pos].name;
    }
    this.log.info(`Switch ${pos}: name set to ${name}`);
    return name;
  }

  createSwitchService(pos: number, val: boolean): Service {
    // get switch name from config (if exists)
    const name = this.getSwitchName(pos);
    const result: Service = new hap.Service.Switch(name, name);
    result.getCharacteristic(hap.Characteristic.On)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        callback(undefined, val);
      })
      .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        val = value as boolean;
       this.setSwitch(pos, val);
        callback();
     });
    return result;
  }

  getServices(): Service[] {
    // create array of all services
    let result: Service[] = [ this.informationService, this.temperatureService, this.humidityService ];
    // add service for each switch outlet
    this.switches.forEach(item => {
      if (item.service !== undefined) {
        result.push(item.service);
      }
    });
    return result;
  }

  startPoller(): void {
    const pollService = new Poller(async () => {
      let data: any[] = [];
      const req = http.get(`http://${this.host}/status.xml`, (res: IncomingMessage) => {
        res.on('data', (chunk: any) => { data = data + chunk; });
        res.on('end', () => { pollService.emit('state', data); });
      });
      req.end();
    }, 60000);

    pollService.on('state', (data: any[]) => {
      let m: RegExpExecArray | null;
      let temp: number = 0;
      let hum: number = 0;

      const ex1 = /<tempBan>(.+?)<\/tempBan>/;
      const ex2 = /<humBan>(.+?)<\/humBan>/;
      const sw0 = /<outletStat0>(on|off)<\/outletStat0>/;
      const sw1 = /<outletStat1>(on|off)<\/outletStat1>/;
      const sw2 = /<outletStat2>(on|off)<\/outletStat2>/;
      const sw3 = /<outletStat3>(on|off)<\/outletStat3>/;
      const sw4 = /<outletStat4>(on|off)<\/outletStat4>/;
      const sw5 = /<outletStat5>(on|off)<\/outletStat5>/;
      const sw6 = /<outletStat6>(on|off)<\/outletStat6>/;
      const sw7 = /<outletStat7>(on|off)<\/outletStat7>/;

      if ((m = ex1.exec(data.toString())) !== null) {
        m.forEach((match, groupIndex) => {
          if (groupIndex == 1) temp = parseInt(match);
        });
      }
      if ((m = ex2.exec(data.toString())) !== null) {
       m.forEach((match, groupIndex) => {
          if (groupIndex == 1) hum = parseInt(match);
        });
      }
      if ((m = sw0.exec(data.toString())) !== null) {
        this.switches[0].isOn = (m.pop() == "on");
      }
      if ((m = sw1.exec(data.toString())) !== null) {
        this.switches[1].isOn = (m.pop() == "on");
      }
      if ((m = sw2.exec(data.toString())) !== null) {
        this.switches[2].isOn = (m.pop() == "on");
      }
      if ((m = sw3.exec(data.toString())) !== null) {
        this.switches[3].isOn = (m.pop() == "on");
      }
      if ((m = sw4.exec(data.toString())) !== null) {
        this.switches[4].isOn = (m.pop() == "on");
      }
      if ((m = sw5.exec(data.toString())) !== null) {
        this.switches[5].isOn = (m.pop() == "on");
      }
      if ((m = sw6.exec(data.toString())) !== null) {
        this.switches[6].isOn = (m.pop() == "on");
      }
      if ((m = sw7.exec(data.toString())) !== null) {
        this.switches[7].isOn = (m.pop() == "on");
      }

      this.log.info(`Humidity: ${hum}, Temperature: ${temp}`);
      this.temperatureService.getCharacteristic(Characteristic.CurrentTemperature).updateValue(temp);
      this.humidityService.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(hum);
      this.switches.forEach(sw => {
        if (sw.enabled) {
          let value: string = sw.isOn? "ON": "OFF";
          this.log.info(`Switch ${sw.name}: ${value}`);
        }
        sw.service?.getCharacteristic(Characteristic.On).updateValue(sw.isOn);
      });
    });

    pollService.start();

    this.api.on('shutdown', (): void => pollService.stop());
  }

  async setSwitch(pos: number, value: boolean): Promise<string> {
    let data: any[] = [];

    const op = value ? 0 : 1;
    const request = `http://${this.username}:${this.password}@${this.host}/control_outlet.htm?outlet${pos}=1&op=${op}`;
    //this.log.info("Request: " + request);

    return new Promise<string> (result => {
      const req = http.get(request, (res: IncomingMessage) => {
        res.on('data', (chunk: any) => { data = data + chunk; });
        res.on('end', () => { result(data.toString()); });
        });
    });
  }
}

